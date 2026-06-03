"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDatabaseNowMs } from "@/lib/supabase/database-time";
import { createClient } from "@/lib/supabase/server";
import { examSchema, updateExamSchema } from "@/lib/validations/exam";
import { submitExamSchema } from "@/lib/validations/student-exam";
import type { Database, Json } from "@/types/database";

import type {
  ExamActionState,
  ManualGradeActionState,
  QuestionType,
  SubmitExamActionState,
} from "./types";

type QuestionSetQuestionRow = {
  id: string;
  set_id: string;
  original_question_id: string | null;
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
  question_sets: { teacher_id: string } | null;
};
type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type ExamQuestionRow = Database["public"]["Tables"]["exam_questions"]["Row"] & {
  snapshot_question_type?: string | null;
  snapshot_description?: string | null;
  snapshot_settings?: Json | null;
  snapshot_answer_key?: Json | null;
  snapshot_grading_mode?: string | null;
  snapshot_points?: number | null;
  snapshot_is_required?: boolean | null;
};
type PublicSetQuestionRow =
  Database["public"]["Tables"]["public_exam_set_questions"]["Row"] & {
    snapshot_question_type?: string | null;
    snapshot_description?: string | null;
    snapshot_settings?: Json | null;
    snapshot_answer_key?: Json | null;
    snapshot_grading_mode?: string | null;
    snapshot_points?: number | null;
    snapshot_is_required?: boolean | null;
  };

type SubmissionExamRow = Pick<
  ExamRow,
  "id" | "group_id" | "starts_at" | "ends_at"
> & {
  exam_questions:
    | Array<
        Pick<
          ExamQuestionRow,
          | "id"
          | "question_id"
          | "sort_order"
          | "snapshot_options"
          | "snapshot_correct_answer"
        >
        & Partial<
          Pick<
            ExamQuestionRow,
            | "snapshot_question_type"
            | "snapshot_description"
            | "snapshot_settings"
            | "snapshot_answer_key"
            | "snapshot_grading_mode"
            | "snapshot_points"
            | "snapshot_is_required"
          >
        >
      >
    | null;
};

type SubmissionQuestionRow = NonNullable<
  SubmissionExamRow["exam_questions"]
>[number];

type SnapshotInput = {
  exam_id: string;
  question_id: string | null;
  sort_order: number;
  snapshot_content: string;
  snapshot_options: Json;
  snapshot_correct_answer: string;
  snapshot_question_type: QuestionType;
  snapshot_description: string | null;
  snapshot_settings: Json;
  snapshot_answer_key: Json;
  snapshot_grading_mode: string;
  snapshot_points: number;
  snapshot_is_required: boolean;
  source_question_set_id?: string | null;
};

type ResponsePayload = {
  type: QuestionType;
  value?: string | number | null;
  values?: string[];
};

type QuestionSelectionSource =
  | "own"
  | "public"
  | "current"
  | "set"
  | "public-set"
  | "current-exam"
  | "any";

type QuestionSelection = {
  id: string;
  source: QuestionSelectionSource;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const questionTypes = new Set<QuestionType>([
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "rating",
]);

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

function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

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

function gradingModeFor(type: QuestionType, value: string | null | undefined) {
  if (type === "paragraph") {
    return value === "manual" ? "manual" : "none";
  }

  return value === "none" ? "none" : "auto";
}

function pointsFor(value: number | null | undefined, gradingMode: string) {
  if (gradingMode === "none") {
    return 0;
  }

  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 1;
}

function snapshotFromQuestionSetQuestion(
  examId: string,
  question: QuestionSetQuestionRow,
  sortOrder: number,
): SnapshotInput {
  const options = optionsFromJson(question.options);
  const questionType = normalizeQuestionType(question.question_type, options);
  const gradingMode = gradingModeFor(questionType, question.grading_mode);

  return {
    exam_id: examId,
    question_id: question.original_question_id,
    sort_order: sortOrder,
    snapshot_content: question.content,
    snapshot_options: question.options,
    snapshot_correct_answer: stringsFromAnswerKey(question.answer_key, "")[0] ?? "",
    snapshot_question_type: questionType,
    snapshot_description: question.description ?? null,
    snapshot_settings: question.settings,
    snapshot_answer_key: question.answer_key,
    snapshot_grading_mode: gradingMode,
    snapshot_points: pointsFor(question.points, gradingMode),
    snapshot_is_required: question.is_required,
    source_question_set_id: question.set_id,
  };
}

function snapshotFromPublicSetQuestion(
  examId: string,
  question: PublicSetQuestionRow,
  sortOrder: number,
): SnapshotInput {
  const options = optionsFromJson(question.snapshot_options);
  const questionType = normalizeQuestionType(
    question.snapshot_question_type,
    options,
  );
  const gradingMode = gradingModeFor(
    questionType,
    question.snapshot_grading_mode,
  );

  return {
    exam_id: examId,
    question_id: question.question_id,
    sort_order: sortOrder,
    snapshot_content: question.snapshot_content,
    snapshot_options: question.snapshot_options,
    snapshot_correct_answer: question.snapshot_correct_answer,
    snapshot_question_type: questionType,
    snapshot_description: question.snapshot_description ?? null,
    snapshot_settings: (question.snapshot_settings ?? {}) as Json,
    snapshot_answer_key:
      question.snapshot_answer_key ??
      ({
        value: question.snapshot_correct_answer,
        values: [question.snapshot_correct_answer],
      } as Json),
    snapshot_grading_mode: gradingMode,
    snapshot_points: pointsFor(question.snapshot_points, gradingMode),
    snapshot_is_required: question.snapshot_is_required ?? true,
  };
}

function snapshotFromExistingExamQuestion(
  examId: string,
  question: ExamQuestionRow,
  sortOrder: number,
): SnapshotInput {
  const options = optionsFromJson(question.snapshot_options);
  const questionType = normalizeQuestionType(
    question.snapshot_question_type,
    options,
  );
  const gradingMode = gradingModeFor(
    questionType,
    question.snapshot_grading_mode,
  );

  return {
    exam_id: examId,
    question_id: question.question_id,
    sort_order: sortOrder,
    snapshot_content: question.snapshot_content,
    snapshot_options: question.snapshot_options,
    snapshot_correct_answer: question.snapshot_correct_answer,
    snapshot_question_type: questionType,
    snapshot_description: question.snapshot_description ?? null,
    snapshot_settings: (question.snapshot_settings ?? {}) as Json,
    snapshot_answer_key:
      question.snapshot_answer_key ??
      ({
        value: question.snapshot_correct_answer,
        values: [question.snapshot_correct_answer],
      } as Json),
    snapshot_grading_mode: gradingMode,
    snapshot_points: pointsFor(question.snapshot_points, gradingMode),
    snapshot_is_required: question.snapshot_is_required ?? true,
    source_question_set_id: question.source_question_set_id,
  };
}

function stringsFromAnswerKey(
  answerKey: Json | null | undefined,
  legacyCorrectAnswer: string,
) {
  const key = objectFromJson(answerKey);
  const candidates =
    key.acceptedAnswers ?? key.correctAnswers ?? key.answers ?? key.values;

  if (Array.isArray(candidates)) {
    return candidates.filter((value): value is string => typeof value === "string");
  }

  for (const field of ["answer", "correctAnswer", "value"]) {
    const value = key[field];

    if (typeof value === "string") {
      return [value];
    }
  }

  return legacyCorrectAnswer ? [legacyCorrectAnswer] : [];
}

function numberFromAnswerKey(
  answerKey: Json | null | undefined,
  legacyCorrectAnswer: string,
) {
  const key = objectFromJson(answerKey);

  for (const field of ["answer", "correctAnswer", "correctValue", "value"]) {
    const numeric = Number(key[field]);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  const legacy = Number(legacyCorrectAnswer);
  return Number.isFinite(legacy) ? legacy : null;
}

function getSubmittedResponse(formData: FormData, question: SubmissionQuestionRow) {
  const type = normalizeQuestionType(
    question.snapshot_question_type,
    optionsFromJson(question.snapshot_options),
  );
  const name = `answer:${question.id}`;

  if (type === "checkboxes") {
    return {
      type,
      values: formData
        .getAll(name)
        .filter((value): value is string => typeof value === "string"),
    } satisfies ResponsePayload;
  }

  const value = formData.get(name);

  return {
    type,
    value: typeof value === "string" ? value : "",
  } satisfies ResponsePayload;
}

function legacyAnswerFromResponse(response: ResponsePayload) {
  return response.values ? response.values.join(", ") : String(response.value ?? "");
}

function scoreResponse(question: SubmissionQuestionRow, response: ResponsePayload) {
  const options = optionsFromJson(question.snapshot_options);
  const type = normalizeQuestionType(question.snapshot_question_type, options);
  const gradingMode = gradingModeFor(type, question.snapshot_grading_mode);
  const maxPoints = pointsFor(question.snapshot_points, gradingMode);
  const legacyCorrectAnswer = question.snapshot_correct_answer;

  if (gradingMode === "none") {
    return {
      isGradable: false,
      gradingStatus: "ungraded",
      maxPoints: 0,
      scorePoints: 0,
      isCorrect: false,
    };
  }

  if (gradingMode === "manual") {
    return {
      isGradable: true,
      gradingStatus: "ungraded",
      maxPoints,
      scorePoints: 0,
      isCorrect: false,
    };
  }

  let isCorrect = false;

  if (type === "short_answer") {
    const accepted = stringsFromAnswerKey(
      question.snapshot_answer_key,
      legacyCorrectAnswer,
    ).map((value) => value.trim().toLocaleLowerCase());
    const submitted = String(response.value ?? "").trim().toLocaleLowerCase();
    isCorrect = Boolean(submitted) && accepted.includes(submitted);
  } else if (type === "checkboxes") {
    const accepted = stringsFromAnswerKey(
      question.snapshot_answer_key,
      legacyCorrectAnswer,
    );
    const submitted = response.values ?? [];
    isCorrect =
      submitted.length === accepted.length &&
      submitted.every((value) => accepted.includes(value)) &&
      accepted.every((value) => submitted.includes(value));
  } else if (type === "linear_scale" || type === "rating") {
    const expected = numberFromAnswerKey(
      question.snapshot_answer_key,
      legacyCorrectAnswer,
    );
    const submitted = Number(response.value);
    isCorrect =
      expected !== null && Number.isFinite(submitted) && submitted === expected;
  } else {
    const expected =
      stringsFromAnswerKey(question.snapshot_answer_key, legacyCorrectAnswer)[0] ??
      "";
    isCorrect = Boolean(response.value) && response.value === expected;
  }

  return {
    isGradable: true,
    gradingStatus: "graded",
    maxPoints,
    scorePoints: isCorrect ? maxPoints : 0,
    isCorrect,
  };
}

function isActiveExam(startsAt: string, endsAt: string, databaseNowMs: number) {
  return (
    databaseNowMs >= new Date(startsAt).getTime() &&
    databaseNowMs < new Date(endsAt).getTime()
  );
}

function getExamInput(formData: FormData) {
  return {
    title: formData.get("title"),
    groupId: formData.get("groupId"),
    questionIds: formData
      .getAll("questionIds")
      .filter((value): value is string => typeof value === "string"),
    startsAt: formData.get("startsAtIso") || formData.get("startsAt"),
    endsAt: formData.get("endsAtIso") || formData.get("endsAt"),
  };
}

function parseQuestionSelection(value: string): QuestionSelection | null {
  const [maybeSource, maybeId] = value.split(":", 2);

  if (
    (maybeSource === "own" ||
      maybeSource === "public" ||
      maybeSource === "current" ||
      maybeSource === "set" ||
      maybeSource === "public-set" ||
      maybeSource === "current-exam") &&
    maybeId
  ) {
    return uuidPattern.test(maybeId)
      ? { id: maybeId, source: maybeSource }
      : null;
  }

  return uuidPattern.test(value) ? { id: value, source: "any" } : null;
}

function parseQuestionSelections(values: string[]) {
  const selections = values.map(parseQuestionSelection);

  if (selections.some((selection) => selection === null)) {
    return null;
  }

  return selections as QuestionSelection[];
}

function validationErrorState(
  fieldErrors: ExamActionState["fieldErrors"],
): ExamActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

async function buildExamQuestionSnapshots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  examId: string,
  questionIds: string[],
): Promise<
  | { status: "success"; snapshots: SnapshotInput[] }
  | { status: "error"; state: ExamActionState }
> {
  const selections = parseQuestionSelections(questionIds);

  if (!selections?.length) {
    return {
      status: "error",
      state: {
        status: "error",
        message: "Choose question sets from your available lists.",
        fieldErrors: {
          questionIds: ["One or more selected question sets are unavailable."],
        },
      },
    };
  }

  const db = supabase as unknown as {
    from(table: string): {
      select(columns?: string): {
        in(column: string, values: string[]): {
          eq(
            column: string,
            value: unknown,
          ): PromiseLike<{
            data: QuestionSetQuestionRow[] | null;
            error: { code?: string; message?: string } | null;
          }>;
        };
      };
    };
  };
  const ownSelectionIds = selections
    .filter((selection) => selection.source === "own" || selection.source === "any")
    .map((selection) => selection.id);
  const publicSelectionIds = selections
    .filter((selection) => selection.source === "public" || selection.source === "any")
    .map((selection) => selection.id);
  const currentSelectionIds = selections
    .filter((selection) => selection.source === "current")
    .map((selection) => selection.id);
  const ownSetSelectionIds = selections
    .filter((selection) => selection.source === "set")
    .map((selection) => selection.id);
  const publicSetSelectionIds = selections
    .filter((selection) => selection.source === "public-set")
    .map((selection) => selection.id);
  const currentExamSelectionIds = selections
    .filter((selection) => selection.source === "current-exam")
    .map((selection) => selection.id);
  const invalidCurrentExamSelection = currentExamSelectionIds.some(
    (selectionId) => selectionId !== examId,
  );
  const [
    { data: questionRows, error: questionError },
    { data: publicSetQuestionRows, error: publicQuestionError },
    { data: currentQuestionRows, error: currentQuestionError },
    { data: ownSetQuestionRows, error: ownSetQuestionError },
    { data: publicSetQuestionRowsForSets, error: publicSetQuestionError },
    { data: currentExamQuestionRows, error: currentExamQuestionError },
  ] =
    await Promise.all([
      ownSelectionIds.length
        ? db
            .from("question_set_questions")
            .select("*, question_sets!question_set_questions_set_id_fkey(teacher_id)")
            .in("id", ownSelectionIds)
            .eq("question_sets.teacher_id", userId)
        : Promise.resolve({ data: [], error: null }),
      publicSelectionIds.length
        ? supabase
            .from("public_exam_set_questions")
            .select("*, public_exam_sets!public_exam_set_questions_set_id_fkey(is_published)")
            .in("id", publicSelectionIds)
            .eq("public_exam_sets.is_published", true)
            .returns<
              Array<
                PublicSetQuestionRow & {
                  public_exam_sets: { is_published: boolean } | null;
                }
              >
            >()
        : Promise.resolve({ data: [], error: null }),
      currentSelectionIds.length
        ? supabase
            .from("exam_questions")
            .select("*")
            .in("id", currentSelectionIds)
            .eq("exam_id", examId)
            .returns<ExamQuestionRow[]>()
        : Promise.resolve({ data: [], error: null }),
      ownSetSelectionIds.length
        ? db
            .from("question_set_questions")
            .select("*, question_sets!question_set_questions_set_id_fkey(teacher_id)")
            .in("set_id", ownSetSelectionIds)
            .eq("question_sets.teacher_id", userId)
        : Promise.resolve({ data: [], error: null }),
      publicSetSelectionIds.length
        ? supabase
            .from("public_exam_set_questions")
            .select("*, public_exam_sets!public_exam_set_questions_set_id_fkey(is_published)")
            .in("set_id", publicSetSelectionIds)
            .eq("public_exam_sets.is_published", true)
            .returns<
              Array<
                PublicSetQuestionRow & {
                  public_exam_sets: { is_published: boolean } | null;
                }
              >
            >()
        : Promise.resolve({ data: [], error: null }),
      currentExamSelectionIds.length && !invalidCurrentExamSelection
        ? supabase
            .from("exam_questions")
            .select("*")
            .eq("exam_id", examId)
            .returns<ExamQuestionRow[]>()
        : Promise.resolve({ data: [], error: null }),
    ]);

  const questionsById = new Map(
    (questionRows ?? [])
      .filter((question) => question.question_sets?.teacher_id === userId)
      .map((question) => [question.id, question]),
  );
  const publicSetQuestionsById = new Map(
    (publicSetQuestionRows ?? [])
      .filter((question) => question.public_exam_sets?.is_published)
      .map((question) => [question.id, question]),
  );
  const currentQuestionsById = new Map(
    (currentQuestionRows ?? []).map((question) => [question.id, question]),
  );
  const ownSetQuestionsBySetId = new Map<string, QuestionSetQuestionRow[]>();
  const publicQuestionsBySetId = new Map<string, PublicSetQuestionRow[]>();

  for (const question of ownSetQuestionRows ?? []) {
    if (question.question_sets?.teacher_id !== userId) {
      continue;
    }

    const setQuestions = ownSetQuestionsBySetId.get(question.set_id) ?? [];
    setQuestions.push(question);
    ownSetQuestionsBySetId.set(question.set_id, setQuestions);
  }

  for (const question of publicSetQuestionRowsForSets ?? []) {
    if (!question.public_exam_sets?.is_published) {
      continue;
    }

    const setQuestions = publicQuestionsBySetId.get(question.set_id) ?? [];
    setQuestions.push(question);
    publicQuestionsBySetId.set(question.set_id, setQuestions);
  }

  for (const questions of [
    ...ownSetQuestionsBySetId.values(),
    ...publicQuestionsBySetId.values(),
  ]) {
    questions.sort((left, right) => left.sort_order - right.sort_order);
  }

  const currentExamQuestions = [...(currentExamQuestionRows ?? [])].sort(
    (left, right) => left.sort_order - right.sort_order,
  );
  const snapshots: SnapshotInput[] = [];
  let hasMissingSelection = invalidCurrentExamSelection;

  for (const selection of selections) {
    if (selection.source === "set") {
      const setQuestions = ownSetQuestionsBySetId.get(selection.id) ?? [];

      if (!setQuestions.length) {
        hasMissingSelection = true;
        continue;
      }

      for (const question of setQuestions) {
        snapshots.push(
          snapshotFromQuestionSetQuestion(examId, question, snapshots.length),
        );
      }
      continue;
    }

    if (selection.source === "public-set") {
      const setQuestions = publicQuestionsBySetId.get(selection.id) ?? [];

      if (!setQuestions.length) {
        hasMissingSelection = true;
        continue;
      }

      for (const question of setQuestions) {
        snapshots.push(
          snapshotFromPublicSetQuestion(examId, question, snapshots.length),
        );
      }
      continue;
    }

    if (selection.source === "current-exam") {
      if (selection.id !== examId || !currentExamQuestions.length) {
        hasMissingSelection = true;
        continue;
      }

      for (const question of currentExamQuestions) {
        snapshots.push(
          snapshotFromExistingExamQuestion(examId, question, snapshots.length),
        );
      }
      continue;
    }

    if (selection.source === "current") {
      const currentQuestion = currentQuestionsById.get(selection.id);

      if (!currentQuestion) {
        hasMissingSelection = true;
        continue;
      }

      snapshots.push(
        snapshotFromExistingExamQuestion(examId, currentQuestion, snapshots.length),
      );
      continue;
    }

    if (selection.source !== "public") {
      const question = questionsById.get(selection.id);

      if (question) {
        snapshots.push(
          snapshotFromQuestionSetQuestion(examId, question, snapshots.length),
        );
        continue;
      }
    }

    if (selection.source !== "own") {
      const publicQuestion = publicSetQuestionsById.get(selection.id);

      if (publicQuestion) {
        snapshots.push(
          snapshotFromPublicSetQuestion(examId, publicQuestion, snapshots.length),
        );
        continue;
      }
    }

    hasMissingSelection = true;
  }

  if (
    questionError ||
    publicQuestionError ||
    currentQuestionError ||
    ownSetQuestionError ||
    publicSetQuestionError ||
    currentExamQuestionError ||
    hasMissingSelection ||
    !snapshots.length
  ) {
    return {
      status: "error",
      state: {
        status: "error",
        message: "Choose question sets from your available lists.",
        fieldErrors: {
          questionIds: ["One or more selected question sets are unavailable."],
        },
      },
    };
  }

  return {
    status: "success",
    snapshots,
  };
}

export async function createExam(
  _previousState: ExamActionState,
  formData: FormData,
): Promise<ExamActionState> {
  const parsed = examSchema.safeParse(getExamInput(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const { supabase, user } = await requireTeacher("/exams");
  const { title, groupId, questionIds, startsAt, endsAt } = parsed.data;
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (groupError || !group) {
    return {
      status: "error",
      message: "Choose one of your batches for this exam.",
      fieldErrors: {
        groupId: ["Choose one of your batches."],
      },
    };
  }
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .insert({
      group_id: groupId,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select("id")
    .single();

  if (examError || !exam) {
    console.error("Create exam failed", {
      code: examError?.code,
      message: examError?.message,
    });

    return {
      status: "error",
      message: "Exam could not be created. Please try again.",
    };
  }

  const snapshotResult = await buildExamQuestionSnapshots(
    supabase,
    user.id,
    exam.id,
    questionIds,
  );

  if (snapshotResult.status === "error") {
    await supabase.from("exams").delete().eq("id", exam.id);
    return snapshotResult.state;
  }

  const { error: examQuestionsError } = await supabase
    .from("exam_questions")
    .insert(snapshotResult.snapshots as never);

  if (examQuestionsError) {
    console.error("Attach exam questions failed", {
      code: examQuestionsError.code,
      message: examQuestionsError.message,
    });

    await supabase.from("exams").delete().eq("id", exam.id);

    return {
      status: "error",
      message: "Exam questions could not be attached. Please try again.",
    };
  }

  revalidatePath("/exams");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Exam created.",
  };
}

export async function updateExam(
  examId: string,
  _previousState: ExamActionState,
  formData: FormData,
): Promise<ExamActionState> {
  const parsed = updateExamSchema.safeParse(getExamInput(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const { supabase, user } = await requireTeacher("/exams");
  const { title, groupId, questionIds, startsAt, endsAt } = parsed.data;
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id,group_id,starts_at,ends_at,groups!exams_group_id_fkey(teacher_id)")
    .eq("id", examId)
    .maybeSingle<{
      id: string;
      group_id: string;
      starts_at: string;
      ends_at: string;
      groups: { teacher_id: string } | null;
    }>();

  if (examError || !exam || exam.groups?.teacher_id !== user.id) {
    return {
      status: "error",
      message: "Exam could not be found.",
    };
  }

  const databaseNowMs = await getDatabaseNowMs(supabase);
  const currentStartMs = new Date(exam.starts_at).getTime();
  const currentEndMs = new Date(exam.ends_at).getTime();
  const nextStartMs = new Date(startsAt).getTime();
  const nextEndMs = new Date(endsAt).getTime();
  const isScheduled = databaseNowMs < currentStartMs;
  const isActive = databaseNowMs >= currentStartMs && databaseNowMs < currentEndMs;

  if (!isScheduled && !isActive) {
    return {
      status: "error",
      message: "Closed exams cannot be edited.",
    };
  }

  if (isScheduled && nextStartMs <= databaseNowMs) {
    return validationErrorState({
      startsAt: ["Start time must be in the future."],
    });
  }

  if (isActive && nextEndMs <= databaseNowMs) {
    return validationErrorState({
      endsAt: ["End time must stay in the future when postponing an active exam."],
    });
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (groupError || !group) {
    return {
      status: "error",
      message: "Choose one of your batches for this exam.",
      fieldErrors: {
        groupId: ["Choose one of your batches."],
      },
    };
  }

  if (isActive && groupId !== exam.group_id) {
    return {
      status: "error",
      message: "Active exams can only be postponed. Batch and questions stay locked.",
      fieldErrors: {
        groupId: ["Batch cannot be changed after the exam starts."],
      },
    };
  }

  if (isActive) {
    const admin = createAdminClient();
    const { error: activeUpdateError } = await admin
      .from("exams")
      .update({
        group_id: exam.group_id,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        closed_at: null,
      })
      .eq("id", examId);

    if (activeUpdateError) {
      console.error("Postpone active exam failed", {
        code: activeUpdateError.code,
        message: activeUpdateError.message,
      });

      return {
        status: "error",
        message: "Exam could not be postponed. Please try again.",
      };
    }

    revalidatePath("/exams");
    revalidatePath(`/exams/${examId}`);
    revalidatePath("/student/exams");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Exam postponed.",
    };
  }

  const snapshotResult = await buildExamQuestionSnapshots(
    supabase,
    user.id,
    examId,
    questionIds,
  );

  if (snapshotResult.status === "error") {
    return snapshotResult.state;
  }

  const { error: updateError } = await supabase
    .from("exams")
    .update({
      group_id: groupId,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      closed_at: null,
    })
    .eq("id", examId);

  if (updateError) {
    console.error("Update exam failed", {
      code: updateError.code,
      message: updateError.message,
    });

    return {
      status: "error",
      message: "Only scheduled exams can be edited.",
    };
  }

  const { error: deleteQuestionsError } = await supabase
    .from("exam_questions")
    .delete()
    .eq("exam_id", examId);

  if (deleteQuestionsError) {
    console.error("Replace exam questions failed", {
      code: deleteQuestionsError.code,
      message: deleteQuestionsError.message,
    });

    return {
      status: "error",
      message: "Exam questions could not be replaced. Please try again.",
    };
  }

  const { error: insertQuestionsError } = await supabase
    .from("exam_questions")
    .insert(snapshotResult.snapshots as never);

  if (insertQuestionsError) {
    console.error("Attach updated exam questions failed", {
      code: insertQuestionsError.code,
      message: insertQuestionsError.message,
    });

    return {
      status: "error",
      message: "Updated exam questions could not be attached. Please try again.",
    };
  }

  revalidatePath("/exams");
  revalidatePath(`/exams/${examId}`);
  revalidatePath(`/exams/${examId}/merit`);
  revalidatePath("/student/exams");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Exam updated.",
  };
}

export async function deleteExam(
  examId: string,
  _previousState: ExamActionState,
): Promise<ExamActionState> {
  void _previousState;

  const { supabase, user } = await requireTeacher("/exams");
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id,starts_at,ends_at,groups!exams_group_id_fkey(teacher_id)")
    .eq("id", examId)
    .maybeSingle<{
      id: string;
      starts_at: string;
      ends_at: string;
      groups: { teacher_id: string } | null;
    }>();

  if (examError || !exam || exam.groups?.teacher_id !== user.id) {
    return {
      status: "error",
      message: "Exam could not be found.",
    };
  }

  const databaseNowMs = await getDatabaseNowMs(supabase);

  if (databaseNowMs >= new Date(exam.ends_at).getTime()) {
    return {
      status: "error",
      message: "Closed exams cannot be deleted.",
    };
  }

  const admin = createAdminClient();
  const { data: submissions, error: submissionsError } = await admin
    .from("submissions")
    .select("id")
    .eq("exam_id", examId)
    .limit(1);

  if (submissionsError) {
    console.error("Check exam submissions before delete failed", {
      code: submissionsError.code,
      message: submissionsError.message,
    });

    return {
      status: "error",
      message: "Exam could not be checked for submissions. Please try again.",
    };
  }

  if (submissions?.length) {
    return {
      status: "error",
      message: "This exam already has submissions, so it cannot be deleted.",
    };
  }

  const { error } = await admin.from("exams").delete().eq("id", examId);

  if (error) {
    console.error("Delete exam failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message: "Exam could not be deleted. Please try again.",
    };
  }

  revalidatePath("/exams");
  revalidatePath("/student/exams");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Exam deleted.",
  };
}

export async function submitExamAnswers(
  _previousState: SubmitExamActionState,
  formData: FormData,
): Promise<SubmitExamActionState> {
  const parsed = submitExamSchema.safeParse({
    examId: formData.get("examId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "This exam submission is not valid.",
    };
  }

  const { examId } = parsed.data;
  const { supabase, user } = await requireStudent(`/student/exams/${examId}`);
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select(
      "id,group_id,starts_at,ends_at,exam_questions(*)",
    )
    .eq("id", examId)
    .maybeSingle<SubmissionExamRow>();

  if (examError || !exam) {
    return {
      status: "error",
      message: "This exam is not available to your account.",
    };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", exam.group_id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!membership) {
    return {
      status: "error",
      message: "This exam is not available to your account.",
    };
  }

  const databaseNowMs = await getDatabaseNowMs(supabase);

  if (!isActiveExam(exam.starts_at, exam.ends_at, databaseNowMs)) {
    return {
      status: "error",
      message: "This exam is no longer accepting submissions.",
    };
  }

  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("exam_id", examId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existingSubmission) {
    return {
      status: "error",
      message: "You have already submitted this exam.",
    };
  }

  const questions = [...(exam.exam_questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  if (!questions.length) {
    return {
      status: "error",
      message: "This exam has no questions to submit.",
    };
  }

  const scoredAnswers = questions.map((question) => {
    const response = getSubmittedResponse(formData, question);
    const scoring = scoreResponse(question, response);

    return {
      examQuestionId: question.id,
      questionId: question.question_id,
      response,
      answer: legacyAnswerFromResponse(response),
      ...scoring,
    };
  });
  const score = scoredAnswers.reduce((sum, answer) => sum + answer.scorePoints, 0);
  const totalQuestions = scoredAnswers.reduce(
    (sum, answer) => sum + answer.maxPoints,
    0,
  );
  const admin = createAdminClient();
  const { data: submission, error: submissionError } = await admin
    .from("submissions")
    .insert({
      exam_id: examId,
      student_id: user.id,
      score,
      total_questions: totalQuestions,
      score_points: score,
      total_points: totalQuestions,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    if (submissionError?.code === "23505") {
      return {
        status: "error",
        message: "You have already submitted this exam.",
      };
    }

    console.error("Submit exam failed", {
      code: submissionError?.code,
      message: submissionError?.message,
    });

    return {
      status: "error",
      message: "Your exam could not be submitted. Please try again.",
    };
  }

  const { error: answersError } = await admin.from("submission_answers").insert(
    scoredAnswers.map((answer) => ({
      submission_id: submission.id,
      exam_question_id: answer.examQuestionId,
      question_id: answer.questionId,
      answer: answer.answer,
      is_correct: answer.isCorrect,
      response: answer.response,
      score_points: answer.scorePoints,
      max_points: answer.maxPoints,
      is_gradable: answer.isGradable,
      grading_status: answer.gradingStatus,
    })),
  );

  if (answersError) {
    console.error("Store submission answers failed", {
      code: answersError.code,
      message: answersError.message,
    });

    await admin.from("submissions").delete().eq("id", submission.id);

    return {
      status: "error",
      message: "Your answers could not be saved. Please submit again.",
    };
  }

  revalidatePath("/student/exams");
  revalidatePath(`/student/exams/${examId}`);
  revalidatePath("/student/progress");
  revalidatePath("/student/practice");
  redirect(`/student/exams/${examId}`);
}

function manualGradeError(message: string): ManualGradeActionState {
  return {
    status: "error",
    message,
  };
}

export async function gradeManualAnswer(
  answerId: string,
  _previousState: ManualGradeActionState,
  formData: FormData,
): Promise<ManualGradeActionState> {
  void _previousState;

  const scorePoints = Number(formData.get("scorePoints"));

  if (!Number.isInteger(scorePoints) || scorePoints < 0) {
    return manualGradeError("Enter a valid score.");
  }

  const { supabase, user } = await requireTeacher("/exams");
  const admin = createAdminClient();
  const { data: answer, error: answerError } = await admin
    .from("submission_answers")
    .select("id,submission_id,exam_question_id,max_points")
    .eq("id", answerId)
    .maybeSingle<{
      id: string;
      submission_id: string;
      exam_question_id: string;
      max_points: number;
    }>();

  if (answerError || !answer) {
    return manualGradeError("Answer could not be found.");
  }

  if (scorePoints > answer.max_points) {
    return manualGradeError(`Score cannot exceed ${answer.max_points}.`);
  }

  const { data: examQuestion, error: questionError } = await admin
    .from("exam_questions")
    .select("id,exam_id,snapshot_question_type,snapshot_grading_mode")
    .eq("id", answer.exam_question_id)
    .maybeSingle<{
      id: string;
      exam_id: string;
      snapshot_question_type: string | null;
      snapshot_grading_mode: string | null;
    }>();
  const { data: submission, error: submissionError } = await admin
    .from("submissions")
    .select("id,exam_id")
    .eq("id", answer.submission_id)
    .maybeSingle<{ id: string; exam_id: string }>();

  if (
    questionError ||
    submissionError ||
    !examQuestion ||
    !submission ||
    examQuestion.exam_id !== submission.exam_id ||
    examQuestion.snapshot_question_type !== "paragraph" ||
    examQuestion.snapshot_grading_mode !== "manual"
  ) {
    return manualGradeError("Only manual paragraph answers can be graded here.");
  }

  const { data: exam, error: examError } = await admin
    .from("exams")
    .select("id,group_id,ends_at")
    .eq("id", submission.exam_id)
    .maybeSingle<{ id: string; group_id: string; ends_at: string }>();

  if (examError || !exam) {
    return manualGradeError("Exam could not be found.");
  }

  const { data: group, error: groupError } = await admin
    .from("groups")
    .select("teacher_id")
    .eq("id", exam.group_id)
    .maybeSingle<{ teacher_id: string }>();

  if (groupError || !group || group.teacher_id !== user.id) {
    return manualGradeError("You can only grade answers for your exams.");
  }

  const databaseNowMs = await getDatabaseNowMs(supabase);

  if (databaseNowMs < new Date(exam.ends_at).getTime()) {
    return manualGradeError("Manual grading opens after the exam closes.");
  }

  const { error: updateAnswerError } = await admin
    .from("submission_answers")
    .update({
      score_points: scorePoints,
      is_correct: answer.max_points > 0 && scorePoints === answer.max_points,
      grading_status: "graded",
      is_gradable: true,
    })
    .eq("id", answer.id);

  if (updateAnswerError) {
    console.error("Manual grade update failed", {
      code: updateAnswerError.code,
      message: updateAnswerError.message,
    });

    return manualGradeError("Grade could not be saved.");
  }

  const { data: answers, error: answersError } = await admin
    .from("submission_answers")
    .select("score_points,max_points,is_gradable")
    .eq("submission_id", submission.id)
    .returns<Array<{
      score_points: number;
      max_points: number;
      is_gradable: boolean;
    }>>();

  if (answersError || !answers) {
    return manualGradeError("Grade saved, but the submission score could not be refreshed.");
  }

  const gradableAnswers = answers.filter((item) => item.is_gradable);
  const score = gradableAnswers.reduce(
    (sum, item) => sum + item.score_points,
    0,
  );
  const total = gradableAnswers.reduce((sum, item) => sum + item.max_points, 0);
  const { error: updateSubmissionError } = await admin
    .from("submissions")
    .update({
      score,
      total_questions: total,
      score_points: score,
      total_points: total,
    })
    .eq("id", submission.id);

  if (updateSubmissionError) {
    console.error("Manual grade score refresh failed", {
      code: updateSubmissionError.code,
      message: updateSubmissionError.message,
    });

    return manualGradeError("Grade saved, but the submission score could not be refreshed.");
  }

  revalidatePath(`/exams/${exam.id}/merit`);
  revalidatePath("/student/progress");
  revalidatePath("/student/practice");

  return {
    status: "success",
    message: "Grade saved.",
  };
}
