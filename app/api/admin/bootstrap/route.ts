import { NextResponse } from "next/server";

import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAuthAdminUser, upsertUserProfile } from "@/lib/supabase/users";

export async function POST(request: Request) {
  const setupToken = process.env.ADMIN_SETUP_TOKEN;

  if (!setupToken) {
    return NextResponse.json(
      { error: "ADMIN_SETUP_TOKEN is not configured." },
      { status: 503 },
    );
  }

  const providedToken = request.headers.get("x-admin-setup-token");

  if (providedToken !== setupToken) {
    return NextResponse.json({ error: "Invalid setup token." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (await hasAuthAdminUser()) {
    return NextResponse.json(
      { error: "An admin already exists. Use the admin promotion endpoint." },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  const { data: users, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const targetUser = users.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!targetUser) {
    return NextResponse.json(
      {
        error:
          "No Supabase Auth user exists for that email. Sign up and verify the account first.",
      },
      { status: 404 },
    );
  }

  const { data, error } = await admin.auth.admin.updateUserById(targetUser.id, {
    app_metadata: {
      ...targetUser.app_metadata,
      role: "admin",
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to promote first admin." },
      { status: 500 },
    );
  }

  const { error: profileError } = await upsertUserProfile(data.user, "admin");

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "First admin created. Sign out and sign back in to refresh claims.",
    dashboardUrl: `${getSiteUrl(request.url)}/dashboard`,
  });
}
