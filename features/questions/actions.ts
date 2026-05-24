"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { questionSchema } from "@/lib/validations/question";

import type { QuestionActionState } from "./types";

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

function getQuestionInput(formData: FormData) {
  return {
    content: formData.get("content"),
    options: ["option-0", "option-1", "option-2", "option-3"].map((name) =>
      formData.get(name),
    ),
    correctOptionIndex: formData.get("correctOptionIndex"),
  };
}

function validationErrorState(
  fieldErrors: QuestionActionState["fieldErrors"],
): QuestionActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

export async function createQuestion(
  _previousState: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const parsed = questionSchema.safeParse(getQuestionInput(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const { supabase, user } = await requireTeacher("/questions");
  const { content, options, correctAnswer } = parsed.data;
  const { error } = await supabase.from("questions").insert({
    author_id: user.id,
    content,
    options,
    correct_answer: correctAnswer,
    source: "teacher",
  });

  if (error) {
    return {
      status: "error",
      message: "Question could not be created. Please try again.",
    };
  }

  revalidatePath("/questions");

  return {
    status: "success",
    message: "Question created.",
  };
}

export async function updateQuestion(
  questionId: string,
  _previousState: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const parsed = questionSchema.safeParse(getQuestionInput(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const { supabase, user } = await requireTeacher("/questions");
  const { content, options, correctAnswer } = parsed.data;
  const { error } = await supabase
    .from("questions")
    .update({
      content,
      options,
      correct_answer: correctAnswer,
    })
    .eq("id", questionId)
    .eq("author_id", user.id)
    .select("id")
    .single();

  if (error) {
    return {
      status: "error",
      message: "Question could not be updated. Please try again.",
    };
  }

  revalidatePath("/questions");

  return {
    status: "success",
    message: "Question updated.",
  };
}

export async function deleteQuestion(
  questionId: string,
  _previousState: QuestionActionState,
): Promise<QuestionActionState> {
  void _previousState;

  const { supabase, user } = await requireTeacher("/questions");
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("author_id", user.id);

  if (error) {
    return {
      status: "error",
      message: "Question could not be deleted. Please try again.",
    };
  }

  revalidatePath("/questions");

  return {
    status: "success",
    message: "Question deleted.",
  };
}
