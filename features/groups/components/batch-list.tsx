import { CalendarDays, Plus, Users } from "lucide-react";
import Link from "next/link";

import type { Group } from "@/features/groups/types";

type BatchListProps = {
  batches: Group[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function BatchList({ batches }: BatchListProps) {
  if (!batches.length) {
    return (
      <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">No batches yet</h2>
        <p className="mt-3 text-sm leading-6 text-[#607066]">
          Create an empty batch now, then add students when they are ready.
        </p>
        <Link
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b]"
          href="/batches/new"
        >
          <Plus className="size-4" aria-hidden="true" />
          Create batch
        </Link>
      </div>
    );
  }

  return (
    <section className="mt-6 grid gap-4">
      {batches.map((batch) => (
        <Link
          className="rounded-lg border border-[#d8dfda] bg-white p-5 transition hover:border-[#17211b] hover:shadow-sm"
          href={`/batches/${batch.id}`}
          key={batch.id}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
                Batch
              </p>
              <h2 className="mt-2 break-words text-xl font-semibold">
                {batch.name}
              </h2>
              <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-[#607066]">
                {batch.description || "No description yet."}
              </p>
            </div>
            <span className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 text-sm font-semibold text-[#1f3528]">
              <Users className="size-4" aria-hidden="true" />
              {batch.memberCount}{" "}
              {batch.memberCount === 1 ? "student" : "students"}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-sm text-[#607066]">
            <span className="inline-flex items-center gap-2 rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-3 py-2">
              <CalendarDays className="size-4" aria-hidden="true" />
              Created {formatDate(batch.createdAt)}
            </span>
            <span className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-3 py-2">
              Invite ready
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
