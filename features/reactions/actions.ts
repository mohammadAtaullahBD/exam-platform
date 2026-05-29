"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { reactionSchema } from "@/lib/validations/social";

import type { ReactionActionState } from "./types";

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

export async function reactToPost(
  postId: string,
  _previousState: ReactionActionState,
  formData: FormData,
): Promise<ReactionActionState> {
  const parsed = reactionSchema.safeParse({
    type: formData.get("type") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Reaction could not be saved.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, user } = await requireStudent("/student/feed");
  const { error } = await supabase.from("reactions").upsert(
    {
      post_id: postId,
      user_id: user.id,
      type: parsed.data.type,
    },
    {
      ignoreDuplicates: true,
      onConflict: "post_id,user_id,type",
    },
  );

  if (error) {
    console.error("React to post failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message: "Reaction could not be saved. Please try again.",
    };
  }

  revalidatePath("/student/feed");

  return {
    status: "success",
    message: "Reaction saved.",
  };
}

