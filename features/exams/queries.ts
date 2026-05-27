import "server-only";

import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import type {
  Exam,
  ExamGroupOption,
  ExamQuestionOption,
  ExamState,
} from "./types";

type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

type ExamWithRelationsRow = ExamRow & {
  groups: Pick<GroupRow, "id" | "name"> | null;
  exam_questions: Array<{ id: string }> | null;
};

function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

function getExamState(startsAt: string, endsAt: string): ExamState {
  const now = Date.now();
  const startTime = new Date(startsAt).getTime();
  const endTime = new Date(endsAt).getTime();

  if (now < startTime) {
    return "scheduled";
  }

  if (now < endTime) {
    return "active";
  }

  return "closed";
}

function examFromRow(row: ExamWithRelationsRow): Exam {
  return {
    id: row.id,
    groupId: row.group_id,
    groupName: row.groups?.name ?? "Group",
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    state: getExamState(row.starts_at, row.ends_at),
    questionCount: row.exam_questions?.length ?? 0,
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

export async function getTeacherExams(callbackUrl = "/exams") {
  const { supabase } = await requireTeacher(callbackUrl);
  const { data, error } = await supabase
    .from("exams")
    .select("*, groups!exams_group_id_fkey(id,name), exam_questions(id)")
    .order("starts_at", { ascending: false })
    .returns<ExamWithRelationsRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map(examFromRow);
}

export async function getExamBuilderData(callbackUrl = "/exams") {
  const { supabase, user } = await requireTeacher(callbackUrl);
  const [{ data: groups }, { data: questions }] = await Promise.all([
    supabase
      .from("groups")
      .select("id,name")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Array<Pick<GroupRow, "id" | "name">>>(),
    supabase
      .from("questions")
      .select("id,content,options,correct_answer")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .returns<
        Array<Pick<QuestionRow, "id" | "content" | "options" | "correct_answer">>
      >(),
  ]);

  const groupOptions: ExamGroupOption[] = (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
  }));

  const questionOptions: ExamQuestionOption[] = (questions ?? []).map(
    (question) => ({
      id: question.id,
      content: question.content,
      options: optionsFromJson(question.options),
      correctAnswer: question.correct_answer,
    }),
  );

  return {
    groups: groupOptions,
    questions: questionOptions,
  };
}
