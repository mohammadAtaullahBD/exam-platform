"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDatabaseNowMs } from "@/lib/supabase/database-time";
import { createClient } from "@/lib/supabase/server";
import { examSchema } from "@/lib/validations/exam";
import { submitExamSchema } from "@/lib/validations/student-exam";
import type { Database, Json } from "@/types/database";

import type {
  ExamActionState,
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
    return "none";
  }

  return value === "none" ? "none" : "auto";
}

function pointsFor(value: number | null | undefined, gradingMode: string) {
  if (gradingMode !== "auto") {
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

  if (gradingMode !== "auto") {
    return {
      isGradable: false,
      gradingStatus: "ungraded",
      maxPoints: 0,
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

function validationErrorState(
  fieldErrors: ExamActionState["fieldErrors"],
): ExamActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors,
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
  const db = supabase as unknown as {
    from(table: string): {
      select(columns?: string): {
        in(column: string, values: string[]): {
          eq(
            column: string,
            value: unknown,
          ): PromiseLike<{ data: QuestionSetQuestionRow[] | null; error: { code?: string; message?: string } | null }>;
        };
      };
    };
  };
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
      message: "Choose one of your groups for this exam.",
      fieldErrors: {
        groupId: ["Choose one of your groups."],
      },
    };
  }

  const { data: questionRows, error: questionError } = await db
    .from("question_set_questions")
    .select("*, question_sets!question_set_questions_set_id_fkey(teacher_id)")
    .in("id", questionIds)
    .eq("question_sets.teacher_id", user.id);

  const { data: publicSetQuestionRows, error: publicQuestionError } = await supabase
    .from("public_exam_set_questions")
    .select("*, public_exam_sets!public_exam_set_questions_set_id_fkey(is_published)")
    .in("id", questionIds)
    .eq("public_exam_sets.is_published", true)
    .returns<
      Array<PublicSetQuestionRow & { public_exam_sets: { is_published: boolean } | null }>
    >();

  const availableQuestionIds = new Set([
    ...(questionRows ?? [])
      .filter((question) => question.question_sets?.teacher_id === user.id)
      .map((question) => question.id),
    ...(publicSetQuestionRows ?? [])
      .filter((question) => question.public_exam_sets?.is_published)
      .map((question) => question.id),
  ]);

  if (
    questionError ||
    publicQuestionError ||
    !questionRows ||
    !publicSetQuestionRows ||
    questionIds.some((questionId) => !availableQuestionIds.has(questionId))
  ) {
    return {
      status: "error",
      message: "Choose questions from your available question lists.",
      fieldErrors: {
        questionIds: ["One or more selected questions are unavailable."],
      },
    };
  }

  const questionsById = new Map(
    questionRows.map((question) => [question.id, question]),
  );
  const publicSetQuestionsById = new Map(
    publicSetQuestionRows.map((question) => [question.id, question]),
  );
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

  const examQuestions = questionIds.flatMap((questionId, index) => {
    const question = questionsById.get(questionId);

    if (question) {
      return [snapshotFromQuestionSetQuestion(exam.id, question, index)];
    }

    const publicQuestion = publicSetQuestionsById.get(questionId);

    return publicQuestion
      ? [snapshotFromPublicSetQuestion(exam.id, publicQuestion, index)]
      : [];
  });

  const { error: examQuestionsError } = await supabase
    .from("exam_questions")
    .insert(examQuestions as never);

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

export async function deleteExam(
  examId: string,
  _previousState: ExamActionState,
): Promise<ExamActionState> {
  void _previousState;

  const { supabase } = await requireTeacher("/exams");
  const { error } = await supabase.from("exams").delete().eq("id", examId);

  if (error) {
    console.error("Delete exam failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message: "Only scheduled exams can be deleted.",
    };
  }

  revalidatePath("/exams");

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
