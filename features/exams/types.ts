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

export type StudentExamSummary = {
  id: string;
  title: string;
  groupName: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  state: Exclude<ExamState, "closed">;
  questionCount: number;
  submittedAt: string | null;
};

export type StudentExamQuestion = {
  id: string;
  content: string;
  options: string[];
  sortOrder: number;
};

export type StudentExamSubmission = {
  id: string;
  score: number;
  totalQuestions: number;
  submittedAt: string;
};

export type StudentExamDetail = {
  id: string;
  title: string;
  groupName: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  state: ExamState;
  questionCount: number;
  questions: StudentExamQuestion[];
  submission: StudentExamSubmission | null;
};

export type MeritEntry = {
  rank: number;
  submissionId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  submittedAt: string;
};

export type MeritList = {
  exam: {
    id: string;
    title: string;
    groupName: string;
    startsAt: string;
    endsAt: string;
    state: ExamState;
  };
  entries: MeritEntry[];
};

export type SubmitExamActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSubmitExamActionState: SubmitExamActionState = {
  status: "idle",
  message: "",
};
