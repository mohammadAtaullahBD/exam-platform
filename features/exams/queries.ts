import "server-only";

import { notFound, redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
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
  StudentExamDetail,
  StudentExamQuestion,
  StudentExamSummary,
} from "./types";

type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type ExamQuestionRow = Database["public"]["Tables"]["exam_questions"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
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
  >,
): StudentExamQuestion {
  return {
    id: row.id,
    content: row.snapshot_content,
    options: optionsFromJson(row.snapshot_options),
    sortOrder: row.sort_order,
  };
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

export async function getStudentExams(callbackUrl = "/student/exams") {
  const { supabase, user } = await requireStudent(callbackUrl);
  const { data, error } = await supabase
    .from("exams")
    .select(
      "id,title,group_id,starts_at,ends_at,groups!exams_group_id_fkey(id,name,users!groups_teacher_id_fkey(name,email)),exam_questions(id)",
    )
    .order("starts_at", { ascending: true })
    .returns<StudentExamRow[]>();

  if (error || !data) {
    return [];
  }

  const visibleExams = data.filter(
    (exam) => getExamState(exam.starts_at, exam.ends_at) !== "closed",
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
    const state = getExamState(exam.starts_at, exam.ends_at);

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
      "id,title,group_id,starts_at,ends_at,groups!exams_group_id_fkey(id,name,users!groups_teacher_id_fkey(name,email)),exam_questions(id,sort_order,snapshot_content,snapshot_options)",
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

  const state = getExamState(data.starts_at, data.ends_at);
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

function meritListFromExam(exam: MeritExamRow, entries: MeritEntry[]): MeritList {
  return {
    exam: {
      id: exam.id,
      title: exam.title,
      groupName: exam.groups?.name ?? "Group",
      startsAt: exam.starts_at,
      endsAt: exam.ends_at,
      state: getExamState(exam.starts_at, exam.ends_at),
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

  const state = getExamState(data.starts_at, data.ends_at);
  const entries = await getMeritEntries(data, state);

  return meritListFromExam(data, entries);
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

  const state = getExamState(data.starts_at, data.ends_at);
  const entries = await getMeritEntries(data, state);

  return meritListFromExam(data, entries);
}
