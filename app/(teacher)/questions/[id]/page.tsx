import { notFound } from "next/navigation";

import { QuestionSetBuilder } from "@/features/questions/components/question-set-builder";
import { getTeacherQuestionSets } from "@/features/questions/queries";

type EditQuestionSetPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditQuestionSetPage({
  params,
}: EditQuestionSetPageProps) {
  const { id } = await params;
  const result = await getTeacherQuestionSets(
    { query: "", source: "own" },
    `/questions/${id}`,
  );
  const set = result.sets.find((questionSet) => questionSet.id === id);

  if (!set) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f8fafd] px-4 py-6 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b border-[#d8dfda] pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Question creator
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Edit questions</h1>
          </div>
        </header>

        <QuestionSetBuilder
          mode="edit"
          set={set}
          disabled={!result.schemaReady}
        />
      </div>
    </main>
  );
}
