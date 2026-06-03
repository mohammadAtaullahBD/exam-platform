import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Pencil,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { Profile } from "@/features/auth/types";

type TeacherProfileProps = {
  profile: Profile;
  isOwnProfile: boolean;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function initialsFor(profile: Profile) {
  const source = profile.name ?? profile.email;
  const parts = source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "T";
}

export function TeacherProfile({
  profile,
  isOwnProfile,
}: TeacherProfileProps) {
  const displayName = profile.name ?? "Unnamed teacher";
  const teachingActions = [
    {
      href: "/batches",
      label: "Batches",
      description: "Manage students, rolls, identities, and invite links.",
      icon: GraduationCap,
    },
    {
      href: "/questions",
      label: "Questions",
      description: "Create, copy, and customize question sets.",
      icon: BookOpen,
    },
    {
      href: "/exams",
      label: "Exams",
      description: "Schedule exams and review results.",
      icon: CalendarClock,
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      description: "Return to the teaching command center.",
      icon: LayoutDashboard,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] dark:bg-[#111813] dark:text-[#edf3ec] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-lg border border-[#d8dfda] bg-white shadow-sm dark:border-[#34443a] dark:bg-[#19231d]">
          <div className="h-3 bg-[#58735f]" />
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-[#e8f0e8] text-3xl font-semibold text-[#1f3528] dark:bg-[#26382d] dark:text-[#dce9de]">
                {initialsFor(profile)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f] dark:text-[#a9bdad]">
                  Teacher profile
                </p>
                <h1 className="mt-2 break-words text-3xl font-semibold">
                  {displayName}
                </h1>
                <p className="mt-3 flex items-center gap-2 break-words text-sm text-[#607066] dark:text-[#b8c7bb]">
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {profile.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {isOwnProfile ? (
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] dark:bg-[#edf3ec] dark:text-[#17211b] dark:hover:bg-white"
                  href="/profile/edit"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit profile
                </Link>
              ) : null}
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] dark:border-[#46594c] dark:text-[#e2eadf] dark:hover:bg-[#223126]"
                href="/dashboard"
              >
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <div className="rounded-lg border border-[#d8dfda] bg-white p-6 shadow-sm dark:border-[#34443a] dark:bg-[#19231d]">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#eef5f0] text-[#31513a] dark:bg-[#26382d] dark:text-[#dce9de]">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-semibold">Teaching bio</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#607066] dark:text-[#b8c7bb]">
              {profile.bio ??
                "Add a short teaching bio so students can recognize your class, subject, and exam style."}
            </p>
          </div>

          <div className="grid gap-4 rounded-lg border border-[#d8dfda] bg-white p-6 shadow-sm dark:border-[#34443a] dark:bg-[#19231d]">
            <InfoRow label="Role" value="Teacher" icon={UserRound} />
            <InfoRow
              label="Joined"
              value={formatDate(profile.createdAt)}
              icon={CalendarClock}
            />
            <InfoRow label="Status" value="Workspace ready" icon={Sparkles} />
          </div>
        </section>

        {isOwnProfile ? (
          <section className="mt-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f] dark:text-[#a9bdad]">
                  Teaching workspace
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Fast paths for daily work
                </h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {teachingActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    className="rounded-lg border border-[#d8dfda] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9fb5a4] hover:shadow-md dark:border-[#34443a] dark:bg-[#19231d] dark:hover:border-[#6d8271]"
                    href={action.href}
                    key={action.href}
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#eef5f0] text-[#31513a] dark:bg-[#26382d] dark:text-[#dce9de]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">
                      {action.label}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#607066] dark:text-[#b8c7bb]">
                      {action.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex size-9 items-center justify-center rounded-md bg-[#f2f6f1] text-[#5f765f] dark:bg-[#223126] dark:text-[#b8c7bb]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b786e] dark:text-[#9eb0a2]">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
