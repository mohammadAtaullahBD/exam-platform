import type { PostComment } from "@/features/comments/types";

type CommentListProps = {
  comments: PostComment[];
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CommentList({ comments }: CommentListProps) {
  if (!comments.length) {
    return (
      <p className="text-sm leading-6 text-[#607066]">
        No comments yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <article className="rounded-md bg-[#f6f8f5] px-4 py-3" key={comment.id}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#26352b]">
              {comment.isOwn ? "You" : "Student"}
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#607066]">
              {formatTime(comment.createdAt)}
            </p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#26352b]">
            {comment.content}
          </p>
        </article>
      ))}
    </div>
  );
}

