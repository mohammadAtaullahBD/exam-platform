import { z } from "zod";

import { richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";

function formString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function richTextString(value: unknown) {
  return sanitizeRichText(formString(value));
}

function hasRichText(value: string) {
  return richTextToPlainText(value).length > 0;
}

const richTextContentSchema = z
  .string()
  .max(4000, "Question text must be 4,000 characters or fewer.")
  .refine(hasRichText, "Question text is required.");

const optionSchema = z.preprocess(
  formString,
  z
    .string()
    .trim()
    .min(1, "Option cannot be blank.")
    .max(160, "Option must be 160 characters or fewer."),
);

const questionTypeSchema = z.enum([
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "rating",
]);

const gradingModeSchema = z.enum(["auto", "manual", "none"]);

export const questionSchema = z
  .object({
    content: z.preprocess(
      richTextString,
      richTextContentSchema,
    ),
    options: z.array(optionSchema).min(1).max(6),
    correctOptionIndex: z.coerce
      .number("Choose the correct option.")
      .int("Choose the correct option.")
      .min(0, "Choose the correct option.")
      .max(5, "Choose the correct option."),
  })
  .superRefine((data, context) => {
    if (!data.options[data.correctOptionIndex]) {
      context.addIssue({
        code: "custom",
        message: "Choose an option that exists.",
        path: ["correctOptionIndex"],
      });
    }

    const normalized = data.options.map((option) => option.toLowerCase());

    if (new Set(normalized).size !== data.options.length) {
      context.addIssue({
        code: "custom",
        message: "Options must be unique.",
        path: ["options"],
      });
    }
  })
  .transform((data) => ({
    content: data.content,
    options: data.options,
    correctAnswer: data.options[data.correctOptionIndex] ?? "",
  }));

export const questionSetSchema = z.object({
  title: z.preprocess(
    (value) => {
      const title = richTextString(value);

      return richTextToPlainText(title) ? title : "Untitled Form";
    },
    z
      .string()
      .trim()
      .max(120, "Set title must be 120 characters or fewer."),
  ),
  description: z
    .preprocess(richTextString, z.string().trim().max(2000))
    .transform((value) => (value ? value : null)),
});

export const questionSetItemSchema = z
  .object({
    content: z.preprocess(
      richTextString,
      richTextContentSchema,
    ),
    description: z
      .preprocess(richTextString, z.string().trim().max(2000))
      .transform((value) => (value ? value : null)),
    questionType: questionTypeSchema,
    options: z.array(optionSchema).max(12),
    answerKey: z.preprocess(formString, z.string().trim().max(1000)),
    isRequired: z.boolean(),
    points: z.coerce.number().int().min(0).max(100),
    gradingMode: gradingModeSchema,
    scaleMin: z.coerce.number().int().min(0).max(10).optional(),
    scaleMax: z.coerce.number().int().min(1).max(10).optional(),
    scaleMinLabel: z.preprocess(formString, z.string().trim().max(80)),
    scaleMaxLabel: z.preprocess(formString, z.string().trim().max(80)),
    ratingMax: z.coerce.number().int().min(2).max(10).optional(),
    shuffleOptions: z.boolean(),
  })
  .superRefine((data, context) => {
    const choiceTypes = ["multiple_choice", "checkboxes", "dropdown"];

    if (choiceTypes.includes(data.questionType) && data.options.length < 1) {
      context.addIssue({
        code: "custom",
        message: "Choice questions need at least one option.",
        path: ["options"],
      });
    }

    const normalized = data.options.map((option) => option.toLowerCase());

    if (new Set(normalized).size !== normalized.length) {
      context.addIssue({
        code: "custom",
        message: "Options must be unique.",
        path: ["options"],
      });
    }

    if (data.questionType === "linear_scale") {
      const min = data.scaleMin ?? 1;
      const max = data.scaleMax ?? 5;

      if (min >= max) {
        context.addIssue({
          code: "custom",
          message: "Scale minimum must be lower than maximum.",
          path: ["scaleMin"],
        });
      }
    }

    if (data.questionType !== "paragraph" && data.gradingMode === "manual") {
      context.addIssue({
        code: "custom",
        message: "Manual grading is only available for paragraph questions.",
        path: ["gradingMode"],
      });
    }

    if (data.questionType === "paragraph" && data.gradingMode === "auto") {
      context.addIssue({
        code: "custom",
        message: "Paragraph questions can be manually graded or ungraded.",
        path: ["gradingMode"],
      });
    }

    if (
      data.questionType === "paragraph" &&
      data.gradingMode === "manual" &&
      data.points <= 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Manual paragraph grading needs at least 1 point.",
        path: ["points"],
      });
    }

    if (data.questionType !== "paragraph" && data.gradingMode === "auto") {
      const answerKey = data.answerKey.trim();

      if (!answerKey) {
        context.addIssue({
          code: "custom",
          message: "Auto-graded questions need an answer key.",
          path: ["answerKey"],
        });
      }

      if (
        ["multiple_choice", "dropdown"].includes(data.questionType) &&
        answerKey &&
        !data.options.includes(answerKey)
      ) {
        context.addIssue({
          code: "custom",
          message: "Answer key must match one of the options.",
          path: ["answerKey"],
        });
      }

      if (data.questionType === "checkboxes" && answerKey) {
        const answers = answerKey
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);

        if (!answers.length || answers.some((answer) => !data.options.includes(answer))) {
          context.addIssue({
            code: "custom",
            message: "Checkbox answer key must list option text separated by commas.",
            path: ["answerKey"],
          });
        }
      }

      if (
        (data.questionType === "linear_scale" || data.questionType === "rating") &&
        answerKey
      ) {
        const answer = Number(answerKey);
        const min = data.questionType === "linear_scale" ? data.scaleMin ?? 1 : 1;
        const max =
          data.questionType === "linear_scale"
            ? data.scaleMax ?? 5
            : data.ratingMax ?? 5;

        if (!Number.isInteger(answer) || answer < min || answer > max) {
          context.addIssue({
            code: "custom",
            message: "Answer key must be a whole number in range.",
            path: ["answerKey"],
          });
        }
      }
    }
  })
  .transform((data) => {
    if (data.questionType === "paragraph") {
      const gradingMode = data.gradingMode === "manual" ? "manual" : "none";

      return {
        content: data.content,
        description: data.description,
        questionType: data.questionType,
        options: [],
        settings: {},
        answerKey: {},
        isRequired: data.isRequired,
        points: gradingMode === "manual" ? data.points : 0,
        gradingMode,
      };
    }

    if (data.questionType === "linear_scale") {
      return {
        content: data.content,
        description: data.description,
        questionType: data.questionType,
        options: [],
        settings: {
          min: data.scaleMin ?? 1,
          max: data.scaleMax ?? 5,
          minLabel: data.scaleMinLabel || null,
          maxLabel: data.scaleMaxLabel || null,
        },
        answerKey: data.answerKey ? { value: data.answerKey } : {},
        isRequired: data.isRequired,
        points: data.gradingMode === "none" ? 0 : data.points,
        gradingMode: data.gradingMode,
      };
    }

    if (data.questionType === "rating") {
      return {
        content: data.content,
        description: data.description,
        questionType: data.questionType,
        options: [],
        settings: {
          max: data.ratingMax ?? 5,
        },
        answerKey: data.answerKey ? { value: data.answerKey } : {},
        isRequired: data.isRequired,
        points: data.gradingMode === "none" ? 0 : data.points,
        gradingMode: data.gradingMode,
      };
    }

    return {
      content: data.content,
      description: data.description,
      questionType: data.questionType,
      options:
        data.questionType === "short_answer"
          ? []
          : data.options,
      settings: data.shuffleOptions
        ? { shuffleOptions: true }
        : {},
      answerKey: data.answerKey
        ? data.questionType === "checkboxes" || data.questionType === "short_answer"
          ? {
              values: data.answerKey
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            }
          : { value: data.answerKey }
        : {},
      isRequired: data.isRequired,
      points: data.gradingMode === "none" ? 0 : data.points,
      gradingMode: data.gradingMode,
    };
  });

export const questionFiltersSchema = z.object({
  q: z.preprocess(formString, z.string().trim().max(120)).optional(),
  source: z.enum(["own", "public", "all"]).catch("own").optional(),
});

export type QuestionSetInput = z.infer<typeof questionSetSchema>;
export type QuestionSetItemInput = z.infer<typeof questionSetItemSchema>;
export type QuestionFiltersInput = z.infer<typeof questionFiltersSchema>;
