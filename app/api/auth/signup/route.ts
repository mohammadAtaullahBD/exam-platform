import { NextResponse } from "next/server";

import { isPublicSignupRole } from "@/lib/roles";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { createAdminClient } from "@/lib/supabase/admin";

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
        role,
      },
    },
  );

  if (roleError) {
    return NextResponse.json(
      { error: "Account created, but role assignment failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Account created. Check your email if confirmation is required.",
    role,
  });
}
