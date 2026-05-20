import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#17211b]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-sm font-bold tracking-[0.14em]">
          EXAM PLATFORM
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              className="rounded-md bg-[#17211b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#26352b]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                className="rounded-md border border-[#cfc7ba] px-4 py-2 text-sm font-semibold text-[#26352b] transition hover:bg-white"
                href="/signin"
              >
                Login
              </Link>
              <Link
                className="rounded-md bg-[#17211b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#26352b]"
                href="/signup"
              >
                Signup
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-10 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7f58]">
            Online exams for growing classrooms
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            Create, take, and manage exams from one secure workspace.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#5f665f] sm:text-lg">
            Students get a clear place to sit exams. Teachers get room to build
            assessments. Manage everything from a unified dashboard.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="flex h-12 items-center justify-center rounded-md bg-[#17211b] px-6 text-sm font-semibold text-white transition hover:bg-[#26352b]"
              href={user ? "/dashboard" : "/signup"}
            >
              {user ? "Open dashboard" : "Create account"}
            </Link>
            <Link
              className="flex h-12 items-center justify-center rounded-md border border-[#cfc7ba] px-6 text-sm font-semibold text-[#26352b] transition hover:bg-white"
              href={user ? "/dashboard" : "/signin"}
            >
              {user ? "View profile" : "Login"}
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            ["Student", "Verify email, sign in, and reach a protected dashboard."],
            ["Teacher", "Use the same secure flow with a teacher profile role."],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-lg border border-[#ded8cc] bg-white p-5 shadow-[0_18px_45px_rgba(31,43,34,0.08)]"
            >
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f665f]">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
