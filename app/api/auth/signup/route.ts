import { NextResponse } from "next/server";

import { isPublicSignupRole } from "@/lib/roles";
import { getSiteUrl } from "@/lib/site-url";
import { createAuthClient } from "@/lib/supabase/auth-client";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    name?: unknown;
    password?: unknown;
    role?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role;

  if (!name || !email || password.length < 8 || !isPublicSignupRole(role)) {
    return NextResponse.json(
      { error: "Enter a name, valid email, 8+ character password, and role." },
      { status: 400 },
    );
  }

  const supabase = createAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl(request.url)}/auth/callback`,
      data: {
        name,
      },
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to create account." },
      { status: 400 },
    );
  }

  // The database trigger 'sync_auth_user_profile' will automatically:
  // 1. Create the user profile in 'public.users'
  // 2. Assign the 'role' if it were in 'raw_app_meta_data'
  // However, signUp() options.data only sets 'raw_user_meta_data'.
  // We'll update the user's app_metadata via the admin client to set the role,
  // but we'll do it in a way that the trigger handles the sync.
  
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  
  const { error: roleError } = await admin.auth.admin.updateUserById(
    data.user.id,
    {
      app_metadata: {
        role,
      },
    },
  );

  if (roleError) {
    console.error("Role assignment error:", roleError);
    return NextResponse.json(
      { error: "Account created, but role assignment failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message:
      "Account created. Check your email to verify your account before signing in.",
    role,
  });
}
