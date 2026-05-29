import type { AdminPublicExamSet } from "@/features/public-exams/types";

type AdminPublicSetListProps = {
  sets: AdminPublicExamSet[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function AdminPublicSetList({ sets }: AdminPublicSetListProps) {
  if (!sets.length) {
    return (
      <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">No public sets yet</h2>
        <p className="mt-3 text-sm leading-6 text-[#607066]">
          Create a named set with at least one question to make it available.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {sets.map((set) => (
        <article
          className="rounded-lg border border-[#d8dfda] bg-white p-6"
          key={set.id}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
                {set.questionCount}{" "}
                {set.questionCount === 1 ? "question" : "questions"}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{set.title}</h2>
              {set.description ? (
                <p className="mt-3 text-sm leading-6 text-[#607066]">
                  {set.description}
                </p>
              ) : null}
            </div>
            <div
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                set.isPublished
                  ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                  : "border-[#d1c5b5] bg-[#f7f1e8] text-[#5e4b34]"
              }`}
            >
              {set.isPublished ? "Published" : "Draft"}
            </div>
          </div>

          <p className="mt-5 text-sm text-[#607066]">
            Created {formatDate(set.createdAt)}
          </p>
        </article>
      ))}
    </section>
  );
}
