import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchManagement } from "@/features/groups/components/batch-management";
import { getTeacherGroupById } from "@/features/groups/queries";
import { getSiteUrl } from "@/lib/site-url";

type BatchDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { id } = await params;
  const batch = await getTeacherGroupById(id, `/batches/${id}`);

  if (!batch) {
    notFound();
  }

  const inviteUrl = `${getSiteUrl()}/join/${batch.inviteToken}`;

  return (
    <main className="min-h-screen bg-[#f8fafd] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Batch workspace
            </p>
            <h1 className="mt-2 break-words text-3xl font-semibold">
              {batch.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Manage batch details, students, roll numbers, custom identities,
              and invite access from one screen.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/batches"
            >
              Batches management
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

        <BatchManagement batch={batch} inviteUrl={inviteUrl} />
      </div>
    </main>
  );
}
