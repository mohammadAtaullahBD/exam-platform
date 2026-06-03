import { z } from "zod";

function formString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isValidIsoDate(value: string) {
  return !Number.isNaN(Date.parse(value));
}

const baseExamSchema = z
  .object({
    title: z.preprocess(
      formString,
      z
        .string()
        .trim()
        .min(1, "Exam title is required.")
        .max(120, "Exam title must be 120 characters or fewer."),
    ),
    groupId: z.preprocess(formString, z.uuid("Choose a batch.")),
    questionIds: z
      .array(z.string().trim().min(1))
      .min(1, "Choose at least one question."),
    startsAt: z.preprocess(
      formString,
      z.string().refine(isValidIsoDate, "Choose a valid start time."),
    ),
    endsAt: z.preprocess(
      formString,
      z.string().refine(isValidIsoDate, "Choose a valid end time."),
    ),
  })
  .superRefine((data, context) => {
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);

    if (endsAt <= startsAt) {
      context.addIssue({
        code: "custom",
        message: "End time must be after the start time.",
        path: ["endsAt"],
      });
    }
  })
  .transform((data) => ({
    title: data.title,
    groupId: data.groupId,
    questionIds: [...new Set(data.questionIds)],
    startsAt: new Date(data.startsAt).toISOString(),
    endsAt: new Date(data.endsAt).toISOString(),
  }));

export const examSchema = baseExamSchema.superRefine((data, context) => {
  if (new Date(data.startsAt) <= new Date()) {
    context.addIssue({
      code: "custom",
      message: "Start time must be in the future.",
      path: ["startsAt"],
    });
  }
});

export const updateExamSchema = baseExamSchema;

export type ExamInput = z.infer<typeof examSchema>;
