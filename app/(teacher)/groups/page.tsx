import Link from "next/link";

import { CreateGroupForm } from "@/features/groups/components/create-group-form";
import { TeacherGroupCard } from "@/features/groups/components/teacher-group-card";
import { getTeacherGroups } from "@/features/groups/queries";
import { getSiteUrl } from "@/lib/site-url";

export default async function TeacherGroupsPage() {
  const groups = await getTeacherGroups("/groups");
  const siteUrl = getSiteUrl();

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Teacher workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Groups</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Create private class groups and share invite links with students.
            </p>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-4">
            {groups.length ? (
              groups.map((group) => (
                <TeacherGroupCard
                  group={group}
                  inviteUrl={`${siteUrl}/join/${group.inviteToken}`}
                  key={group.id}
                />
              ))
            ) : (
              <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
                <h2 className="text-xl font-semibold">No groups yet</h2>
                <p className="mt-3 text-sm leading-6 text-[#607066]">
                  Create your first group to generate an invite link for
                  students.
                </p>
              </div>
            )}
          </section>

          <aside>
            <CreateGroupForm />
          </aside>
        </div>
      </div>
    </main>
  );
}
