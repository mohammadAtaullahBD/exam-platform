import Link from "next/link";

import { CreateExamForm } from "@/features/exams/components/create-exam-form";
import { ExamCard } from "@/features/exams/components/exam-card";
import { getExamBuilderData, getTeacherExams } from "@/features/exams/queries";

export default async function TeacherExamsPage() {
  const [exams, builderData] = await Promise.all([
    getTeacherExams("/exams"),
    getExamBuilderData("/exams"),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Teacher workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Exams</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Schedule group exams from your question bank.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/groups"
            >
              Groups
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <section className="space-y-4">
            {exams.length ? (
              exams.map((exam) => <ExamCard exam={exam} key={exam.id} />)
            ) : (
              <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
                <h2 className="text-xl font-semibold">No exams yet</h2>
                <p className="mt-3 text-sm leading-6 text-[#607066]">
                  Create your first exam after you have at least one group and
                  one question ready.
                </p>
              </div>
            )}
          </section>

          <aside>
            <CreateExamForm
              groups={builderData.groups}
              questions={builderData.questions}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
