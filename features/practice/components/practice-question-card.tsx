"use client";

import { useState } from "react";

import type { PracticeQuestion } from "@/features/practice/types";
import { RichTextDisplay } from "@/features/questions/components/rich-text-display";

type PracticeQuestionCardProps = {
  question: PracticeQuestion;
  index: number;
};

function answerLabel(value: string) {
  return value || "Not answered";
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

function displayOptions(question: PracticeQuestion) {
  if (!question.settings.shuffleOptions) {
    return question.options;
  }

  return [...question.options].sort(
    (left, right) =>
      stableHash(`${question.id}:${left}`) - stableHash(`${question.id}:${right}`),
  );
}

export function PracticeQuestionCard({
  question,
  index,
}: PracticeQuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const isCorrect =
    checked &&
    (question.questionType === "checkboxes"
      ? question.correctAnswer
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .every((value) => selectedAnswers.includes(value)) &&
        selectedAnswers.every((value) =>
          question.correctAnswer
            .split(",")
            .map((correct) => correct.trim())
            .filter(Boolean)
            .includes(value),
        )
      : question.questionType === "short_answer"
      ? selectedAnswer.trim().toLocaleLowerCase() ===
        question.correctAnswer.trim().toLocaleLowerCase()
      : selectedAnswer === question.correctAnswer);

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            {question.groupName}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-7">
            <span>{index + 1}. </span>
            <RichTextDisplay value={question.content} />
          </h2>
          {question.description ? (
            <RichTextDisplay
              className="mt-2 block text-sm leading-6 text-[#607066]"
              value={question.description}
            />
          ) : null}
        </div>
        <div className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 text-sm font-semibold text-[#1f3528]">
          {question.examTitle}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-[#e5d6b8] bg-[#fffaf0] px-4 py-3 text-sm text-[#6c5620]">
        Previous answer: {answerLabel(question.submittedAnswer)}
      </div>

      <div className="mt-4 grid gap-3">
        {question.questionType === "short_answer" ? (
          <input
            className="h-12 w-full rounded-md border border-[#cfc7ba] bg-[#f9fbf8] px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            onChange={(event) => {
              setSelectedAnswer(event.target.value);
              setChecked(false);
            }}
            type="text"
            value={selectedAnswer}
          />
        ) : null}

        {question.questionType === "dropdown" ? (
          <select
            className="h-12 w-full rounded-md border border-[#cfc7ba] bg-[#f9fbf8] px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            onChange={(event) => {
              setSelectedAnswer(event.target.value);
              setChecked(false);
            }}
            value={selectedAnswer}
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
        question.questionType === "rating"
          ? scaleValues(question.settings.min, question.settings.max).map(
              (value) => (
                <label
                  className="flex min-h-11 items-center rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-3 text-sm font-medium text-[#26352b] transition-colors hover:bg-[#eef5f0]"
                  key={value}
                >
                  <input
                    checked={selectedAnswer === String(value)}
                    className="mr-2 size-4 accent-[#17211b]"
                    name={`practice:${question.submissionAnswerId}`}
                    onChange={() => {
                      setSelectedAnswer(String(value));
                      setChecked(false);
                    }}
                    type="radio"
                    value={value}
                  />
                  {value}
                </label>
              ),
            )
          : null}

        {question.questionType === "multiple_choice"
          ? displayOptions(question).map((option) => (
              <label
                className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3 text-sm font-medium text-[#26352b] transition-colors hover:bg-[#eef5f0]"
                key={option}
              >
                <input
                  checked={selectedAnswer === option}
                  className="mt-1 size-4 accent-[#17211b]"
                  name={`practice:${question.submissionAnswerId}`}
                  onChange={() => {
                    setSelectedAnswer(option);
                    setChecked(false);
                  }}
                  type="radio"
                  value={option}
                />
                <span>{option}</span>
              </label>
            ))
          : null}

        {question.questionType === "checkboxes"
          ? displayOptions(question).map((option) => (
              <label
                className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3 text-sm font-medium text-[#26352b] transition-colors hover:bg-[#eef5f0]"
                key={option}
              >
                <input
                  checked={selectedAnswers.includes(option)}
                  className="mt-1 size-4 accent-[#17211b]"
                  name={`practice:${question.submissionAnswerId}`}
                  onChange={(event) => {
                    setSelectedAnswers((current) =>
                      event.target.checked
                        ? [...current, option]
                        : current.filter((value) => value !== option),
                    );
                    setChecked(false);
                  }}
                  type="checkbox"
                  value={option}
                />
                <span>{option}</span>
              </label>
            ))
          : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {checked ? (
          <p
            className={`rounded-md border px-4 py-3 text-sm font-medium ${
              isCorrect
                ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
            }`}
          >
            {isCorrect
              ? "Correct."
              : `Correct answer: ${question.correctAnswer}`}
          </p>
        ) : (
          <p className="text-sm text-[#607066]">Try this question again.</p>
        )}
        <button
          className="h-10 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            question.questionType === "checkboxes"
              ? selectedAnswers.length === 0
              : !selectedAnswer
          }
          onClick={() => setChecked(true)}
          type="button"
        >
          Check answer
        </button>
      </div>
    </article>
  );
}
