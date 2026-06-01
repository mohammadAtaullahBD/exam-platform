"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createQuestionSet,
  updateQuestionSet,
} from "@/features/questions/actions";
import {
  initialQuestionSetActionState,
  type QuestionSet,
  type QuestionType,
  type GradingMode,
} from "@/features/questions/types";

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
};

type QuestionSetBuilderProps = {
  mode: "create" | "edit";
  set?: QuestionSet;
  disabled?: boolean;
};

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

function answerKeyValue(value: unknown) {
  if (value && typeof value === "object" && "value" in value) {
    const answer = (value as { value?: unknown }).value;

    return typeof answer === "string" ? answer : "";
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

function createDraftQuestion(index: number): DraftQuestion {
  return {
    key: `${Date.now()}-${index}`,
    content: "",
    description: "",
    questionType: "multiple_choice",
    options: ["", ""],
    answerKey: "",
    isRequired: true,
    points: 1,
    gradingMode: "auto",
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
    ratingMax: 5,
  };
}

function draftQuestionsFromSet(set?: QuestionSet): DraftQuestion[] {
  if (!set?.questions.length) {
    return [createDraftQuestion(0)];
  }

  return set.questions.map((question, index) => ({
    key: question.id || `${Date.now()}-${index}`,
    content: question.content,
    description: question.description ?? "",
    questionType: question.questionType,
    options: question.options.length ? question.options : ["", ""],
    answerKey: answerKeyValue(question.answerKey),
    isRequired: question.isRequired,
    points: question.points,
    gradingMode: question.gradingMode,
    scaleMin: settingsNumber(question.settings, "min", 1),
    scaleMax: settingsNumber(question.settings, "max", 5),
    scaleMinLabel: settingsString(question.settings, "minLabel"),
    scaleMaxLabel: settingsString(question.settings, "maxLabel"),
    ratingMax: settingsNumber(question.settings, "max", 5),
  }));
}

export function QuestionSetBuilder({
  mode,
  set,
  disabled = false,
}: QuestionSetBuilderProps) {
  const action = useMemo(
    () => (mode === "edit" && set ? updateQuestionSet.bind(null, set.id) : createQuestionSet),
    [mode, set],
  );
  const [state, formAction, isPending] = useActionState(
    action,
    initialQuestionSetActionState,
  );
  const [questions, setQuestions] = useState(() => draftQuestionsFromSet(set));
  const isDisabled = disabled || isPending;

  function addQuestion() {
    setQuestions((current) => [...current, createDraftQuestion(current.length)]);
  }

  function removeQuestion(key: string) {
    setQuestions((current) =>
      current.length === 1
        ? current
        : current.filter((question) => question.key !== key),
    );
  }

  function duplicateQuestion(key: string) {
    setQuestions((current) => {
      const index = current.findIndex((question) => question.key === key);

      if (index < 0) {
        return current;
      }

      const clone = {
        ...current[index],
        key: `${Date.now()}-${index}`,
      };
      const next = [...current];
      next.splice(index + 1, 0, clone);

      return next;
    });
  }

  function moveQuestion(key: string, direction: -1 | 1) {
    setQuestions((current) => {
      const index = current.findIndex((question) => question.key === key);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [question] = next.splice(index, 1);
      next.splice(nextIndex, 0, question);

      return next;
    });
  }

  return (
    <form action={formAction} className="rounded-lg border border-[#d8dfda] bg-white p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Set title</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name="title"
            type="text"
            defaultValue={set?.title ?? ""}
            disabled={isDisabled}
            maxLength={120}
            required
          />
          {state.fieldErrors?.title?.[0] ? (
            <span className="mt-2 block text-sm text-[#8a3a28]">
              {state.fieldErrors.title[0]}
            </span>
          ) : null}
        </label>

        <div className="flex items-end">
          <button
            className="h-11 w-full rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isDisabled}
          >
            {isPending
              ? "Saving..."
              : mode === "edit"
                ? "Save set"
                : "Create set"}
          </button>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-[#26352b]">Description</span>
        <textarea
          className="mt-2 min-h-20 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="description"
          defaultValue={set?.description ?? ""}
          disabled={isDisabled}
          maxLength={1000}
        />
      </label>

      {state.message ? (
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
              : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        {questions.map((question, index) => (
          <QuestionEditor
            key={question.key}
            index={index}
            question={question}
            disabled={isDisabled}
            canMoveUp={index > 0}
            canMoveDown={index < questions.length - 1}
            canRemove={questions.length > 1}
            onRemove={() => removeQuestion(question.key)}
            onDuplicate={() => duplicateQuestion(question.key)}
            onMoveUp={() => moveQuestion(question.key, -1)}
            onMoveDown={() => moveQuestion(question.key, 1)}
          />
        ))}
      </div>

      {state.fieldErrors?.questions?.[0] ? (
        <div className="mt-4 rounded-md border border-[#e3b6aa] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a2f1f]">
          {state.fieldErrors.questions.join(" ")}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-[#e5ebe6] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="h-11 rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isDisabled}
          onClick={addQuestion}
        >
          Add question
        </button>
        <p className="text-sm text-[#607066]">
          {questions.length} {questions.length === 1 ? "question" : "questions"}
        </p>
      </div>
    </form>
  );
}

type QuestionEditorProps = {
  index: number;
  question: DraftQuestion;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function QuestionEditor({
  index,
  question,
  disabled,
  canMoveUp,
  canMoveDown,
  canRemove,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: QuestionEditorProps) {
  const [type, setType] = useState<QuestionType>(question.questionType);
  const [options, setOptions] = useState(
    question.options.length ? question.options : ["", ""],
  );
  const isChoice = choiceTypes.includes(type);
  const isParagraph = type === "paragraph";

  function addOption() {
    setOptions((current) => [...current, ""]);
  }

  function removeOption(optionIndex: number) {
    setOptions((current) =>
      current.length <= 2
        ? current
        : current.filter((_, index) => index !== optionIndex),
    );
  }

  return (
    <section className="rounded-md border border-[#d8dfda] bg-[#fbfdfb] p-4">
      <input name="questionIndexes" type="hidden" value={index} />
      <div className="flex flex-col gap-3 border-b border-[#e5ebe6] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-semibold text-[#26352b]">
          Question {index + 1}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="h-9 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={disabled || !canMoveUp}
            onClick={onMoveUp}
          >
            Up
          </button>
          <button
            className="h-9 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={disabled || !canMoveDown}
            onClick={onMoveDown}
          >
            Down
          </button>
          <button
            className="h-9 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={disabled}
            onClick={onDuplicate}
          >
            Duplicate
          </button>
          <button
            className="h-9 rounded-md border border-[#d9b7ad] px-3 text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={disabled || !canRemove}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Question</span>
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name={`question-${index}-content`}
            defaultValue={question.content}
            disabled={disabled}
            maxLength={2000}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Type</span>
          <select
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
            name={`question-${index}-type`}
            value={type}
            disabled={disabled}
            onChange={(event) => setType(event.target.value as QuestionType)}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-[#26352b]">
          Description or help text
        </span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name={`question-${index}-description`}
          type="text"
          defaultValue={question.description}
          disabled={disabled}
          maxLength={600}
        />
      </label>

      {isChoice ? (
        <fieldset className="mt-4 grid gap-3">
          <legend className="text-sm font-medium text-[#26352b]">Options</legend>
          {options.map((option, optionIndex) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2"
              key={`${question.key}-${optionIndex}`}
            >
              <input
                className="h-11 rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
                name={`question-${index}-options`}
                type="text"
                defaultValue={option}
                placeholder={`Option ${optionIndex + 1}`}
                disabled={disabled}
                maxLength={160}
                required
              />
              <button
                className="h-11 rounded-md border border-[#d9b7ad] text-sm font-semibold text-[#7a2f1f] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={disabled || options.length <= 2}
                onClick={() => removeOption(optionIndex)}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="h-10 rounded-md border border-[#cfd8d2] px-3 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0] disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
            type="button"
            disabled={disabled || options.length >= 12}
            onClick={addOption}
          >
            Add option
          </button>
        </fieldset>
      ) : null}

      {type === "linear_scale" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Scale min"
            name={`question-${index}-scaleMin`}
            defaultValue={question.scaleMin}
            min={0}
            max={9}
            disabled={disabled}
          />
          <NumberField
            label="Scale max"
            name={`question-${index}-scaleMax`}
            defaultValue={question.scaleMax}
            min={1}
            max={10}
            disabled={disabled}
          />
          <TextField
            label="Min label"
            name={`question-${index}-scaleMinLabel`}
            defaultValue={question.scaleMinLabel}
            disabled={disabled}
          />
          <TextField
            label="Max label"
            name={`question-${index}-scaleMaxLabel`}
            defaultValue={question.scaleMaxLabel}
            disabled={disabled}
          />
        </div>
      ) : null}

      {type === "rating" ? (
        <div className="mt-4 max-w-48">
          <NumberField
            label="Rating max"
            name={`question-${index}-ratingMax`}
            defaultValue={question.ratingMax}
            min={2}
            max={10}
            disabled={disabled}
          />
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-[9rem_12rem_9rem_minmax(0,1fr)] lg:items-end">
        <NumberField
          label="Points"
          name={`question-${index}-points`}
          defaultValue={isParagraph ? 0 : question.points}
          min={0}
          max={100}
          disabled={disabled || isParagraph}
        />

        <label className="block">
          <span className="text-sm font-medium text-[#26352b]">Grading</span>
          <select
            className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15 disabled:opacity-60"
            name={`question-${index}-gradingMode`}
            defaultValue={isParagraph ? "none" : question.gradingMode}
            disabled={disabled || isParagraph}
          >
            <option value="auto">Auto</option>
            <option value="none">None</option>
          </select>
          {isParagraph ? (
            <input name={`question-${index}-gradingMode`} type="hidden" value="none" />
          ) : null}
        </label>

        <label className="flex h-11 items-center gap-2 rounded-md border border-[#cfc7ba] bg-white px-3 text-sm font-medium text-[#26352b]">
          <input
            className="size-4 accent-[#17211b]"
            name={`question-${index}-required`}
            type="checkbox"
            defaultChecked={question.isRequired}
            disabled={disabled}
          />
          Required
        </label>

        <TextField
          label="Answer key"
          name={`question-${index}-answerKey`}
          defaultValue={isParagraph ? "" : question.answerKey}
          disabled={disabled || isParagraph}
        />
      </div>

      {isParagraph ? (
        <input name={`question-${index}-points`} type="hidden" value="0" />
      ) : null}
    </section>
  );
}

type NumberFieldProps = {
  label: string;
  name: string;
  defaultValue: number;
  min: number;
  max: number;
  disabled: boolean;
};

function NumberField({
  label,
  name,
  defaultValue,
  min,
  max,
  disabled,
}: NumberFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#26352b]">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15 disabled:opacity-60"
        name={name}
        type="number"
        defaultValue={defaultValue}
        min={min}
        max={max}
        disabled={disabled}
      />
    </label>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  disabled: boolean;
};

function TextField({ label, name, defaultValue, disabled }: TextFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#26352b]">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-md border border-[#cfc7ba] bg-white px-3 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15 disabled:opacity-60"
        name={name}
        type="text"
        defaultValue={defaultValue}
        disabled={disabled}
        maxLength={1000}
      />
    </label>
  );
}
