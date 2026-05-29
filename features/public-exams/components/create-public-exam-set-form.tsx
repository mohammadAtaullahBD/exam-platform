"use client";

import { useActionState, useState } from "react";

import { createPublicExamSet } from "@/features/public-exams/actions";
import { initialPublicExamActionState } from "@/features/public-exams/types";

type QuestionDraft = {
  id: number;
};

const optionIndexes = [0, 1, 2, 3];

export function CreatePublicExamSetForm() {
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>([
    { id: 0 },
  ]);
  const [nextQuestionId, setNextQuestionId] = useState(1);
  const [state, formAction, isPending] = useActionState(
    createPublicExamSet,
    initialPublicExamActionState,
  );

  function addQuestion() {
    setQuestionDrafts((current) => [...current, { id: nextQuestionId }]);
    setNextQuestionId((current) => current + 1);
  }

  function removeQuestion(id: number) {
    setQuestionDrafts((current) =>
      current.length > 1 ? current.filter((draft) => draft.id !== id) : current,
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-lg border border-[#d8dfda] bg-white p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Create public set</h2>
          <p className="mt-2 text-sm leading-6 text-[#607066]">
            Create a named set and add the questions students will answer.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-3 py-2 text-sm font-medium text-[#26352b]">
          <input
            className="size-4 accent-[#17211b]"
            name="isPublished"
            type="checkbox"
            defaultChecked
            disabled={isPending}
          />
          Published
        </label>
      </div>

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

      <div className="mt-5 grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Set title</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="title"
            type="text"
            maxLength={120}
            disabled={isPending}
            required
          />
          {state.fieldErrors?.title?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.title[0]}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">
            Description
          </span>
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="description"
            maxLength={1000}
            disabled={isPending}
          />
          {state.fieldErrors?.description?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.description[0]}
            </span>
          ) : null}
        </label>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Questions</h3>
          <button
            className="h-10 rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={addQuestion}
            disabled={isPending}
          >
            Add question
          </button>
        </div>

        {state.fieldErrors?.questions?.length ? (
          <div className="rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm leading-6 text-[#7a2f1f]">
            {state.fieldErrors.questions.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        {questionDrafts.map((questionDraft, questionIndex) => (
          <fieldset
            className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-4"
            key={questionDraft.id}
          >
            <legend className="text-sm font-semibold text-[#26352b]">
              Question {questionIndex + 1}
            </legend>
            <input
              name="questionIndexes"
              type="hidden"
              value={questionDraft.id}
            />
            <div className="mt-3 flex justify-end">
              <button
                className="h-9 rounded-md border border-[#d9b7ad] px-3 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => removeQuestion(questionDraft.id)}
                disabled={isPending || questionDrafts.length === 1}
              >
                Remove
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-[#26352b]">
                Question text
              </span>
              <textarea
                className="mt-2 min-h-28 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                name={`question-${questionDraft.id}-content`}
                maxLength={2000}
                disabled={isPending}
                required
              />
            </label>

            <div className="mt-4 grid gap-3">
              <p className="text-sm font-medium text-[#26352b]">Options</p>
              {optionIndexes.map((optionIndex) => (
                <div
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"
                  key={optionIndex}
                >
                  <label className="flex h-11 items-center justify-center rounded-md border border-[#cfc7ba] bg-white">
                    <input
                      aria-label={`Mark question ${
                        questionIndex + 1
                      } option ${optionIndex + 1} as correct`}
                      className="size-4 accent-[#17211b]"
                      name={`question-${questionDraft.id}-correctOptionIndex`}
                      type="radio"
                      value={optionIndex}
                      disabled={isPending}
                      required
                    />
                  </label>
                  <input
                    className="h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                    name={`question-${questionDraft.id}-option-${optionIndex}`}
                    type="text"
                    placeholder={`Option ${optionIndex + 1}`}
                    maxLength={160}
                    disabled={isPending}
                    required
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <button
        className="mt-6 h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Creating..." : "Create set"}
      </button>
    </form>
  );
}
