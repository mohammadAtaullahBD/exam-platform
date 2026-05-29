import Link from "next/link";

import { StudentExamCard } from "@/features/exams/components/student-exam-card";
import { getStudentExams } from "@/features/exams/queries";

export default async function StudentExamsPage() {
  const exams = await getStudentExams("/student/exams");

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Student workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Exams</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Upcoming and active exams from groups you have joined.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/student/progress"
            >
              Progress
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/student/practice"
            >
              Practice
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4">
          {exams.length ? (
            exams.map((exam) => <StudentExamCard exam={exam} key={exam.id} />)
          ) : (
            <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
              <h2 className="text-xl font-semibold">No exams available</h2>
              <p className="mt-3 text-sm leading-6 text-[#607066]">
                Active and scheduled exams from joined groups will appear here.
              </p>
              <Link
                className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
                href="/student/groups"
              >
                My groups
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

