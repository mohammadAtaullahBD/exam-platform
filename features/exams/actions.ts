"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { examSchema } from "@/lib/validations/exam";
import type { Database } from "@/types/database";

import type { ExamActionState } from "./types";

type QuestionRow = Pick<
  Database["public"]["Tables"]["questions"]["Row"],
  "id" | "content" | "options" | "correct_answer"
>;

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

function getExamInput(formData: FormData) {
  return {
    title: formData.get("title"),
    groupId: formData.get("groupId"),
    questionIds: formData
      .getAll("questionIds")
      .filter((value): value is string => typeof value === "string"),
    startsAt: formData.get("startsAtIso") || formData.get("startsAt"),
    endsAt: formData.get("endsAtIso") || formData.get("endsAt"),
  };
}

function validationErrorState(
  fieldErrors: ExamActionState["fieldErrors"],
): ExamActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

export async function createExam(
  _previousState: ExamActionState,
  formData: FormData,
): Promise<ExamActionState> {
  const parsed = examSchema.safeParse(getExamInput(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const { supabase, user } = await requireTeacher("/exams");
  const { title, groupId, questionIds, startsAt, endsAt } = parsed.data;
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (groupError || !group) {
    return {
      status: "error",
      message: "Choose one of your groups for this exam.",
      fieldErrors: {
        groupId: ["Choose one of your groups."],
      },
    };
  }

  const { data: questionRows, error: questionError } = await supabase
    .from("questions")
    .select("id,content,options,correct_answer")
    .eq("author_id", user.id)
    .in("id", questionIds)
    .returns<QuestionRow[]>();

  if (questionError || !questionRows || questionRows.length !== questionIds.length) {
    return {
      status: "error",
      message: "Choose questions from your question bank.",
      fieldErrors: {
        questionIds: ["One or more selected questions are unavailable."],
      },
    };
  }

  const questionsById = new Map(
    questionRows.map((question) => [question.id, question]),
  );
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .insert({
      group_id: groupId,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select("id")
    .single();

  if (examError || !exam) {
    console.error("Create exam failed", {
      code: examError?.code,
      message: examError?.message,
    });

    return {
      status: "error",
      message: "Exam could not be created. Please try again.",
    };
  }

  const examQuestions = questionIds.flatMap((questionId, index) => {
    const question = questionsById.get(questionId);

    if (!question) {
      return [];
    }

    return [
      {
        exam_id: exam.id,
        question_id: question.id,
        sort_order: index,
        snapshot_content: question.content,
        snapshot_options: question.options,
        snapshot_correct_answer: question.correct_answer,
      },
    ];
  });

  const { error: examQuestionsError } = await supabase
    .from("exam_questions")
    .insert(examQuestions);

  if (examQuestionsError) {
    console.error("Attach exam questions failed", {
      code: examQuestionsError.code,
      message: examQuestionsError.message,
    });

    await supabase.from("exams").delete().eq("id", exam.id);

    return {
      status: "error",
      message: "Exam questions could not be attached. Please try again.",
    };
  }

  revalidatePath("/exams");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Exam created.",
  };
}

export async function deleteExam(
  examId: string,
  _previousState: ExamActionState,
): Promise<ExamActionState> {
  void _previousState;

  const { supabase } = await requireTeacher("/exams");
  const { error } = await supabase.from("exams").delete().eq("id", examId);

  if (error) {
    console.error("Delete exam failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message: "Only scheduled exams can be deleted.",
    };
  }

  revalidatePath("/exams");

  return {
    status: "success",
    message: "Exam deleted.",
  };
}
