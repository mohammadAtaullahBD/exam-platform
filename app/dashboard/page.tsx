import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LineChart,
  Plus,
  Target,
  UsersRound,
} from "lucide-react";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { getDatabaseNowMs } from "@/lib/supabase/database-time";
import { createClient } from "@/lib/supabase/server";
import { profileFromAuthUser, upsertUserProfile } from "@/lib/supabase/users";

import { LogoutButton } from "./logout-button";

type DashboardGroupRow = {
  id: string;
  name: string;
  created_at: string;
  group_members: Array<{ student_id: string }> | null;
};

type DashboardQuestionSetRow = {
  id: string;
  title: string;
  updated_at: string;
  question_set_questions: Array<{ id: string; points: number | null }> | null;
};

type DashboardExamRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  groups: { name: string } | null;
  exam_questions: Array<{ id: string; snapshot_points: number | null }> | null;
  submissions: Array<{
    id: string;
    score_points: number;
    total_points: number;
  }> | null;
};

type ExamState = "scheduled" | "active" | "closed";

function getExamState(startsAt: string, endsAt: string, nowMs: number): ExamState {
  if (nowMs < new Date(startsAt).getTime()) {
    return "scheduled";
  }

  if (nowMs < new Date(endsAt).getTime()) {
    return "active";
  }

  return "closed";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function getTeacherDashboardData(userId: string) {
  const supabase = await createClient();
  const [groupsResult, questionSetsResult, examsResult, databaseNowMs] =
    await Promise.all([
      supabase
        .from("groups")
        .select("id,name,created_at,group_members(student_id)")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false })
        .returns<DashboardGroupRow[]>(),
      supabase
        .from("question_sets")
        .select("id,title,updated_at,question_set_questions(id,points)")
        .eq("teacher_id", userId)
        .order("updated_at", { ascending: false })
        .returns<DashboardQuestionSetRow[]>(),
      supabase
        .from("exams")
        .select(
          "id,title,starts_at,ends_at,groups!exams_group_id_fkey(name),exam_questions(id,snapshot_points),submissions(id,score_points,total_points)",
        )
        .order("starts_at", { ascending: false })
        .returns<DashboardExamRow[]>(),
      getDatabaseNowMs(supabase).catch(() => Date.now()),
    ]);

  const groups = groupsResult.data ?? [];
  const questionSets = questionSetsResult.data ?? [];
  const exams = examsResult.data ?? [];
  const examStates = exams.map((exam) => ({
    ...exam,
    state: getExamState(exam.starts_at, exam.ends_at, databaseNowMs),
  }));
  const activeExam = examStates.find((exam) => exam.state === "active");
  const nextExam = examStates
    .filter((exam) => exam.state === "scheduled")
    .sort(
      (left, right) =>
        new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
    )[0];
  const recentExam = examStates[0] ?? null;
  const totalStudents = groups.reduce(
    (total, group) => total + (group.group_members?.length ?? 0),
    0,
  );
  const totalQuestions = questionSets.reduce(
    (total, set) => total + (set.question_set_questions?.length ?? 0),
    0,
  );
  const totalPoints = questionSets.reduce(
    (total, set) =>
      total +
      (set.question_set_questions ?? []).reduce(
        (subtotal, question) => subtotal + (question.points ?? 0),
        0,
      ),
    0,
  );

  return {
    activeExam,
    examCount: exams.length,
    nextExam,
    recentExam,
    scheduledExamCount: examStates.filter((exam) => exam.state === "scheduled")
      .length,
    closedExamCount: examStates.filter((exam) => exam.state === "closed").length,
    groups,
    groupCount: groups.length,
    questionSetCount: questionSets.length,
    totalPoints,
    totalQuestions,
    totalStudents,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  await upsertUserProfile(data.user);
  const profile = profileFromAuthUser(data.user);

  if (profile.role === "teacher") {
    const dashboard = await getTeacherDashboardData(profile.id);

    return (
      <TeacherDashboard
        dashboard={dashboard}
        displayName={profile.name ?? "Teacher"}
        email={profile.email}
      />
    );
  }

  return (
    <StudentDashboard
      displayName={profile.name ?? "Student"}
      email={profile.email}
    />
  );
}

function TeacherDashboard({
  dashboard,
  displayName,
  email,
}: {
  dashboard: Awaited<ReturnType<typeof getTeacherDashboardData>>;
  displayName: string;
  email: string;
}) {
  const primaryExam = dashboard.activeExam ?? dashboard.nextExam;
  const quickActions = [
    {
      href: "/batches/new",
      label: "Create batch",
      description: "Start a new student batch and add members.",
      icon: UsersRound,
    },
    {
      href: "/questions/new",
      label: "Create questions",
      description: "Build a Google-Forms-style question set.",
      icon: BookOpen,
    },
    {
      href: "/exams",
      label: "Create exam",
      description: "Schedule an exam from My or Public Questions.",
      icon: CalendarClock,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] dark:bg-[#111813] dark:text-[#edf3ec] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <DashboardTopBar />

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-lg border border-[#d8dfda] bg-white shadow-sm dark:border-[#34443a] dark:bg-[#19231d]">
            <div className="h-2 bg-[#58735f]" />
            <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f] dark:text-[#a9bdad]">
                  Teacher workspace
                </p>
                <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight">
                  Welcome back, {displayName}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#607066] dark:text-[#b8c7bb]">
                  Manage batches, questions, exam schedules, and results from
                  one quiet workspace built for repeated teaching work.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] dark:bg-[#edf3ec] dark:text-[#17211b] dark:hover:bg-white"
                    href="/exams"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Create exam
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] dark:border-[#46594c] dark:text-[#e2eadf] dark:hover:bg-[#223126]"
                    href="/questions"
                  >
                    <BookOpen className="size-4" aria-hidden="true" />
                    Question management
                  </Link>
                </div>
              </div>
              <div className="rounded-lg border border-[#d8dfda] bg-[#fbfcfa] p-5 dark:border-[#34443a] dark:bg-[#141d18]">
                <p className="text-sm font-semibold text-[#1f3528] dark:text-[#edf3ec]">
                  Signed in as
                </p>
                <p className="mt-2 break-words text-sm text-[#607066] dark:text-[#b8c7bb]">
                  {email}
                </p>
                <div className="mt-5 grid gap-3 text-sm">
                  <WorkspaceLink href="/profile" label="Profile" />
                  <WorkspaceLink href="/batches" label="Batches" />
                  <WorkspaceLink href="/questions" label="Questions" />
                  <WorkspaceLink href="/exams" label="Exams" />
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-[#d8dfda] bg-white p-6 shadow-sm dark:border-[#34443a] dark:bg-[#19231d]">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#eef5f0] text-[#31513a] dark:bg-[#26382d] dark:text-[#dce9de]">
                <Target className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">Today focus</p>
                <p className="mt-1 text-xs text-[#607066] dark:text-[#b8c7bb]">
                  Exams and preparation
                </p>
              </div>
            </div>
            {primaryExam ? (
              <div className="mt-5 rounded-md border border-[#d8dfda] bg-[#fbfcfa] p-4 dark:border-[#34443a] dark:bg-[#141d18]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f765f] dark:text-[#a9bdad]">
                  {primaryExam.state === "active" ? "Active now" : "Next exam"}
                </p>
                <h2 className="mt-2 break-words text-lg font-semibold">
                  {primaryExam.title}
                </h2>
                <p className="mt-2 text-sm text-[#607066] dark:text-[#b8c7bb]">
                  {primaryExam.groups?.name ?? "Batch"} -{" "}
                  {formatDateTime(primaryExam.starts_at)}
                </p>
                <Link
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] dark:bg-[#edf3ec] dark:text-[#17211b]"
                  href={`/exams/${primaryExam.id}`}
                >
                  Open results
                </Link>
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-dashed border-[#cfd8d2] bg-[#fbfcfa] p-4 text-sm leading-6 text-[#607066] dark:border-[#46594c] dark:bg-[#141d18] dark:text-[#b8c7bb]">
                No exams are scheduled yet. Create one when your next question
                set is ready.
              </div>
            )}
          </aside>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={UsersRound}
            label="Batches"
            value={dashboard.groupCount}
            detail={`${dashboard.totalStudents} student memberships`}
          />
          <MetricCard
            icon={BookOpen}
            label="Question sets"
            value={dashboard.questionSetCount}
            detail={`${dashboard.totalQuestions} questions - ${dashboard.totalPoints} points`}
          />
          <MetricCard
            icon={CalendarClock}
            label="Scheduled"
            value={dashboard.scheduledExamCount}
            detail={`${dashboard.examCount} total exams`}
          />
          <MetricCard
            icon={CheckCircle2}
            label="Closed"
            value={dashboard.closedExamCount}
            detail="Review results and merit lists"
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f] dark:text-[#a9bdad]">
                  Quick actions
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Build the next exam faster
                </h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {quickActions.map((action) => {
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
          </div>

          <div className="rounded-lg border border-[#d8dfda] bg-white p-6 shadow-sm dark:border-[#34443a] dark:bg-[#19231d]">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#eef5f0] text-[#31513a] dark:bg-[#26382d] dark:text-[#dce9de]">
                <LineChart className="size-5" aria-hidden="true" />
              </span>
              <h2 className="text-lg font-semibold">Recent exam</h2>
            </div>
            {dashboard.recentExam ? (
              <div className="mt-5">
                <p className="break-words text-xl font-semibold">
                  {dashboard.recentExam.title}
                </p>
                <p className="mt-2 text-sm text-[#607066] dark:text-[#b8c7bb]">
                  {dashboard.recentExam.groups?.name ?? "Batch"} -{" "}
                  {formatDateTime(dashboard.recentExam.starts_at)}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniStat
                    label="Questions"
                    value={dashboard.recentExam.exam_questions?.length ?? 0}
                  />
                  <MiniStat
                    label="Taken"
                    value={dashboard.recentExam.submissions?.length ?? 0}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[#607066] dark:text-[#b8c7bb]">
                Recent exam statistics will appear after the first exam is
                created.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StudentDashboard({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const actions = [
    { href: "/student/groups", label: "Batches", icon: UsersRound },
    { href: "/student/exams", label: "Exams", icon: CalendarClock },
    { href: "/student/progress", label: "Progress", icon: LineChart },
    { href: "/student/practice", label: "Practice", icon: Target },
    { href: "/student/public-exams", label: "Public Exams", icon: BookOpen },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] dark:bg-[#111813] dark:text-[#edf3ec] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <DashboardTopBar />
        <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-6 shadow-sm dark:border-[#34443a] dark:bg-[#19231d]">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f] dark:text-[#a9bdad]">
            Student workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            Welcome back, {displayName}
          </h1>
          <p className="mt-3 break-words text-sm text-[#607066] dark:text-[#b8c7bb]">
            {email}
          </p>
        </section>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                className="rounded-lg border border-[#d8dfda] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9fb5a4] hover:shadow-md dark:border-[#34443a] dark:bg-[#19231d]"
                href={action.href}
                key={action.href}
              >
                <Icon className="size-5 text-[#5f765f]" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold">{action.label}</h2>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function DashboardTopBar() {
  return (
    <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 dark:border-[#34443a] md:flex-row md:items-center md:justify-between">
      <Link
        className="inline-flex items-center gap-3 text-lg font-semibold"
        href="/dashboard"
      >
        <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#17211b] text-white dark:bg-[#edf3ec] dark:text-[#17211b]">
          <ClipboardList className="size-5" aria-hidden="true" />
        </span>
        Exam Platform
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}

function WorkspaceLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex h-10 items-center justify-between rounded-md border border-[#d8dfda] px-3 font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] dark:border-[#34443a] dark:text-[#e2eadf] dark:hover:bg-[#223126]"
      href={href}
    >
      {label}
      <span aria-hidden="true">-&gt;</span>
    </Link>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof UsersRound;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-[#d8dfda] bg-white p-5 shadow-sm dark:border-[#34443a] dark:bg-[#19231d]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#607066] dark:text-[#b8c7bb]">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#eef5f0] text-[#31513a] dark:bg-[#26382d] dark:text-[#dce9de]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-sm text-[#607066] dark:text-[#b8c7bb]">
        {detail}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#d8dfda] bg-[#fbfcfa] p-3 dark:border-[#34443a] dark:bg-[#141d18]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607066] dark:text-[#9eb0a2]">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
