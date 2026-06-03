import Link from "next/link";
import { notFound } from "next/navigation";

import { JoinGroupForm } from "@/features/groups/components/join-group-form";
import { getGroupInvite } from "@/features/groups/queries";
import { inviteTokenSchema } from "@/lib/validations/group";

type JoinGroupPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function JoinGroupPage({ params }: JoinGroupPageProps) {
  const { token } = await params;
  const parsedToken = inviteTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    notFound();
  }

  const invite = await getGroupInvite(parsedToken.data, `/join/${token}`);

  if (!invite) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 text-[#17211b] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[#d8dfda] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f765f]">
              Batch invite
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Join batch</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607066]">
              Confirm the teacher and batch details before joining.
            </p>
          </div>
          <Link
            className="flex h-10 items-center justify-center rounded-md border border-[#cfd8d2] px-4 text-sm font-semibold text-[#1f3528] transition hover:bg-[#eef5f0]"
            href="/student/groups"
          >
            My batches
          </Link>
        </header>

        <JoinGroupForm invite={invite} />
      </div>
    </main>
  );
}
