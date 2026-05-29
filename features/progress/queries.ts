import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import type { ProgressDashboardData, ProgressExamResult } from "./types";

type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

type SubmissionWithExamRow = Pick<
  SubmissionRow,
  | "id"
  | "exam_id"
  | "student_id"
  | "score"
  | "total_questions"
  | "submitted_at"
> & {
  exams:
    | (Pick<ExamRow, "id" | "title" | "starts_at" | "ends_at"> & {
        groups: Pick<GroupRow, "id" | "name"> | null;
      })
    | null;
};

type RankSubmissionRow = Pick<
  SubmissionRow,
  "id" | "exam_id" | "student_id" | "score" | "submitted_at"
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

function isClosed(endsAt: string) {
  return Date.now() >= new Date(endsAt).getTime();
}

function percent(score: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((score / total) * 100);
}

function buildRankMap(submissions: RankSubmissionRow[], studentId: string) {
  const rowsByExamId = new Map<string, RankSubmissionRow[]>();

  for (const submission of submissions) {
    const rows = rowsByExamId.get(submission.exam_id) ?? [];
    rows.push(submission);
    rowsByExamId.set(submission.exam_id, rows);
  }

  const ranks = new Map<string, { rank: number | null; participantCount: number }>();

  for (const [examId, rows] of rowsByExamId) {
    rows.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return (
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      );
    });

    const rankIndex = rows.findIndex((row) => row.student_id === studentId);
    ranks.set(examId, {
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      participantCount: rows.length,
    });
  }

  return ranks;
}

export async function getStudentProgress(
  callbackUrl = "/student/progress",
): Promise<ProgressDashboardData> {
  const { supabase, user } = await requireStudent(callbackUrl);
  const { data, error } = await supabase
    .from("submissions")
    .select(
      "id,exam_id,student_id,score,total_questions,submitted_at,exams!submissions_exam_id_fkey(id,title,starts_at,ends_at,groups!exams_group_id_fkey(id,name))",
    )
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false })
    .returns<SubmissionWithExamRow[]>();

  if (error || !data) {
    return {
      stats: {
        completedExams: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        averagePercent: 0,
        bestPercent: 0,
      },
      results: [],
    };
  }

  const closedRows = data.filter((submission) => {
    return submission.exams ? isClosed(submission.exams.ends_at) : false;
  });
  const examIds = [...new Set(closedRows.map((submission) => submission.exam_id))];
  let rankRows: RankSubmissionRow[] = [];

  if (examIds.length) {
    const { data: submissionsForRanks } = await supabase
      .from("submissions")
      .select("id,exam_id,student_id,score,submitted_at")
      .in("exam_id", examIds)
      .returns<RankSubmissionRow[]>();

    rankRows = submissionsForRanks ?? [];
  }

  const rankMap = buildRankMap(rankRows, user.id);
  const results = closedRows.flatMap<ProgressExamResult>((submission) => {
    const exam = submission.exams;

    if (!exam) {
      return [];
    }

    const ranking = rankMap.get(submission.exam_id) ?? {
      rank: null,
      participantCount: 0,
    };

    return [
      {
        examId: exam.id,
        title: exam.title,
        groupName: exam.groups?.name ?? "Group",
        startsAt: exam.starts_at,
        endsAt: exam.ends_at,
        submittedAt: submission.submitted_at,
        score: submission.score,
        totalQuestions: submission.total_questions,
        rank: ranking.rank,
        participantCount: ranking.participantCount,
      },
    ];
  });
  const totalCorrect = results.reduce((sum, result) => sum + result.score, 0);
  const totalQuestions = results.reduce(
    (sum, result) => sum + result.totalQuestions,
    0,
  );
  const bestPercent = results.reduce(
    (best, result) => Math.max(best, percent(result.score, result.totalQuestions)),
    0,
  );

  return {
    stats: {
      completedExams: results.length,
      totalCorrect,
      totalQuestions,
      averagePercent: percent(totalCorrect, totalQuestions),
      bestPercent,
    },
    results,
  };
}

