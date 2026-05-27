export type ExamState = "scheduled" | "active" | "closed";

export type Exam = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  state: ExamState;
  questionCount: number;
};

export type ExamGroupOption = {
  id: string;
  name: string;
};

export type ExamQuestionOption = {
  id: string;
  content: string;
  options: string[];
  correctAnswer: string;
};

export type ExamActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    title?: string[];
    groupId?: string[];
    questionIds?: string[];
    startsAt?: string[];
    endsAt?: string[];
  };
};

export const initialExamActionState: ExamActionState = {
  status: "idle",
  message: "",
};
