"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateProfileSchema } from "@/lib/validations/profile";
import { createClient } from "@/lib/supabase/server";

import type { UpdateProfileState } from "./types";

export async function updateProfile(
  _previousState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/signin?callbackUrl=/profile/edit");
  }

  const { name, bio } = parsed.data;
  const { error } = await supabase
    .from("users")
    .update({
      name,
      bio: bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id")
    .single();

  if (error) {
    return {
      status: "error",
      message: "Your profile could not be updated. Please try again.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath(`/teacher/${user.id}`);

  return {
    status: "success",
    message: "Profile updated.",
  };
}
