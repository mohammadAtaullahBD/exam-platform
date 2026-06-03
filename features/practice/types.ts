export type PracticeQuestion = {
  id: string;
  submissionAnswerId: string;
  examId: string;
  examTitle: string;
  groupName: string;
  content: string;
  description: string | null;
  options: string[];
  questionType: QuestionType;
  settings: QuestionSettings;
  submittedAnswer: string;
  correctAnswer: string;
  submittedAt: string;
};

export type QuestionType =
  | "short_answer"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale"
  | "rating";

export type QuestionSettings = {
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  shuffleOptions?: boolean;
};
