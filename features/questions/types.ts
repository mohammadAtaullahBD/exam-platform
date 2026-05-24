export type QuestionSource = "teacher" | "admin";
export type QuestionSourceFilter = "all" | QuestionSource;

export type Question = {
  id: string;
  authorId: string;
  content: string;
  options: string[];
  correctAnswer: string;
  source: QuestionSource;
  originalId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionFilters = {
  query: string;
  source: QuestionSourceFilter;
};

export type QuestionActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    content?: string[];
    options?: string[];
    correctOptionIndex?: string[];
  };
};

export const initialQuestionActionState: QuestionActionState = {
  status: "idle",
  message: "",
};
