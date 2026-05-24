"use client";

import { useActionState } from "react";

import { createQuestion } from "@/features/questions/actions";
import { initialQuestionActionState } from "@/features/questions/types";

const optionFields = [0, 1, 2, 3];

export function CreateQuestionForm() {
  const [state, formAction, isPending] = useActionState(
    createQuestion,
    initialQuestionActionState,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-[#d8dfda] bg-white p-6"
    >
      <h2 className="text-xl font-semibold">Create question</h2>
      <p className="mt-2 text-sm leading-6 text-[#607066]">
        Add a text question with four answer options.
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

      <div className="mt-5 grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Question</span>
          <textarea
            className="mt-2 min-h-32 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-4 py-3 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="content"
            maxLength={2000}
            disabled={isPending}
            required
          />
          {state.fieldErrors?.content?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.content[0]}
            </span>
          ) : null}
        </label>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-[#26352b]">
            Options
          </legend>
          {optionFields.map((index) => (
            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3" key={index}>
              <label className="flex h-11 items-center justify-center rounded-md border border-[#cfc7ba] bg-[#f9fbf8]">
                <input
                  aria-label={`Mark option ${index + 1} as correct`}
                  className="size-4 accent-[#17211b]"
                  name="correctOptionIndex"
                  type="radio"
                  value={index}
                  disabled={isPending}
                  required
                />
              </label>
              <input
                className="h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                name={`option-${index}`}
                type="text"
                placeholder={`Option ${index + 1}`}
                maxLength={160}
                disabled={isPending}
                required
              />
            </div>
          ))}
          {state.fieldErrors?.options?.[0] ? (
            <span className="text-sm text-[#8a3a28]">
              {state.fieldErrors.options[0]}
            </span>
          ) : null}
          {state.fieldErrors?.correctOptionIndex?.[0] ? (
            <span className="text-sm text-[#8a3a28]">
              {state.fieldErrors.correctOptionIndex[0]}
            </span>
          ) : null}
        </fieldset>
      </div>

      <button
        className="mt-5 h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Creating..." : "Create question"}
      </button>
    </form>
  );
}
