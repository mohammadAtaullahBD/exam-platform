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
      .min(1, "Batch name is required.")
      .max(80, "Batch name must be 80 characters or fewer."),
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

export const groupMemberIdentitySchema = z.object({
  studentId: z.preprocess(formString, z.uuid("Choose a student.")),
  rollNumber: z.coerce
    .number()
    .int("Roll must be a whole number.")
    .min(1, "Roll must be 1 or greater.")
    .max(99999, "Roll must be 99,999 or lower."),
  studentIdentity: z.preprocess(
    formString,
    z
      .string()
      .trim()
      .max(80, "Identity must be 80 characters or fewer."),
  ),
});

export const groupMemberAddSchema = z.object({
  email: z.preprocess(
    formString,
    z
      .email("Enter a valid student email.")
      .trim()
      .max(320, "Email must be 320 characters or fewer.")
      .transform((value) => value.toLowerCase()),
  ),
  rollNumber: z.preprocess((value) => {
    const stringValue = formString(value).trim();

    return stringValue ? stringValue : undefined;
  }, z.coerce.number().int().min(1).max(99999).optional()),
  studentIdentity: z.preprocess(
    formString,
    z
      .string()
      .trim()
      .max(80, "Identity must be 80 characters or fewer."),
  ),
});

export type GroupInput = z.infer<typeof groupSchema>;
export type InviteTokenInput = z.infer<typeof inviteTokenSchema>;
export type GroupMemberIdentityInput = z.infer<typeof groupMemberIdentitySchema>;
export type GroupMemberAddInput = z.infer<typeof groupMemberAddSchema>;
