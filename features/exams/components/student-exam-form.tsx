"use client";

import { useActionState, useCallback, useRef, useState } from "react";

import { submitExamAnswers } from "@/features/exams/actions";
import { ExamCountdown } from "@/features/exams/components/exam-countdown";
import {
  initialSubmitExamActionState,
  type StudentExamDetail,
} from "@/features/exams/types";
import { RichTextDisplay } from "@/features/questions/components/rich-text-display";

type StudentExamFormProps = {
  exam: StudentExamDetail;
};

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

function displayOptions(question: StudentExamDetail["questions"][number]) {
  if (!question.settings.shuffleOptions) {
    return question.options;
  }

  return [...question.options].sort(
    (left, right) =>
      stableHash(`${question.id}:${left}`) - stableHash(`${question.id}:${right}`),
  );
}

export function StudentExamForm({ exam }: StudentExamFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmittedRef = useRef(false);
  const [expired, setExpired] = useState(false);
  const [state, formAction, isPending] = useActionState(
    submitExamAnswers,
    initialSubmitExamActionState,
  );

  const handleExpire = useCallback(() => {
    if (autoSubmittedRef.current) {
      return;
    }

    autoSubmittedRef.current = true;
    formRef.current?.requestSubmit();
    setExpired(true);
  }, []);

  return (
    <form action={formAction} className="mt-8" ref={formRef}>
      <input name="examId" type="hidden" value={exam.id} />

      <div className="flex flex-col gap-4 rounded-lg border border-[#d8dfda] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            Active exam
          </p>
          <h2 className="mt-2 text-xl font-semibold">{exam.title}</h2>
        </div>
        <ExamCountdown endsAt={exam.endsAt} onExpire={handleExpire} />
      </div>

      {state.message ? (
        <div className="mt-4 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
          {state.message}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        {exam.questions.map((question, index) => (
          <fieldset
            className="rounded-lg border border-[#d8dfda] bg-white p-5"
            disabled={isPending}
            key={question.id}
          >
            <legend className="px-1 text-sm font-semibold text-[#5f765f]">
              Question {index + 1}
            </legend>
            <RichTextDisplay
              className="mt-2 block text-lg font-semibold leading-7 text-[#17211b]"
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
                  className="h-12 w-full rounded-md border border-[#cfc7ba] bg-[#f9fbf8] px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                  name={`answer:${question.id}`}
                  type="text"
                  required={question.isRequired}
                />
              ) : null}

              {question.questionType === "paragraph" ? (
                <textarea
                  className="min-h-32 w-full resize-y rounded-md border border-[#cfc7ba] bg-[#f9fbf8] px-4 py-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                  name={`answer:${question.id}`}
                  required={question.isRequired}
                />
              ) : null}

              {question.questionType === "dropdown" ? (
                <select
                  className="h-12 w-full rounded-md border border-[#cfc7ba] bg-[#f9fbf8] px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                  name={`answer:${question.id}`}
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
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-3 text-sm font-semibold text-[#26352b]"
                          key={value}
                        >
                          <input
                            className="mr-2 size-4 accent-[#17211b]"
                            name={`answer:${question.id}`}
                            type="radio"
                            value={value}
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
                ? displayOptions(question).map((option) => (
                    <label
                      className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3 text-sm font-medium text-[#26352b] transition-colors hover:bg-[#eef5f0]"
                      key={option}
                    >
                      <input
                        className="mt-1 size-4 accent-[#17211b]"
                        name={`answer:${question.id}`}
                        type={
                          question.questionType === "checkboxes"
                            ? "checkbox"
                            : "radio"
                        }
                        value={option}
                        required={
                          question.isRequired &&
                          question.questionType !== "checkboxes"
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))
                : null}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-[#d8dfda] bg-[#f6f8f5]/95 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[#607066]">
            {expired
              ? "Time is up. Your submission is being processed."
              : `${exam.questionCount} questions`}
          </p>
          <button
            className="h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || expired}
            type="submit"
          >
            {isPending ? "Submitting..." : "Submit exam"}
          </button>
        </div>
      </div>
    </form>
  );
}
