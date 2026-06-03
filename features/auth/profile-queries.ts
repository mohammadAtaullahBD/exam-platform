import "server-only";

import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

import type { Profile } from "./types";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  bio: string | null;
  role: string | null;
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

  return {
    profile: profileFromRow(data),
    viewerId: user.id,
  };
}
