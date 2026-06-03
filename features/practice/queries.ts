import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { getDatabaseNowMs } from "@/lib/supabase/database-time";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import type { PracticeQuestion, QuestionSettings, QuestionType } from "./types";

type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type ExamQuestionRow = Database["public"]["Tables"]["exam_questions"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type SubmissionAnswerRow =
  Database["public"]["Tables"]["submission_answers"]["Row"] & {
    is_gradable?: boolean | null;
  };
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

type SubmissionWithExamRow = Pick<
  SubmissionRow,
  "id" | "exam_id" | "submitted_at"
> & {
  exams:
    | (Pick<ExamRow, "id" | "title" | "ends_at"> & {
        groups: Pick<GroupRow, "id" | "name"> | null;
      })
    | null;
};

type WrongAnswerRow = Pick<
  SubmissionAnswerRow,
  "id" | "submission_id" | "exam_question_id" | "answer" | "created_at"
>;

type PracticeExamQuestionRow = Pick<
  ExamQuestionRow,
  | "id"
  | "exam_id"
  | "snapshot_content"
  | "snapshot_options"
  | "snapshot_correct_answer"
> & {
  snapshot_question_type?: string | null;
  snapshot_description?: string | null;
  snapshot_settings?: Json | null;
};

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

function isClosed(endsAt: string, databaseNowMs: number) {
  return databaseNowMs >= new Date(endsAt).getTime();
}

function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

const questionTypes = new Set<QuestionType>([
  "short_answer",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "rating",
]);

function objectFromJson(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeQuestionType(value: unknown, options: string[]): QuestionType {
  return typeof value === "string" && questionTypes.has(value as QuestionType)
    ? (value as QuestionType)
    : options.length
      ? "multiple_choice"
      : "short_answer";
}

function normalizeSettings(value: Json | null | undefined): QuestionSettings {
  const settings = objectFromJson(value);
  const min = Number(settings.min);
  const max = Number(settings.max);

  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    minLabel:
      typeof settings.minLabel === "string"
        ? settings.minLabel
        : typeof settings.lowLabel === "string"
          ? settings.lowLabel
          : undefined,
    maxLabel:
      typeof settings.maxLabel === "string"
        ? settings.maxLabel
        : typeof settings.highLabel === "string"
          ? settings.highLabel
          : undefined,
    shuffleOptions: settings.shuffleOptions === true,
  };
}

export async function getPracticeQuestions(callbackUrl = "/student/practice") {
  const { supabase, user } = await requireStudent(callbackUrl);
  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select(
      "id,exam_id,submitted_at,exams!submissions_exam_id_fkey(id,title,ends_at,groups!exams_group_id_fkey(id,name))",
    )
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false })
    .returns<SubmissionWithExamRow[]>();

  if (submissionsError || !submissions) {
    return [];
  }

  const databaseNowMs = await getDatabaseNowMs(supabase);
  const closedSubmissions = submissions.filter((submission) => {
    return submission.exams
      ? isClosed(submission.exams.ends_at, databaseNowMs)
      : false;
  });
  const submissionIds = closedSubmissions.map((submission) => submission.id);

  if (!submissionIds.length) {
    return [];
  }

  const { data: answers, error: answersError } = await supabase
    .from("submission_answers")
    .select("id,submission_id,exam_question_id,answer,created_at")
    .in("submission_id", submissionIds)
    .eq("is_correct", false)
    .eq("is_gradable", true)
    .order("created_at", { ascending: false })
    .returns<WrongAnswerRow[]>();

  if (answersError || !answers?.length) {
    return [];
  }

  const examQuestionIds = [
    ...new Set(answers.map((answer) => answer.exam_question_id)),
  ];
  const { data: examQuestions } = await supabase
    .from("exam_questions")
    .select(
      "id,exam_id,snapshot_content,snapshot_options,snapshot_correct_answer,snapshot_question_type,snapshot_description,snapshot_settings",
    )
    .in("id", examQuestionIds)
    .returns<PracticeExamQuestionRow[]>();

  const submissionsById = new Map(
    closedSubmissions.map((submission) => [submission.id, submission]),
  );
  const questionsById = new Map(
    (examQuestions ?? []).map((question) => [question.id, question]),
  );

  return answers.flatMap<PracticeQuestion>((answer) => {
    const submission = submissionsById.get(answer.submission_id);
    const examQuestion = questionsById.get(answer.exam_question_id);

    if (!submission?.exams || !examQuestion) {
      return [];
    }

    const options = optionsFromJson(examQuestion.snapshot_options);

    return [
      {
        id: examQuestion.id,
        submissionAnswerId: answer.id,
        examId: submission.exams.id,
        examTitle: submission.exams.title,
        groupName: submission.exams.groups?.name ?? "Batch",
        content: examQuestion.snapshot_content,
        description: examQuestion.snapshot_description ?? null,
        options,
        questionType: normalizeQuestionType(
          examQuestion.snapshot_question_type,
          options,
        ),
        settings: normalizeSettings(examQuestion.snapshot_settings),
        submittedAnswer: answer.answer,
        correctAnswer: examQuestion.snapshot_correct_answer,
        submittedAt: submission.submitted_at,
      },
    ];
  });
}
