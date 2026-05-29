export type ProgressExamResult = {
  examId: string;
  title: string;
  groupName: string;
  startsAt: string;
  endsAt: string;
  submittedAt: string;
  score: number;
  totalQuestions: number;
  rank: number | null;
  participantCount: number;
};

export type ProgressStats = {
  completedExams: number;
  totalCorrect: number;
  totalQuestions: number;
  averagePercent: number;
  bestPercent: number;
};

export type ProgressDashboardData = {
  stats: ProgressStats;
  results: ProgressExamResult[];
};

