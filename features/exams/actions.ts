"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { examSchema } from "@/lib/validations/exam";
import { submitExamSchema } from "@/lib/validations/student-exam";
import type { Database, Json } from "@/types/database";

import type { ExamActionState, SubmitExamActionState } from "./types";

type QuestionRow = Pick<
  Database["public"]["Tables"]["questions"]["Row"],
  "id" | "content" | "options" | "correct_answer"
>;
type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type ExamQuestionRow = Database["public"]["Tables"]["exam_questions"]["Row"];

type SubmissionExamRow = Pick<
  ExamRow,
  "id" | "group_id" | "starts_at" | "ends_at"
> & {
  exam_questions:
    | Array<
        Pick<
          ExamQuestionRow,
          | "id"
          | "question_id"
          | "sort_order"
          | "snapshot_options"
          | "snapshot_correct_answer"
        >
      >
    | null;
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

function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

function isActiveExam(startsAt: string, endsAt: string) {
  const now = Date.now();

  return now >= new Date(startsAt).getTime() && now < new Date(endsAt).getTime();
}

function getSubmittedAnswers(formData: FormData) {
  const answers = new Map<string, string>();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer:") || typeof value !== "string") {
      continue;
    }

    const examQuestionId = key.slice("answer:".length);

    if (examQuestionId) {
      answers.set(examQuestionId, value);
    }
  }

  return answers;
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

export async function submitExamAnswers(
  _previousState: SubmitExamActionState,
  formData: FormData,
): Promise<SubmitExamActionState> {
  const parsed = submitExamSchema.safeParse({
    examId: formData.get("examId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "This exam submission is not valid.",
    };
  }

  const { examId } = parsed.data;
  const { supabase, user } = await requireStudent(`/student/exams/${examId}`);
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select(
      "id,group_id,starts_at,ends_at,exam_questions(id,question_id,sort_order,snapshot_options,snapshot_correct_answer)",
    )
    .eq("id", examId)
    .maybeSingle<SubmissionExamRow>();

  if (examError || !exam) {
    return {
      status: "error",
      message: "This exam is not available to your account.",
    };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", exam.group_id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!membership) {
    return {
      status: "error",
      message: "This exam is not available to your account.",
    };
  }

  if (!isActiveExam(exam.starts_at, exam.ends_at)) {
    return {
      status: "error",
      message: "This exam is no longer accepting submissions.",
    };
  }

  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("exam_id", examId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existingSubmission) {
    return {
      status: "error",
      message: "You have already submitted this exam.",
    };
  }

  const questions = [...(exam.exam_questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  if (!questions.length) {
    return {
      status: "error",
      message: "This exam has no questions to submit.",
    };
  }

  const submittedAnswers = getSubmittedAnswers(formData);
  const scoredAnswers = questions.map((question) => {
    const options = optionsFromJson(question.snapshot_options);
    const submittedAnswer = submittedAnswers.get(question.id);
    const answer = options.includes(submittedAnswer ?? "")
      ? (submittedAnswer ?? "")
      : "";

    return {
      examQuestionId: question.id,
      questionId: question.question_id,
      answer,
      isCorrect: answer === question.snapshot_correct_answer,
    };
  });
  const score = scoredAnswers.filter((answer) => answer.isCorrect).length;
  const admin = createAdminClient();
  const { data: submission, error: submissionError } = await admin
    .from("submissions")
    .insert({
      exam_id: examId,
      student_id: user.id,
      score,
      total_questions: questions.length,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    if (submissionError?.code === "23505") {
      return {
        status: "error",
        message: "You have already submitted this exam.",
      };
    }

    console.error("Submit exam failed", {
      code: submissionError?.code,
      message: submissionError?.message,
    });

    return {
      status: "error",
      message: "Your exam could not be submitted. Please try again.",
    };
  }

  const { error: answersError } = await admin.from("submission_answers").insert(
    scoredAnswers.map((answer) => ({
      submission_id: submission.id,
      exam_question_id: answer.examQuestionId,
      question_id: answer.questionId,
      answer: answer.answer,
      is_correct: answer.isCorrect,
    })),
  );

  if (answersError) {
    console.error("Store submission answers failed", {
      code: answersError.code,
      message: answersError.message,
    });

    await admin.from("submissions").delete().eq("id", submission.id);

    return {
      status: "error",
      message: "Your answers could not be saved. Please submit again.",
    };
  }

  revalidatePath("/student/exams");
  revalidatePath(`/student/exams/${examId}`);
  revalidatePath("/student/progress");
  revalidatePath("/student/practice");
  redirect(`/student/exams/${examId}`);
}
