import "server-only";

import { redirect } from "next/navigation";

import { questionFiltersSchema } from "@/lib/validations/question";
import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import type { Question, QuestionFilters } from "./types";

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

function questionFromRow(row: QuestionRow): Question {
  return {
    id: row.id,
    authorId: row.author_id,
    content: row.content,
    options: optionsFromJson(row.options),
    correctAnswer: row.correct_answer,
    source: row.source === "admin" ? "admin" : "teacher",
    originalId: row.original_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  return { supabase, user };
}

export function parseQuestionFilters(searchParams: {
  q?: string | string[];
  source?: string | string[];
}): QuestionFilters {
  const parsed = questionFiltersSchema.parse({
    q: Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q,
    source: Array.isArray(searchParams.source)
      ? searchParams.source[0]
      : searchParams.source,
  });

  return {
    query: parsed.q ?? "",
    source: parsed.source ?? "all",
  };
}

export async function getTeacherQuestions(
  filters: QuestionFilters,
  callbackUrl = "/questions",
) {
  const { supabase, user } = await requireTeacher(callbackUrl);
  let query = supabase
    .from("questions")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (filters.source !== "all") {
    query = query.eq("source", filters.source);
  }

  const { data, error } = await query.returns<QuestionRow[]>();

  if (error || !data) {
    return [];
  }

  const normalizedSearch = filters.query.toLowerCase();
  const questions = data.map(questionFromRow);

  if (!normalizedSearch) {
    return questions;
  }

  return questions.filter((question) => {
    const haystack = [
      question.content,
      question.correctAnswer,
      ...question.options,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}
