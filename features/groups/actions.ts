"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { groupSchema, inviteTokenSchema } from "@/lib/validations/group";
import { toUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { GroupActionState } from "./types";

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

  const { supabase, user } = await requireTeacher("/groups");
  const { name, description } = parsed.data;
  const { error } = await supabase.from("groups").insert({
    teacher_id: user.id,
    name,
    description: description || null,
  });

  if (error) {
    return {
      status: "error",
      message: "Group could not be created. Please try again.",
    };
  }

  revalidatePath("/groups");

  return {
    status: "success",
    message: "Group created.",
  };
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

  const { supabase, user } = await requireTeacher("/groups");
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
      message: "Group could not be updated. Please try again.",
    };
  }

  revalidatePath("/groups");
  revalidatePath("/student/groups");

  return {
    status: "success",
    message: "Group updated.",
  };
}

export async function deleteGroup(
  groupId: string,
  _previousState: GroupActionState,
): Promise<GroupActionState> {
  void _previousState;

  const { supabase, user } = await requireTeacher("/groups");
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("teacher_id", user.id);

  if (error) {
    return {
      status: "error",
      message: "Group could not be deleted. Please try again.",
    };
  }

  revalidatePath("/groups");
  revalidatePath("/student/groups");

  return {
    status: "success",
    message: "Group deleted.",
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
