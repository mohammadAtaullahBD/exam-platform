"use client";

import { useActionState } from "react";

import { copyPublicExamSetToQuestionBank } from "@/features/questions/actions";
import {
  initialQuestionImportActionState,
  type PublicQuestionSetImportOption,
} from "@/features/questions/types";

type PublicSetImportPanelProps = {
  sets: PublicQuestionSetImportOption[];
};

export function PublicSetImportPanel({ sets }: PublicSetImportPanelProps) {
  const [state, formAction, isPending] = useActionState(
    copyPublicExamSetToQuestionBank,
    initialQuestionImportActionState,
  );
  const canCopy = sets.some((set) => set.questionCount > 0);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-[#d8dfda] bg-white p-6"
    >
      <h2 className="text-xl font-semibold">Import public set</h2>
      <p className="mt-2 text-sm leading-6 text-[#607066]">
        Copy a published set into your question bank before customizing it for a
        group exam.
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

      {sets.length ? (
        <label className="mt-5 block">
          <span className="text-sm font-medium text-[#26352b]">Public set</span>
          <select
            className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="setId"
            disabled={isPending || !canCopy}
            required
          >
            <option value="">Choose a set</option>
            {sets.map((set) => (
              <option
                value={set.id}
                disabled={set.questionCount === 0}
                key={set.id}
              >
                {set.title} ({set.questionCount})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="mt-5 rounded-md border border-[#e5d6b8] bg-[#fffaf0] px-4 py-3 text-sm leading-6 text-[#6c5620]">
          No published public sets are available yet.
        </div>
      )}

      <button
        className="mt-5 h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending || !canCopy}
      >
        {isPending ? "Copying..." : "Copy questions"}
      </button>
    </form>
  );
}
