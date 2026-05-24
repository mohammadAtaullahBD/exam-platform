import { z } from "zod";

function formString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export const groupSchema = z.object({
  name: z.preprocess(
    formString,
    z
      .string()
      .trim()
      .min(1, "Group name is required.")
      .max(80, "Group name must be 80 characters or fewer."),
  ),
  description: z.preprocess(
    formString,
    z
      .string()
      .trim()
      .max(500, "Description must be 500 characters or fewer."),
  ),
});

export const inviteTokenSchema = z.preprocess(
  formString,
  z
    .string()
    .trim()
    .regex(/^[a-f0-9]{32}$/i, "This invite link is not valid."),
);

export type GroupInput = z.infer<typeof groupSchema>;
export type InviteTokenInput = z.infer<typeof inviteTokenSchema>;
