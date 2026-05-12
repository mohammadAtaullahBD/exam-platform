import "server-only";

import type { User } from "@supabase/supabase-js";

import { toUserRole, type UserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppUserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

function getUserName(user: User) {
  const name = user.user_metadata?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function profileFromAuthUser(user: User): AppUserProfile {
  return {
    id: user.id,
    email: user.email ?? "",
    name: getUserName(user),
    role: toUserRole(user.app_metadata?.role),
  };
}

export async function upsertUserProfile(user: User, role?: UserRole) {
  const admin = createAdminClient();
  const profile = profileFromAuthUser(user);
  const resolvedRole = role ?? profile.role;

  const { error } = await admin.from("users").upsert(
    {
      id: user.id,
      email: profile.email,
      name: profile.name,
      role: resolvedRole,
      password_hash: "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  return { error };
}

export async function getTrustedUserRole(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    return null;
  }

  return toUserRole(data.user.app_metadata?.role);
}

export async function hasAuthAdminUser() {
  const admin = createAdminClient();
  let page = 1;

  while (page <= 100) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    if (data.users.some((user) => toUserRole(user.app_metadata?.role) === "admin")) {
      return true;
    }

    if (data.users.length < 1000) {
      return false;
    }

    page += 1;
  }

  return false;
}
