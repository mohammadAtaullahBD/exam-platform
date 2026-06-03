"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Copy, FileText, Pencil, Trash2 } from "lucide-react";

import {
  copyPublicExamSetToQuestionSets,
  copyQuestionSet,
  deleteQuestionSet,
} from "@/features/questions/actions";
import {
  initialQuestionImportActionState,
  initialQuestionSetActionState,
  type PublicQuestionSetImportOption,
  type QuestionSet,
  type QuestionSourceFilter,
} from "@/features/questions/types";

type QuestionSetListProps = {
  publicSets: PublicQuestionSetImportOption[];
  sets: QuestionSet[];
  schemaReady: boolean;
  source: QuestionSourceFilter;
};

export function QuestionSetList({
  publicSets,
  sets,
  schemaReady,
  source,
}: QuestionSetListProps) {
  if (!sets.length && !publicSets.length) {
    return (
      <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">No questions found</h2>
        <p className="mt-3 text-sm leading-6 text-[#607066]">
          Create questions or adjust the filters to widen your workspace view.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sets.length ? (
        <section className="grid gap-4">
          {source === "all" ? (
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              My Questions
            </h2>
          ) : null}
          {sets.map((set) => (
            <QuestionSetPanel set={set} disabled={!schemaReady} key={set.id} />
          ))}
        </section>
      ) : null}

      {publicSets.length ? (
        <section className="grid gap-4">
          {source === "all" ? (
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Public Questions
            </h2>
          ) : null}
          {publicSets.map((set) => (
            <PublicQuestionSetPanel set={set} key={set.id} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

type QuestionSetPanelProps = {
  set: QuestionSet;
  disabled: boolean;
};

function QuestionSetPanel({ set, disabled }: QuestionSetPanelProps) {
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteQuestionSet.bind(null, set.id),
    initialQuestionSetActionState,
  );
  const [copyState, copyAction, isCopying] = useActionState(
    copyQuestionSet.bind(null, set.id),
    initialQuestionSetActionState,
  );
  const points = set.questions.reduce((total, question) => total + question.points, 0);

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white">
      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[#f4effb] text-[#673ab7]">
                <FileText className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold">{set.title}</h2>
                {set.description ? (
                  <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-[#607066]">
                    {set.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 font-semibold text-[#1f3528]">
              {set.questions.length}{" "}
              {set.questions.length === 1 ? "question" : "questions"}
            </span>
            <span className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 font-semibold text-[#1f3528]">
              {points} {points === 1 ? "point" : "points"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f765f]">
          {Array.from(new Set(set.questions.map((question) => question.questionType))).map(
            (type) => (
              <span className="rounded border border-[#d8dfda] px-2 py-1" key={type}>
                {type.replace("_", " ")}
              </span>
            ),
          )}
        </div>

        {deleteState.status === "error" && deleteState.message ? (
          <div className="mt-4 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
            {deleteState.message}
          </div>
        ) : null}

        {copyState.status === "error" && copyState.message ? (
          <div className="mt-4 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
            {copyState.message}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href={`/questions/${set.id}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Link>
          <form action={copyAction}>
            <button
              aria-label={`Copy ${set.title}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={disabled || isCopying}
              title="Make a copy"
            >
              <Copy className="size-4" aria-hidden="true" />
              {isCopying ? "Copying..." : "Copy"}
            </button>
          </form>
          <form action={deleteAction}>
            <button
              aria-label={`Delete ${set.title}`}
              className="inline-flex size-10 items-center justify-center rounded-md border border-[#d9b7ad] text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={disabled || isDeleting}
              title="Delete set"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

type PublicQuestionSetPanelProps = {
  set: PublicQuestionSetImportOption;
};

function PublicQuestionSetPanel({ set }: PublicQuestionSetPanelProps) {
  const [copyState, copyAction, isCopying] = useActionState(
    copyPublicExamSetToQuestionSets,
    initialQuestionImportActionState,
  );

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white">
      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eef5f0] text-[#47614f]">
                <FileText className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-xl font-semibold">
                    {set.title}
                  </h2>
                  <span className="rounded border border-[#d8dfda] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f765f]">
                    Public
                  </span>
                </div>
                {set.description ? (
                  <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-[#607066]">
                    {set.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <span className="rounded-md border border-[#d8dfda] bg-[#f6f8f5] px-3 py-2 text-sm font-semibold text-[#1f3528]">
            {set.questionCount}{" "}
            {set.questionCount === 1 ? "question" : "questions"}
          </span>
        </div>

        {copyState.message ? (
          <div
            className={`mt-4 rounded-md border px-4 py-3 text-sm ${
              copyState.status === "success"
                ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
            }`}
          >
            {copyState.message}
          </div>
        ) : null}

        <form action={copyAction} className="mt-5">
          <input name="setId" type="hidden" value={set.id} />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCopying || set.questionCount === 0}
            type="submit"
          >
            <Copy className="size-4" aria-hidden="true" />
            Edit as own questions
          </button>
        </form>
      </div>
    </article>
  );
}
