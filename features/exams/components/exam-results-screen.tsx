import {
  BarChart3,
  ClipboardList,
  FileText,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import type { Exam } from "@/features/exams/types";

type ExamResultsScreenProps = {
  exam: Exam;
};

const stateLabels = {
  scheduled: "Scheduled",
  active: "Active",
  closed: "Closed",
};

const stateClasses = {
  scheduled: "border-[#d8dfda] bg-[#f6f8f5] text-[#1f3528]",
  active: "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]",
  closed: "border-[#d1c5b5] bg-[#f7f1e8] text-[#5e4b34]",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatScore(value: number | null) {
  if (value === null) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function ExamResultsScreen({ exam }: ExamResultsScreenProps) {
  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[#d8dfda] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              {exam.groupName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{exam.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#607066]">
              Review attendance, scores, absences, and manual grading status for
              every student in this batch.
            </p>
          </div>
          <span
            className={`inline-flex h-10 items-center rounded-md border px-3 text-sm font-semibold ${stateClasses[exam.state]}`}
          >
            {stateLabels[exam.state]}
          </span>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Starts" value={formatDateTime(exam.startsAt)} />
          <InfoTile label="Ends" value={formatDateTime(exam.endsAt)} />
          <InfoTile label="Questions" value={exam.questionCount} />
          <InfoTile label="Max points" value={exam.maxPoints} />
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatTile icon={Users} label="Taken" value={exam.submittedCount} />
        <StatTile icon={Users} label="Absent" value={exam.absentCount} />
        <StatTile icon={Users} label="Students" value={exam.studentCount} />
        <StatTile
          icon={BarChart3}
          label="Average"
          value={exam.averageScore === null ? "-" : exam.averageScore.toFixed(1)}
        />
        <StatTile icon={FileText} label="Ungraded" value={exam.ungradedCount} />
        <StatTile icon={ClipboardList} label="State" value={stateLabels[exam.state]} />
      </section>

      <section className="overflow-hidden rounded-lg border border-[#d8dfda] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#d8dfda] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">All Student Results</h2>
            <p className="mt-2 text-sm text-[#607066]">
              Roll and identity come from the batch member settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/batches"
            >
              Manage batch
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href={`/exams/${exam.id}/merit`}
            >
              Merit and grading
            </Link>
          </div>
        </div>

        {exam.results.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead className="bg-[#f6f8f5] text-[#607066]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Roll</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Identity</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {exam.results.map((result) => (
                  <tr
                    className="border-t border-[#e7ece8]"
                    key={result.studentId}
                  >
                    <td className="px-4 py-4 font-semibold text-[#17211b]">
                      {result.rollNumber ? `#${result.rollNumber}` : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="block font-semibold text-[#26352b]">
                        {result.studentName}
                      </span>
                      {result.studentEmail ? (
                        <span className="mt-1 block text-xs text-[#607066]">
                          {result.studentEmail}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-[#26352b]">
                      {result.studentIdentity ?? "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                          result.status === "submitted"
                            ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                            : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
                        }`}
                      >
                        {result.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-[#26352b]">
                      {result.status === "submitted"
                        ? `${formatScore(result.score)}/${formatScore(
                            result.totalPoints,
                          )}`
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-[#607066]">
                      {formatDateTime(result.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm leading-6 text-[#607066]">
            Add students to this batch to see attendance and results.
          </p>
        )}
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
      <dt className="text-sm font-medium text-[#607066]">{label}</dt>
      <dd className="mt-1 font-semibold text-[#26352b]">{value}</dd>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-[#d8dfda] bg-white p-4">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#607066]">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-2 text-xl font-semibold text-[#17211b]">{value}</dd>
    </div>
  );
}
