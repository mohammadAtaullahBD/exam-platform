import Link from "next/link";
import type { ReactNode } from "react";

import type { FeedPost } from "@/features/posts/types";

type FeedPostCardProps = {
  post: FeedPost;
  reactionSlot: ReactNode;
  commentsSlot: ReactNode;
  commentFormSlot: ReactNode;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function FeedPostCard({
  post,
  reactionSlot,
  commentsSlot,
  commentFormSlot,
}: FeedPostCardProps) {
  return (
    <article className="rounded-lg border border-[#d8dfda] bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            className="text-sm font-semibold text-[#1f3528] transition hover:text-[#58735f]"
            href={`/teacher/${post.teacherId}`}
          >
            {post.teacherName}
          </Link>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#607066]">
            {formatDate(post.createdAt)}
          </p>
        </div>
        {reactionSlot}
      </div>

      <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-[#26352b]">
        {post.content}
      </p>

      <div className="mt-6 border-t border-[#eef1ed] pt-5">
        {commentsSlot}
        {commentFormSlot}
      </div>
    </article>
  );
}

