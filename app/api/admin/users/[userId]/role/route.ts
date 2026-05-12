import { NextResponse, type NextRequest } from "next/server";

import { isUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTrustedUserRole, upsertUserProfile } from "@/lib/supabase/users";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const actorRole = await getTrustedUserRole(actor.id);

  if (actorRole !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    role?: unknown;
  } | null;
  const role = body?.role;

  if (!isUserRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const { userId } = await context.params;
  const admin = createAdminClient();
  const { data: targetResult, error: targetError } =
    await admin.auth.admin.getUserById(userId);

  if (targetError || !targetResult.user) {
    return NextResponse.json(
      { error: targetError?.message ?? "User not found." },
      { status: 404 },
    );
  }

  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...targetResult.user.app_metadata,
      role,
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to update role." },
      { status: 500 },
    );
  }

  const { error: profileError } = await upsertUserProfile(data.user, role);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "User role updated.",
    user: {
      id: data.user.id,
      email: data.user.email,
      role,
    },
  });
}
