"use client";

import { useState } from "react";

import type { PracticeQuestion } from "@/features/practice/types";

type PracticeQuestionCardProps = {
  question: PracticeQuestion;
  index: number;
};

function answerLabel(value: string) {
  return value || "Not answered";
}

export function PracticeQuestionCard({
  question,
  index,
}: PracticeQuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const isCorrect = checked && selectedAnswer === question.correctAnswer;

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            {question.groupName}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-7">
            {index + 1}. {question.content}
          </h2>
        </div>
        <div className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 text-sm font-semibold text-[#1f3528]">
          {question.examTitle}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-[#e5d6b8] bg-[#fffaf0] px-4 py-3 text-sm text-[#6c5620]">
        Previous answer: {answerLabel(question.submittedAnswer)}
      </div>

      <div className="mt-4 grid gap-3">
        {question.options.map((option) => (
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
        ))}
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
          disabled={!selectedAnswer}
          onClick={() => setChecked(true)}
          type="button"
        >
          Check answer
        </button>
      </div>
    </article>
  );
}

