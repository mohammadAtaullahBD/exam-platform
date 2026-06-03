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
  ExamResultSummary,
  ExamState,
  MeritEntry,
  MeritList,
  ManualGradingAnswer,
  ManualGradingQueue,
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
type QuestionSetBuilderQuestionRow = {
  id: string;
  question_type: string;
  points: number | null;
  sort_order: number;
};
type QuestionSetBuilderRow = Pick<
  Database["public"]["Tables"]["question_sets"]["Row"],
  "id" | "title" | "description"
> & {
  question_set_questions: QuestionSetBuilderQuestionRow[] | null;
};
type PublicSetBuilderQuestionRow = Pick<
  Database["public"]["Tables"]["public_exam_set_questions"]["Row"],
  "id" | "sort_order"
> & {
  snapshot_question_type?: string | null;
  snapshot_points?: number | null;
};
type PublicSetBuilderRow = Pick<
  Database["public"]["Tables"]["public_exam_sets"]["Row"],
  "id" | "title" | "description"
> & {
  public_exam_set_questions: PublicSetBuilderQuestionRow[] | null;
};
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type SubmissionAnswerRow =
  Database["public"]["Tables"]["submission_answers"]["Row"];

type UserSummaryRow = {
  name: string | null;
  email: string | null;
};

type ExamWithRelationsRow = ExamRow & {
  groups: Pick<GroupRow, "id" | "name"> | null;
  exam_questions: Array<{
    id: string;
    snapshot_content: string;
    snapshot_options: Json;
    snapshot_correct_answer: string;
    snapshot_description: string | null;
    snapshot_points: number | null;
    snapshot_question_type: string | null;
    sort_order: number;
    source_question_set_id: string | null;
  }> | null;
};

type TeacherGroupMemberRow = {
  group_id: string;
  student_id: string;
  joined_at: string;
  roll_number: number | null;
  student_identity: string | null;
  users: UserSummaryRow | null;
};

type TeacherSubmissionSummaryRow = Pick<
  SubmissionRow,
  | "id"
  | "exam_id"
  | "student_id"
  | "score_points"
  | "total_points"
  | "submitted_at"
> & {
  users: UserSummaryRow | null;
};

type UngradedAnswerCountRow = Pick<SubmissionAnswerRow, "submission_id">;

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
  | "id"
  | "exam_id"
  | "score"
  | "total_questions"
  | "score_points"
  | "total_points"
  | "submitted_at"
>;

type MeritExamRow = Pick<
  ExamRow,
  "id" | "title" | "group_id" | "starts_at" | "ends_at"
> & {
  groups: Pick<GroupRow, "id" | "name" | "teacher_id"> | null;
};

type MeritSubmissionRow = Pick<
  SubmissionRow,
  | "id"
  | "student_id"
  | "score"
  | "total_questions"
  | "score_points"
  | "total_points"
  | "submitted_at"
> & {
  users: UserSummaryRow | null;
};

type ManualGradingQuestionRow = Pick<
  ExamQuestionRow,
  "id" | "snapshot_content" | "sort_order"
> &
  Partial<
    Pick<
      ExamQuestionRow,
      "snapshot_question_type" | "snapshot_grading_mode" | "snapshot_points"
    >
  >;

type ManualGradingSubmissionRow = Pick<
  SubmissionRow,
  "id" | "student_id" | "submitted_at"
> & {
  users: UserSummaryRow | null;
};

type ManualGradingAnswerRow = Pick<
  SubmissionAnswerRow,
  | "id"
  | "submission_id"
  | "exam_question_id"
  | "answer"
  | "response"
  | "score_points"
  | "max_points"
  | "grading_status"
>;

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

function displayAnswerFromResponse(response: Json | null | undefined, fallback = "") {
  if (typeof response === "string" || typeof response === "number") {
    return String(response);
  }

  const value = objectFromJson(response);

  if (typeof value.value === "string" || typeof value.value === "number") {
    return String(value.value);
  }

  if (Array.isArray(value.values)) {
    return value.values
      .filter((item): item is string | number => {
        return typeof item === "string" || typeof item === "number";
      })
      .map(String)
      .join(", ");
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

function studentDisplayName(member: TeacherGroupMemberRow) {
  return (
    member.student_identity ??
    member.users?.name ??
    member.users?.email ??
    "Unnamed student"
  );
}

function examFromRow(
  row: ExamWithRelationsRow,
  databaseNowMs: number,
  members: TeacherGroupMemberRow[],
  submissions: TeacherSubmissionSummaryRow[],
  ungradedSubmissionIds: Set<string>,
): Exam {
  const submissionsByStudentId = new Map(
    submissions.map((submission) => [submission.student_id, submission]),
  );
  const submittedCount = submissions.length;
  const studentCount = members.length;
  const maxPoints = (row.exam_questions ?? []).reduce(
    (total, question) => total + (question.snapshot_points ?? 0),
    0,
  );
  const sortedExamQuestions = [...(row.exam_questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const currentQuestionTypes = Array.from(
    new Set(
      sortedExamQuestions.map((question) => {
        const options = optionsFromJson(question.snapshot_options);

        return normalizeQuestionType(question.snapshot_question_type, options);
      }),
    ),
  );
  const averageScore = submittedCount
    ? submissions.reduce((total, submission) => total + submission.score_points, 0) /
      submittedCount
    : null;
  const results: ExamResultSummary[] = members.map((member) => {
    const submission = submissionsByStudentId.get(member.student_id);

    return {
      studentId: member.student_id,
      studentName: studentDisplayName(member),
      studentEmail: member.users?.email ?? null,
      rollNumber: member.roll_number,
      studentIdentity: member.student_identity,
      score: submission?.score_points ?? null,
      totalPoints: submission?.total_points ?? null,
      submittedAt: submission?.submitted_at ?? null,
      status: submission ? "submitted" : "absent",
    };
  });

  return {
    id: row.id,
    groupId: row.group_id,
    groupName: row.groups?.name ?? "Batch",
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    state: getExamState(row.starts_at, row.ends_at, databaseNowMs),
    questionCount: row.exam_questions?.length ?? 0,
    maxPoints,
    submittedCount,
    absentCount: Math.max(studentCount - submittedCount, 0),
    studentCount,
    averageScore,
    ungradedCount: submissions.filter((submission) =>
      ungradedSubmissionIds.has(submission.id),
    ).length,
    results,
    selectedQuestionIds: sortedExamQuestions.length
      ? [`current-exam:${row.id}`]
      : [],
    currentQuestions: sortedExamQuestions.length
      ? [
          {
            id: row.id,
            title: "Current exam questions",
            description: "Preserve this scheduled exam's existing snapshots.",
            questionCount: sortedExamQuestions.length,
            questionTypes: currentQuestionTypes,
            sourceLabel: "Current exam",
            source: "current",
            points: maxPoints,
          },
        ]
      : [],
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
      .select(
        "*, groups!exams_group_id_fkey(id,name), exam_questions(id,snapshot_content,snapshot_options,snapshot_correct_answer,snapshot_description,snapshot_points,snapshot_question_type,sort_order,source_question_set_id)",
      )
      .order("starts_at", { ascending: false })
      .returns<ExamWithRelationsRow[]>(),
    getDatabaseNowMs(supabase),
  ]);

  if (error || !data) {
    return [];
  }

  const groupIds = Array.from(new Set(data.map((exam) => exam.group_id)));
  const examIds = data.map((exam) => exam.id);
  const [{ data: memberRows }, { data: submissionRows }] = await Promise.all([
    groupIds.length
      ? supabase
          .from("group_members")
          .select("group_id,student_id,joined_at,roll_number,student_identity,users!group_members_student_id_fkey(name,email)")
          .in("group_id", groupIds)
          .order("roll_number", { ascending: true })
          .returns<TeacherGroupMemberRow[]>()
      : Promise.resolve({ data: [] }),
    examIds.length
      ? supabase
          .from("submissions")
          .select("id,exam_id,student_id,score_points,total_points,submitted_at,users!submissions_student_id_fkey(name,email)")
          .in("exam_id", examIds)
          .returns<TeacherSubmissionSummaryRow[]>()
      : Promise.resolve({ data: [] }),
  ]);
  const submissionIds = (submissionRows ?? []).map((submission) => submission.id);
  const { data: ungradedRows } = submissionIds.length
    ? await supabase
        .from("submission_answers")
        .select("submission_id")
        .in("submission_id", submissionIds)
        .eq("grading_status", "ungraded")
        .eq("is_gradable", true)
        .returns<UngradedAnswerCountRow[]>()
    : { data: [] };
  const membersByGroupId = new Map<string, TeacherGroupMemberRow[]>();
  const submissionsByExamId = new Map<string, TeacherSubmissionSummaryRow[]>();

  for (const member of memberRows ?? []) {
    const members = membersByGroupId.get(member.group_id) ?? [];
    members.push(member);
    membersByGroupId.set(member.group_id, members);
  }

  for (const submission of submissionRows ?? []) {
    const submissions = submissionsByExamId.get(submission.exam_id) ?? [];
    submissions.push(submission);
    submissionsByExamId.set(submission.exam_id, submissions);
  }

  const ungradedSubmissionIds = new Set(
    (ungradedRows ?? []).map((row) => row.submission_id),
  );

  return data.map((exam) =>
    examFromRow(
      exam,
      databaseNowMs,
      membersByGroupId.get(exam.group_id) ?? [],
      submissionsByExamId.get(exam.id) ?? [],
      ungradedSubmissionIds,
    ),
  );
}

export async function getTeacherExamStats(examId: string) {
  await requireTeacher(`/exams/${examId}`);
  const id = parseExamId(examId);
  const exams = await getTeacherExams(`/exams/${id}`);
  const exam = exams.find((item) => item.id === id);

  if (!exam) {
    notFound();
  }

  return exam;
}

export async function getExamBuilderData(callbackUrl = "/exams") {
  const { supabase, user } = await requireTeacher(callbackUrl);
  const [
    { data: groups },
    { data: questionSets },
    { data: publicSets },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id,name")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Array<Pick<GroupRow, "id" | "name">>>(),
    supabase
      .from("question_sets")
      .select("id,title,description,question_set_questions(id,question_type,points,sort_order)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .returns<QuestionSetBuilderRow[]>(),
    supabase
      .from("public_exam_sets")
      .select("id,title,description,public_exam_set_questions(id,snapshot_question_type,snapshot_points,sort_order)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .returns<PublicSetBuilderRow[]>(),
  ]);

  const groupOptions: ExamGroupOption[] = (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
  }));

  const ownQuestionOptions: ExamQuestionOption[] = (questionSets ?? []).map(
    (questionSet) => {
      const questions = [...(questionSet.question_set_questions ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order,
      );

      return {
        id: questionSet.id,
        title: questionSet.title,
        description: questionSet.description ?? null,
        questionCount: questions.length,
        questionTypes: Array.from(
          new Set(
            questions.map((question) =>
              normalizeQuestionType(question.question_type, []),
            ),
          ),
        ),
        sourceLabel: "My Questions",
        source: "own",
        points: questions.reduce(
          (total, question) => total + (question.points ?? 0),
          0,
        ),
      };
    },
  );
  const publicQuestionOptions: ExamQuestionOption[] = (publicSets ?? []).map(
    (questionSet) => {
      const questions = [...(questionSet.public_exam_set_questions ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order,
      );

      return {
        id: questionSet.id,
        title: questionSet.title,
        description: questionSet.description ?? null,
        questionCount: questions.length,
        questionTypes: Array.from(
          new Set(
            questions.map((question) =>
              normalizeQuestionType(question.snapshot_question_type, []),
            ),
          ),
        ),
        sourceLabel: "Public Questions",
        source: "public",
        points: questions.reduce(
          (total, question) => total + (question.snapshot_points ?? 0),
          0,
        ),
      };
    },
  );

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
      groupName: exam.groups?.name ?? "Batch",
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
    .select("id,exam_id,score,total_questions,score_points,total_points,submitted_at")
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
    groupName: data.groups?.name ?? "Batch",
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
          score: submission.score_points,
          totalQuestions: submission.total_points,
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
    .select("id,student_id,score,total_questions,score_points,total_points,submitted_at,users!submissions_student_id_fkey(name,email)")
    .eq("exam_id", exam.id)
    .order("score_points", { ascending: false })
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
    score: submission.score_points,
    totalQuestions: submission.total_points,
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
      groupName: exam.groups?.name ?? "Batch",
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

export async function getTeacherExamManualGrading(
  examId: string,
): Promise<ManualGradingQueue> {
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
  const exam = meritListFromExam(data, [], state).exam;

  if (state !== "closed") {
    return {
      exam,
      answers: [],
    };
  }

  const admin = createAdminClient();
  const { data: questions } = await admin
    .from("exam_questions")
    .select("id,snapshot_content,snapshot_question_type,snapshot_grading_mode,snapshot_points,sort_order")
    .eq("exam_id", id)
    .eq("snapshot_question_type", "paragraph")
    .eq("snapshot_grading_mode", "manual")
    .order("sort_order", { ascending: true })
    .returns<ManualGradingQuestionRow[]>();

  if (!questions?.length) {
    return {
      exam,
      answers: [],
    };
  }

  const { data: submissions } = await admin
    .from("submissions")
    .select("id,student_id,submitted_at,users!submissions_student_id_fkey(name,email)")
    .eq("exam_id", id)
    .order("submitted_at", { ascending: true })
    .returns<ManualGradingSubmissionRow[]>();

  if (!submissions?.length) {
    return {
      exam,
      answers: [],
    };
  }

  const questionIds = questions.map((question) => question.id);
  const submissionIds = submissions.map((submission) => submission.id);
  const { data: answers } = await admin
    .from("submission_answers")
    .select("id,submission_id,exam_question_id,answer,response,score_points,max_points,grading_status")
    .in("submission_id", submissionIds)
    .in("exam_question_id", questionIds)
    .returns<ManualGradingAnswerRow[]>();

  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const submissionsById = new Map(
    submissions.map((submission) => [submission.id, submission]),
  );
  const manualAnswers = (answers ?? [])
    .flatMap<ManualGradingAnswer>((answer) => {
      const question = questionsById.get(answer.exam_question_id);
      const submission = submissionsById.get(answer.submission_id);

      if (!question || !submission) {
        return [];
      }

      return [
        {
          id: answer.id,
          submissionId: answer.submission_id,
          studentName:
            submission.users?.name ??
            submission.users?.email ??
            "Unnamed student",
          submittedAt: submission.submitted_at,
          question: question.snapshot_content,
          answer: displayAnswerFromResponse(answer.response, answer.answer),
          scorePoints: answer.score_points,
          maxPoints: answer.max_points,
          gradingStatus:
            answer.grading_status === "graded" ? "graded" : "ungraded",
        },
      ];
    })
    .sort((left, right) => {
      const submittedAtOrder =
        new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();

      if (submittedAtOrder !== 0) {
        return submittedAtOrder;
      }

      return left.question.localeCompare(right.question);
    });

  return {
    exam,
    answers: manualAnswers,
  };
}
