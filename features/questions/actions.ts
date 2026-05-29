"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { questionSchema } from "@/lib/validations/question";
import type { Database } from "@/types/database";

import type { QuestionActionState, QuestionImportActionState } from "./types";

type PublicExamSetQuestionRow =
  Database["public"]["Tables"]["public_exam_set_questions"]["Row"];

type PublicExamSetWithQuestionsRow =
  Database["public"]["Tables"]["public_exam_sets"]["Row"] & {
    public_exam_set_questions: PublicExamSetQuestionRow[] | null;
  };

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
    console.error("Create question failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message:
        error.code === "42501"
          ? "Question permissions are not ready. Please refresh and try again."
          : "Question could not be created. Please try again.",
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
    console.error("Update question failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message:
        error.code === "42501"
          ? "Question permissions are not ready. Please refresh and try again."
          : "Question could not be updated. Please try again.",
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
    console.error("Delete question failed", {
      code: error.code,
      message: error.message,
    });

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

export async function copyPublicExamSetToQuestionBank(
  _previousState: QuestionImportActionState,
  formData: FormData,
): Promise<QuestionImportActionState> {
  const setId = formData.get("setId");

  if (typeof setId !== "string" || !setId) {
    return {
      status: "error",
      message: "Choose a public set to copy.",
    };
  }

  const { supabase, user } = await requireTeacher("/questions");
  const { data: setData, error: setError } = await supabase
    .from("public_exam_sets")
    .select("*, public_exam_set_questions(*)")
    .eq("id", setId)
    .eq("is_published", true)
    .maybeSingle();
  const set = setData as PublicExamSetWithQuestionsRow | null;

  if (setError || !set) {
    return {
      status: "error",
      message: "This public set is not available.",
    };
  }

  const questions = [...(set.public_exam_set_questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  if (!questions.length) {
    return {
      status: "error",
      message: "This public set has no questions to copy.",
    };
  }

  const copiedQuestions = questions.map((question) => ({
    author_id: user.id,
    content: question.snapshot_content,
    options: question.snapshot_options,
    correct_answer: question.snapshot_correct_answer,
    source: "teacher",
    original_id: question.question_id,
  }));
  const { error } = await supabase.from("questions").insert(copiedQuestions);

  if (error) {
    console.error("Copy public set questions failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message: "Public set questions could not be copied. Please try again.",
    };
  }

  revalidatePath("/questions");
  revalidatePath("/exams");

  return {
    status: "success",
    message: `${questions.length} ${
      questions.length === 1 ? "question" : "questions"
    } copied to your bank.`,
  };
}
