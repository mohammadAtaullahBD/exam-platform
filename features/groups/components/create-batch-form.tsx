"use client";

import { MailPlus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { createGroup } from "@/features/groups/actions";
import { initialGroupActionState } from "@/features/groups/types";

export function CreateBatchForm() {
  const [state, formAction, isPending] = useActionState(
    createGroup,
    initialGroupActionState,
  );
  const [studentRows, setStudentRows] = useState<string[]>([]);

  function addStudentRow() {
    setStudentRows((current) => [...current, crypto.randomUUID()]);
  }

  function removeStudentRow(rowId: string) {
    setStudentRows((current) => current.filter((id) => id !== rowId));
  }

  return (
    <form
      action={formAction}
      className="mt-8 rounded-lg border border-[#d8dfda] bg-white"
    >
      <div className="border-b border-[#d8dfda] p-5">
        <h2 className="text-xl font-semibold">Batch details</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#607066]">
          You can create the batch without students, or add initial students by
          email before saving. The batch screen stays editable later.
        </p>
      </div>

      <div className="grid gap-5 p-5">
        {state.message ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Batch name</span>
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
            className="mt-2 min-h-32 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-4 py-3 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="description"
            maxLength={500}
            placeholder="Optional notes about the class, schedule, or syllabus."
            disabled={isPending}
          />
          {state.fieldErrors?.description?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.description[0]}
            </span>
          ) : null}
        </label>
      </div>

      <div className="border-t border-[#d8dfda] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Students</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">
              Optional. Add existing student accounts now, or leave this empty
              and add students later.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            type="button"
            onClick={addStudentRow}
            disabled={isPending}
          >
            <MailPlus className="size-4" aria-hidden="true" />
            Add student
          </button>
        </div>

        {state.fieldErrors?.email?.[0] ? (
          <div className="mt-4 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
            {state.fieldErrors.email.join(" ")}
          </div>
        ) : null}

        {studentRows.length ? (
          <div className="mt-4 grid gap-3">
            {studentRows.map((rowId, index) => (
              <div
                className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-4"
                key={rowId}
              >
                <input name="initialStudentIndexes" type="hidden" value={rowId} />
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,14rem)_auto] lg:items-end">
                  <label className="block">
                    <span className="text-sm font-medium text-[#26352b]">
                      Student {index + 1} email
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                      name={`student-${rowId}-email`}
                      type="email"
                      placeholder="student@example.com"
                      disabled={isPending}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[#26352b]">
                      Roll
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                      name={`student-${rowId}-rollNumber`}
                      type="number"
                      min={1}
                      max={99999}
                      placeholder="Auto"
                      disabled={isPending}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[#26352b]">
                      Identity
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                      name={`student-${rowId}-studentIdentity`}
                      type="text"
                      maxLength={80}
                      placeholder="Optional"
                      disabled={isPending}
                    />
                  </label>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d9b7ad] px-3 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => removeStudentRow(rowId)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-4 py-3 text-sm leading-6 text-[#607066]">
            No initial students. This batch will be created empty.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-[#d8dfda] p-5 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
          href="/batches"
        >
          Cancel
        </Link>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          <Plus className="size-4" aria-hidden="true" />
          {isPending ? "Creating..." : "Create batch"}
        </button>
      </div>
    </form>
  );
}
