import Link from "next/link";

import { MeritListView } from "@/features/exams/components/merit-list";
import { getTeacherExamMeritList } from "@/features/exams/queries";

type TeacherExamMeritPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherExamMeritPage({
  params,
}: TeacherExamMeritPageProps) {
  const { id } = await params;
  const meritList = await getTeacherExamMeritList(id);

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              {meritList.exam.groupName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {meritList.exam.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Merit list
            </p>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/exams"
          >
            Exams
          </Link>
        </header>

        <MeritListView meritList={meritList} />
      </div>
    </main>
  );
}

