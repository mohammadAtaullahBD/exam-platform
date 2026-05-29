import type { TeacherPost } from "@/features/posts/types";

type TeacherPostListProps = {
  posts: TeacherPost[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function TeacherPostList({ posts }: TeacherPostListProps) {
  if (!posts.length) {
    return (
      <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
        <h2 className="text-xl font-semibold">No posts yet</h2>
        <p className="mt-3 text-sm leading-6 text-[#607066]">
          Your published posts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          className="rounded-lg border border-[#d8dfda] bg-white p-6"
          key={post.id}
        >
          <p className="whitespace-pre-wrap text-sm leading-6 text-[#26352b]">
            {post.content}
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-[#607066]">
            {formatDate(post.createdAt)}
          </p>
        </article>
      ))}
    </div>
  );
}

