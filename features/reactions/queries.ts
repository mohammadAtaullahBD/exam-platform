import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import type { ReactionSummary } from "./types";

type ReactionRow = Pick<
  Database["public"]["Tables"]["reactions"]["Row"],
  "post_id" | "type" | "user_id"
>;

async function requireStudent(callbackUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (toUserRole(user.app_metadata?.role) !== "student") {
    redirect("/dashboard");
  }

  return { supabase, user };
}

function emptySummary(postId: string): ReactionSummary {
  return {
    postId,
    type: "like",
    count: 0,
    hasReacted: false,
  };
}

export async function getReactionSummaries(
  postIds: string[],
  callbackUrl = "/student/feed",
) {
  const { supabase, user } = await requireStudent(callbackUrl);
  const summaries = Object.fromEntries(
    postIds.map((postId) => [postId, emptySummary(postId)]),
  ) as Record<string, ReactionSummary>;

  if (!postIds.length) {
    return summaries;
  }

  const { data, error } = await supabase
    .from("reactions")
    .select("post_id,type,user_id")
    .in("post_id", postIds)
    .eq("type", "like")
    .returns<ReactionRow[]>();

  if (error || !data) {
    return summaries;
  }

  for (const reaction of data) {
    const summary = summaries[reaction.post_id];

    if (!summary) {
      continue;
    }

    summary.count += 1;
    summary.hasReacted = summary.hasReacted || reaction.user_id === user.id;
  }

  return summaries;
}

