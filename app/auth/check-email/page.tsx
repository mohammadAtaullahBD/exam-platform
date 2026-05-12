import Link from "next/link";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";

export default function CheckEmailPage() {
  return (
    <AuthShell
      eyebrow="Almost there"
      title="Check your email"
      description="Your account was created. Open the verification email to activate your account and start a session."
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-[#5f665f]">
          The verification link may take a minute to arrive. If it expires, sign
          up again with the same email or request a fresh link from Supabase.
        </p>
        <Link
          className="flex h-12 w-full items-center justify-center rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b]"
          href="/signin"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
