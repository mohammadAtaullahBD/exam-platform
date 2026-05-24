import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import type { Group, GroupInvite, StudentGroup } from "./types";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];

type GroupMemberWithGroupRow = {
  joined_at: string;
  groups:
    | (Pick<GroupRow, "id" | "name" | "description"> & {
        users: {
          name: string | null;
          email: string;
        } | null;
      })
    | null;
};

type GroupInviteRow = Pick<
  GroupRow,
  "id" | "name" | "description" | "invite_token"
> & {
  users: {
    name: string | null;
    email: string;
  } | null;
};

function groupFromRow(row: GroupRow, memberCount: number): Group {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    description: row.description,
    inviteToken: row.invite_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount,
  };
}

async function requireRole(
  expectedRole: "teacher" | "student",
  callbackUrl: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const role = toUserRole(user.app_metadata?.role);

  if (role !== expectedRole) {
    redirect("/dashboard");
  }

  return { supabase, user };
}

export async function getTeacherGroups(callbackUrl = "/groups") {
  const { supabase, user } = await requireRole("teacher", callbackUrl);

  const { data: groupRows, error } = await supabase
    .from("groups")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })
    .returns<GroupRow[]>();

  if (error || !groupRows?.length) {
    return [];
  }

  const groupIds = groupRows.map((group) => group.id);
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds)
    .returns<Array<{ group_id: string }>>();

  const counts = new Map<string, number>();
  for (const member of memberRows ?? []) {
    counts.set(member.group_id, (counts.get(member.group_id) ?? 0) + 1);
  }

  return groupRows.map((group) => groupFromRow(group, counts.get(group.id) ?? 0));
}

export async function getStudentGroups(callbackUrl = "/student/groups") {
  const { supabase } = await requireRole("student", callbackUrl);

  const { data, error } = await supabase
    .from("group_members")
    .select(
      "joined_at, groups(id,name,description,users!groups_teacher_id_fkey(name,email))",
    )
    .order("joined_at", { ascending: false })
    .returns<GroupMemberWithGroupRow[]>();

  if (error || !data) {
    return [];
  }

  return data.flatMap<StudentGroup>((membership) => {
    const group = membership.groups;

    if (!group) {
      return [];
    }

    return [
      {
        id: group.id,
        name: group.name,
        description: group.description,
        teacherName: group.users?.name ?? group.users?.email ?? "Teacher",
        joinedAt: membership.joined_at,
      },
    ];
  });
}

export async function getGroupInvite(
  token: string,
  callbackUrl = `/join/${token}`,
): Promise<GroupInvite | null> {
  const { user } = await requireRole("student", callbackUrl);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("groups")
    .select("id,name,description,invite_token,users!groups_teacher_id_fkey(name,email)")
    .eq("invite_token", token)
    .maybeSingle<GroupInviteRow>();

  if (error || !data) {
    return null;
  }

  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", data.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    redirect("/student/groups");
  }

  return {
    token: data.invite_token,
    groupId: data.id,
    groupName: data.name,
    description: data.description,
    teacherName: data.users?.name ?? data.users?.email ?? "Teacher",
  };
}
