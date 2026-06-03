import Link from "next/link";

import { CreateBatchForm } from "@/features/groups/components/create-batch-form";
import { requireTeacherGroupAccess } from "@/features/groups/queries";

export default async function NewBatchPage() {
  await requireTeacherGroupAccess("/batches/new");

  return (
    <main className="min-h-screen bg-[#f8fafd] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Batch creator
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Create batch</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Start with a name and optional description. The next screen lets
              you add students or leave the batch empty for later.
            </p>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/batches"
          >
            Batches management
          </Link>
        </header>

        <CreateBatchForm />
      </div>
    </main>
  );
}
