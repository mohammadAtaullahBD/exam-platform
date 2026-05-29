import Link from "next/link";

import { CreatePostForm } from "@/features/posts/components/create-post-form";
import { TeacherPostList } from "@/features/posts/components/teacher-post-list";
import { getTeacherPosts } from "@/features/posts/queries";

export default async function TeacherPostsPage() {
  const posts = await getTeacherPosts("/posts");

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Teacher workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Posts</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Publish text updates for students to read, react to, and discuss.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/profile"
            >
              Profile
            </Link>
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section>
            <TeacherPostList posts={posts} />
          </section>

          <aside>
            <CreatePostForm />
          </aside>
        </div>
      </div>
    </main>
  );
}

