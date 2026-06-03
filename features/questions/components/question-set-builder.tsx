"use client";

import { useRouter } from "next/navigation";
import {
  Bold,
  Check,
  Circle,
  Copy,
  Eye,
  GripVertical,
  Italic,
  Link2,
  ListPlus,
  MoreVertical,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Trash2,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createQuestionSet,
  updateQuestionSet,
} from "@/features/questions/actions";
import { RichTextDisplay } from "@/features/questions/components/rich-text-display";
import {
  initialQuestionSetActionState,
  type GradingMode,
  type QuestionSet,
  type QuestionType,
} from "@/features/questions/types";
import { richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";

type DraftQuestion = {
  key: string;
  content: string;
  description: string;
  questionType: QuestionType;
  options: string[];
  answerKey: string;
  isRequired: boolean;
  points: number;
  gradingMode: GradingMode;
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  ratingMax: number;
  shuffleOptions: boolean;
};

type QuestionSetBuilderProps = {
  backHref?: string;
  backLabel?: string;
  mode: "create" | "edit";
  set?: QuestionSet;
  disabled?: boolean;
};

type ThemeOption = {
  name: string;
  color: string;
  page: string;
  border: string;
  soft: string;
};

const themeOptions: ThemeOption[] = [
  {
    name: "Default",
    color: "#17211b",
    page: "#f8fafd",
    border: "#d8dfda",
    soft: "#f6f8f5",
  },
  {
    name: "Purple",
    color: "#673ab7",
    page: "#ede7f6",
    border: "#d2c6e8",
    soft: "#f5f0ff",
  },
  {
    name: "Green",
    color: "#34a853",
    page: "#e7f3e8",
    border: "#c7dfcd",
    soft: "#f0f8f1",
  },
  {
    name: "Blue",
    color: "#1a73e8",
    page: "#e8f0fe",
    border: "#bfd1f4",
    soft: "#f2f6ff",
  },
  {
    name: "Rose",
    color: "#d93064",
    page: "#fde7ee",
    border: "#f4becd",
    soft: "#fff3f6",
  },
];

const typeLabels: Record<QuestionType, string> = {
  short_answer: "Short answer",
  paragraph: "Paragraph",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  dropdown: "Dropdown",
  linear_scale: "Linear scale",
  rating: "Rating",
};

const choiceTypes: QuestionType[] = [
  "multiple_choice",
  "checkboxes",
  "dropdown",
];

const formatButtonClass =
  "inline-flex size-8 items-center justify-center rounded-md text-[#5f665f] transition hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50";

const iconButtonClass =
  "inline-flex size-10 items-center justify-center rounded-md border border-transparent text-[#5f6368] transition hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-40";

function draftKey(index: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
}

function answerKeyValue(value: unknown) {
  if (value && typeof value === "object" && "value" in value) {
    const answer = (value as { value?: unknown }).value;

    return typeof answer === "string" || typeof answer === "number"
      ? String(answer)
      : "";
  }

  if (value && typeof value === "object" && "values" in value) {
    const answers = (value as { values?: unknown }).values;

    return Array.isArray(answers)
      ? answers.filter((answer) => typeof answer === "string").join(", ")
      : "";
  }

  return "";
}

function settingsNumber(value: unknown, name: string, fallback: number) {
  if (value && typeof value === "object" && name in value) {
    const nextValue = (value as Record<string, unknown>)[name];

    return typeof nextValue === "number" ? nextValue : fallback;
  }

  return fallback;
}

function settingsString(value: unknown, name: string) {
  if (value && typeof value === "object" && name in value) {
    const nextValue = (value as Record<string, unknown>)[name];

    return typeof nextValue === "string" ? nextValue : "";
  }

  return "";
}

function settingsBoolean(value: unknown, name: string) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>)[name] === true,
  );
}

function createDraftQuestion(index: number): DraftQuestion {
  return {
    key: draftKey(index),
    content: "",
    description: "",
    questionType: "multiple_choice",
    options: ["Option 1"],
    answerKey: "Option 1",
    isRequired: false,
    points: 1,
    gradingMode: "auto",
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
    ratingMax: 5,
    shuffleOptions: false,
  };
}

function draftQuestionsFromSet(set?: QuestionSet): DraftQuestion[] {
  if (!set?.questions.length) {
    return [createDraftQuestion(0)];
  }

  return set.questions.map((question, index) => ({
    key: question.id || draftKey(index),
    content: question.content,
    description: question.description ?? "",
    questionType: question.questionType,
    options: question.options.length ? question.options : ["Option 1"],
    answerKey: answerKeyValue(question.answerKey),
    isRequired: question.isRequired,
    points:
      question.questionType === "paragraph" && question.gradingMode === "none"
        ? 0
        : Math.max(question.points, 1),
    gradingMode: question.gradingMode,
    scaleMin: settingsNumber(question.settings, "min", 1),
    scaleMax: settingsNumber(question.settings, "max", 5),
    scaleMinLabel: settingsString(question.settings, "minLabel"),
    scaleMaxLabel: settingsString(question.settings, "maxLabel"),
    ratingMax: settingsNumber(question.settings, "max", 5),
    shuffleOptions: settingsBoolean(question.settings, "shuffleOptions"),
  }));
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);

  return next;
}

function stopToolbarBlur(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

function dispatchRichInput(target: Element) {
  target.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

function applyVisualFormat(kind: "bold" | "italic" | "underline" | "link" | "clear") {
  const target = document.activeElement;

  if (!(target instanceof HTMLElement) || target.dataset.richTarget !== "true") {
    return;
  }

  if (kind === "bold") {
    document.execCommand("bold");
  } else if (kind === "italic") {
    document.execCommand("italic");
  } else if (kind === "underline") {
    document.execCommand("underline");
  } else if (kind === "link") {
    const url = window.prompt("Link URL", "https://");

    if (url?.startsWith("http://") || url?.startsWith("https://")) {
      document.execCommand("createLink", false, url);
    }
  } else {
    document.execCommand("removeFormat");
    document.execCommand("unlink");
  }

  dispatchRichInput(target);
  target.focus();
}

function runUndoRedo(kind: "undo" | "redo") {
  const target = document.activeElement;

  if (target instanceof HTMLElement && target.dataset.richTarget === "true") {
    document.execCommand(kind);
    dispatchRichInput(target);
    target.focus();
  } else {
    document.execCommand(kind);
  }
}

function serializeDraft(
  title: string,
  description: string,
  questions: DraftQuestion[],
) {
  return JSON.stringify({
    title,
    description,
    questions: questions.map((question) => ({
      content: question.content,
      description: question.description,
      questionType: question.questionType,
      options: question.options,
      answerKey: question.answerKey,
      isRequired: question.isRequired,
      points: question.points,
      gradingMode: question.gradingMode,
      scaleMin: question.scaleMin,
      scaleMax: question.scaleMax,
      scaleMinLabel: question.scaleMinLabel,
      scaleMaxLabel: question.scaleMaxLabel,
      ratingMax: question.ratingMax,
      shuffleOptions: question.shuffleOptions,
    })),
  });
}

export function QuestionSetBuilder({
  backHref = "/questions",
  backLabel = "Questions management",
  mode,
  set,
  disabled = false,
}: QuestionSetBuilderProps) {
  const router = useRouter();
  const action = useMemo(
    () =>
      mode === "edit" && set ? updateQuestionSet.bind(null, set.id) : createQuestionSet,
    [mode, set],
  );
  const [state, formAction, isPending] = useActionState(
    action,
    initialQuestionSetActionState,
  );
  const [title, setTitle] = useState(() => set?.title ?? "");
  const [description, setDescription] = useState(() => set?.description ?? "");
  const [questions, setQuestions] = useState(() => draftQuestionsFromSet(set));
  const [history, setHistory] = useState<DraftQuestion[][]>([]);
  const [future, setFuture] = useState<DraftQuestion[][]>([]);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [showFormDescription, setShowFormDescription] = useState(
    Boolean(set?.description),
  );
  const [theme, setTheme] = useState(themeOptions[0]);
  const [showPreview, setShowPreview] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const draftSnapshot = useMemo(
    () => serializeDraft(title, description, questions),
    [description, questions, title],
  );
  const [savedSnapshot, setSavedSnapshot] = useState(draftSnapshot);
  const [pendingNavigation, setPendingNavigation] = useState<
    { type: "href"; href: string } | { type: "back" } | null
  >(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const skipNavigationGuardRef = useRef(false);
  const isDisabled = disabled || isPending;
  const hasUnsavedChanges = !disabled && draftSnapshot !== savedSnapshot;

  useEffect(() => {
    if (state.status === "success") {
      queueMicrotask(() => setSavedSnapshot(draftSnapshot));
    }
  }, [draftSnapshot, state.status]);

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

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    window.history.pushState({ questionBuilderUnsavedGuard: true }, "", window.location.href);

    function handlePopState() {
      if (skipNavigationGuardRef.current) {
        return;
      }

      setPendingNavigation({ type: "back" });
      window.history.pushState({ questionBuilderUnsavedGuard: true }, "", window.location.href);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasUnsavedChanges]);

  function requestNavigation(href: string) {
    if (!hasUnsavedChanges) {
      router.push(href);
      return;
    }

    setPendingNavigation({ type: "href", href });
  }

  function leaveWithUnsavedChanges() {
    if (!pendingNavigation) {
      return;
    }

    skipNavigationGuardRef.current = true;
    setSavedSnapshot(draftSnapshot);

    if (pendingNavigation.type === "href") {
      router.push(pendingNavigation.href);
    } else {
      window.history.back();
    }
  }

  useEffect(() => {
    if (!showThemeMenu) {
      return;
    }

    function closeThemeMenu(event: PointerEvent) {
      if (
        themeMenuRef.current &&
        event.target instanceof Node &&
        !themeMenuRef.current.contains(event.target)
      ) {
        setShowThemeMenu(false);
      }
    }

    document.addEventListener("pointerdown", closeThemeMenu);

    return () => document.removeEventListener("pointerdown", closeThemeMenu);
  }, [showThemeMenu]);

  function setQuestionsWithHistory(updater: (current: DraftQuestion[]) => DraftQuestion[]) {
    setQuestions((current) => {
      const next = updater(current);

      if (next === current || JSON.stringify(next) === JSON.stringify(current)) {
        return current;
      }

      setHistory((previous) => [...previous.slice(-24), current]);
      setFuture([]);

      return next;
    });
  }

  function undoDraft() {
    if (!history.length) {
      runUndoRedo("undo");
      return;
    }

    const previous = history[history.length - 1];

    setFuture((current) => [questions, ...current]);
    setHistory((current) => current.slice(0, -1));
    setQuestions(previous);
  }

  function redoDraft() {
    if (!future.length) {
      runUndoRedo("redo");
      return;
    }

    const [next, ...rest] = future;

    setHistory((current) => [...current, questions]);
    setFuture(rest);
    setQuestions(next);
  }

  function addQuestion() {
    setQuestionsWithHistory((current) => [
      ...current,
      createDraftQuestion(current.length),
    ]);
  }

  function removeQuestion(key: string) {
    setQuestionsWithHistory((current) =>
      current.length === 1
        ? current
        : current.filter((question) => question.key !== key),
    );
  }

  function duplicateQuestion(key: string) {
    setQuestionsWithHistory((current) => {
      const index = current.findIndex((question) => question.key === key);

      if (index < 0) {
        return current;
      }

      const clone = {
        ...current[index],
        key: draftKey(index),
      };
      const next = [...current];
      next.splice(index + 1, 0, clone);

      return next;
    });
  }

  function reorderQuestion(targetKey: string) {
    if (!draggingKey || draggingKey === targetKey) {
      return;
    }

    setQuestionsWithHistory((current) => {
      const fromIndex = current.findIndex((question) => question.key === draggingKey);
      const toIndex = current.findIndex((question) => question.key === targetKey);

      return moveItem(current, fromIndex, toIndex);
    });
  }

  function updateQuestion(key: string, patch: Partial<DraftQuestion>) {
    setQuestions((current) =>
      current.map((question) =>
        question.key === key ? { ...question, ...patch } : question,
      ),
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-3 rounded-xl p-3 transition-colors"
      style={
        {
          "--builder-accent": theme.color,
          "--builder-page": theme.page,
          "--builder-border": theme.border,
          "--builder-soft": theme.soft,
          backgroundColor: theme.page,
        } as CSSProperties
      }
    >
      <div className="sticky top-3 z-30 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d8dfda] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            type="button"
            onClick={() => requestNavigation(backHref)}
          >
            {backLabel}
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            type="button"
            onClick={() => requestNavigation("/exams")}
          >
            Exams
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Undo"
            className={iconButtonClass}
            onClick={undoDraft}
            onMouseDown={stopToolbarBlur}
            title="Undo"
            type="button"
          >
            <Undo2 className="size-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Redo"
            className={iconButtonClass}
            onClick={redoDraft}
            onMouseDown={stopToolbarBlur}
            title="Redo"
            type="button"
          >
            <Redo2 className="size-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Preview"
            className={iconButtonClass}
            onClick={() => setShowPreview(true)}
            title="Preview"
            type="button"
          >
            <Eye className="size-4" aria-hidden="true" />
          </button>
          <div className="relative" ref={themeMenuRef}>
            <button
              aria-label="Theme"
              className={iconButtonClass}
              onClick={() => setShowThemeMenu((current) => !current)}
              title="Theme"
              type="button"
            >
              <Palette className="size-4" aria-hidden="true" />
            </button>
            {showThemeMenu ? (
              <div className="absolute right-0 top-12 z-30 w-64 rounded-md border border-[#dadce0] bg-white p-2 shadow-lg">
                {themeOptions.map((option) => (
                  <button
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-[#3c4043] transition hover:bg-[#f1f3f4]"
                    key={option.name}
                    onClick={() => {
                      setTheme(option);
                      setShowThemeMenu(false);
                    }}
                    type="button"
                  >
                    <span className="flex items-center -space-x-2">
                      <span
                        className="size-5 rounded-full border border-white"
                        style={{ backgroundColor: option.color }}
                      />
                      <span
                        className="size-5 rounded-full border border-white"
                        style={{ backgroundColor: option.page }}
                      />
                    </span>
                    <span className="flex-1">{option.name}</span>
                    {theme.name === option.name ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-3">

        <section className="overflow-hidden rounded-lg border border-[#dadce0] bg-white shadow-sm">
          <div className="h-3" style={{ backgroundColor: theme.color }} />
          <div className="space-y-3 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <RichTextField
                  className="min-h-12 w-full min-w-0 border-0 border-b border-transparent bg-transparent px-0 py-1 text-3xl font-normal leading-tight outline-none transition empty:before:text-[#3c4043] focus:border-[var(--builder-accent)]"
                  disabled={isDisabled}
                  maxLength={120}
                  name="title"
                  onChange={setTitle}
                  placeholder="Untitled Form"
                  value={title}
                />
                {state.fieldErrors?.title?.[0] ? (
                  <span className="mt-2 block text-sm text-[#8a3a28]">
                    {state.fieldErrors.title[0]}
                  </span>
                ) : null}
              </div>

              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: theme.color }}
                type="submit"
                disabled={isDisabled}
              >
                <Save className="size-4" aria-hidden="true" />
                {isPending
                  ? "Saving..."
                  : mode === "edit"
                    ? "Save"
                    : "Create"}
              </button>
            </div>

            {showFormDescription ? (
              <RichTextField
                className="min-h-11 w-full min-w-0 border-0 border-b border-[#dadce0] bg-transparent px-0 py-2 text-sm leading-6 outline-none transition focus:border-[var(--builder-accent)]"
                disabled={isDisabled}
                maxLength={2000}
                name="description"
                onChange={setDescription}
                placeholder="Form description"
                value={description}
              />
            ) : (
              <>
                <input name="description" type="hidden" value="" />
                <button
                  className="text-sm font-medium transition hover:opacity-80"
                  style={{ color: theme.color }}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setShowFormDescription(true)}
                >
                  Add form description
                </button>
              </>
            )}
          </div>
        </section>

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

        <div className="space-y-3">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.key}
              index={index}
              question={question}
              disabled={isDisabled}
              isDragging={draggingKey === question.key}
              canRemove={questions.length > 1}
              theme={theme}
              onChange={(patch) => updateQuestion(question.key, patch)}
              onRemove={() => removeQuestion(question.key)}
              onDuplicate={() => duplicateQuestion(question.key)}
              onDragStart={() => setDraggingKey(question.key)}
              onDragEnd={() => setDraggingKey(null)}
              onDrop={() => reorderQuestion(question.key)}
            />
          ))}
        </div>

        {state.fieldErrors?.questions?.[0] ? (
          <div className="rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
            {state.fieldErrors.questions.join(" ")}
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 flex justify-center">
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: theme.color,
              boxShadow: `0 12px 24px ${theme.color}30`,
            }}
            type="button"
            disabled={isDisabled}
            onClick={addQuestion}
          >
            <Plus className="size-5" aria-hidden="true" />
            Add question
          </button>
        </div>
      </form>

      {pendingNavigation ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-question-set-title"
        >
          <div className="w-full max-w-md rounded-lg border border-[#d8dfda] bg-white p-5 shadow-2xl">
            <h2
              className="text-xl font-semibold text-[#17211b]"
              id="unsaved-question-set-title"
            >
              Unsaved changes
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#607066]">
              You have unsaved question set changes. Leaving now will discard
              them.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-[#d9b7ad] px-4 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef]"
                type="button"
                onClick={leaveWithUnsavedChanges}
              >
                Leave with unsaved
              </button>
              <button
                className="h-10 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b]"
                type="button"
                onClick={() => setPendingNavigation(null)}
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPreview ? (
        <PreviewDialog
          description={showFormDescription ? description : ""}
          onClose={() => setShowPreview(false)}
          questions={questions}
          theme={theme}
          title={title}
        />
      ) : null}
    </div>
  );
}

type RichTextFieldProps = {
  className: string;
  disabled: boolean;
  maxLength: number;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
};

function RichTextField({
  className,
  disabled,
  maxLength,
  name,
  onChange,
  placeholder,
  required = false,
  value,
}: RichTextFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const isEmpty = !richTextToPlainText(value);

  useEffect(() => {
    if (!ref.current || focused) {
      return;
    }

    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [focused, value]);

  function handleInput(event: FormEvent<HTMLDivElement>) {
    const nextValue = sanitizeRichText(event.currentTarget.innerHTML);
    if (inputRef.current) {
      inputRef.current.value = nextValue;
    }
    onChange(nextValue);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    document.execCommand(
      "insertText",
      false,
      event.clipboardData.getData("text/plain"),
    );
  }

  return (
    <div className="group/format space-y-1">
      <input
        name={name}
        readOnly
        ref={inputRef}
        required={required}
        type="hidden"
        value={value}
      />
      <div className="relative">
        {isEmpty ? (
          <span
            className={`${className} pointer-events-none absolute inset-x-0 top-0 rounded-sm text-[#70757a]`}
          >
            {placeholder}
          </span>
        ) : null}
        <div
          aria-label={placeholder}
          className={`${className} relative rounded-sm`}
          contentEditable={!disabled}
          data-empty={isEmpty ? "true" : "false"}
          data-format-target="true"
          data-placeholder={placeholder}
          data-rich-target="true"
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          onInput={handleInput}
          onPaste={handlePaste}
          ref={ref}
          role="textbox"
          suppressContentEditableWarning
          tabIndex={disabled ? -1 : 0}
          title={placeholder}
        />
      </div>
      <RichTextToolbar disabled={disabled} />
      <input name={`${name}:maxLength`} type="hidden" value={maxLength} />
    </div>
  );
}

function RichTextToolbar({ disabled }: { disabled: boolean }) {
  const actions = [
    { label: "Bold", icon: Bold, kind: "bold" as const },
    { label: "Italic", icon: Italic, kind: "italic" as const },
    { label: "Underline", icon: Underline, kind: "underline" as const },
    { label: "Link", icon: Link2, kind: "link" as const },
    { label: "Clear formatting", icon: RotateCcw, kind: "clear" as const },
  ];

  return (
    <div className="hidden flex-wrap items-center gap-1 rounded-md border border-[#dadce0] bg-white p-1 shadow-sm group-focus-within/format:inline-flex">
      {actions.map(({ label, icon: Icon, kind }) => (
        <button
          aria-label={label}
          className={formatButtonClass}
          disabled={disabled}
          key={kind}
          onClick={() => applyVisualFormat(kind)}
          onMouseDown={stopToolbarBlur}
          title={label}
          type="button"
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

type QuestionEditorProps = {
  index: number;
  question: DraftQuestion;
  disabled: boolean;
  isDragging: boolean;
  canRemove: boolean;
  theme: ThemeOption;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
};

function QuestionEditor({
  index,
  question,
  disabled,
  isDragging,
  canRemove,
  theme,
  onChange,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragEnd,
  onDrop,
}: QuestionEditorProps) {
  const [showDescription, setShowDescription] = useState(Boolean(question.description));
  const isChoice = choiceTypes.includes(question.questionType);
  const isParagraph = question.questionType === "paragraph";

  function addOption() {
    onChange({
      options: [...question.options, `Option ${question.options.length + 1}`],
    });
  }

  function removeOption(optionIndex: number) {
    if (question.options.length <= 1) {
      return;
    }

    const removed = question.options[optionIndex];
    const next = question.options.filter((_, index) => index !== optionIndex);

    onChange({
      options: next,
      answerKey: question.answerKey === removed ? next[0] ?? "" : question.answerKey,
    });
  }

  function updateOption(optionIndex: number, value: string) {
    const previous = question.options[optionIndex];
    const next = question.options.map((option, index) =>
      index === optionIndex ? value : option,
    );

    onChange({
      options: next,
      answerKey:
        question.answerKey === previous || (!question.answerKey && optionIndex === 0)
          ? value
          : question.answerKey,
    });
  }

  function onTypeChange(nextType: QuestionType) {
    onChange({
      questionType: nextType,
      gradingMode:
        nextType === "paragraph"
          ? question.gradingMode === "none"
            ? "none"
            : "manual"
          : question.gradingMode === "none"
            ? "none"
            : "auto",
      answerKey:
        choiceTypes.includes(nextType) && !question.answerKey
          ? question.options[0] ?? "Option 1"
          : question.answerKey,
    });
  }

  function toggleDescription() {
    const next = !showDescription;
    setShowDescription(next);

    if (!next) {
      onChange({ description: "" });
    }
  }

  return (
    <section
      className={`relative overflow-visible rounded-lg border bg-white shadow-sm transition ${
        isDragging ? "opacity-70 ring-4" : "focus-within:border-l-4"
      }`}
      style={{
        borderLeftColor: theme.color,
        boxShadow: isDragging ? `0 0 0 4px ${theme.color}18` : undefined,
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <input name="questionIndexes" type="hidden" value={index} />
      <input
        name={`question-${index}-shuffleOptions`}
        type="hidden"
        value={question.shuffleOptions ? "on" : ""}
      />

      <button
        aria-label={`Drag question ${index + 1}`}
        className="absolute left-1/2 top-1 inline-flex h-6 w-12 -translate-x-1/2 cursor-grab items-center justify-center rounded-md text-[#9aa0a6] transition hover:bg-[#f1f3f4] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        draggable={!disabled}
        onDragEnd={onDragEnd}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        title="Drag to reorder"
        type="button"
      >
        <GripVertical className="size-4 rotate-90" aria-hidden="true" />
      </button>

      <div className="space-y-4 p-5 pt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem]">
          <RichTextField
            className="min-h-12 w-full min-w-0 border-0 border-b border-transparent bg-transparent px-0 py-2 text-base leading-7 outline-none transition hover:border-[#dadce0] focus:border-[var(--builder-accent)]"
            disabled={disabled}
            maxLength={4000}
            name={`question-${index}-content`}
            onChange={(content) => onChange({ content })}
            placeholder="Question"
            required
            value={question.content}
          />

          <label className="min-w-0">
            <span className="sr-only">Question type</span>
            <select
              className="h-12 w-full rounded-md border border-[#dadce0] bg-white px-3 text-sm outline-none transition focus:border-[var(--builder-accent)] focus:ring-4 focus:ring-[#673ab7]/10"
              name={`question-${index}-type`}
              value={question.questionType}
              disabled={disabled}
              onChange={(event) => onTypeChange(event.target.value as QuestionType)}
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showDescription ? (
          <RichTextField
            className="min-h-10 w-full min-w-0 border-0 border-b border-[#dadce0] bg-transparent px-0 py-1 text-sm leading-6 outline-none transition focus:border-[var(--builder-accent)]"
            disabled={disabled}
            maxLength={2000}
            name={`question-${index}-description`}
            onChange={(description) => onChange({ description })}
            placeholder="Description"
            value={question.description}
          />
        ) : (
          <input name={`question-${index}-description`} type="hidden" value="" />
        )}

        {isChoice ? (
          <fieldset className="space-y-2">
            <legend className="sr-only">Options</legend>
            {question.options.map((option, optionIndex) => (
              <div
                className="flex min-w-0 items-center gap-3"
                key={`${question.key}-${optionIndex}`}
              >
                <Circle className="size-5 shrink-0 text-[#9aa0a6]" aria-hidden="true" />
                <input
                  className="h-10 min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0 text-sm outline-none transition placeholder:text-[#3c4043] hover:border-[#dadce0] focus:border-[var(--builder-accent)]"
                  name={`question-${index}-options`}
                  type="text"
                  value={option}
                  placeholder={`Option ${optionIndex + 1}`}
                  disabled={disabled}
                  maxLength={160}
                  required
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateOption(optionIndex, event.target.value)
                  }
                />
                <button
                  aria-label={`Remove option ${optionIndex + 1}`}
                  className={iconButtonClass}
                  type="button"
                  disabled={disabled || question.options.length <= 1}
                  onClick={() => removeOption(optionIndex)}
                  title="Remove option"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              className="ml-8 inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm transition hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: theme.color }}
              type="button"
              disabled={disabled || question.options.length >= 12}
              onClick={addOption}
            >
              <ListPlus className="size-4" aria-hidden="true" />
              Add option
            </button>
          </fieldset>
        ) : null}

        {question.questionType === "linear_scale" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Scale min"
              name={`question-${index}-scaleMin`}
              value={question.scaleMin}
              min={0}
              max={9}
              disabled={disabled}
              onChange={(scaleMin) => onChange({ scaleMin })}
            />
            <NumberField
              label="Scale max"
              name={`question-${index}-scaleMax`}
              value={question.scaleMax}
              min={1}
              max={10}
              disabled={disabled}
              onChange={(scaleMax) => onChange({ scaleMax })}
            />
            <TextField
              label="Min label"
              name={`question-${index}-scaleMinLabel`}
              value={question.scaleMinLabel}
              disabled={disabled}
              onChange={(scaleMinLabel) => onChange({ scaleMinLabel })}
            />
            <TextField
              label="Max label"
              name={`question-${index}-scaleMaxLabel`}
              value={question.scaleMaxLabel}
              disabled={disabled}
              onChange={(scaleMaxLabel) => onChange({ scaleMaxLabel })}
            />
          </div>
        ) : null}

        {question.questionType === "rating" ? (
          <div className="max-w-48">
            <NumberField
              label="Rating max"
              name={`question-${index}-ratingMax`}
              value={question.ratingMax}
              min={2}
              max={10}
              disabled={disabled}
              onChange={(ratingMax) => onChange({ ratingMax })}
            />
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[9rem_13rem_minmax(0,1fr)] lg:items-end">
          <NumberField
            label="Points"
            name={`question-${index}-points`}
            value={
              question.gradingMode === "none" ? 0 : Math.max(question.points, 1)
            }
            min={0}
            max={100}
            disabled={disabled || question.gradingMode === "none"}
            onChange={(points) => onChange({ points })}
          />

          <label className="block">
            <span className="text-sm font-medium text-[#3c4043]">Grading</span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-[#dadce0] bg-white px-3 text-sm outline-none transition focus:border-[var(--builder-accent)] focus:ring-4 focus:ring-[#673ab7]/10 disabled:opacity-60"
              name={`question-${index}-gradingMode`}
              value={question.gradingMode}
              disabled={disabled}
              onChange={(event) =>
                onChange({ gradingMode: event.target.value as GradingMode })
              }
            >
              {isParagraph ? (
                <>
                  <option value="manual">Manual</option>
                  <option value="none">None</option>
                </>
              ) : (
                <>
                  <option value="auto">Auto</option>
                  <option value="none">None</option>
                </>
              )}
            </select>
            {question.gradingMode === "none" ? (
              <input name={`question-${index}-points`} type="hidden" value="0" />
            ) : null}
          </label>

          <CorrectAnswerField
            answerKey={question.answerKey}
            disabled={disabled || isParagraph || question.gradingMode !== "auto"}
            index={index}
            options={question.options}
            questionType={question.questionType}
            setAnswerKey={(answerKey) => onChange({ answerKey })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e8eaed] px-5 py-3">
        <button
          aria-label={`Duplicate question ${index + 1}`}
          className={iconButtonClass}
          type="button"
          disabled={disabled}
          onClick={onDuplicate}
          title="Duplicate question"
        >
          <Copy className="size-4" aria-hidden="true" />
        </button>
        <button
          aria-label={`Delete question ${index + 1}`}
          className={iconButtonClass}
          type="button"
          disabled={disabled || !canRemove}
          onClick={onRemove}
          title="Delete question"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
        <span className="mx-1 h-8 w-px bg-[#dadce0]" />
        <RequiredToggle
          checked={question.isRequired}
          disabled={disabled}
          name={`question-${index}-required`}
          onChange={(isRequired) => onChange({ isRequired })}
        />
        <QuestionMoreMenu
          disabled={disabled}
          isChoice={isChoice}
          onToggleDescription={toggleDescription}
          onToggleShuffle={() =>
            onChange({ shuffleOptions: !question.shuffleOptions })
          }
          showDescription={showDescription}
          shuffleOptions={question.shuffleOptions}
        />
      </div>
    </section>
  );
}

type CorrectAnswerFieldProps = {
  answerKey: string;
  disabled: boolean;
  index: number;
  options: string[];
  questionType: QuestionType;
  setAnswerKey: (value: string) => void;
};

function CorrectAnswerField({
  answerKey,
  disabled,
  index,
  options,
  questionType,
  setAnswerKey,
}: CorrectAnswerFieldProps) {
  if (questionType === "paragraph") {
    return <input name={`question-${index}-answerKey`} type="hidden" value="" />;
  }

  if (questionType === "multiple_choice" || questionType === "dropdown") {
    return (
      <label className="block min-w-0">
        <span className="text-sm font-medium text-[#3c4043]">Correct answer</span>
        <select
          className="mt-2 h-11 w-full rounded-md border border-[#dadce0] bg-white px-3 text-sm outline-none transition focus:border-[var(--builder-accent)] focus:ring-4 focus:ring-[#673ab7]/10 disabled:opacity-60"
          name={`question-${index}-answerKey`}
          value={answerKey || options[0] || ""}
          disabled={disabled}
          onChange={(event) => setAnswerKey(event.target.value)}
        >
          {options.map((option, optionIndex) => (
            <option value={option} key={`${option}-${optionIndex}`}>
              {option || `Option ${optionIndex + 1}`}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <TextField
      label={questionType === "checkboxes" ? "Correct answers" : "Correct answer"}
      name={`question-${index}-answerKey`}
      value={answerKey}
      disabled={disabled}
      onChange={setAnswerKey}
    />
  );
}

type RequiredToggleProps = {
  checked: boolean;
  disabled: boolean;
  name: string;
  onChange: (checked: boolean) => void;
};

function RequiredToggle({
  checked,
  disabled,
  name,
  onChange,
}: RequiredToggleProps) {
  return (
    <label className="inline-flex h-10 items-center gap-3 px-2 text-sm font-medium text-[#3c4043]">
      <span>Required</span>
      <span className="relative inline-flex items-center">
        <input
          className="peer sr-only"
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="h-5 w-9 rounded-full bg-[#dadce0] transition peer-checked:bg-[#b39ddb] peer-disabled:opacity-50" />
        <span className="absolute left-0.5 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-4 peer-checked:bg-[#673ab7]" />
      </span>
    </label>
  );
}

type QuestionMoreMenuProps = {
  disabled: boolean;
  isChoice: boolean;
  onToggleDescription: () => void;
  onToggleShuffle: () => void;
  showDescription: boolean;
  shuffleOptions: boolean;
};

function QuestionMoreMenu({
  disabled,
  isChoice,
  onToggleDescription,
  onToggleShuffle,
  showDescription,
  shuffleOptions,
}: QuestionMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeMenu(event: PointerEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenu);

    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-label="Question options"
        className={iconButtonClass}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        title="More"
        type="button"
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute bottom-11 right-0 z-20 w-64 rounded-md border border-[#dadce0] bg-white p-2 text-sm shadow-lg">
          <MenuToggleItem checked={showDescription} onClick={onToggleDescription}>
            Description
          </MenuToggleItem>
          {isChoice ? (
            <MenuToggleItem checked={shuffleOptions} onClick={onToggleShuffle}>
              Shuffle option order
            </MenuToggleItem>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuToggleItem({
  checked,
  children,
  onClick,
}: {
  checked: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[#3c4043] transition hover:bg-[#f1f3f4]"
      type="button"
      onClick={onClick}
    >
      <span className="inline-flex size-5 items-center justify-center">
        {checked ? <Check className="size-4" aria-hidden="true" /> : null}
      </span>
      <span>{children}</span>
    </button>
  );
}

type NumberFieldProps = {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function NumberField({
  label,
  name,
  value,
  min,
  max,
  disabled,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium text-[#3c4043]">{label}</span>
      <input
        className="mt-2 h-11 w-full min-w-0 rounded-md border border-[#dadce0] bg-white px-3 text-sm outline-none transition focus:border-[var(--builder-accent)] focus:ring-4 focus:ring-[#673ab7]/10 disabled:opacity-60"
        name={name}
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function TextField({ label, name, value, disabled, onChange }: TextFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium text-[#3c4043]">{label}</span>
      <input
        className="mt-2 h-11 w-full min-w-0 rounded-md border border-[#dadce0] bg-white px-3 text-sm outline-none transition focus:border-[var(--builder-accent)] focus:ring-4 focus:ring-[#673ab7]/10 disabled:opacity-60"
        name={name}
        type="text"
        value={value}
        disabled={disabled}
        maxLength={1000}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type PreviewDialogProps = {
  description: string;
  onClose: () => void;
  questions: DraftQuestion[];
  theme: ThemeOption;
  title: string;
};

function PreviewDialog({
  description,
  onClose,
  questions,
  theme,
  title,
}: PreviewDialogProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e8eaed] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#202124]">Preview</h2>
          <button
            aria-label="Close preview"
            className={iconButtonClass}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5" style={{ backgroundColor: theme.page }}>
          <section className="overflow-hidden rounded-lg border border-[#dadce0] bg-white">
            <div className="h-3" style={{ backgroundColor: theme.color }} />
            <div className="p-5">
              <RichTextDisplay
                className="block text-3xl font-normal leading-tight text-[#202124]"
                value={title}
              />
              {description ? (
                <RichTextDisplay
                  className="mt-3 block text-sm leading-6 text-[#5f6368]"
                  value={description}
                />
              ) : null}
            </div>
          </section>
          <div className="mt-4 space-y-3">
            {questions.map((question, index) => (
              <section
                className="rounded-lg border border-[#dadce0] bg-white p-5"
                key={question.key}
              >
                <RichTextDisplay
                  className="block text-base leading-7 text-[#202124]"
                  value={`${index + 1}. ${question.content || "Question"}`}
                />
                {question.description ? (
                  <RichTextDisplay
                    className="mt-2 block text-sm leading-6 text-[#5f6368]"
                    value={question.description}
                  />
                ) : null}
                {choiceTypes.includes(question.questionType) ? (
                  <div className="mt-4 space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        className="flex items-center gap-3 text-sm text-[#3c4043]"
                        key={`${question.key}-preview-${optionIndex}`}
                      >
                        <Circle className="size-5 text-[#9aa0a6]" aria-hidden="true" />
                        <span>{option || `Option ${optionIndex + 1}`}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 h-10 rounded-md border border-[#dadce0] bg-[#f8f9fa]" />
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
