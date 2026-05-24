import { z } from "zod";

function formString(value: unknown) {
  return typeof value === "string" ? value : "";
}

const optionSchema = z.preprocess(
  formString,
  z
    .string()
    .trim()
    .min(1, "Option cannot be blank.")
    .max(160, "Option must be 160 characters or fewer."),
);

export const questionSchema = z
  .object({
    content: z.preprocess(
      formString,
      z
        .string()
        .trim()
        .min(1, "Question text is required.")
        .max(2000, "Question text must be 2,000 characters or fewer."),
    ),
    options: z.array(optionSchema).min(2).max(6),
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
    const uniqueOptions = new Set(normalized);

    if (uniqueOptions.size !== data.options.length) {
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

export const questionFiltersSchema = z.object({
  q: z.preprocess(formString, z.string().trim().max(120)).optional(),
  source: z
    .preprocess(formString, z.enum(["all", "teacher", "admin"]).catch("all"))
    .optional(),
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type QuestionFiltersInput = z.infer<typeof questionFiltersSchema>;
