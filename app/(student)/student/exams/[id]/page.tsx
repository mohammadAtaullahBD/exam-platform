import Link from "next/link";

import { StudentExamForm } from "@/features/exams/components/student-exam-form";
import { getStudentExamDetail } from "@/features/exams/queries";

type StudentExamPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function StudentExamPage({ params }: StudentExamPageProps) {
  const { id } = await params;
  const exam = await getStudentExamDetail(id);
  const isClosed = exam.state === "closed";

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              {exam.groupName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{exam.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Teacher: {exam.teacherName}
            </p>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/student/exams"
          >
            All exams
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Starts</p>
            <p className="mt-2 font-semibold">{formatDateTime(exam.startsAt)}</p>
          </div>
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Ends</p>
            <p className="mt-2 font-semibold">{formatDateTime(exam.endsAt)}</p>
          </div>
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Questions</p>
            <p className="mt-2 font-semibold">{exam.questionCount}</p>
          </div>
        </section>

        {exam.submission ? (
          <section className="mt-8 rounded-lg border border-[#b8d3bd] bg-[#eef8f0] p-6 text-[#244c2c]">
            <h2 className="text-xl font-semibold">Submission received</h2>
            <p className="mt-3 text-sm leading-6">
              Submitted {formatDateTime(exam.submission.submittedAt)}.
            </p>
            {isClosed ? (
              <p className="mt-3 text-lg font-semibold">
                Score: {exam.submission.score}/{exam.submission.totalQuestions}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                className="flex h-10 items-center justify-center rounded-md border border-[#9dc2a5] px-4 text-sm font-semibold transition hover:bg-white/50"
                href="/student/progress"
              >
                Progress
              </Link>
              {isClosed ? (
                <Link
                  className="flex h-10 items-center justify-center rounded-md border border-[#9dc2a5] px-4 text-sm font-semibold transition hover:bg-white/50"
                  href={`/student/exams/${exam.id}/merit`}
                >
                  Merit list
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {!exam.submission && exam.state === "scheduled" ? (
          <section className="mt-8 rounded-lg border border-[#e5d6b8] bg-[#fffaf0] p-6 text-[#6c5620]">
            <h2 className="text-xl font-semibold">Exam is scheduled</h2>
            <p className="mt-3 text-sm leading-6">
              This exam opens at {formatDateTime(exam.startsAt)}.
            </p>
          </section>
        ) : null}

        {!exam.submission && exam.state === "active" ? (
          <StudentExamForm exam={exam} />
        ) : null}

        {!exam.submission && isClosed ? (
          <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-6">
            <h2 className="text-xl font-semibold">Exam closed</h2>
            <p className="mt-3 text-sm leading-6 text-[#607066]">
              This exam is no longer accepting submissions.
            </p>
            <Link
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href={`/student/exams/${exam.id}/merit`}
            >
              Merit list
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}

