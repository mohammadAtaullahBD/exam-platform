import Link from "next/link";

import { StudentGroupsList } from "@/features/groups/components/student-groups-list";
import { getStudentGroups } from "@/features/groups/queries";

export default async function StudentGroupsPage() {
  const groups = await getStudentGroups("/student/groups");

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Student workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Groups</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Groups you join from teacher invite links will appear here.
            </p>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </header>

        <StudentGroupsList groups={groups} />
      </div>
    </main>
  );
}
