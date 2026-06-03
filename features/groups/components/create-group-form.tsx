"use client";

import { useActionState } from "react";

import { createGroup } from "@/features/groups/actions";
import { initialGroupActionState } from "@/features/groups/types";

export function CreateGroupForm() {
  const [state, formAction, isPending] = useActionState(
    createGroup,
    initialGroupActionState,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-[#d8dfda] bg-white p-6"
    >
      <h2 className="text-xl font-semibold">Create batch</h2>
      <p className="mt-2 text-sm leading-6 text-[#607066]">
        Set up a private student batch and share its invite link.
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
          <span className="text-sm font-medium text-[#26352b]">Name</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="name"
            type="text"
            placeholder="HSC Batch 2026"
            disabled={isPending}
            required
          />
          {state.fieldErrors?.name?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.name[0]}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">
            Description
          </span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-4 py-3 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="description"
            maxLength={500}
            disabled={isPending}
          />
          {state.fieldErrors?.description?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.description[0]}
            </span>
          ) : null}
        </label>
      </div>

      <button
        className="mt-5 h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Creating..." : "Create batch"}
      </button>
    </form>
  );
}
