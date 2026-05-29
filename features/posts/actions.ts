"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { postSchema } from "@/lib/validations/social";

import type { PostActionState } from "./types";

async function requireTeacher(callbackUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (toUserRole(user.app_metadata?.role) !== "teacher") {
    redirect("/dashboard");
  }

  return { supabase, user };
}

export async function createPost(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const parsed = postSchema.safeParse({
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, user } = await requireTeacher("/posts");
  const { error } = await supabase.from("posts").insert({
    teacher_id: user.id,
    content: parsed.data.content,
  });

  if (error) {
    console.error("Create post failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message: "Post could not be published. Please try again.",
    };
  }

  revalidatePath("/posts");
  revalidatePath("/profile");
  revalidatePath(`/teacher/${user.id}`);
  revalidatePath("/student/feed");

  return {
    status: "success",
    message: "Post published.",
  };
}

