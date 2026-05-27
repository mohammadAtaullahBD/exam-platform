"use client";

import { useActionState } from "react";

import { deleteExam } from "@/features/exams/actions";
import { initialExamActionState, type Exam } from "@/features/exams/types";

type ExamCardProps = {
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ExamCard({ exam }: ExamCardProps) {
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteExam.bind(null, exam.id),
    initialExamActionState,
  );
  const canDelete = exam.state === "scheduled";

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            {exam.groupName}
          </p>
          <h2 className="mt-2 text-xl font-semibold">{exam.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#607066]">
            {exam.questionCount}{" "}
            {exam.questionCount === 1 ? "question" : "questions"}
          </p>
        </div>
        <div
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${stateClasses[exam.state]}`}
        >
          {stateLabels[exam.state]}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
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
      </dl>

      <form action={deleteAction} className="mt-5">
        {deleteState.message ? (
          <div
            className={`mb-3 rounded-md border px-4 py-3 text-sm ${
              deleteState.status === "success"
                ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
            }`}
          >
            {deleteState.message}
          </div>
        ) : null}
        <button
          className="h-11 rounded-md border border-[#d9b7ad] px-4 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isDeleting || !canDelete}
        >
          {isDeleting ? "Deleting..." : "Delete scheduled exam"}
        </button>
      </form>
    </article>
  );
}
