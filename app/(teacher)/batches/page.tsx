import { Plus } from "lucide-react";
import Link from "next/link";

import { BatchList } from "@/features/groups/components/batch-list";
import { getTeacherGroups } from "@/features/groups/queries";

export default async function TeacherBatchesPage() {
  const batches = await getTeacherGroups("/batches");

  return (
    <main className="min-h-screen bg-[#f8fafd] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Batches management
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Batches</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Create private student batches, review recent batches, and open a
              batch to manage students, roll numbers, and invite links.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b]"
              href="/batches/new"
            >
              <Plus className="size-4" aria-hidden="true" />
              Create batch
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/exams"
            >
              Exams
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Batches</h2>
              <p className="mt-2 text-sm leading-6 text-[#607066]">
                Open a batch card to edit batch details and manage students.
              </p>
            </div>
            <span className="text-sm font-semibold text-[#607066]">
              {batches.length} {batches.length === 1 ? "batch" : "batches"}
            </span>
          </div>
        </section>

        <BatchList batches={batches} />
      </div>
    </main>
  );
}
