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
  maxPoints: number;
  submittedCount: number;
  absentCount: number;
  studentCount: number;
  averageScore: number | null;
  ungradedCount: number;
  results: ExamResultSummary[];
  selectedQuestionIds: string[];
  currentQuestions: ExamQuestionOption[];
};

export type ExamResultSummary = {
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  rollNumber: number | null;
  studentIdentity: string | null;
  score: number | null;
  totalPoints: number | null;
  submittedAt: string | null;
  status: "submitted" | "absent";
};

export type ExamGroupOption = {
  id: string;
  name: string;
};

export type ExamQuestionOption = {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  questionTypes: QuestionType[];
  sourceLabel: string;
  source: "own" | "public" | "current";
  points: number;
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
  description: string | null;
  options: string[];
  questionType: QuestionType;
  settings: QuestionSettings;
  isRequired: boolean;
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

export type ManualGradingAnswer = {
  id: string;
  submissionId: string;
  studentName: string;
  submittedAt: string;
  question: string;
  answer: string;
  scorePoints: number;
  maxPoints: number;
  gradingStatus: "graded" | "ungraded";
};

export type ManualGradingQueue = {
  exam: MeritList["exam"];
  answers: ManualGradingAnswer[];
};

export type ManualGradeActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialManualGradeActionState: ManualGradeActionState = {
  status: "idle",
  message: "",
};

export type SubmitExamActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSubmitExamActionState: SubmitExamActionState = {
  status: "idle",
  message: "",
};

export type QuestionType =
  | "short_answer"
  | "paragraph"
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
