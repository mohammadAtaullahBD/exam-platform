import Link from "next/link";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";

type AuthErrorPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      eyebrow="Verification failed"
      title="That link did not work"
      description="Email links can expire or be opened after they were already used."
    >
      <div className="space-y-5">
        <p className="rounded-md border border-[#efc7bd] bg-[#fff2ee] px-4 py-3 text-sm text-[#9f321f]">
          {params.message ?? "Please request a new verification email and try again."}
        </p>
        <Link
          className="flex h-12 w-full items-center justify-center rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b]"
          href="/signup"
        >
          Create account
        </Link>
      </div>
    </AuthShell>
  );
}
