import type { Json } from "@/types/database";

export type QuestionType =
  | "short_answer"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale"
  | "rating";

export type GradingMode = "auto" | "none";

export type QuestionSetFilters = {
  query: string;
};

export type QuestionSetQuestion = {
  id: string;
  setId: string;
  content: string;
  description: string | null;
  questionType: QuestionType;
  options: string[];
  settings: Json;
  answerKey: Json;
  isRequired: boolean;
  points: number;
  gradingMode: GradingMode;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type QuestionSet = {
  id: string;
  teacherId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  questions: QuestionSetQuestion[];
};

export type QuestionSetListResult = {
  sets: QuestionSet[];
  schemaReady: boolean;
  message: string | null;
};

export type QuestionSetActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type PublicQuestionSetImportOption = {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
};

export type QuestionImportActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialQuestionSetActionState: QuestionSetActionState = {
  status: "idle",
  message: "",
};

export const initialQuestionImportActionState: QuestionImportActionState = {
  status: "idle",
  message: "",
};
