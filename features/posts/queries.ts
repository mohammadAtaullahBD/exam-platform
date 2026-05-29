import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import type { FeedPost, TeacherPost } from "./types";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];

type PostWithTeacherRow = PostRow & {
  users: {
    name: string | null;
    email: string;
  } | null;
};

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

  if (toUserRole(user.app_metadata?.role) !== expectedRole) {
    redirect("/dashboard");
  }

  return { supabase, user };
}

function teacherPostFromRow(row: PostRow): TeacherPost {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function feedPostFromRow(row: PostWithTeacherRow): FeedPost {
  return {
    ...teacherPostFromRow(row),
    teacherName: row.users?.name ?? row.users?.email ?? "Teacher",
  };
}

export async function getTeacherPosts(callbackUrl = "/posts") {
  const { supabase, user } = await requireRole("teacher", callbackUrl);
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PostRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map(teacherPostFromRow);
}

export async function getStudentFeedPosts(callbackUrl = "/student/feed") {
  const { supabase } = await requireRole("student", callbackUrl);
  const { data, error } = await supabase
    .from("posts")
    .select("id,teacher_id,content,created_at,users!posts_teacher_id_fkey(name,email)")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PostWithTeacherRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map(feedPostFromRow);
}

