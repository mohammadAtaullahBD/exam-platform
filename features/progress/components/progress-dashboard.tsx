import Link from "next/link";

import type { ProgressDashboardData } from "@/features/progress/types";

type ProgressDashboardProps = {
  data: ProgressDashboardData;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function scoreLabel(score: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((score / total) * 100)}%`;
}

export function ProgressDashboard({ data }: ProgressDashboardProps) {
  return (
    <div className="mt-8 grid gap-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
          <p className="text-sm font-medium text-[#607066]">Completed exams</p>
          <p className="mt-2 text-2xl font-semibold">
            {data.stats.completedExams}
          </p>
        </div>
        <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
          <p className="text-sm font-medium text-[#607066]">Average score</p>
          <p className="mt-2 text-2xl font-semibold">
            {data.stats.averagePercent}%
          </p>
        </div>
        <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
          <p className="text-sm font-medium text-[#607066]">Best score</p>
          <p className="mt-2 text-2xl font-semibold">
            {data.stats.bestPercent}%
          </p>
        </div>
      </section>

      {data.results.length ? (
        <section className="overflow-hidden rounded-lg border border-[#d8dfda] bg-white">
          <div className="border-b border-[#d8dfda] p-5">
            <h2 className="text-xl font-semibold">Previous exams</h2>
            <p className="mt-2 text-sm text-[#607066]">
              Closed exams with score and merit position.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="bg-[#f6f8f5] text-[#607066]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Exam</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Merit</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold"> </th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((result) => (
                  <tr className="border-t border-[#e7ece8]" key={result.examId}>
                    <td className="px-4 py-4 font-semibold text-[#17211b]">
                      {result.title}
                    </td>
                    <td className="px-4 py-4 text-[#26352b]">
                      {result.groupName}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[#26352b]">
                      {result.score}/{result.totalQuestions}{" "}
                      <span className="text-[#607066]">
                        ({scoreLabel(result.score, result.totalQuestions)})
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#26352b]">
                      {result.rank
                        ? `${result.rank} of ${result.participantCount}`
                        : "Not available"}
                    </td>
                    <td className="px-4 py-4 text-[#607066]">
                      {formatDate(result.submittedAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
                        href={`/student/exams/${result.examId}/merit`}
                      >
                        Merit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-[#d8dfda] bg-white p-6">
          <h2 className="text-xl font-semibold">No completed exams yet</h2>
          <p className="mt-3 text-sm leading-6 text-[#607066]">
            Scores and merit positions appear here after submitted exams close.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/student/exams"
          >
            Exams
          </Link>
        </section>
      )}
    </div>
  );
}
