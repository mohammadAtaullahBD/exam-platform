"use client";

import { useActionState } from "react";

import { createPost } from "@/features/posts/actions";
import { initialPostActionState } from "@/features/posts/types";

export function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(
    createPost,
    initialPostActionState,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-[#d8dfda] bg-white p-6"
    >
      <h2 className="text-xl font-semibold">Create post</h2>
      <p className="mt-2 text-sm leading-6 text-[#607066]">
        Publish a text update for students.
      </p>

      {state.message ? (
        <div
          className={`mt-5 rounded-md border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-[#b8d3bd] bg-[#eef8f0] text-[#244c2c]"
              : "border-[#e3b6aa] bg-[#fff2ef] text-[#7a2f1f]"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <label className="mt-5 block">
        <span className="text-sm font-medium text-[#26352b]">Post</span>
        <textarea
          className="mt-2 min-h-40 w-full resize-y rounded-md border border-[#cfc7ba] bg-white px-4 py-3 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="content"
          maxLength={2000}
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
        className="mt-5 h-12 rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Publishing..." : "Publish post"}
      </button>
    </form>
  );
}

