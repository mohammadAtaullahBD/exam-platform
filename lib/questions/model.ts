import type { Json } from "@/types/database";

import type {
  GradingMode,
  QuestionAnswerKey,
  QuestionDefinition,
  QuestionResponse,
  QuestionSettings,
  QuestionType,
  ScoredQuestionResponse,
} from "./types";

const selectableTypes = new Set<QuestionType>([
  "multiple_choice",
  "checkboxes",
  "dropdown",
]);

export function isQuestionType(value: unknown): value is QuestionType {
  return (
    value === "short_answer" ||
    value === "paragraph" ||
    value === "multiple_choice" ||
    value === "checkboxes" ||
    value === "dropdown" ||
    value === "linear_scale" ||
    value === "rating"
  );
}

export function isSelectableQuestionType(type: QuestionType) {
  return selectableTypes.has(type);
}

export function optionsFromJson(options: Json): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

export function objectFromJson(value: Json): Record<string, Json> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return value as Record<string, Json>;
}

export function settingsFromJson(value: Json): QuestionSettings {
  const object = objectFromJson(value);
  const min = numberFromUnknown(object.min);
  const max = numberFromUnknown(object.max);
  const minLabel = stringFromUnknown(object.minLabel);
  const maxLabel = stringFromUnknown(object.maxLabel);
  const icon = stringFromUnknown(object.icon);

  return {
    ...(min === null ? {} : { min }),
    ...(max === null ? {} : { max }),
    ...(minLabel ? { minLabel } : {}),
    ...(maxLabel ? { maxLabel } : {}),
    ...(icon === "heart" || icon === "thumb" ? { icon } : { icon: "star" }),
  };
}

export function answerKeyFromJson(value: Json): QuestionAnswerKey {
  const object = objectFromJson(value);
  const answer = object.answer;
  const answers = object.answers;
  const caseSensitive = object.caseSensitive;

  return {
    ...(typeof answer === "string" || typeof answer === "number"
      ? { answer }
      : {}),
    ...(Array.isArray(answers)
      ? { answers: answers.filter((item): item is string => typeof item === "string") }
      : {}),
    ...(typeof caseSensitive === "boolean" ? { caseSensitive } : {}),
  };
}

export function normalizeQuestionType(value: unknown): QuestionType {
  return isQuestionType(value) ? value : "multiple_choice";
}

export function normalizeGradingMode(value: unknown): GradingMode {
  return value === "none" ? "none" : "auto";
}

export function defaultSettingsForType(type: QuestionType): QuestionSettings {
  if (type === "linear_scale") {
    return { min: 1, max: 5, minLabel: "", maxLabel: "" };
  }

  if (type === "rating") {
    return { min: 1, max: 5, icon: "star" };
  }

  return {};
}

export function defaultAnswerKeyForType(type: QuestionType): QuestionAnswerKey {
  if (type === "checkboxes" || type === "short_answer") {
    return { answers: [] };
  }

  if (type === "paragraph") {
    return {};
  }

  return { answer: "" };
}

export function answerKeyToLegacyText(answerKey: QuestionAnswerKey): string {
  if (typeof answerKey.answer === "number") {
    return String(answerKey.answer);
  }

  if (typeof answerKey.answer === "string") {
    return answerKey.answer;
  }

  if (answerKey.answers?.[0]) {
    return answerKey.answers[0];
  }

  return "";
}

export function responseToLegacyText(response: QuestionResponse) {
  if (Array.isArray(response)) {
    return response.join("; ");
  }

  if (typeof response === "number") {
    return String(response);
  }

  return response ?? "";
}

export function responseToJson(response: QuestionResponse): Json {
  if (Array.isArray(response)) {
    return response;
  }

  return response;
}

export function scoreQuestionResponse(
  question: QuestionDefinition,
  response: QuestionResponse,
): ScoredQuestionResponse {
  const answerText = responseToLegacyText(response);
  const ungraded = {
    response: responseToJson(response),
    answerText,
    isCorrect: false,
    isGradable: false,
    scorePoints: 0,
    maxPoints: 0,
    gradingStatus: "ungraded" as const,
  };

  if (question.gradingMode !== "auto" || question.points <= 0) {
    return ungraded;
  }

  const isCorrect = isResponseCorrect(question, response);

  return {
    response: responseToJson(response),
    answerText,
    isCorrect,
    isGradable: true,
    scorePoints: isCorrect ? question.points : 0,
    maxPoints: question.points,
    gradingStatus: "graded",
  };
}

function isResponseCorrect(question: QuestionDefinition, response: QuestionResponse) {
  if (question.questionType === "multiple_choice" || question.questionType === "dropdown") {
    return (
      typeof response === "string" &&
      question.options.includes(response) &&
      normalizeText(response) === normalizeText(String(question.answerKey.answer ?? ""))
    );
  }

  if (question.questionType === "checkboxes") {
    if (!Array.isArray(response)) {
      return false;
    }

    const selected = uniqueNormalized(response);
    const expected = uniqueNormalized(question.answerKey.answers ?? []);

    return (
      selected.length > 0 &&
      selected.length === expected.length &&
      selected.every((item, index) => item === expected[index])
    );
  }

  if (question.questionType === "short_answer") {
    if (typeof response !== "string") {
      return false;
    }

    const caseSensitive = question.answerKey.caseSensitive ?? false;
    const submitted = normalizeFreeText(response, caseSensitive);

    return (question.answerKey.answers ?? []).some(
      (answer) => normalizeFreeText(answer, caseSensitive) === submitted,
    );
  }

  if (question.questionType === "linear_scale" || question.questionType === "rating") {
    const answer = numberFromUnknown(question.answerKey.answer);

    return typeof response === "number" && answer !== null && response === answer;
  }

  return false;
}

function uniqueNormalized(values: string[]) {
  return [...new Set(values.map(normalizeText))].sort();
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeFreeText(value: string, caseSensitive: boolean) {
  const collapsed = value.trim().replace(/\s+/g, " ");

  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

function stringFromUnknown(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }

  return null;
}

