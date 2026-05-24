import { z } from "zod";

function formString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export const updateProfileSchema = z.object({
  name: z.preprocess(
    formString,
    z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(80, "Name must be 80 characters or fewer."),
  ),
  bio: z.preprocess(
    formString,
    z.string().trim().max(500, "Bio must be 500 characters or fewer."),
  ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
