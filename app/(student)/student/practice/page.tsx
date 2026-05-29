import Link from "next/link";

import { PracticeList } from "@/features/practice/components/practice-list";
import { getPracticeQuestions } from "@/features/practice/queries";

export default async function StudentPracticePage() {
  const questions = await getPracticeQuestions("/student/practice");

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Student workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Practice</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Questions you answered incorrectly in closed exams.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/student/exams"
            >
              Exams
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/student/progress"
            >
              Progress
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <PracticeList questions={questions} />
      </div>
    </main>
  );
}

