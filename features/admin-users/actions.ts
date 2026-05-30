"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { isUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertUserProfile } from "@/lib/supabase/users";

import { requireAdmin } from "./guards";

export async function updateManagedUserRole(userId: string, formData: FormData) {
  const { user: actor } = await requireAdmin("/admin/users");
  const role = formData.get("role");

  if (!isUserRole(role)) {
    return;
  }

  if (actor.id === userId) {
    return;
  }

  const admin = createAdminClient();
  const { data: targetResult, error: targetError } =
    await admin.auth.admin.getUserById(userId);

  if (targetError || !targetResult.user) {
    return;
  }

  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...targetResult.user.app_metadata,
      role,
    },
  });

  if (error || !data.user) {
    return;
  }

  await upsertUserProfile(data.user, role);
  revalidatePath("/admin/users");
}
