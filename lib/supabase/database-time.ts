import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDatabaseNowMs(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("database_now");

  if (error || !data) {
    throw new Error("Database time could not be verified.");
  }

  return new Date(data).getTime();
}
