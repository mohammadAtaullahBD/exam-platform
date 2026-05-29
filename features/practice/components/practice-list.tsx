import Link from "next/link";

import { PracticeQuestionCard } from "@/features/practice/components/practice-question-card";
import type { PracticeQuestion } from "@/features/practice/types";

type PracticeListProps = {
  questions: PracticeQuestion[];
};

export function PracticeList({ questions }: PracticeListProps) {
  if (!questions.length) {
    return (
      <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">No practice questions yet</h2>
        <p className="mt-3 text-sm leading-6 text-[#607066]">
          Incorrect answers from closed exam submissions will appear here.
        </p>
        <Link
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
          href="/student/exams"
        >
          Exams
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-8 grid gap-4">
      {questions.map((question, index) => (
        <PracticeQuestionCard
          index={index}
          key={question.submissionAnswerId}
          question={question}
        />
      ))}
    </section>
  );
}

