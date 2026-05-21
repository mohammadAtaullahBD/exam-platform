import { redirect } from "next/navigation";

import { profileFromAuthUser, upsertUserProfile } from "@/lib/supabase/users";
import { createClient } from "@/lib/supabase/server";

import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  await upsertUserProfile(data.user);
  const profile = profileFromAuthUser(data.user);

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Exam Platform
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Welcome dashboard</h1>
          </div>
          <LogoutButton />
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Name</p>
            <p className="mt-2 text-lg font-semibold">
              {profile.name ?? "Not provided"}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Email</p>
            <p className="mt-2 break-words text-lg font-semibold">
              {profile.email}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8dfda] bg-white p-5">
            <p className="text-sm font-medium text-[#607066]">Role</p>
            <p className="mt-2 text-lg font-semibold capitalize">{profile.role}</p>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-[#d8dfda] bg-white p-6">
          <h2 className="text-xl font-semibold">You are signed in</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
            This is a protected starter dashboard. Future student and teacher
            workflows can branch from this authenticated area.
          </p>
        </section>
      </div>
    </main>
  );
}
