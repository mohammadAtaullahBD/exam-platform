import Link from "next/link";

import { QuestionFilters } from "@/features/questions/components/question-filters";
import { QuestionSetList } from "@/features/questions/components/question-set-list";
import {
  getPublicQuestionSetImportOptions,
  getTeacherQuestionSets,
  parseQuestionFilters,
} from "@/features/questions/queries";

type TeacherQuestionsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    source?: string | string[];
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
  const normalizedSearch = filters.query.toLowerCase();
  const publicSets = normalizedSearch
    ? importSets.filter((set) =>
        [set.title, set.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      )
    : importSets;
  const showOwn = filters.source === "own" || filters.source === "all";
  const showPublic = filters.source === "public" || filters.source === "all";
  const resultCount =
    (showOwn ? questionSetResult.sets.length : 0) +
    (showPublic ? publicSets.length : 0);

  return (
    <main className="min-h-screen bg-[#f8fafd] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Questions management
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Questions</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Search, manage, and prepare reusable questions for group exams.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b]"
              href="/questions/new"
            >
              Create Questions
            </Link>
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

        <section className="mt-8 space-y-6">
          <QuestionFilters
            filters={filters}
            resultCount={resultCount}
          />

          <QuestionSetList
            publicSets={showPublic ? publicSets : []}
            schemaReady={questionSetResult.schemaReady}
            sets={showOwn ? questionSetResult.sets : []}
            source={filters.source}
          />
        </section>
      </div>
    </main>
  );
}
