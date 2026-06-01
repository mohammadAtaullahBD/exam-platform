import Link from "next/link";

import { PublicSetImportPanel } from "@/features/questions/components/public-set-import-panel";
import { QuestionFilters } from "@/features/questions/components/question-filters";
import { QuestionSetBuilder } from "@/features/questions/components/question-set-builder";
import { QuestionSetList } from "@/features/questions/components/question-set-list";
import {
  getPublicQuestionSetImportOptions,
  getTeacherQuestionSets,
  parseQuestionFilters,
} from "@/features/questions/queries";

type TeacherQuestionsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export default async function TeacherQuestionsPage({
  searchParams,
}: TeacherQuestionsPageProps) {
  const filters = parseQuestionFilters(await searchParams);
  const [questionSetResult, importSets] = await Promise.all([
    getTeacherQuestionSets(filters, "/questions"),
    getPublicQuestionSetImportOptions("/questions"),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Teacher workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Question sets</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Build form-style sets with typed questions, answer keys, points,
              and reusable drafts for exams.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
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

        {questionSetResult.message ? (
          <div className="mt-6 rounded-md border border-[#e5d6b8] bg-[#fffaf0] px-4 py-3 text-sm leading-6 text-[#6c5620]">
            {questionSetResult.message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="space-y-5">
            <QuestionFilters
              filters={filters}
              resultCount={questionSetResult.sets.length}
            />
            <QuestionSetList
              sets={questionSetResult.sets}
              schemaReady={questionSetResult.schemaReady}
            />
          </section>

          <aside className="space-y-6">
            <PublicSetImportPanel sets={importSets} />
            <QuestionSetBuilder mode="create" />
          </aside>
        </div>
      </div>
    </main>
  );
}
