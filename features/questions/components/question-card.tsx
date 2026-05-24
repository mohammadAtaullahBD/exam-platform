"use client";

import { useActionState } from "react";

import { deleteQuestion, updateQuestion } from "@/features/questions/actions";
import {
  initialQuestionActionState,
  type Question,
} from "@/features/questions/types";

type QuestionCardProps = {
  question: Question;
};

export function QuestionCard({ question }: QuestionCardProps) {
  const [updateState, updateAction, isUpdating] = useActionState(
    updateQuestion.bind(null, question.id),
    initialQuestionActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteQuestion.bind(null, question.id),
    initialQuestionActionState,
  );
  const correctIndex = Math.max(
    0,
    question.options.findIndex((option) => option === question.correctAnswer),
  );

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
            {question.source === "admin" ? "Imported" : "Teacher"}
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {question.content}
          </h2>
        </div>
        <div className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 text-sm font-semibold text-[#1f3528]">
          {question.createdAt.slice(0, 10)}
        </div>
      </div>

      <form action={updateAction} className="mt-6 grid gap-4">
        {updateState.message ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              updateState.status === "success"
                ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
            }`}
          >
            {updateState.message}
          </div>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Question</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="content"
            defaultValue={question.content}
            maxLength={2000}
            disabled={isUpdating || isDeleting}
            required
          />
          {updateState.fieldErrors?.content?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {updateState.fieldErrors.content[0]}
            </span>
          ) : null}
        </label>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-[#26352b]">
            Options
          </legend>
          {[0, 1, 2, 3].map((index) => (
            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3" key={index}>
              <label className="flex h-11 items-center justify-center rounded-md border border-[#cfc7ba] bg-[#f9fbf8]">
                <input
                  aria-label={`Mark option ${index + 1} as correct`}
                  className="size-4 accent-[#17211b]"
                  name="correctOptionIndex"
                  type="radio"
                  value={index}
                  defaultChecked={correctIndex === index}
                  disabled={isUpdating || isDeleting}
                  required
                />
              </label>
              <input
                className="h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                name={`option-${index}`}
                type="text"
                defaultValue={question.options[index] ?? ""}
                placeholder={`Option ${index + 1}`}
                maxLength={160}
                disabled={isUpdating || isDeleting}
                required
              />
            </div>
          ))}
          {updateState.fieldErrors?.options?.[0] ? (
            <span className="text-sm text-[#8a3a28]">
              {updateState.fieldErrors.options[0]}
            </span>
          ) : null}
          {updateState.fieldErrors?.correctOptionIndex?.[0] ? (
            <span className="text-sm text-[#8a3a28]">
              {updateState.fieldErrors.correctOptionIndex[0]}
            </span>
          ) : null}
        </fieldset>

        <button
          className="h-11 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
          type="submit"
          disabled={isUpdating || isDeleting}
        >
          {isUpdating ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form action={deleteAction} className="mt-3">
        {deleteState.status === "error" && deleteState.message ? (
          <div className="mb-3 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
            {deleteState.message}
          </div>
        ) : null}
        <button
          className="h-11 rounded-md border border-[#d9b7ad] px-4 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isUpdating || isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete question"}
        </button>
      </form>
    </article>
  );
}
