import Link from "next/link";

import { CreateQuestionForm } from "@/features/questions/components/create-question-form";
import { QuestionCard } from "@/features/questions/components/question-card";
import { QuestionFilters } from "@/features/questions/components/question-filters";
import {
  getTeacherQuestions,
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
  const questions = await getTeacherQuestions(filters, "/questions");

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Teacher workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Questions</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Build and maintain your question bank for upcoming exams.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/groups"
            >
              Groups
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="space-y-4">
            <QuestionFilters filters={filters} resultCount={questions.length} />

            {questions.length ? (
              questions.map((question) => (
                <QuestionCard question={question} key={question.id} />
              ))
            ) : (
              <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
                <h2 className="text-xl font-semibold">No questions found</h2>
                <p className="mt-3 text-sm leading-6 text-[#607066]">
                  Create a question or adjust the filters to widen your question
                  bank view.
                </p>
              </div>
            )}
          </section>

          <aside>
            <CreateQuestionForm />
          </aside>
        </div>
      </div>
    </main>
  );
}
