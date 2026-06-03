"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  groupMemberAddSchema,
  groupMemberIdentitySchema,
  groupSchema,
  inviteTokenSchema,
} from "@/lib/validations/group";
import { toUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { GroupActionState } from "./types";

type InitialBatchStudent = {
  email: string;
  rollNumber?: number;
  studentIdentity: string;
};

async function requireTeacher(callbackUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (toUserRole(user.app_metadata?.role) !== "teacher") {
    redirect("/dashboard");
  }

  return { supabase, user };
}

async function requireStudent(callbackUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (toUserRole(user.app_metadata?.role) !== "student") {
    redirect("/dashboard");
  }

  return user;
}

async function requireOwnedGroup(groupId: string, callbackUrl: string) {
  const { supabase, user } = await requireTeacher(callbackUrl);
  const { data: group, error } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (error || !group) {
    return { supabase, user, group: null };
  }

  return { supabase, user, group };
}

function parseInitialBatchStudents(formData: FormData) {
  const indexes = Array.from(
    new Set(
      formData
        .getAll("initialStudentIndexes")
        .filter((value): value is string => typeof value === "string"),
    ),
  );
  const students: InitialBatchStudent[] = [];
  const fieldErrors: NonNullable<GroupActionState["fieldErrors"]> = {};

  for (const index of indexes) {
    const parsed = groupMemberAddSchema.safeParse({
      email: formData.get(`student-${index}-email`),
      rollNumber: formData.get(`student-${index}-rollNumber`),
      studentIdentity: formData.get(`student-${index}-studentIdentity`),
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;

      fieldErrors.email = [
        ...(fieldErrors.email ?? []),
        errors.email?.[0] ?? `Student ${students.length + 1} is invalid.`,
      ];
      fieldErrors.rollNumber = [
        ...(fieldErrors.rollNumber ?? []),
        ...(errors.rollNumber ?? []),
      ];
      fieldErrors.studentIdentity = [
        ...(fieldErrors.studentIdentity ?? []),
        ...(errors.studentIdentity ?? []),
      ];
      continue;
    }

    students.push(parsed.data);
  }

  const duplicateEmail = students.find(
    (student, index) =>
      students.findIndex((item) => item.email === student.email) !== index,
  );

  if (duplicateEmail) {
    fieldErrors.email = [
      ...(fieldErrors.email ?? []),
      "Each initial student email must be unique.",
    ];
  }

  const rolls = students
    .map((student) => student.rollNumber)
    .filter((rollNumber): rollNumber is number => typeof rollNumber === "number");
  const duplicateRoll = rolls.find(
    (rollNumber, index) => rolls.indexOf(rollNumber) !== index,
  );

  if (duplicateRoll) {
    fieldErrors.rollNumber = [
      ...(fieldErrors.rollNumber ?? []),
      "Each initial roll number must be unique.",
    ];
  }

  return {
    students,
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter(([, errors]) => errors.length > 0),
    ) as NonNullable<GroupActionState["fieldErrors"]>,
  };
}

export async function createGroup(
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const initialStudents = parseInitialBatchStudents(formData);
  if (Object.keys(initialStudents.fieldErrors).length) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: initialStudents.fieldErrors,
    };
  }

  const { supabase, user } = await requireTeacher("/batches/new");
  const { name, description } = parsed.data;
  const adminClient = createAdminClient();
  const studentRows: Array<{
    id: string;
    email: string;
  }> = [];

  for (const initialStudent of initialStudents.students) {
    const { data: student, error: studentError } = await adminClient
      .from("users")
      .select("id,email,role")
      .eq("email", initialStudent.email)
      .maybeSingle();

    if (studentError || !student || student.role !== "student") {
      return {
        status: "error",
        message: "One or more students could not be found.",
        fieldErrors: {
          email: ["Use existing student account emails for initial students."],
        },
      };
    }

    studentRows.push({ id: student.id, email: student.email });
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      teacher_id: user.id,
      name,
      description: description || null,
    })
    .select("id")
    .single();

  if (error || !group) {
    return {
      status: "error",
      message: "Batch could not be created. Please try again.",
    };
  }

  if (initialStudents.students.length) {
    const memberRows = initialStudents.students.map((student) => {
      const studentRow = studentRows.find((row) => row.email === student.email);

      return {
        group_id: group.id,
        student_id: studentRow?.id,
        ...(student.rollNumber ? { roll_number: student.rollNumber } : {}),
        student_identity: student.studentIdentity || null,
      };
    });
    const { error: memberError } = await adminClient
      .from("group_members")
      .insert(memberRows);

    if (memberError) {
      console.error("Create batch initial members failed", {
        code: memberError.code,
        message: memberError.message,
      });

      await adminClient.from("groups").delete().eq("id", group.id);

      return {
        status: "error",
        message:
          memberError.code === "23505"
            ? "Initial students or roll numbers contain duplicates."
            : "Initial students could not be added. Please try again.",
      };
    }
  }

  revalidatePath("/batches");
  redirect(`/batches/${group.id}`);
}

export async function updateGroup(
  groupId: string,
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, user } = await requireTeacher(`/batches/${groupId}`);
  const { name, description } = parsed.data;
  const { error } = await supabase
    .from("groups")
    .update({
      name,
      description: description || null,
    })
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .select("id")
    .single();

  if (error) {
    return {
      status: "error",
      message: "Batch could not be updated. Please try again.",
    };
  }

  revalidatePath("/batches");
  revalidatePath(`/batches/${groupId}`);
  revalidatePath("/student/groups");

  return {
    status: "success",
    message: "Batch updated.",
  };
}

export async function deleteGroup(
  groupId: string,
  _previousState: GroupActionState,
): Promise<GroupActionState> {
  void _previousState;

  const { supabase, user } = await requireTeacher(`/batches/${groupId}`);
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("teacher_id", user.id);

  if (error) {
    return {
      status: "error",
      message: "Batch could not be deleted. Please try again.",
    };
  }

  revalidatePath("/batches");
  revalidatePath("/student/groups");

  return {
    status: "success",
    message: "Batch deleted.",
  };
}

export async function deleteGroupAndRedirect(
  groupId: string,
  _previousState: GroupActionState,
): Promise<GroupActionState> {
  const state = await deleteGroup(groupId, _previousState);

  if (state.status === "error") {
    return state;
  }

  redirect("/batches");
}

export async function updateGroupMemberIdentity(
  groupId: string,
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const parsed = groupMemberIdentitySchema.safeParse({
    studentId: formData.get("studentId"),
    rollNumber: formData.get("rollNumber"),
    studentIdentity: formData.get("studentIdentity"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, user } = await requireTeacher(`/batches/${groupId}`);
  const { studentId, rollNumber, studentIdentity } = parsed.data;
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!group) {
    return {
      status: "error",
      message: "Batch could not be found.",
    };
  }

  const { error } = await supabase
    .from("group_members")
    .update({
      roll_number: rollNumber,
      student_identity: studentIdentity || null,
    } as never)
    .eq("group_id", groupId)
    .eq("student_id", studentId);

  if (error) {
    console.error("Batch member identity update failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message:
        error.code === "23505"
          ? "That roll is already used in this batch."
          : "Student identity could not be saved. Please try again.",
    };
  }

  revalidatePath("/batches");
  revalidatePath(`/batches/${groupId}`);
  revalidatePath("/exams");
  revalidatePath("/student/groups");

  return {
    status: "success",
    message: "Student identity saved.",
  };
}

export async function addGroupMemberByEmail(
  groupId: string,
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const parsed = groupMemberAddSchema.safeParse({
    email: formData.get("email"),
    rollNumber: formData.get("rollNumber"),
    studentIdentity: formData.get("studentIdentity"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { group } = await requireOwnedGroup(groupId, `/batches/${groupId}`);

  if (!group) {
    return {
      status: "error",
      message: "Batch could not be found.",
    };
  }

  const supabase = createAdminClient();
  const { email, rollNumber, studentIdentity } = parsed.data;
  const { data: student, error: studentError } = await supabase
    .from("users")
    .select("id,role")
    .eq("email", email)
    .maybeSingle();

  if (studentError || !student || student.role !== "student") {
    return {
      status: "error",
      message: "No student account was found with that email.",
      fieldErrors: {
        email: ["Use the email of an existing student account."],
      },
    };
  }

  const row = {
    group_id: groupId,
    student_id: student.id,
    ...(rollNumber ? { roll_number: rollNumber } : {}),
    student_identity: studentIdentity || null,
  };
  const { error } = await supabase.from("group_members").insert(row);

  if (error) {
    console.error("Add batch member failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message:
        error.code === "23505"
          ? "That student or roll number is already in this batch."
          : "Student could not be added. Please try again.",
    };
  }

  revalidatePath("/batches");
  revalidatePath(`/batches/${groupId}`);
  revalidatePath("/exams");
  revalidatePath("/student/groups");

  return {
    status: "success",
    message: "Student added to batch.",
  };
}

export async function removeGroupMember(
  groupId: string,
  studentId: string,
  _previousState: GroupActionState,
): Promise<GroupActionState> {
  void _previousState;

  const { group } = await requireOwnedGroup(groupId, `/batches/${groupId}`);

  if (!group) {
    return {
      status: "error",
      message: "Batch could not be found.",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("student_id", studentId);

  if (error) {
    return {
      status: "error",
      message: "Student could not be removed. Please try again.",
    };
  }

  revalidatePath("/batches");
  revalidatePath(`/batches/${groupId}`);
  revalidatePath("/exams");
  revalidatePath("/student/groups");

  return {
    status: "success",
    message: "Student removed from batch.",
  };
}

export async function joinGroupByInvite(
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const tokenResult = inviteTokenSchema.safeParse(formData.get("token"));

  if (!tokenResult.success) {
    return {
      status: "error",
      message: "This invite link is not valid.",
      fieldErrors: {
        token: tokenResult.error.flatten().formErrors,
      },
    };
  }

  const token = tokenResult.data;
  const user = await requireStudent(`/join/${token}`);
  const supabase = createAdminClient();
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id")
    .eq("invite_token", token)
    .maybeSingle();

  if (groupError || !group) {
    return {
      status: "error",
      message: "This invite link is no longer available.",
    };
  }

  const { error } = await supabase.from("group_members").upsert(
    {
      group_id: group.id,
      student_id: user.id,
    },
    {
      onConflict: "group_id,student_id",
    },
  );

  if (error) {
    return {
      status: "error",
      message: "You could not join this group. Please try again.",
    };
  }

  revalidatePath("/student/groups");
  revalidatePath(`/join/${token}`);
  redirect("/student/groups");
}
