export type PublicExamActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
  score?: number;
  totalQuestions?: number;
};

export const initialPublicExamActionState: PublicExamActionState = {
  status: "idle",
  message: "",
};

export type AdminPublicExamSet = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
};

export type PublicExamQuestion = {
  id: string;
  content: string;
  options: string[];
};

export type PublicExamAttemptSummary = {
  id: string;
  score: number;
  totalQuestions: number;
  submittedAt: string;
};

export type StudentPublicExamSet = {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  questions: PublicExamQuestion[];
  attempts: PublicExamAttemptSummary[];
};
