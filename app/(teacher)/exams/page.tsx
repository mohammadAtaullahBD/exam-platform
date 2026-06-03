import Link from "next/link";

import { ExamWorkspace } from "@/features/exams/components/exam-workspace";
import { getExamBuilderData, getTeacherExams } from "@/features/exams/queries";

export default async function TeacherExamsPage() {
  const [exams, builderData] = await Promise.all([
    getTeacherExams("/exams"),
    getExamBuilderData("/exams"),
  ]);

  return (
    <main className="min-h-screen bg-[#f8fafd] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Teacher workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Exams</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Schedule batch exams, attach questions, and track student results.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/batches"
            >
              Batches
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/questions"
            >
              Questions
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <ExamWorkspace
          exams={exams}
          groups={builderData.groups}
          questions={builderData.questions}
        />
      </div>
    </main>
  );
}
