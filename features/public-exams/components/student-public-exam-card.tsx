"use client";

import { useActionState } from "react";

import { submitPublicExamAttempt } from "@/features/public-exams/actions";
import {
  initialPublicExamActionState,
  type StudentPublicExamSet,
} from "@/features/public-exams/types";

type StudentPublicExamCardProps = {
  set: StudentPublicExamSet;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StudentPublicExamCard({ set }: StudentPublicExamCardProps) {
  const [state, formAction, isPending] = useActionState(
    submitPublicExamAttempt,
    initialPublicExamActionState,
  );
  const latestAttempt = set.attempts[0];
  const canSubmit = set.questions.length > 0;

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            Public exam
          </p>
          <h2 className="mt-2 text-xl font-semibold">{set.title}</h2>
          {set.description ? (
            <p className="mt-3 text-sm leading-6 text-[#607066]">
              {set.description}
            </p>
          ) : null}
        </div>
        <div className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 text-sm font-semibold text-[#1f3528]">
          {set.questionCount} {set.questionCount === 1 ? "question" : "questions"}
        </div>
      </div>

      {latestAttempt ? (
        <div className="mt-5 rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-4">
          <p className="text-sm font-semibold text-[#26352b]">
            Latest score: {latestAttempt.score}/{latestAttempt.totalQuestions}
          </p>
          <p className="mt-1 text-sm text-[#607066]">
            Submitted {formatDateTime(latestAttempt.submittedAt)}
          </p>
        </div>
      ) : null}

      {state.message ? (
        <div
          className={`mt-5 rounded-md border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
              : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-6">
        <input name="setId" type="hidden" value={set.id} />

        <div className="space-y-5">
          {set.questions.map((question, questionIndex) => (
            <fieldset
              className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-4"
              key={question.id}
            >
              <input name="setQuestionIds" type="hidden" value={question.id} />
              <legend className="text-sm font-semibold text-[#26352b]">
                Question {questionIndex + 1}
              </legend>
              <p className="mt-2 text-base font-semibold leading-7 text-[#17211b]">
                {question.content}
              </p>

              <div className="mt-4 grid gap-3">
                {question.options.map((option, optionIndex) => (
                  <label
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 rounded-md border border-[#d8dfda] bg-white p-3 text-sm text-[#26352b]"
                    key={`${question.id}-${option}`}
                  >
                    <input
                      className="mt-1 size-4 accent-[#17211b]"
                      name={`answer-${question.id}`}
                      type="radio"
                      value={option}
                      aria-label={`Question ${
                        questionIndex + 1
                      } option ${optionIndex + 1}`}
                      disabled={isPending || !canSubmit}
                      required
                    />
                    <span className="leading-6">{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {state.fieldErrors?.answers?.[0] ? (
          <div className="mt-4 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
            {state.fieldErrors.answers[0]}
          </div>
        ) : null}

        {!canSubmit ? (
          <div className="mt-4 rounded-md border border-[#e5d6b8] bg-[#fffaf0] px-4 py-3 text-sm text-[#6c5620]">
            This public exam set does not have questions yet.
          </div>
        ) : null}

        <button
          className="mt-5 h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isPending || !canSubmit}
        >
          {isPending ? "Submitting..." : "Submit attempt"}
        </button>
      </form>

      {set.attempts.length > 1 ? (
        <details className="mt-5 rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#26352b]">
            Previous attempts
          </summary>
          <div className="mt-3 grid gap-2 text-sm text-[#607066]">
            {set.attempts.slice(1).map((attempt) => (
              <p key={attempt.id}>
                {attempt.score}/{attempt.totalQuestions} on{" "}
                {formatDateTime(attempt.submittedAt)}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}
