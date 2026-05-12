import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          time: checkedAt,
          error: "Supabase responded, but the health query failed.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "alive",
      time: checkedAt,
    });
  } catch {
    return NextResponse.json(
      {
        status: "down",
        time: checkedAt,
        error: "Health check could not reach Supabase.",
      },
      { status: 503 },
    );
  }
}
