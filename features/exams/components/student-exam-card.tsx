import Link from "next/link";

import { ExamCountdown } from "@/features/exams/components/exam-countdown";
import type { StudentExamSummary } from "@/features/exams/types";

type StudentExamCardProps = {
  exam: StudentExamSummary;
};

const stateClasses = {
  scheduled: "border-[#d8dfda] bg-[#f6f8f5] text-[#1f3528]",
  active: "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StudentExamCard({ exam }: StudentExamCardProps) {
  const isActive = exam.state === "active";
  const href = `/student/exams/${exam.id}`;

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            {exam.groupName}
          </p>
          <h2 className="mt-2 text-xl font-semibold">{exam.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#607066]">
            Teacher: {exam.teacherName}
          </p>
        </div>
        <div
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${stateClasses[exam.state]}`}
        >
          {isActive ? "Active" : "Scheduled"}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
          <dt className="font-medium text-[#607066]">Starts</dt>
          <dd className="mt-1 font-semibold text-[#26352b]">
            {formatDateTime(exam.startsAt)}
          </dd>
        </div>
        <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
          <dt className="font-medium text-[#607066]">Ends</dt>
          <dd className="mt-1 font-semibold text-[#26352b]">
            {formatDateTime(exam.endsAt)}
          </dd>
        </div>
        <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
          <dt className="font-medium text-[#607066]">Questions</dt>
          <dd className="mt-1 font-semibold text-[#26352b]">
            {exam.questionCount}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {isActive ? (
          <ExamCountdown endsAt={exam.endsAt} />
        ) : (
          <p className="text-sm font-medium text-[#607066]">
            Opens {formatDateTime(exam.startsAt)}
          </p>
        )}

        <Link
          className={`flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${
            isActive
              ? "bg-[#17211b] text-white hover:bg-[#26352b]"
              : "border border-[#cfd8d2] text-[#1f3528] hover:bg-[#eef5f0]"
          }`}
          href={href}
        >
          {exam.submittedAt
            ? "View submission"
            : isActive
              ? "Open exam"
              : "View details"}
        </Link>
      </div>
    </article>
  );
}

