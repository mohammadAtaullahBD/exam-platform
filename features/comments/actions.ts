"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { commentSchema } from "@/lib/validations/social";

import type { CommentActionState } from "./types";

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

export async function createComment(
  postId: string,
  _previousState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const parsed = commentSchema.safeParse({
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, user } = await requireStudent("/student/feed");
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: user.id,
    content: parsed.data.content,
  });

  if (error) {
    console.error("Create comment failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message: "Comment could not be posted. Please try again.",
    };
  }

  revalidatePath("/student/feed");

  return {
    status: "success",
    message: "Comment posted.",
  };
}

