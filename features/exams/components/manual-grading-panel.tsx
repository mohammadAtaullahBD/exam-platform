"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import { gradeManualAnswer } from "@/features/exams/actions";
import {
  initialManualGradeActionState,
  type ManualGradingAnswer,
  type ManualGradingQueue,
} from "@/features/exams/types";

type ManualGradingPanelProps = {
  queue: ManualGradingQueue;
};

export function ManualGradingPanel({ queue }: ManualGradingPanelProps) {
  if (queue.exam.state !== "closed") {
    return (
      <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-5">
        <h2 className="text-xl font-semibold">Manual grading</h2>
        <p className="mt-2 text-sm leading-6 text-[#607066]">
          Manual paragraph grading opens after this exam closes.
        </p>
      </section>
    );
  }

  if (!queue.answers.length) {
    return (
      <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-5">
        <h2 className="text-xl font-semibold">Manual grading</h2>
        <p className="mt-2 text-sm leading-6 text-[#607066]">
          No manual paragraph answers are waiting for this exam.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Manual grading</h2>
        <p className="mt-2 text-sm leading-6 text-[#607066]">
          Review paragraph answers and update scores before relying on the merit
          order.
        </p>
      </div>

      <div className="grid gap-4">
        {queue.answers.map((answer) => (
          <ManualAnswerForm answer={answer} key={answer.id} />
        ))}
      </div>
    </section>
  );
}

type ManualAnswerFormProps = {
  answer: ManualGradingAnswer;
};

function ManualAnswerForm({ answer }: ManualAnswerFormProps) {
  const [state, formAction, isPending] = useActionState(
    gradeManualAnswer.bind(null, answer.id),
    initialManualGradeActionState,
  );

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-sm font-semibold text-[#26352b]">
              {answer.studentName}
            </p>
            <p className="mt-1 text-xs text-[#607066]">
              Submitted {new Date(answer.submittedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#26352b]">Question</p>
            <p className="mt-1 break-words text-sm leading-6 text-[#4d5b52]">
              {answer.question}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#26352b]">Answer</p>
            <p className="mt-1 whitespace-pre-wrap break-words rounded-md border border-[#e4e9e5] bg-[#f8faf8] p-3 text-sm leading-6 text-[#243229]">
              {answer.answer || "No answer provided."}
            </p>
          </div>
        </div>

        <form action={formAction} className="w-full shrink-0 space-y-3 lg:w-48">
          <label className="block">
            <span className="text-sm font-medium text-[#26352b]">
              Score out of {answer.maxPoints}
            </span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[#d7cec3] bg-white px-3 text-sm outline-none transition focus:border-[#673ab7] focus:ring-4 focus:ring-[#673ab7]/10"
              name="scorePoints"
              type="number"
              min={0}
              max={answer.maxPoints}
              defaultValue={answer.scorePoints}
              disabled={isPending}
              required
            />
          </label>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#673ab7] px-3 text-sm font-semibold text-white transition hover:bg-[#5b32a4] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            <Save className="size-4" aria-hidden="true" />
            {isPending ? "Saving..." : "Save grade"}
          </button>
          {state.message ? (
            <p
              className={`text-sm ${
                state.status === "success" ? "text-[#256533]" : "text-[#8a3a28]"
              }`}
            >
              {state.message}
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066]">
              {answer.gradingStatus}
            </p>
          )}
        </form>
      </div>
    </article>
  );
}
