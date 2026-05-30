import "server-only";

import type { User } from "@supabase/supabase-js";

import { toUserRole, type UserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

import { requireAdmin } from "./guards";
import type { ManagedUser } from "./types";

type ProfileRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "name" | "role"
>;

async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const users: User[] = [];

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < 1000) {
      break;
    }
  }

  return users;
}

export async function getManagedUsers(callbackUrl = "/admin/users") {
  const { user: currentUser } = await requireAdmin(callbackUrl);
  const admin = createAdminClient();
  const [authUsers, { data: profiles }] = await Promise.all([
    listAllAuthUsers(admin),
    admin.from("users").select("id,name,role").returns<ProfileRow[]>(),
  ]);
  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  return authUsers
    .map<ManagedUser>((authUser) => {
      const profile = profilesById.get(authUser.id);
      const profileRole: UserRole | null = profile?.role
        ? toUserRole(profile.role)
        : null;

      return {
        id: authUser.id,
        email: authUser.email ?? "",
        name:
          profile?.name ??
          (typeof authUser.user_metadata?.name === "string"
            ? authUser.user_metadata.name
            : null),
        authRole: toUserRole(authUser.app_metadata?.role),
        profileRole,
        emailConfirmedAt: authUser.email_confirmed_at ?? null,
        lastSignInAt: authUser.last_sign_in_at ?? null,
        createdAt: authUser.created_at,
        isCurrentUser: authUser.id === currentUser.id,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}
