import "server-only";

import { notFound, redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDatabaseNowMs } from "@/lib/supabase/database-time";
import { createClient } from "@/lib/supabase/server";
import { examIdSchema } from "@/lib/validations/student-exam";
import type { Database, Json } from "@/types/database";

import type {
  Exam,
  ExamGroupOption,
  ExamQuestionOption,
  ExamState,
  MeritEntry,
  MeritList,
  QuestionSettings,
  QuestionType,
  StudentExamDetail,
  StudentExamQuestion,
  StudentExamSummary,
} from "./types";

type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type ExamQuestionRow = Database["public"]["Tables"]["exam_questions"]["Row"] & {
  snapshot_question_type?: string | null;
  snapshot_description?: string | null;
  snapshot_settings?: Json | null;
  snapshot_is_required?: boolean | null;
};
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type QuestionSetQuestionRow = {
  id: string;
  content: string;
  description: string | null;
  question_type: string;
  options: Json;
  answer_key: Json;
  sort_order: number;
  question_sets: { title: string; teacher_id: string } | null;
};
type PublicSetQuestionRow =
  Database["public"]["Tables"]["public_exam_set_questions"]["Row"] & {
    snapshot_question_type?: string | null;
    snapshot_description?: string | null;
    snapshot_settings?: Json | null;
    public_exam_sets: { title: string; is_published: boolean } | null;
  };
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

type UserSummaryRow = {
  name: string | null;
  email: string | null;
};

type ExamWithRelationsRow = ExamRow & {
  groups: Pick<GroupRow, "id" | "name"> | null;
  exam_questions: Array<{ id: string }> | null;
};

type StudentExamGroupRow = Pick<GroupRow, "id" | "name"> & {
  users: UserSummaryRow | null;
};

type StudentExamRow = Pick<
  ExamRow,
  "id" | "title" | "group_id" | "starts_at" | "ends_at"
> & {
  groups: StudentExamGroupRow | null;
  exam_questions: Array<{ id: string }> | null;
};

type StudentExamDetailRow = Pick<
  ExamRow,
  "id" | "title" | "group_id" | "starts_at" | "ends_at"
> & {
  groups: StudentExamGroupRow | null;
  exam_questions:
    | Array<
        Pick<
          ExamQuestionRow,
          "id" | "sort_order" | "snapshot_content" | "snapshot_options"
        >
        & Partial<
          Pick<
            ExamQuestionRow,
            | "snapshot_question_type"
            | "snapshot_description"
            | "snapshot_settings"
            | "snapshot_is_required"
          >
        >
      >
    | null;
};

type StudentSubmissionRow = Pick<
  SubmissionRow,
  "id" | "exam_id" | "score" | "total_questions" | "submitted_at"
>;

type MeritExamRow = Pick<
  ExamRow,
  "id" | "title" | "group_id" | "starts_at" | "ends_at"
> & {
  groups: Pick<GroupRow, "id" | "name" | "teacher_id"> | null;
};

type MeritSubmissionRow = Pick<
  SubmissionRow,
  "id" | "student_id" | "score" | "total_questions" | "submitted_at"
> & {
  users: UserSummaryRow | null;
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
  };
}

function displayAnswerFromKey(answerKey: Json | null | undefined, fallback = "") {
  const key = objectFromJson(answerKey);
  const values = key.values ?? key.answers;

  if (Array.isArray(values)) {
    return values.filter((value): value is string => typeof value === "string").join(", ");
  }

  for (const field of ["value", "answer", "correctAnswer"]) {
    const value = key[field];

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
}

function getExamState(
  startsAt: string,
  endsAt: string,
  databaseNowMs: number,
): ExamState {
  const startTime = new Date(startsAt).getTime();
  const endTime = new Date(endsAt).getTime();

  if (databaseNowMs < startTime) {
    return "scheduled";
  }

  if (databaseNowMs < endTime) {
    return "active";
  }

  return "closed";
}

function examFromRow(row: ExamWithRelationsRow, databaseNowMs: number): Exam {
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
    state: getExamState(row.starts_at, row.ends_at, databaseNowMs),
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

function parseExamId(examId: string) {
  const parsed = examIdSchema.safeParse(examId);

  if (!parsed.success) {
    notFound();
  }

  return parsed.data;
}

function teacherNameFromGroup(group: StudentExamGroupRow | null) {
  return group?.users?.name ?? group?.users?.email ?? "Teacher";
}

function questionFromRow(
  row: Pick<
    ExamQuestionRow,
    "id" | "sort_order" | "snapshot_content" | "snapshot_options"
  > &
    Partial<
      Pick<
        ExamQuestionRow,
        | "snapshot_question_type"
        | "snapshot_description"
        | "snapshot_settings"
        | "snapshot_is_required"
      >
    >,
): StudentExamQuestion {
  const options = optionsFromJson(row.snapshot_options);

  return {
    id: row.id,
    content: row.snapshot_content,
    description: row.snapshot_description ?? null,
    options,
    questionType: normalizeQuestionType(row.snapshot_question_type, options),
    settings: normalizeSettings(row.snapshot_settings),
    isRequired: row.snapshot_is_required ?? true,
    sortOrder: row.sort_order,
  };
}

export async function getTeacherExams(callbackUrl = "/exams") {
  const { supabase } = await requireTeacher(callbackUrl);
  const [{ data, error }, databaseNowMs] = await Promise.all([
    supabase
      .from("exams")
      .select("*, groups!exams_group_id_fkey(id,name), exam_questions(id)")
      .order("starts_at", { ascending: false })
      .returns<ExamWithRelationsRow[]>(),
    getDatabaseNowMs(supabase),
  ]);

  if (error || !data) {
    return [];
  }

  return data.map((exam) => examFromRow(exam, databaseNowMs));
}

export async function getExamBuilderData(callbackUrl = "/exams") {
  const { supabase, user } = await requireTeacher(callbackUrl);
  const db = supabase as unknown as {
    from(table: string): {
      select(columns?: string): {
        eq(column: string, value: unknown): {
          order(
            column: string,
            options?: { ascending?: boolean },
          ): PromiseLike<{ data: QuestionSetQuestionRow[] | null }>;
        };
      };
    };
  };
  const [
    { data: groups },
    { data: questions },
    { data: publicSetQuestions },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id,name")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Array<Pick<GroupRow, "id" | "name">>>(),
    db
      .from("question_set_questions")
      .select("*, question_sets!question_set_questions_set_id_fkey(title,teacher_id)")
      .eq("question_sets.teacher_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_exam_set_questions")
      .select("*, public_exam_sets!public_exam_set_questions_set_id_fkey(title,is_published)")
      .eq("public_exam_sets.is_published", true)
      .order("sort_order", { ascending: true })
      .returns<PublicSetQuestionRow[]>(),
  ]);

  const groupOptions: ExamGroupOption[] = (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
  }));

  const ownQuestionOptions: ExamQuestionOption[] = (questions ?? []).map(
    (question) => ({
      id: question.id,
      content: question.content,
      description: question.description ?? null,
      options: optionsFromJson(question.options),
      questionType: normalizeQuestionType(
        question.question_type,
        optionsFromJson(question.options),
      ),
      correctAnswer: displayAnswerFromKey(question.answer_key),
      sourceLabel: question.question_sets?.title ?? "Question set",
    }),
  );
  const publicQuestionOptions: ExamQuestionOption[] = (publicSetQuestions ?? [])
    .filter((question) => question.public_exam_sets?.is_published)
    .map((question) => {
      const options = optionsFromJson(question.snapshot_options);

      return {
        id: question.id,
        content: question.snapshot_content,
        description: question.snapshot_description ?? null,
        options,
        questionType: normalizeQuestionType(
          question.snapshot_question_type,
          options,
        ),
        correctAnswer: question.snapshot_correct_answer,
        sourceLabel: question.public_exam_sets?.title ?? "Public set",
      };
    });

  return {
    groups: groupOptions,
    questions: [...ownQuestionOptions, ...publicQuestionOptions],
  };
}

export async function getStudentExams(callbackUrl = "/student/exams") {
  const { supabase, user } = await requireStudent(callbackUrl);
  const [{ data, error }, databaseNowMs] = await Promise.all([
    supabase
      .from("exams")
      .select(
        "id,title,group_id,starts_at,ends_at,groups!exams_group_id_fkey(id,name,users!groups_teacher_id_fkey(name,email)),exam_questions(id)",
      )
      .order("starts_at", { ascending: true })
      .returns<StudentExamRow[]>(),
    getDatabaseNowMs(supabase),
  ]);

  if (error || !data) {
    return [];
  }

  const visibleExams = data.filter(
    (exam) =>
      getExamState(exam.starts_at, exam.ends_at, databaseNowMs) !== "closed",
  );
  const examIds = visibleExams.map((exam) => exam.id);
  const submittedAtByExamId = new Map<string, string>();

  if (examIds.length) {
    const { data: submissions } = await supabase
      .from("submissions")
      .select("exam_id,submitted_at")
      .eq("student_id", user.id)
      .in("exam_id", examIds)
      .returns<Array<Pick<SubmissionRow, "exam_id" | "submitted_at">>>();

    for (const submission of submissions ?? []) {
      submittedAtByExamId.set(submission.exam_id, submission.submitted_at);
    }
  }

  return visibleExams.map<StudentExamSummary>((exam) => {
    const state = getExamState(exam.starts_at, exam.ends_at, databaseNowMs);

    return {
      id: exam.id,
      title: exam.title,
      groupName: exam.groups?.name ?? "Group",
      teacherName: teacherNameFromGroup(exam.groups),
      startsAt: exam.starts_at,
      endsAt: exam.ends_at,
      state: state === "closed" ? "scheduled" : state,
      questionCount: exam.exam_questions?.length ?? 0,
      submittedAt: submittedAtByExamId.get(exam.id) ?? null,
    };
  });
}

export async function getStudentExamDetail(examId: string) {
  const id = parseExamId(examId);
  const { supabase, user } = await requireStudent(`/student/exams/${id}`);
  const { data, error } = await supabase
    .from("exams")
    .select(
      "id,title,group_id,starts_at,ends_at,groups!exams_group_id_fkey(id,name,users!groups_teacher_id_fkey(name,email)),exam_questions(*)",
    )
    .eq("id", id)
    .maybeSingle<StudentExamDetailRow>();

  if (error || !data) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", data.group_id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select("id,exam_id,score,total_questions,submitted_at")
    .eq("exam_id", id)
    .eq("student_id", user.id)
    .maybeSingle<StudentSubmissionRow>();

  const databaseNowMs = await getDatabaseNowMs(supabase);
  const state = getExamState(data.starts_at, data.ends_at, databaseNowMs);
  const sortedQuestions = [...(data.exam_questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return {
    id: data.id,
    title: data.title,
    groupName: data.groups?.name ?? "Group",
    teacherName: teacherNameFromGroup(data.groups),
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    state,
    questionCount: sortedQuestions.length,
    questions:
      state === "active" && !submission
        ? sortedQuestions.map(questionFromRow)
        : [],
    submission: submission
      ? {
          id: submission.id,
          score: submission.score,
          totalQuestions: submission.total_questions,
          submittedAt: submission.submitted_at,
        }
      : null,
  } satisfies StudentExamDetail;
}

async function getMeritEntries(exam: MeritExamRow, state: ExamState) {
  if (state !== "closed") {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("submissions")
    .select("id,student_id,score,total_questions,submitted_at,users!submissions_student_id_fkey(name,email)")
    .eq("exam_id", exam.id)
    .order("score", { ascending: false })
    .order("submitted_at", { ascending: true })
    .returns<MeritSubmissionRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map<MeritEntry>((submission, index) => ({
    rank: index + 1,
    submissionId: submission.id,
    studentId: submission.student_id,
    studentName:
      submission.users?.name ?? submission.users?.email ?? "Unnamed student",
    score: submission.score,
    totalQuestions: submission.total_questions,
    submittedAt: submission.submitted_at,
  }));
}

function meritListFromExam(
  exam: MeritExamRow,
  entries: MeritEntry[],
  state: ExamState,
): MeritList {
  return {
    exam: {
      id: exam.id,
      title: exam.title,
      groupName: exam.groups?.name ?? "Group",
      startsAt: exam.starts_at,
      endsAt: exam.ends_at,
      state,
    },
    entries,
  };
}

export async function getStudentExamMeritList(examId: string) {
  const id = parseExamId(examId);
  const { supabase, user } = await requireStudent(
    `/student/exams/${id}/merit`,
  );
  const { data, error } = await supabase
    .from("exams")
    .select("id,title,group_id,starts_at,ends_at,groups!exams_group_id_fkey(id,name,teacher_id)")
    .eq("id", id)
    .maybeSingle<MeritExamRow>();

  if (error || !data) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", data.group_id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const databaseNowMs = await getDatabaseNowMs(supabase);
  const state = getExamState(data.starts_at, data.ends_at, databaseNowMs);
  const entries = await getMeritEntries(data, state);

  return meritListFromExam(data, entries, state);
}

export async function getTeacherExamMeritList(examId: string) {
  const id = parseExamId(examId);
  const { supabase, user } = await requireTeacher(`/exams/${id}/merit`);
  const { data, error } = await supabase
    .from("exams")
    .select("id,title,group_id,starts_at,ends_at,groups!exams_group_id_fkey(id,name,teacher_id)")
    .eq("id", id)
    .maybeSingle<MeritExamRow>();

  if (error || !data || data.groups?.teacher_id !== user.id) {
    notFound();
  }

  const databaseNowMs = await getDatabaseNowMs(supabase);
  const state = getExamState(data.starts_at, data.ends_at, databaseNowMs);
  const entries = await getMeritEntries(data, state);

  return meritListFromExam(data, entries, state);
}
