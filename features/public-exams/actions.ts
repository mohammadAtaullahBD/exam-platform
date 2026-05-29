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

type PublicExamSetQuestionRow =
  Database["public"]["Tables"]["public_exam_set_questions"]["Row"];

type PublicExamSetWithQuestionsRow =
  Database["public"]["Tables"]["public_exam_sets"]["Row"] & {
    public_exam_set_questions: PublicExamSetQuestionRow[] | null;
  };

type ParsedSetQuestion = {
  content: string;
  options: string[];
  correctAnswer: string;
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

function stringFromForm(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
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
      questions.push(questionParsed.data);
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
        source: "admin",
      })
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
  }));
  const { error: setQuestionsError } = await supabase
    .from("public_exam_set_questions")
    .insert(setQuestions);

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
    answersByQuestionId: new Map(
      questionIds.map((questionId) => [
        questionId,
        stringFromForm(formData.get(`answer-${questionId}`)).trim(),
      ]),
    ),
  };
}

export async function submitPublicExamAttempt(
  _previousState: PublicExamActionState,
  formData: FormData,
): Promise<PublicExamActionState> {
  const { setId, answersByQuestionId } = getAttemptInput(formData);

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
    const answer = answersByQuestionId.get(question.id) ?? "";
    const options = optionsFromJson(question.snapshot_options);
    const isAvailableOption = options.includes(answer);

    return {
      question,
      answer,
      isValid: Boolean(answer) && isAvailableOption,
      isCorrect: isAvailableOption && answer === question.snapshot_correct_answer,
    };
  });

  if (scoredAnswers.some((answer) => !answer.isValid)) {
    return validationErrorState({
      answers: ["Answer every question before submitting."],
    });
  }

  const score = scoredAnswers.filter((answer) => answer.isCorrect).length;
  const totalQuestions = scoredAnswers.length;
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
  }));
  const { error: answersError } = await admin
    .from("public_exam_attempt_answers")
    .insert(attemptAnswers);

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
