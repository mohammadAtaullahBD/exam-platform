"use client";

import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useActionState } from "react";

import {
  createExam,
  deleteExam,
  updateExam,
} from "@/features/exams/actions";
import {
  initialExamActionState,
  type Exam,
  type ExamGroupOption,
  type ExamQuestionOption,
} from "@/features/exams/types";

type ExamWorkspaceProps = {
  exams: Exam[];
  groups: ExamGroupOption[];
  questions: ExamQuestionOption[];
};

type ExamEditorMode =
  | { type: "create"; exam?: never }
  | { type: "edit"; exam: Exam };

const stateLabels = {
  scheduled: "Scheduled",
  active: "Active",
  closed: "Closed",
};

const stateClasses = {
  scheduled: "border-[#d8dfda] bg-[#f6f8f5] text-[#1f3528]",
  active: "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]",
  closed: "border-[#d1c5b5] bg-[#f7f1e8] text-[#5e4b34]",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isoToLocalInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function localDateTimeToIso(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function questionValue(question: ExamQuestionOption) {
  if (question.source === "public") {
    return `public-set:${question.id}`;
  }

  if (question.source === "current") {
    return `current-exam:${question.id}`;
  }

  return `set:${question.id}`;
}

function formatQuestionTypes(question: ExamQuestionOption) {
  return question.questionTypes.length
    ? question.questionTypes.map((type) => type.replaceAll("_", " ")).join(", ")
    : "No question items";
}

export function ExamWorkspace({
  exams,
  groups,
  questions,
}: ExamWorkspaceProps) {
  const [editorMode, setEditorMode] = useState<ExamEditorMode | null>(null);

  return (
    <>
      <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recent Exams</h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">
              Open an exam card to review participation, absences, and results.
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b]"
            type="button"
            onClick={() => setEditorMode({ type: "create" })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Create exam
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        {exams.length ? (
          exams.map((exam) => (
            <ExamSummaryCard
              exam={exam}
              key={exam.id}
              onEdit={() => setEditorMode({ type: "edit", exam })}
            />
          ))
        ) : (
          <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
            <h2 className="text-xl font-semibold">No exams yet</h2>
            <p className="mt-3 text-sm leading-6 text-[#607066]">
              Create your first exam after you have at least one batch and one
              question set ready.
            </p>
          </div>
        )}
      </section>

      {editorMode ? (
        <ExamEditorModal
          groups={groups}
          mode={editorMode}
          questions={questions}
          onClose={() => setEditorMode(null)}
        />
      ) : null}
    </>
  );
}

function ExamSummaryCard({
  exam,
  onEdit,
}: {
  exam: Exam;
  onEdit: () => void;
}) {
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteExam.bind(null, exam.id),
    initialExamActionState,
  );
  const canEdit = exam.state !== "closed";
  const canDelete = exam.state !== "closed";

  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white transition hover:border-[#17211b] hover:shadow-sm">
      <Link className="block p-5" href={`/exams/${exam.id}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              {exam.groupName}
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold">
              {exam.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#607066]">
              {exam.questionCount}{" "}
              {exam.questionCount === 1 ? "question" : "questions"} -{" "}
              {exam.studentCount}{" "}
              {exam.studentCount === 1 ? "student" : "students"}
            </p>
          </div>
          <span
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${stateClasses[exam.state]}`}
          >
            {stateLabels[exam.state]}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
            <dt className="font-medium text-[#607066]">Starts</dt>
            <dd className="mt-1 font-semibold text-[#26352b]">
              {formatDateTime(exam.startsAt)}
            </dd>
          </div>
          <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
            <dt className="font-medium text-[#607066]">Ends</dt>
            <dd className="mt-1 font-semibold text-[#26352b]">
              {formatDateTime(exam.endsAt)}
            </dd>
          </div>
        </dl>
      </Link>

      <div className="border-t border-[#d8dfda] px-5 py-4">
        {deleteState.message ? (
          <div
            className={`mb-3 rounded-md border px-4 py-3 text-sm ${
              deleteState.status === "success"
                ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
            }`}
          >
            {deleteState.message}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!canEdit}
            onClick={onEdit}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </button>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              const confirmed = window.confirm(
                `Delete "${exam.title}"? This removes the exam for every student. This cannot be undone.`,
              );

              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d9b7ad] px-3 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={isDeleting || !canDelete}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function ExamEditorModal({
  groups,
  mode,
  questions,
  onClose,
}: {
  groups: ExamGroupOption[];
  mode: ExamEditorMode;
  questions: ExamQuestionOption[];
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const startsAtInputRef = useRef<HTMLInputElement>(null);
  const endsAtInputRef = useRef<HTMLInputElement>(null);
  const startsAtIsoRef = useRef<HTMLInputElement>(null);
  const endsAtIsoRef = useRef<HTMLInputElement>(null);
  const action =
    mode.type === "edit" ? updateExam.bind(null, mode.exam.id) : createExam;
  const [state, formAction, isPending] = useActionState(
    action,
    initialExamActionState,
  );
  const allQuestions = useMemo(
    () => [
      ...(mode.type === "edit" ? mode.exam.currentQuestions : []),
      ...questions,
    ],
    [mode, questions],
  );
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | "own" | "public" | "current">(
    mode.type === "edit" ? "current" : "own",
  );
  const [selectedQuestionValues, setSelectedQuestionValues] = useState(
    mode.type === "edit" ? mode.exam.selectedQuestionIds : [],
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const canSave = groups.length > 0 && allQuestions.length > 0;
  const isPostponeOnly = mode.type === "edit" && mode.exam.state === "active";
  const filteredQuestions = allQuestions.filter((question) => {
    const haystack = `${question.title} ${question.description ?? ""} ${
      question.sourceLabel
    } ${question.questionTypes.join(" ")}`.toLocaleLowerCase();
    const sourceMatches = source === "all" || question.source === source;

    return sourceMatches && haystack.includes(query.toLocaleLowerCase());
  });
  const sourceOptions: Array<{
    value: "all" | "own" | "public" | "current";
    label: string;
  }> = [
    { value: "all", label: "All" },
    { value: "own", label: "My Questions" },
    { value: "public", label: "Public Questions" },
    ...(mode.type === "edit"
      ? [{ value: "current" as const, label: "Current exam" }]
      : []),
  ];

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      onClose();
    }
  }, [onClose, state.status]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  function requestClose() {
    if (hasUnsavedChanges) {
      setShowLeaveWarning(true);
      return;
    }

    onClose();
  }

  function handleSubmit() {
    if (startsAtIsoRef.current && startsAtInputRef.current) {
      startsAtIsoRef.current.value = localDateTimeToIso(
        startsAtInputRef.current.value,
      );
    }

    if (endsAtIsoRef.current && endsAtInputRef.current) {
      endsAtIsoRef.current.value = localDateTimeToIso(endsAtInputRef.current.value);
    }
  }

  function toggleQuestion(value: string) {
    setHasUnsavedChanges(true);
    setSelectedQuestionValues((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#17211b]/45 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <form
        action={formAction}
        className="w-full max-w-4xl rounded-lg border border-[#d8dfda] bg-white shadow-xl"
        onInput={() => setHasUnsavedChanges(true)}
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d8dfda] p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              {mode.type === "edit"
                ? isPostponeOnly
                  ? "Postpone active exam"
                  : "Edit scheduled exam"
                : "Create exam"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {mode.type === "edit" ? mode.exam.title : "New exam"}
            </h2>
          </div>
          <button
            className="inline-flex size-10 items-center justify-center rounded-md border border-[#cfd8d2] text-[#1f3528] transition hover:bg-[#eef5f0]"
            type="button"
            onClick={requestClose}
            aria-label="Close exam editor"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 p-5">
          {state.message ? (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                state.status === "success"
                  ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
                  : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          {isPostponeOnly ? (
            <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-4 py-3 text-sm leading-6 text-[#607066]">
              This exam has already started. You can postpone or extend the
              exam time, but the batch and questions stay locked.
            </div>
          ) : null}

          {!canSave ? (
            <div className="rounded-md border border-[#e5d6b8] bg-[#fffaf0] px-4 py-3 text-sm leading-6 text-[#6c5620]">
              Add at least one batch and one question set before creating an
              exam.
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <label className="block">
              <span className="text-sm font-medium text-[#26352b]">
                Exam title
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                name="title"
                type="text"
                maxLength={120}
                defaultValue={mode.type === "edit" ? mode.exam.title : ""}
                disabled={isPending || !canSave}
                required
              />
              {state.fieldErrors?.title?.[0] ? (
                <span className="mt-2 block text-sm text-[#8a3a28]">
                  {state.fieldErrors.title[0]}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#26352b]">
                Student batch
              </span>
              <select
                className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                name="groupId"
                defaultValue={mode.type === "edit" ? mode.exam.groupId : ""}
                disabled={isPending || !canSave || isPostponeOnly}
                required
              >
                <option value="">Choose a batch</option>
                {groups.map((group) => (
                  <option value={group.id} key={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.groupId?.[0] ? (
                <span className="mt-2 block text-sm text-[#8a3a28]">
                  {state.fieldErrors.groupId[0]}
                </span>
              ) : null}
              {isPostponeOnly && mode.type === "edit" ? (
                <input name="groupId" type="hidden" value={mode.exam.groupId} />
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[#26352b]">
                Start date and time
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                name="startsAt"
                type="datetime-local"
                defaultValue={
                  mode.type === "edit" ? isoToLocalInput(mode.exam.startsAt) : ""
                }
                disabled={isPending || !canSave}
                ref={startsAtInputRef}
                required
              />
              <input name="startsAtIso" type="hidden" ref={startsAtIsoRef} />
              {state.fieldErrors?.startsAt?.[0] ? (
                <span className="mt-2 block text-sm text-[#8a3a28]">
                  {state.fieldErrors.startsAt[0]}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#26352b]">
                End date and time
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                name="endsAt"
                type="datetime-local"
                defaultValue={
                  mode.type === "edit" ? isoToLocalInput(mode.exam.endsAt) : ""
                }
                disabled={isPending || !canSave}
                ref={endsAtInputRef}
                required
              />
              <input name="endsAtIso" type="hidden" ref={endsAtIsoRef} />
              {state.fieldErrors?.endsAt?.[0] ? (
                <span className="mt-2 block text-sm text-[#8a3a28]">
                  {state.fieldErrors.endsAt[0]}
                </span>
              ) : null}
            </label>
          </div>

          {isPostponeOnly ? (
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-[#26352b]">
                Questions
              </legend>
              {selectedQuestionValues.map((value) => (
                <input
                  name="questionIds"
                  type="hidden"
                  value={value}
                  key={value}
                />
              ))}
              <div className="rounded-md border border-[#d8dfda] bg-[#f9fbf8] px-4 py-3 text-sm leading-6 text-[#607066]">
                Current exam questions are locked for active exams.
              </div>
            </fieldset>
          ) : (
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium text-[#26352b]">
              Questions
            </legend>
            <div className="grid gap-3 rounded-md border border-[#d8dfda] bg-[#f9fbf8] p-3">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607066]"
                  aria-hidden="true"
                />
                <input
                  className="h-11 w-full rounded-md border border-[#cfc7ba] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search My Questions and Public Questions"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {sourceOptions.map(({ value, label }) => (
                  <button
                    className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                      source === value
                        ? "border-[#17211b] bg-[#17211b] text-white"
                        : "border-[#cfd8d2] text-[#1f3528] hover:bg-[#eef5f0]"
                    }`}
                    key={value}
                    type="button"
                    onClick={() => setSource(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {selectedQuestionValues.map((value) => (
                <input
                  name="questionIds"
                  type="hidden"
                  value={value}
                  key={value}
                />
              ))}

              <div className="max-h-80 overflow-y-auto rounded-md border border-[#d8dfda] bg-white">
                {filteredQuestions.length ? (
                  <div className="grid gap-0">
                    {filteredQuestions.map((question) => {
                      const value = questionValue(question);
                      const checked = selectedQuestionValues.includes(value);

                      return (
                        <label
                          className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-3 border-b border-[#edf1ee] p-3 last:border-b-0"
                          key={value}
                        >
                          <input
                            className="mt-1 size-4 accent-[#17211b]"
                            type="checkbox"
                            checked={checked}
                            disabled={isPending || !canSave}
                            onChange={() => toggleQuestion(value)}
                          />
                          <span className="min-w-0">
                            <span className="block break-words text-sm font-semibold text-[#26352b]">
                              {question.title}
                            </span>
                            {question.description ? (
                              <span className="mt-1 block break-words text-xs leading-5 text-[#607066]">
                                {question.description}
                              </span>
                            ) : null}
                            <span className="mt-1 block text-xs leading-5 text-[#607066]">
                              {question.sourceLabel} -{" "}
                              {question.source === "own"
                                ? "My Questions"
                                : question.source === "public"
                                  ? "Public Questions"
                                  : "Current exam"}{" "}
                              - {question.questionCount}{" "}
                              {question.questionCount === 1
                                ? "question"
                                : "questions"}{" "}
                              - {formatQuestionTypes(question)}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-[#26352b]">
                            {question.points}{" "}
                            {question.points === 1 ? "pt" : "pts"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="p-4 text-sm text-[#607066]">
                    No question sets match this search.
                  </p>
                )}
              </div>
            </div>
            {state.fieldErrors?.questionIds?.[0] ? (
              <span className="text-sm text-[#8a3a28]">
                {state.fieldErrors.questionIds[0]}
              </span>
            ) : null}
          </fieldset>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#d8dfda] p-5 sm:flex-row sm:justify-end">
          <button
            className="h-11 rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            type="button"
            onClick={requestClose}
          >
            Cancel
          </button>
          <button
            className="h-11 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isPending || !canSave}
          >
            {isPending
              ? mode.type === "edit"
                ? "Saving..."
                : "Creating..."
              : mode.type === "edit"
                ? "Save exam"
                : "Create exam"}
          </button>
        </div>
      </form>

      {showLeaveWarning ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-exam-title"
        >
          <div className="w-full max-w-md rounded-lg border border-[#d8dfda] bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold" id="unsaved-exam-title">
              Unsaved changes
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#607066]">
              You have unsaved exam changes. Leaving now will discard them.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-[#d9b7ad] px-4 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef]"
                type="button"
                onClick={() => {
                  setHasUnsavedChanges(false);
                  onClose();
                }}
              >
                Leave with unsaved
              </button>
              <button
                className="h-10 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b]"
                type="button"
                onClick={() => setShowLeaveWarning(false)}
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
