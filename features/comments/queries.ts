import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import type { PostComment } from "./types";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

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

function commentFromRow(row: CommentRow, viewerId: string): PostComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    isOwn: row.user_id === viewerId,
  };
}

export async function getCommentsForPosts(
  postIds: string[],
  callbackUrl = "/student/feed",
) {
  const { supabase, user } = await requireStudent(callbackUrl);
  const commentsByPostId = Object.fromEntries(
    postIds.map((postId) => [postId, [] as PostComment[]]),
  ) as Record<string, PostComment[]>;

  if (!postIds.length) {
    return commentsByPostId;
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .in("post_id", postIds)
    .order("created_at", { ascending: true })
    .returns<CommentRow[]>();

  if (error || !data) {
    return commentsByPostId;
  }

  for (const row of data) {
    commentsByPostId[row.post_id]?.push(commentFromRow(row, user.id));
  }

  return commentsByPostId;
}

