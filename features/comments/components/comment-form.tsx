"use client";

import { useActionState, useEffect, useRef } from "react";

import { createComment } from "@/features/comments/actions";
import { initialCommentActionState } from "@/features/comments/types";

type CommentFormProps = {
  postId: string;
};

export function CommentForm({ postId }: CommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createComment.bind(null, postId),
    initialCommentActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form action={formAction} className="mt-4" ref={formRef}>
      {state.message ? (
        <div
          className={`mb-3 rounded-md border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
              : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-[#26352b]">Comment</span>
        <textarea
          className="mt-2 min-h-24 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="content"
          maxLength={1000}
          disabled={isPending}
          required
        />
        {state.fieldErrors?.content?.[0] ? (
          <span className="mt-2 block text-sm text-[#8a3a28]">
            {state.fieldErrors.content[0]}
          </span>
        ) : null}
      </label>

      <button
        className="mt-3 h-10 rounded-md bg-[#17211b] px-4 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Posting..." : "Post comment"}
      </button>
    </form>
  );
}

