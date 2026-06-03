import Link from "next/link";

import { ExamResultsScreen } from "@/features/exams/components/exam-results-screen";
import { getTeacherExamStats } from "@/features/exams/queries";

type TeacherExamStatsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherExamStatsPage({
  params,
}: TeacherExamStatsPageProps) {
  const { id } = await params;
  const exam = await getTeacherExamStats(id);

  return (
    <main className="min-h-screen bg-[#f8fafd] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Exam statistics
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Student Results</h1>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/exams"
          >
            Exams
          </Link>
        </header>

        <ExamResultsScreen exam={exam} />
      </div>
    </main>
  );
}
