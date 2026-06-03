import Link from "next/link";

import type {
  QuestionSetFilters,
  QuestionSourceFilter,
} from "@/features/questions/types";

type QuestionFiltersProps = {
  filters: QuestionSetFilters;
  resultCount: number;
};

export function QuestionFilters({
  filters,
  resultCount,
}: QuestionFiltersProps) {
  const sourceOptions: Array<{ label: string; value: QuestionSourceFilter }> = [
    { label: "My Questions", value: "own" },
    { label: "Public Questions", value: "public" },
    { label: "All", value: "all" },
  ];

  function hrefForSource(source: QuestionSourceFilter) {
    const params = new URLSearchParams();

    if (filters.query) {
      params.set("q", filters.query);
    }

    if (source !== "own") {
      params.set("source", source);
    }

    const query = params.toString();

    return query ? `/questions?${query}` : "/questions";
  }

  return (
    <form className="rounded-lg border border-[#d8dfda] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Search</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="q"
            type="search"
            defaultValue={filters.query}
            placeholder="Question title, prompt, option, or description"
          />
        </label>
        <input name="source" type="hidden" value={filters.source} />

        <button
          className="h-11 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b]"
          type="submit"
        >
          Apply
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sourceOptions.map((option) => {
          const active = filters.source === option.value;

          return (
            <Link
              className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-semibold transition ${
                active
                  ? "border-[#17211b] bg-[#17211b] text-white"
                  : "border-[#cfd8d2] text-[#1f3528] hover:bg-[#eef5f0]"
              }`}
              href={hrefForSource(option.value)}
              key={option.value}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-[#607066] sm:flex-row sm:items-center sm:justify-between">
        <p>
          {resultCount} {resultCount === 1 ? "question collection" : "question collections"} found
        </p>
        <Link className="font-semibold text-[#1f3528] hover:underline" href="/questions">
          Clear filters
        </Link>
      </div>
    </form>
  );
}
