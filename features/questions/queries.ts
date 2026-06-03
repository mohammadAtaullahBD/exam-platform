import "server-only";

import { redirect } from "next/navigation";

import { questionFiltersSchema } from "@/lib/validations/question";
import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import type {
  GradingMode,
  PublicQuestionSetImportOption,
  QuestionSourceFilter,
  QuestionSet,
  QuestionSetFilters,
  QuestionSetListResult,
  QuestionSetQuestion,
  QuestionType,
} from "./types";

type UntypedSupabase = {
  from(table: string): UntypedQuery;
};

type DbError = {
  code?: string;
  message?: string;
};

type DbResponse<T = unknown> = {
  data: T | null;
  error: DbError | null;
};

type UntypedQuery<T = unknown> = PromiseLike<DbResponse<T>> & {
  select(columns?: string): UntypedQuery<T>;
  eq(column: string, value: unknown): UntypedQuery<T>;
  order(column: string, options?: { ascending?: boolean }): UntypedQuery<T>;
};

type QuestionSetQuestionRow = {
  id: string;
  set_id: string;
  content: string;
  description: string | null;
  question_type: string;
  options: Json;
  settings: Json;
  answer_key: Json;
  is_required: boolean;
  points: number;
  grading_mode: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type QuestionSetRow = {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  question_set_questions: QuestionSetQuestionRow[] | null;
};

type PublicExamSetImportRow = {
  id: string;
  title: string;
  description: string | null;
  public_exam_set_questions: Array<{ id: string }> | null;
};

function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

function questionTypeFromValue(value: string): QuestionType {
  if (
    value === "short_answer" ||
    value === "paragraph" ||
    value === "multiple_choice" ||
    value === "checkboxes" ||
    value === "dropdown" ||
    value === "linear_scale" ||
    value === "rating"
  ) {
    return value;
  }

  return "short_answer";
}

function gradingModeFromValue(value: string): GradingMode {
  if (value === "auto" || value === "manual" || value === "none") {
    return value;
  }

  return "auto";
}

function questionFromRow(row: QuestionSetQuestionRow): QuestionSetQuestion {
  return {
    id: row.id,
    setId: row.set_id,
    content: row.content,
    description: row.description,
    questionType: questionTypeFromValue(row.question_type),
    options: optionsFromJson(row.options),
    settings: row.settings,
    answerKey: row.answer_key,
    isRequired: row.is_required,
    points: row.points,
    gradingMode: gradingModeFromValue(row.grading_mode),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function setFromRow(row: QuestionSetRow): QuestionSet {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questions: [...(row.question_set_questions ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(questionFromRow),
  };
}

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

  return { db: supabase as unknown as UntypedSupabase, supabase, user };
}

export async function requireTeacherQuestionAccess(callbackUrl = "/questions") {
  await requireTeacher(callbackUrl);
}

export function parseQuestionFilters(searchParams: {
  q?: string | string[];
  source?: string | string[];
}): QuestionSetFilters {
  const parsed = questionFiltersSchema.parse({
    q: Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q,
    source: Array.isArray(searchParams.source)
      ? searchParams.source[0]
      : searchParams.source,
  });

  return {
    query: parsed.q ?? "",
    source: (parsed.source ?? "own") as QuestionSourceFilter,
  };
}

export async function getTeacherQuestionSets(
  filters: QuestionSetFilters,
  callbackUrl = "/questions",
): Promise<QuestionSetListResult> {
  const { db, user } = await requireTeacher(callbackUrl);
  const { data, error } = (await db
    .from("question_sets")
    .select("*, question_set_questions(*)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })) as DbResponse<QuestionSetRow[]>;

  if (error) {
    console.error("Fetch question sets failed", {
      code: error.code,
      message: error.message,
    });

    return {
      sets: [],
      schemaReady: false,
      message:
        error.code === "42P01"
          ? "Question set tables are not available yet. The builder UI is ready, but saving requires the question-set schema."
          : "Question sets could not be loaded.",
    };
  }

  const normalizedSearch = filters.query.toLowerCase();
  const sets = (data ?? []).map(setFromRow);

  if (!normalizedSearch) {
    return {
      sets,
      schemaReady: true,
      message: null,
    };
  }

  return {
    sets: sets.filter((set) => {
      const haystack = [
        set.title,
        set.description ?? "",
        ...set.questions.flatMap((question) => [
          question.content,
          question.description ?? "",
          ...question.options,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    }),
    schemaReady: true,
    message: null,
  };
}

export async function getPublicQuestionSetImportOptions(
  callbackUrl = "/questions",
) {
  const { supabase } = await requireTeacher(callbackUrl);
  const { data, error } = await supabase
    .from("public_exam_sets")
    .select("id,title,description,public_exam_set_questions(id)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .returns<PublicExamSetImportRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map<PublicQuestionSetImportOption>((set) => ({
    id: set.id,
    title: set.title,
    description: set.description,
    questionCount: set.public_exam_set_questions?.length ?? 0,
  }));
}
