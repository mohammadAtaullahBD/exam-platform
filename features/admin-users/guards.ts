import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(callbackUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (toUserRole(user.app_metadata?.role) !== "admin") {
    redirect("/dashboard");
  }

  return { user };
}
