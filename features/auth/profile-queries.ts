import "server-only";

import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

import type { Profile, TeacherPost } from "./types";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  bio: string | null;
  role: string | null;
  created_at: string | null;
};

type PostRow = {
  id: string;
  content: string | null;
  created_at: string | null;
};

function profileFromRow(row: UserRow, fallbackUser?: User): Profile {
  return {
    id: row.id,
    email: row.email ?? fallbackUser?.email ?? "",
    name: row.name,
    bio: row.bio,
    role: toUserRole(fallbackUser?.app_metadata?.role ?? row.role),
    createdAt: row.created_at,
  };
}

function fallbackProfileFromUser(user: User): Profile {
  const name = user.user_metadata?.name;

  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    bio: null,
    role: toUserRole(user.app_metadata?.role),
    createdAt: user.created_at,
  };
}

function postFromRow(row: PostRow): TeacherPost {
  return {
    id: row.id,
    content: row.content ?? "",
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

export async function getCurrentProfile(callbackUrl = "/profile") {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,name,bio,role,created_at")
    .eq("id", user.id)
    .single<UserRow>();

  if (error || !data) {
    return fallbackProfileFromUser(user);
  }

  return profileFromRow(data, user);
}

export async function getTeacherProfilePageData(teacherId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/teacher/${teacherId}`)}`,
    );
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,name,bio,role,created_at")
    .eq("id", teacherId)
    .eq("role", "teacher")
    .single<UserRow>();

  if (error || !data) {
    notFound();
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id,content,created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<PostRow[]>();

  return {
    profile: profileFromRow(data),
    posts: (posts ?? []).map(postFromRow),
    viewerId: user.id,
  };
}

export async function getTeacherPosts(teacherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id,content,created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<PostRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map(postFromRow);
}
