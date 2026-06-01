"use client";

import { useRef, useActionState } from "react";

import { createExam } from "@/features/exams/actions";
import {
  initialExamActionState,
  type ExamGroupOption,
  type ExamQuestionOption,
} from "@/features/exams/types";

type CreateExamFormProps = {
  groups: ExamGroupOption[];
  questions: ExamQuestionOption[];
};

function localDateTimeToIso(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function CreateExamForm({ groups, questions }: CreateExamFormProps) {
  const startsAtInputRef = useRef<HTMLInputElement>(null);
  const endsAtInputRef = useRef<HTMLInputElement>(null);
  const startsAtIsoRef = useRef<HTMLInputElement>(null);
  const endsAtIsoRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    createExam,
    initialExamActionState,
  );
  const canCreate = groups.length > 0 && questions.length > 0;

  function handleSubmit() {
    if (startsAtIsoRef.current && startsAtInputRef.current) {
      startsAtIsoRef.current.value = localDateTimeToIso(
        startsAtInputRef.current.value,
      );
    }

    if (endsAtIsoRef.current && endsAtInputRef.current) {
      endsAtIsoRef.current.value = localDateTimeToIso(endsAtInputRef.current.value);
    }
  }

  return (
    <form
      action={formAction}
      className="rounded-lg border border-[#d8dfda] bg-white p-6"
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-semibold">Create exam</h2>
      <p className="mt-2 text-sm leading-6 text-[#607066]">
        Select a group, schedule the window, and attach questions.
      </p>

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

      {!canCreate ? (
        <div className="mt-5 rounded-md border border-[#e5d6b8] bg-[#fffaf0] px-4 py-3 text-sm leading-6 text-[#6c5620]">
          Add at least one group and one question before creating an exam.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Title</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="title"
            type="text"
            maxLength={120}
            disabled={isPending || !canCreate}
            required
          />
          {state.fieldErrors?.title?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.title[0]}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Group</span>
          <select
            className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="groupId"
            disabled={isPending || !canCreate}
            required
          >
            <option value="">Choose a group</option>
            {groups.map((group) => (
              <option value={group.id} key={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.groupId?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.groupId[0]}
            </span>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-[#26352b]">Starts</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
              name="startsAt"
              type="datetime-local"
              disabled={isPending || !canCreate}
              ref={startsAtInputRef}
              required
            />
            <input name="startsAtIso" type="hidden" ref={startsAtIsoRef} />
            {state.fieldErrors?.startsAt?.[0] ? (
              <span className="mt-2 block text-sm text-[#8a3a28]">
                {state.fieldErrors.startsAt[0]}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#26352b]">Ends</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
              name="endsAt"
              type="datetime-local"
              disabled={isPending || !canCreate}
              ref={endsAtInputRef}
              required
            />
            <input name="endsAtIso" type="hidden" ref={endsAtIsoRef} />
            {state.fieldErrors?.endsAt?.[0] ? (
              <span className="mt-2 block text-sm text-[#8a3a28]">
                {state.fieldErrors.endsAt[0]}
              </span>
            ) : null}
          </label>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-[#26352b]">
            Questions
          </legend>
          <div className="max-h-80 overflow-y-auto rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
            {questions.length ? (
              <div className="grid gap-3">
                {questions.map((question) => (
                  <label
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 rounded-md border border-[#d8dfda] bg-white p-3"
                    key={question.id}
                  >
                    <input
                      className="mt-1 size-4 accent-[#17211b]"
                      name="questionIds"
                      type="checkbox"
                      value={question.id}
                      disabled={isPending || !canCreate}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#26352b]">
                        {question.content}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#607066]">
                        {question.sourceLabel} ·{" "}
                        {question.questionType.replaceAll("_", " ")}
                        {question.options.length
                          ? ` · ${question.options.length} options`
                          : ""}
                        {question.correctAnswer
                          ? ` · answer: ${question.correctAnswer}`
                          : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#607066]">No questions available.</p>
            )}
          </div>
          {state.fieldErrors?.questionIds?.[0] ? (
            <span className="text-sm text-[#8a3a28]">
              {state.fieldErrors.questionIds[0]}
            </span>
          ) : null}
        </fieldset>
      </div>

      <button
        className="mt-5 h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending || !canCreate}
      >
        {isPending ? "Creating..." : "Create exam"}
      </button>
    </form>
  );
}
