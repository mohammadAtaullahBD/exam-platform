import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { upsertUserProfile } from "@/lib/supabase/users";

export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Sign in required." },
      { status: 401 },
    );
  }

  const { error: profileError } = await upsertUserProfile(data.user);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
