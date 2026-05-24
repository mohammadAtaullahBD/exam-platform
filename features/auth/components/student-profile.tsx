import Link from "next/link";

import type { Profile } from "@/features/auth/types";

type StudentProfileProps = {
  profile: Profile;
};

function formatJoinedDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function StudentProfile({ profile }: StudentProfileProps) {
  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Student profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {profile.name ?? "Unnamed student"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              {profile.bio ?? "Add a short bio to introduce yourself."}
            </p>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/profile/edit"
          >
            Edit profile
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Name</p>
            <p className="mt-2 text-lg font-semibold">
              {profile.name ?? "Not provided"}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Joined</p>
            <p className="mt-2 text-lg font-semibold">
              {formatJoinedDate(profile.createdAt)}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Role</p>
            <p className="mt-2 text-lg font-semibold capitalize">
              {profile.role}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
            <h2 className="text-xl font-semibold">My Groups</h2>
            <p className="mt-3 text-sm leading-6 text-[#607066]">
              Group memberships will appear here in the groups phase.
            </p>
          </div>
          <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
            <h2 className="text-xl font-semibold">My Progress</h2>
            <p className="mt-3 text-sm leading-6 text-[#607066]">
              Exam progress and recent results will appear here in a later
              phase.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
