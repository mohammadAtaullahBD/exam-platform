"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  questionSetItemSchema,
  questionSetSchema,
} from "@/lib/validations/question";
import type { Json } from "@/types/database";

import type {
  QuestionImportActionState,
  QuestionSetActionState,
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
  insert(values: unknown): UntypedQuery<T>;
  update(values: unknown): UntypedQuery<T>;
  delete(): UntypedQuery<T>;
  eq(column: string, value: unknown): UntypedQuery<T>;
  single(): UntypedQuery<T>;
};

type ParsedQuestionSetQuestion = {
  content: string;
  description: string | null;
  questionType: string;
  options: string[];
  settings: Json;
  answerKey: Json;
  isRequired: boolean;
  points: number;
  gradingMode: string;
};

type PublicExamSetQuestionRow = {
  question_id: string | null;
  snapshot_content: string;
  snapshot_options: Json;
  snapshot_correct_answer: string;
  sort_order: number;
};

type PublicExamSetWithQuestionsRow = {
  id: string;
  title: string;
  description: string | null;
  public_exam_set_questions: PublicExamSetQuestionRow[] | null;
};

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

function getString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function getBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function parseQuestionIndexes(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("questionIndexes")
        .filter((value): value is string => typeof value === "string"),
    ),
  );
}

function getQuestionInput(formData: FormData, index: string) {
  const options = formData
    .getAll(`question-${index}-options`)
    .filter((value): value is string => typeof value === "string");

  return {
    content: formData.get(`question-${index}-content`),
    description: formData.get(`question-${index}-description`),
    questionType: formData.get(`question-${index}-type`),
    options,
    answerKey: formData.get(`question-${index}-answerKey`),
    isRequired: getBoolean(formData, `question-${index}-required`),
    points: formData.get(`question-${index}-points`),
    gradingMode: formData.get(`question-${index}-gradingMode`),
    scaleMin: formData.get(`question-${index}-scaleMin`),
    scaleMax: formData.get(`question-${index}-scaleMax`),
    scaleMinLabel: formData.get(`question-${index}-scaleMinLabel`),
    scaleMaxLabel: formData.get(`question-${index}-scaleMaxLabel`),
    ratingMax: formData.get(`question-${index}-ratingMax`),
  };
}

function parseQuestionSetForm(formData: FormData) {
  const setParsed = questionSetSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  const fieldErrors: Record<string, string[]> = {};

  if (!setParsed.success) {
    Object.assign(fieldErrors, setParsed.error.flatten().fieldErrors);
  }

  const questionIndexes = parseQuestionIndexes(formData);

  if (!questionIndexes.length) {
    fieldErrors.questions = ["Add at least one question."];
  }

  const questions: ParsedQuestionSetQuestion[] = [];

  questionIndexes.forEach((index, position) => {
    const questionParsed = questionSetItemSchema.safeParse(
      getQuestionInput(formData, index),
    );

    if (questionParsed.success) {
      questions.push({
        content: questionParsed.data.content,
        description: questionParsed.data.description,
        questionType: questionParsed.data.questionType,
        options: questionParsed.data.options,
        settings: questionParsed.data.settings,
        answerKey: questionParsed.data.answerKey,
        isRequired: questionParsed.data.isRequired,
        points: questionParsed.data.points,
        gradingMode: questionParsed.data.gradingMode,
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
      flattened.scaleMin?.[0] ??
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

function validationErrorState(
  fieldErrors: QuestionSetActionState["fieldErrors"],
): QuestionSetActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

function schemaErrorMessage(error: DbError | null) {
  if (error?.code === "42P01" || error?.message?.includes("question_sets")) {
    return "Question set tables are not available yet. Apply the question-set schema, then retry.";
  }

  return null;
}

async function replaceSetQuestions(
  db: UntypedSupabase,
  setId: string,
  questions: ParsedQuestionSetQuestion[],
) {
  const deleteResult = await db
    .from("question_set_questions")
    .delete()
    .eq("set_id", setId);

  if (deleteResult.error) {
    return deleteResult;
  }

  const rows = questions.map((question, index) => ({
    set_id: setId,
    content: question.content,
    description: question.description,
    question_type: question.questionType,
    options: question.options,
    settings: question.settings,
    answer_key: question.answerKey,
    is_required: question.isRequired,
    points: question.points,
    grading_mode: question.gradingMode,
    sort_order: index,
  }));

  return db.from("question_set_questions").insert(rows);
}

export async function createQuestionSet(
  _previousState: QuestionSetActionState,
  formData: FormData,
): Promise<QuestionSetActionState> {
  const parsed = parseQuestionSetForm(formData);

  if (!parsed.ok) {
    return validationErrorState(parsed.fieldErrors);
  }

  const { db, user } = await requireTeacher("/questions");
  const { title, description, questions } = parsed.input;
  const { data: set, error: setError } = (await db
    .from("question_sets")
    .insert({
      teacher_id: user.id,
      title,
      description,
    })
    .select("id")
    .single()) as DbResponse<{ id: string }>;

  if (setError || !set) {
    console.error("Create question set failed", {
      code: setError?.code,
      message: setError?.message,
    });

    return {
      status: "error",
      message:
        schemaErrorMessage(setError) ??
        "Question set could not be created. Please try again.",
    };
  }

  const questionsResult = await replaceSetQuestions(db, set.id, questions);

  if (questionsResult.error) {
    console.error("Create question set questions failed", {
      code: questionsResult.error.code,
      message: questionsResult.error.message,
    });

    await db.from("question_sets").delete().eq("id", set.id);

    return {
      status: "error",
      message: "Set questions could not be saved. Please try again.",
    };
  }

  revalidatePath("/questions");
  revalidatePath("/exams");

  return {
    status: "success",
    message: "Question set created.",
  };
}

export async function updateQuestionSet(
  setId: string,
  _previousState: QuestionSetActionState,
  formData: FormData,
): Promise<QuestionSetActionState> {
  const parsed = parseQuestionSetForm(formData);

  if (!parsed.ok) {
    return validationErrorState(parsed.fieldErrors);
  }

  const { db, user } = await requireTeacher("/questions");
  const { title, description, questions } = parsed.input;
  const { data: set, error: setError } = (await db
    .from("question_sets")
    .update({
      title,
      description,
    })
    .eq("id", setId)
    .eq("teacher_id", user.id)
    .select("id")
    .single()) as DbResponse<{ id: string }>;

  if (setError || !set) {
    console.error("Update question set failed", {
      code: setError?.code,
      message: setError?.message,
    });

    return {
      status: "error",
      message:
        schemaErrorMessage(setError) ??
        "Question set could not be updated. Please try again.",
    };
  }

  const questionsResult = await replaceSetQuestions(db, setId, questions);

  if (questionsResult.error) {
    console.error("Update question set questions failed", {
      code: questionsResult.error.code,
      message: questionsResult.error.message,
    });

    return {
      status: "error",
      message: "Set questions could not be saved. Please try again.",
    };
  }

  revalidatePath("/questions");
  revalidatePath("/exams");

  return {
    status: "success",
    message: "Question set saved.",
  };
}

export async function deleteQuestionSet(
  setId: string,
  _previousState: QuestionSetActionState,
): Promise<QuestionSetActionState> {
  void _previousState;

  const { db, user } = await requireTeacher("/questions");
  const { error } = await db
    .from("question_sets")
    .delete()
    .eq("id", setId)
    .eq("teacher_id", user.id);

  if (error) {
    console.error("Delete question set failed", {
      code: error.code,
      message: error.message,
    });

    return {
      status: "error",
      message:
        schemaErrorMessage(error) ??
        "Question set could not be deleted. Please try again.",
    };
  }

  revalidatePath("/questions");
  revalidatePath("/exams");

  return {
    status: "success",
    message: "Question set deleted.",
  };
}

export async function copyPublicExamSetToQuestionSets(
  _previousState: QuestionImportActionState,
  formData: FormData,
): Promise<QuestionImportActionState> {
  const setId = getString(formData, "setId");

  if (!setId) {
    return {
      status: "error",
      message: "Choose a public set to copy.",
    };
  }

  const { db, supabase, user } = await requireTeacher("/questions");
  const { data: setData, error: setError } = await supabase
    .from("public_exam_sets")
    .select("id,title,description,public_exam_set_questions(*)")
    .eq("id", setId)
    .eq("is_published", true)
    .maybeSingle();
  const set = setData as PublicExamSetWithQuestionsRow | null;

  if (setError || !set) {
    return {
      status: "error",
      message: "This public set is not available.",
    };
  }

  const questions = [...(set.public_exam_set_questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  if (!questions.length) {
    return {
      status: "error",
      message: "This public set has no questions to copy.",
    };
  }

  const { data: createdSet, error: createSetError } = (await db
    .from("question_sets")
    .insert({
      teacher_id: user.id,
      title: set.title,
      description: set.description,
    })
    .select("id")
    .single()) as DbResponse<{ id: string }>;

  if (createSetError || !createdSet) {
    console.error("Import public set failed", {
      code: createSetError?.code,
      message: createSetError?.message,
    });

    return {
      status: "error",
      message:
        schemaErrorMessage(createSetError) ??
        "Public set could not be copied. Please try again.",
    };
  }

  const insertRows = questions.map((question, index) => ({
    set_id: createdSet.id,
    content: question.snapshot_content,
    description: null,
    question_type: "multiple_choice",
    options: question.snapshot_options,
    settings: {},
    answer_key: { value: question.snapshot_correct_answer },
    is_required: true,
    points: 1,
    grading_mode: "auto",
    sort_order: index,
    original_question_id: question.question_id,
  }));
  const { error } = await db.from("question_set_questions").insert(insertRows);

  if (error) {
    console.error("Import public set questions failed", {
      code: error.code,
      message: error.message,
    });

    await db.from("question_sets").delete().eq("id", createdSet.id);

    return {
      status: "error",
      message: "Public set questions could not be copied. Please try again.",
    };
  }

  revalidatePath("/questions");
  revalidatePath("/exams");

  return {
    status: "success",
    message: `${questions.length} ${
      questions.length === 1 ? "question" : "questions"
    } copied into a new set.`,
  };
}
