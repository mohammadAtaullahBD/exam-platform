import { z } from "zod";

function formString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export const examIdSchema = z.preprocess(
  formString,
  z.uuid("Exam is not valid."),
);

export const submitExamSchema = z.object({
  examId: examIdSchema,
});

