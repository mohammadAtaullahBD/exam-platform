import { NextResponse } from "next/server";

import { isPublicSignupRole } from "@/lib/roles";
import { getSiteUrl } from "@/lib/site-url";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertUserProfile } from "@/lib/supabase/users";

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

  const admin = createAdminClient();
  const { error: roleError } = await admin.auth.admin.updateUserById(
    data.user.id,
    {
      app_metadata: {
        ...data.user.app_metadata,
        role,
      },
    },
  );

  if (roleError) {
    console.error("Role assignment error:", roleError);
    return NextResponse.json(
      { error: `Account created, but role assignment failed: ${roleError.message}` },
      { status: 500 },
    );
  }

  const { data: updatedUser, error: getUserError } =
    await admin.auth.admin.getUserById(data.user.id);

  if (getUserError || !updatedUser.user) {
    return NextResponse.json(
      { error: "Account created, but profile setup failed." },
      { status: 500 },
    );
  }

  const { error: profileError } = await upsertUserProfile(updatedUser.user, role);

  if (profileError) {
    return NextResponse.json(
      { error: "Account created, but profile setup failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message:
      "Account created. Check your email to verify your account before signing in.",
    role,
  });
}
