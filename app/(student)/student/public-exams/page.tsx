import Link from "next/link";

import { StudentPublicExamCard } from "@/features/public-exams/components/student-public-exam-card";
import { getStudentPublicExamSets } from "@/features/public-exams/queries";

export default async function StudentPublicExamsPage() {
  const sets = await getStudentPublicExamSets("/student/public-exams");

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Student workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Public Exams</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Take a published set whenever you want. Your personal score is
              saved after each attempt.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/student/groups"
            >
              Batches
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="mt-8 space-y-5">
          {sets.length ? (
            sets.map((set) => <StudentPublicExamCard set={set} key={set.id} />)
          ) : (
            <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
              <h2 className="text-xl font-semibold">No public exams yet</h2>
              <p className="mt-3 text-sm leading-6 text-[#607066]">
                Published public exam sets will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
