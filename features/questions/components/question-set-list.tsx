"use client";

import { useActionState } from "react";

import { deleteQuestionSet } from "@/features/questions/actions";
import {
  initialQuestionSetActionState,
  type QuestionSet,
} from "@/features/questions/types";

import { QuestionSetBuilder } from "./question-set-builder";

type QuestionSetListProps = {
  sets: QuestionSet[];
  schemaReady: boolean;
};

export function QuestionSetList({ sets, schemaReady }: QuestionSetListProps) {
  if (!sets.length) {
    return (
      <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">No question sets found</h2>
        <p className="mt-3 text-sm leading-6 text-[#607066]">
          Create a set or adjust the search to widen your workspace view.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sets.map((set) => (
        <QuestionSetPanel set={set} disabled={!schemaReady} key={set.id} />
      ))}
    </div>
  );
}

type QuestionSetPanelProps = {
  set: QuestionSet;
  disabled: boolean;
};

function QuestionSetPanel({ set, disabled }: QuestionSetPanelProps) {
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteQuestionSet.bind(null, set.id),
    initialQuestionSetActionState,
  );
  const points = set.questions.reduce((total, question) => total + question.points, 0);

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white">
      <details>
        <summary className="cursor-pointer list-none p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{set.title}</h2>
              {set.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#607066]">
                  {set.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 font-semibold text-[#1f3528]">
                {set.questions.length}{" "}
                {set.questions.length === 1 ? "question" : "questions"}
              </span>
              <span className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 font-semibold text-[#1f3528]">
                {points} {points === 1 ? "point" : "points"}
              </span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f765f]">
            {Array.from(new Set(set.questions.map((question) => question.questionType))).map(
              (type) => (
                <span className="rounded border border-[#d8dfda] px-2 py-1" key={type}>
                  {type.replace("_", " ")}
                </span>
              ),
            )}
          </div>
        </summary>

        <div className="border-t border-[#e5ebe6] bg-[#f8fbf8] p-5">
          <QuestionSetBuilder mode="edit" set={set} disabled={disabled || isDeleting} />

          <form action={deleteAction} className="mt-4">
            {deleteState.status === "error" && deleteState.message ? (
              <div className="mb-3 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
                {deleteState.message}
              </div>
            ) : null}
            <button
              className="h-11 rounded-md border border-[#d9b7ad] px-4 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={disabled || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete set"}
            </button>
          </form>
        </div>
      </details>
    </article>
  );
}
