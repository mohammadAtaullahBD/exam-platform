"use client";

import { Download } from "lucide-react";
import { useActionState } from "react";

import { copyPublicExamSetToQuestionSets } from "@/features/questions/actions";
import {
  initialQuestionImportActionState,
  type PublicQuestionSetImportOption,
} from "@/features/questions/types";

type PublicSetImportPanelProps = {
  sets: PublicQuestionSetImportOption[];
};

export function PublicSetImportPanel({ sets }: PublicSetImportPanelProps) {
  const [state, formAction, isPending] = useActionState(
    copyPublicExamSetToQuestionSets,
    initialQuestionImportActionState,
  );
  const canCopy = sets.some((set) => set.questionCount > 0);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-[#d8dfda] bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[#f3ecff] text-[#673ab7]">
            <Download className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Import public set</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">
              Copy a published set into your workspace as an editable question set.
            </p>
          </div>
        </div>
        <span className="inline-flex h-9 items-center rounded-md border border-[#d8dfda] bg-[#f8fafd] px-3 text-sm font-semibold text-[#1f3528]">
          {sets.length} available
        </span>
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

      {sets.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block">
            <span className="text-sm font-medium text-[#26352b]">Public set</span>
            <select
              className="mt-2 h-12 w-full rounded-md border border-[#cfd8d2] bg-white px-4 text-sm outline-none transition focus:border-[#673ab7] focus:ring-4 focus:ring-[#673ab7]/15"
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
          <button
            className="h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isPending || !canCopy}
          >
            {isPending ? "Copying..." : "Copy set"}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-[#e5d6b8] bg-[#fffaf0] px-4 py-3 text-sm leading-6 text-[#6c5620]">
          No published public sets are available yet.
        </div>
      )}
    </form>
  );
}
