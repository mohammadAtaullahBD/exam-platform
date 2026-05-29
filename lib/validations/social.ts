import { z } from "zod";

export const postSchema = z.object({
  content: z.string().trim().min(1, "Post content is required.").max(2000),
});

export const reactionTypeSchema = z.enum(["like"]);

export const reactionSchema = z.object({
  type: reactionTypeSchema.default("like"),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Comment is required.").max(1000),
});

