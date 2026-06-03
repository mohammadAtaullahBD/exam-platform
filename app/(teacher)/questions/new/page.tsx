import { QuestionSetBuilder } from "@/features/questions/components/question-set-builder";
import { requireTeacherQuestionAccess } from "@/features/questions/queries";

export default async function NewQuestionSetPage() {
  await requireTeacherQuestionAccess("/questions/new");

  return (
    <main className="min-h-screen bg-[#f8fafd] px-4 py-6 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b border-[#d8dfda] pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Question creator
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Create questions</h1>
          </div>
        </header>

        <section className="space-y-6">
          <QuestionSetBuilder mode="create" />
        </section>
      </div>
    </main>
  );
}
