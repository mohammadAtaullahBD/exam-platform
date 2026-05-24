import Link from "next/link";

import type { Profile, TeacherPost } from "@/features/auth/types";

type TeacherProfileProps = {
  profile: Profile;
  posts: TeacherPost[];
  isOwnProfile: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function TeacherProfile({
  profile,
  posts,
  isOwnProfile,
}: TeacherProfileProps) {
  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Teacher profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {profile.name ?? "Unnamed teacher"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              {profile.bio ?? "This teacher has not added a bio yet."}
            </p>
          </div>
          {isOwnProfile ? (
            <Link
              className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
              href="/profile/edit"
            >
              Edit profile
            </Link>
          ) : null}
        </header>

        <section className="mt-8 rounded-lg border border-[#d8dfda] bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Public posts</h2>
            <span className="text-sm font-medium text-[#607066]">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {posts.length ? (
            <div className="mt-5 space-y-4">
              {posts.map((post) => (
                <article
                  className="rounded-lg border border-[#d8dfda] bg-[#fbfcfa] p-5"
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
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-[#cfd8d2] bg-[#fbfcfa] p-6">
              <p className="text-sm leading-6 text-[#607066]">
                No public posts yet.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
