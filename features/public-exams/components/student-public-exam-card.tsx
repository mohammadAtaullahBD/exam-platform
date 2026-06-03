"use client";

import { useActionState } from "react";

import { submitPublicExamAttempt } from "@/features/public-exams/actions";
import {
  initialPublicExamActionState,
  type StudentPublicExamSet,
} from "@/features/public-exams/types";
import { RichTextDisplay } from "@/features/questions/components/rich-text-display";

type StudentPublicExamCardProps = {
  set: StudentPublicExamSet;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function scaleValues(min = 1, max = 5) {
  const start = Math.min(min, max);
  const end = Math.max(min, max);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function displayOptions(question: StudentPublicExamSet["questions"][number]) {
  if (!question.settings.shuffleOptions) {
    return question.options;
  }

  return [...question.options].sort(
    (left, right) =>
      stableHash(`${question.id}:${left}`) - stableHash(`${question.id}:${right}`),
  );
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
              <RichTextDisplay
                className="mt-2 block text-base font-semibold leading-7 text-[#17211b]"
                value={question.content}
              />
              {question.description ? (
                <RichTextDisplay
                  className="mt-2 block text-sm leading-6 text-[#607066]"
                  value={question.description}
                />
              ) : null}

              <div className="mt-4 grid gap-3">
                {question.questionType === "short_answer" ? (
                  <input
                    className="h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                    name={`answer-${question.id}`}
                    type="text"
                    disabled={isPending || !canSubmit}
                    required={question.isRequired}
                  />
                ) : null}

                {question.questionType === "paragraph" ? (
                  <textarea
                    className="min-h-32 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                    name={`answer-${question.id}`}
                    disabled={isPending || !canSubmit}
                    required={question.isRequired}
                  />
                ) : null}

                {question.questionType === "dropdown" ? (
                  <select
                    className="h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                    name={`answer-${question.id}`}
                    disabled={isPending || !canSubmit}
                    required={question.isRequired}
                  >
                    <option value="">Choose an answer</option>
                    {displayOptions(question).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}

                {question.questionType === "linear_scale" ||
                question.questionType === "rating" ? (
                  <div className="grid gap-2">
                    <div className="flex flex-wrap gap-2">
                      {scaleValues(question.settings.min, question.settings.max).map(
                        (value) => (
                          <label
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#d8dfda] bg-white px-3 text-sm font-semibold text-[#26352b]"
                            key={value}
                          >
                            <input
                              className="mr-2 size-4 accent-[#17211b]"
                              name={`answer-${question.id}`}
                              type="radio"
                              value={value}
                              disabled={isPending || !canSubmit}
                              required={question.isRequired}
                            />
                            {value}
                          </label>
                        ),
                      )}
                    </div>
                    {question.settings.minLabel || question.settings.maxLabel ? (
                      <div className="flex justify-between gap-4 text-xs text-[#607066]">
                        <span>{question.settings.minLabel}</span>
                        <span>{question.settings.maxLabel}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {question.questionType === "multiple_choice" ||
                question.questionType === "checkboxes"
                  ? displayOptions(question).map((option, optionIndex) => (
                      <label
                        className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 rounded-md border border-[#d8dfda] bg-white p-3 text-sm text-[#26352b]"
                        key={`${question.id}-${option}`}
                      >
                        <input
                          className="mt-1 size-4 accent-[#17211b]"
                          name={`answer-${question.id}`}
                          type={
                            question.questionType === "checkboxes"
                              ? "checkbox"
                              : "radio"
                          }
                          value={option}
                          aria-label={`Question ${
                            questionIndex + 1
                          } option ${optionIndex + 1}`}
                          disabled={isPending || !canSubmit}
                          required={
                            question.isRequired &&
                            question.questionType !== "checkboxes"
                          }
                        />
                        <span className="leading-6">{option}</span>
                      </label>
                    ))
                  : null}
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
