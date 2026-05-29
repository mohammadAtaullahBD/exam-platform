import Link from "next/link";

import { AdminPublicSetList } from "@/features/public-exams/components/admin-public-set-list";
import { CreatePublicExamSetForm } from "@/features/public-exams/components/create-public-exam-set-form";
import { getAdminPublicExamSets } from "@/features/public-exams/queries";

export default async function PublicSetsPage() {
  const sets = await getAdminPublicExamSets("/public-sets");

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Private workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Public Sets</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Create question sets that students can take any time and teachers
              can copy into their own bank.
            </p>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_28rem]">
          <AdminPublicSetList sets={sets} />
          <aside>
            <CreatePublicExamSetForm />
          </aside>
        </div>
      </div>
    </main>
  );
}
