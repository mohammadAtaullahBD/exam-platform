import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { getDatabaseNowMs } from "@/lib/supabase/database-time";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import type { PracticeQuestion } from "./types";

type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type ExamQuestionRow = Database["public"]["Tables"]["exam_questions"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type SubmissionAnswerRow =
  Database["public"]["Tables"]["submission_answers"]["Row"];
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
>;

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
      "id,exam_id,snapshot_content,snapshot_options,snapshot_correct_answer",
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

    return [
      {
        id: examQuestion.id,
        submissionAnswerId: answer.id,
        examId: submission.exams.id,
        examTitle: submission.exams.title,
        groupName: submission.exams.groups?.name ?? "Group",
        content: examQuestion.snapshot_content,
        options: optionsFromJson(examQuestion.snapshot_options),
        submittedAnswer: answer.answer,
        correctAnswer: examQuestion.snapshot_correct_answer,
        submittedAt: submission.submitted_at,
      },
    ];
  });
}
