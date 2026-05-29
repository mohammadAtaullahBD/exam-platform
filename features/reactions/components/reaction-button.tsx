"use client";

import { useActionState } from "react";

import { reactToPost } from "@/features/reactions/actions";
import {
  initialReactionActionState,
  type ReactionSummary,
} from "@/features/reactions/types";

type ReactionButtonProps = {
  postId: string;
  summary: ReactionSummary;
};

export function ReactionButton({ postId, summary }: ReactionButtonProps) {
  const [state, formAction, isPending] = useActionState(
    reactToPost.bind(null, postId),
    initialReactionActionState,
  );
  const label = summary.count === 1 ? "1 like" : `${summary.count} likes`;

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input name="type" type="hidden" value="like" />
      <span className="text-sm font-medium text-[#607066]">{label}</span>
      <button
        className={`h-10 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
          summary.hasReacted
            ? "border border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
            : "border border-[#cfd8d2] text-[#1f3528] hover:bg-[#eef5f0] disabled:opacity-60"
        }`}
        type="submit"
        disabled={isPending || summary.hasReacted}
      >
        {summary.hasReacted ? "Liked" : isPending ? "Saving..." : "Like"}
      </button>
      {state.status === "error" && state.message ? (
        <span className="text-sm text-[#8a3a28]">{state.message}</span>
      ) : null}
    </form>
  );
}

