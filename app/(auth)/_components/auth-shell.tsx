import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#17211b]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-[#ded8cc] bg-[#18231d] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em]">
            EXAM PLATFORM
          </Link>

          <div className="max-w-xl">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-[#9dc6ad]">
              Student, teacher, admin
            </p>
            <h1 className="text-5xl font-semibold leading-tight">
              Focused exams, clean roles, fewer moving parts.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#dce7df]">
              Teachers create and manage exams, students sit for them, and
              admins keep the whole workspace visible.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm text-[#dce7df]">
            {["Students", "Teachers", "Admins"].map((label) => (
              <div
                key={label}
                className="border border-white/15 bg-white/5 px-4 py-3"
              >
                {label}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <Link
                href="/"
                className="mb-8 inline-flex text-sm font-semibold text-[#47614f] lg:hidden"
              >
                Exam Platform
              </Link>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7f58]">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-[#17211b]">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#5f665f]">
                {description}
              </p>
            </div>

            <div className="rounded-lg border border-[#ded8cc] bg-white p-6 shadow-[0_24px_70px_rgba(31,43,34,0.12)] sm:p-8">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
