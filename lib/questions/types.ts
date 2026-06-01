import type { Json } from "@/types/database";

export const questionTypes = [
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "rating",
] as const;

export type QuestionType = (typeof questionTypes)[number];
export type GradingMode = "auto" | "none";

export type QuestionSettings = {
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  icon?: "star" | "heart" | "thumb";
};

export type QuestionAnswerKey = {
  answer?: string | number;
  answers?: string[];
  caseSensitive?: boolean;
};

export type QuestionDefinition = {
  id: string;
  content: string;
  description: string | null;
  questionType: QuestionType;
  options: string[];
  settings: QuestionSettings;
  answerKey: QuestionAnswerKey;
  gradingMode: GradingMode;
  points: number;
  isRequired: boolean;
};

export type QuestionResponse = string | string[] | number | null;

export type ScoredQuestionResponse = {
  response: Json;
  answerText: string;
  isCorrect: boolean;
  isGradable: boolean;
  scorePoints: number;
  maxPoints: number;
  gradingStatus: "graded" | "ungraded";
};

