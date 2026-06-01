"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { UserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { questionSchema } from "@/lib/validations/question";
import type { Database, Json } from "@/types/database";

import type { PublicExamActionState } from "./types";
import type { QuestionType } from "./types";

type PublicExamSetQuestionRow =
  Database["public"]["Tables"]["public_exam_set_questions"]["Row"] & {
    snapshot_question_type?: string | null;
    snapshot_description?: string | null;
    snapshot_settings?: Json | null;
    snapshot_answer_key?: Json | null;
    snapshot_grading_mode?: string | null;
    snapshot_points?: number | null;
    snapshot_is_required?: boolean | null;
  };

type PublicExamSetWithQuestionsRow =
  Database["public"]["Tables"]["public_exam_sets"]["Row"] & {
    public_exam_set_questions: PublicExamSetQuestionRow[] | null;
  };

type ParsedSetQuestion = {
  content: string;
  description: string | null;
  options: string[];
  correctAnswer: string;
  questionType: QuestionType;
  settings: Json;
  answerKey: Json;
  gradingMode: string;
  points: number;
  isRequired: boolean;
};

type QuestionFormInput = {
  content: FormDataEntryValue | null;
  options: Array<FormDataEntryValue | null>;
  correctOptionIndex: FormDataEntryValue | null;
};

const publicExamSetSchema = z.object({
  title: z.preprocess(
    stringFromForm,
    z
      .string()
      .trim()
      .min(1, "Set title is required.")
      .max(120, "Set title must be 120 characters or fewer."),
  ),
  description: z
    .preprocess(stringFromForm, z.string().trim().max(1000))
    .transform((value) => (value ? value : null)),
  isPublished: z.boolean(),
});
const questionTypes = new Set<QuestionType>([
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "rating",
]);

function stringFromForm(value: unknown) {
  return typeof value === "string" ? value : "";
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

function validationErrorState(
  fieldErrors: PublicExamActionState["fieldErrors"],
): PublicExamActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

function questionInputFromFormData(
  formData: FormData,
  index: string,
): QuestionFormInput {
  return {
    content: formData.get(`question-${index}-content`),
    options: [0, 1, 2, 3].map((optionIndex) =>
      formData.get(`question-${index}-option-${optionIndex}`),
    ),
    correctOptionIndex: formData.get(
      `question-${index}-correctOptionIndex`,
    ),
  };
}

function parsePublicExamSetForm(formData: FormData) {
  const setParsed = publicExamSetSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    isPublished: formData.get("isPublished") === "on",
  });
  const fieldErrors: Record<string, string[]> = {};

  if (!setParsed.success) {
    Object.assign(fieldErrors, setParsed.error.flatten().fieldErrors);
  }

  const questionIndexes = Array.from(
    new Set(
      formData
        .getAll("questionIndexes")
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  if (!questionIndexes.length) {
    fieldErrors.questions = ["Add at least one question."];
  }

  const questions: ParsedSetQuestion[] = [];

  questionIndexes.forEach((index, position) => {
    const questionParsed = questionSchema.safeParse(
      questionInputFromFormData(formData, index),
    );

    if (questionParsed.success) {
      questions.push({
        ...questionParsed.data,
        description: null,
        questionType: "multiple_choice",
        settings: {},
        answerKey: {
          value: questionParsed.data.correctAnswer,
          values: [questionParsed.data.correctAnswer],
        },
        gradingMode: "auto",
        points: 1,
        isRequired: true,
      });
      return;
    }

    const flattened = questionParsed.error.flatten().fieldErrors as Record<
      string,
      string[] | undefined
    >;
    const firstMessage =
      flattened.content?.[0] ??
      flattened.options?.[0] ??
      flattened.correctOptionIndex?.[0] ??
      flattened.correctAnswer?.[0] ??
      "Question is invalid.";

    fieldErrors.questions = [
      ...(fieldErrors.questions ?? []),
      `Question ${position + 1}: ${firstMessage}`,
    ];
  });

  if (Object.keys(fieldErrors).length || !setParsed.success) {
    return { ok: false as const, fieldErrors };
  }

  return {
    ok: true as const,
    input: {
      ...setParsed.data,
      questions,
    },
  };
}

async function cleanupPublicSet(
  setId: string | null,
  questionIds: string[],
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  if (setId) {
    await supabase.from("public_exam_sets").delete().eq("id", setId);
  }

  if (questionIds.length) {
    await supabase.from("questions").delete().in("id", questionIds);
  }
}

export async function createPublicExamSet(
  _previousState: PublicExamActionState,
  formData: FormData,
): Promise<PublicExamActionState> {
  const parsed = parsePublicExamSetForm(formData);

  if (!parsed.ok) {
    return validationErrorState(parsed.fieldErrors);
  }

  const { supabase, user } = await requireRole("admin", "/public-sets");
  const { title, description, isPublished, questions } = parsed.input;
  const { data: set, error: setError } = await supabase
    .from("public_exam_sets")
    .insert({
      admin_id: user.id,
      title,
      description,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (setError || !set) {
    console.error("Create public exam set failed", {
      code: setError?.code,
      message: setError?.message,
    });

    return {
      status: "error",
      message: "Public set could not be created. Please try again.",
    };
  }

  const insertedQuestions: Array<{ id: string; question: ParsedSetQuestion }> = [];

  for (const question of questions) {
    const { data: questionRow, error: questionError } = await supabase
      .from("questions")
      .insert({
        author_id: user.id,
        content: question.content,
        options: question.options,
        correct_answer: question.correctAnswer,
        question_type: question.questionType,
        description: question.description,
        settings: question.settings,
        answer_key: question.answerKey,
        grading_mode: question.gradingMode,
        points: question.points,
        is_required: question.isRequired,
        source: "admin",
      } as never)
      .select("id")
      .single();

    if (questionError || !questionRow) {
      console.error("Create admin public question failed", {
        code: questionError?.code,
        message: questionError?.message,
      });

      await cleanupPublicSet(
        set.id,
        insertedQuestions.map((inserted) => inserted.id),
        supabase,
      );

      return {
        status: "error",
        message: "Set questions could not be created. Please try again.",
      };
    }

    insertedQuestions.push({
      id: questionRow.id,
      question,
    });
  }

  const setQuestions = insertedQuestions.map((inserted, index) => ({
    set_id: set.id,
    question_id: inserted.id,
    sort_order: index,
    snapshot_content: inserted.question.content,
    snapshot_options: inserted.question.options,
    snapshot_correct_answer: inserted.question.correctAnswer,
    snapshot_question_type: inserted.question.questionType,
    snapshot_description: inserted.question.description,
    snapshot_settings: inserted.question.settings,
    snapshot_answer_key: inserted.question.answerKey,
    snapshot_grading_mode: inserted.question.gradingMode,
    snapshot_points: inserted.question.points,
    snapshot_is_required: inserted.question.isRequired,
  }));
  const { error: setQuestionsError } = await supabase
    .from("public_exam_set_questions")
    .insert(setQuestions as never);

  if (setQuestionsError) {
    console.error("Attach public exam set questions failed", {
      code: setQuestionsError.code,
      message: setQuestionsError.message,
    });

    await cleanupPublicSet(
      set.id,
      insertedQuestions.map((inserted) => inserted.id),
      supabase,
    );

    return {
      status: "error",
      message: "Set questions could not be attached. Please try again.",
    };
  }

  revalidatePath("/public-sets");
  revalidatePath("/student/public-exams");
  revalidatePath("/questions");

  return {
    status: "success",
    message: "Public set created.",
  };
}

function getAttemptInput(formData: FormData) {
  const setId = formData.get("setId");
  const questionIds = Array.from(
    new Set(
      formData
        .getAll("setQuestionIds")
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  return {
    setId: typeof setId === "string" ? setId : "",
    questionIds,
  };
}

function getSubmittedResponse(formData: FormData, question: PublicExamSetQuestionRow) {
  const type = normalizeQuestionType(
    question.snapshot_question_type,
    optionsFromJson(question.snapshot_options),
  );
  const name = `answer-${question.id}`;

  if (type === "checkboxes") {
    return {
      type,
      values: formData
        .getAll(name)
        .filter((value): value is string => typeof value === "string"),
    };
  }

  const value = formData.get(name);

  return {
    type,
    value: typeof value === "string" ? value : "",
  };
}

function legacyAnswerFromResponse(response: {
  value?: string | number | null;
  values?: string[];
}) {
  return response.values ? response.values.join(", ") : String(response.value ?? "");
}

function scoreResponse(
  question: PublicExamSetQuestionRow,
  response: { value?: string | number | null; values?: string[] },
) {
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

export async function submitPublicExamAttempt(
  _previousState: PublicExamActionState,
  formData: FormData,
): Promise<PublicExamActionState> {
  const { setId } = getAttemptInput(formData);

  if (!setId) {
    return validationErrorState({
      setId: ["Choose a public exam set."],
    });
  }

  const { supabase, user } = await requireRole(
    "student",
    "/student/public-exams",
  );
  const { data: setData, error: setError } = await supabase
    .from("public_exam_sets")
    .select("*, public_exam_set_questions(*)")
    .eq("id", setId)
    .eq("is_published", true)
    .maybeSingle();
  const set = setData as PublicExamSetWithQuestionsRow | null;

  if (setError || !set) {
    return {
      status: "error",
      message: "This public exam set is not available.",
    };
  }

  const questions = [...(set.public_exam_set_questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  if (!questions.length) {
    return {
      status: "error",
      message: "This public exam set has no questions yet.",
    };
  }

  const scoredAnswers = questions.map((question) => {
    const response = getSubmittedResponse(formData, question);
    const scoring = scoreResponse(question, response);

    return {
      question,
      response,
      answer: legacyAnswerFromResponse(response),
      isValid: !question.snapshot_is_required || Boolean(legacyAnswerFromResponse(response)),
      ...scoring,
    };
  });

  if (scoredAnswers.some((answer) => !answer.isValid)) {
    return validationErrorState({
      answers: ["Answer every question before submitting."],
    });
  }

  const score = scoredAnswers.reduce((sum, answer) => sum + answer.scorePoints, 0);
  const totalQuestions = scoredAnswers.reduce(
    (sum, answer) => sum + answer.maxPoints,
    0,
  );
  const admin = createAdminClient();
  const { data: attempt, error: attemptError } = await admin
    .from("public_exam_attempts")
    .insert({
      set_id: set.id,
      student_id: user.id,
      score,
      total_questions: totalQuestions,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    console.error("Create public exam attempt failed", {
      code: attemptError?.code,
      message: attemptError?.message,
    });

    return {
      status: "error",
      message: "Your score could not be saved. Please try again.",
    };
  }

  const attemptAnswers = scoredAnswers.map((answer) => ({
    attempt_id: attempt.id,
    set_question_id: answer.question.id,
    question_id: answer.question.question_id,
    answer: answer.answer,
    is_correct: answer.isCorrect,
    response: answer.response,
    score_points: answer.scorePoints,
    max_points: answer.maxPoints,
    is_gradable: answer.isGradable,
    grading_status: answer.gradingStatus,
  }));
  const { error: answersError } = await admin
    .from("public_exam_attempt_answers")
    .insert(attemptAnswers as never);

  if (answersError) {
    console.error("Create public exam answers failed", {
      code: answersError.code,
      message: answersError.message,
    });

    await admin.from("public_exam_attempts").delete().eq("id", attempt.id);

    return {
      status: "error",
      message: "Your answers could not be saved. Please try again.",
    };
  }

  revalidatePath("/student/public-exams");

  return {
    status: "success",
    message: `Score saved: ${score}/${totalQuestions}.`,
    score,
    totalQuestions,
  };
}
