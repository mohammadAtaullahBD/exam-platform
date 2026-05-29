import Link from "next/link";

import { CommentForm } from "@/features/comments/components/comment-form";
import { CommentList } from "@/features/comments/components/comment-list";
import { getCommentsForPosts } from "@/features/comments/queries";
import { FeedPostCard } from "@/features/posts/components/feed-post-card";
import { getStudentFeedPosts } from "@/features/posts/queries";
import { ReactionButton } from "@/features/reactions/components/reaction-button";
import { getReactionSummaries } from "@/features/reactions/queries";

export default async function StudentFeedPage() {
  const posts = await getStudentFeedPosts("/student/feed");
  const postIds = posts.map((post) => post.id);
  const [reactionSummaries, commentsByPostId] = await Promise.all([
    getReactionSummaries(postIds, "/student/feed"),
    getCommentsForPosts(postIds, "/student/feed"),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Student workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Feed</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Read teacher posts and join the conversation.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/student/groups"
            >
              Groups
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="mt-8 space-y-4">
          {posts.length ? (
            posts.map((post) => (
              <FeedPostCard
                commentFormSlot={<CommentForm postId={post.id} />}
                commentsSlot={
                  <CommentList comments={commentsByPostId[post.id] ?? []} />
                }
                key={post.id}
                post={post}
                reactionSlot={
                  <ReactionButton
                    postId={post.id}
                    summary={reactionSummaries[post.id]}
                  />
                }
              />
            ))
          ) : (
            <div className="rounded-lg border border-[#d8dfda] bg-white p-6">
              <h2 className="text-xl font-semibold">No posts yet</h2>
              <p className="mt-3 text-sm leading-6 text-[#607066]">
                Teacher posts will appear here when they are published.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

