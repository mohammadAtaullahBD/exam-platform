import "server-only";

import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import type {
  AdminPublicExamSet,
  PublicExamAttemptSummary,
  PublicExamQuestion,
  QuestionSettings,
  QuestionType,
  StudentPublicExamSet,
} from "./types";

type PublicExamSetRow = Database["public"]["Tables"]["public_exam_sets"]["Row"];
type PublicExamSetQuestionRow =
  Database["public"]["Tables"]["public_exam_set_questions"]["Row"] & {
    snapshot_question_type?: string | null;
    snapshot_description?: string | null;
    snapshot_settings?: Json | null;
    snapshot_is_required?: boolean | null;
  };
type PublicExamAttemptRow =
  Database["public"]["Tables"]["public_exam_attempts"]["Row"];

type AdminPublicExamSetRow = PublicExamSetRow & {
  public_exam_set_questions: Array<{ id: string }> | null;
};

type StudentPublicExamSetRow = PublicExamSetRow & {
  public_exam_set_questions: PublicExamSetQuestionRow[] | null;
};

function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

const questionTypes = new Set<QuestionType>([
  "short_answer",
  "paragraph",
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

async function requireRole(role: UserRole, callbackUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (user.app_metadata?.role !== role) {
    redirect("/dashboard");
  }

  return { supabase, user };
}

function adminSetFromRow(row: AdminPublicExamSetRow): AdminPublicExamSet {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questionCount: row.public_exam_set_questions?.length ?? 0,
  };
}

function studentQuestionFromRow(
  row: PublicExamSetQuestionRow,
): PublicExamQuestion {
  const options = optionsFromJson(row.snapshot_options);

  return {
    id: row.id,
    content: row.snapshot_content,
    description: row.snapshot_description ?? null,
    options,
    questionType: normalizeQuestionType(row.snapshot_question_type, options),
    settings: normalizeSettings(row.snapshot_settings),
    isRequired: row.snapshot_is_required ?? true,
  };
}

function attemptFromRow(row: PublicExamAttemptRow): PublicExamAttemptSummary {
  return {
    id: row.id,
    score: row.score,
    totalQuestions: row.total_questions,
    submittedAt: row.submitted_at,
  };
}

export async function getAdminPublicExamSets(callbackUrl = "/public-sets") {
  const { supabase } = await requireRole("admin", callbackUrl);
  const { data, error } = await supabase
    .from("public_exam_sets")
    .select("*, public_exam_set_questions(id)")
    .order("created_at", { ascending: false })
    .returns<AdminPublicExamSetRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map(adminSetFromRow);
}

export async function getStudentPublicExamSets(
  callbackUrl = "/student/public-exams",
) {
  const { supabase, user } = await requireRole("student", callbackUrl);
  const [{ data: setRows }, { data: attemptRows }] = await Promise.all([
    supabase
      .from("public_exam_sets")
      .select("*, public_exam_set_questions(*)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .returns<StudentPublicExamSetRow[]>(),
    supabase
      .from("public_exam_attempts")
      .select("*")
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false })
      .returns<PublicExamAttemptRow[]>(),
  ]);

  const attemptsBySet = new Map<string, PublicExamAttemptSummary[]>();

  for (const attempt of attemptRows ?? []) {
    const attempts = attemptsBySet.get(attempt.set_id) ?? [];
    attempts.push(attemptFromRow(attempt));
    attemptsBySet.set(attempt.set_id, attempts);
  }

  return (setRows ?? []).map<StudentPublicExamSet>((set) => {
    const questions = [...(set.public_exam_set_questions ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(studentQuestionFromRow);

    return {
      id: set.id,
      title: set.title,
      description: set.description,
      questionCount: questions.length,
      questions,
      attempts: attemptsBySet.get(set.id) ?? [],
    };
  });
}
