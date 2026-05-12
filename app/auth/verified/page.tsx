import Link from "next/link";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";

export default function VerifiedPage() {
  return (
    <AuthShell
      eyebrow="Verified"
      title="Your email is confirmed"
      description="You are signed in for this browser session when Supabase can exchange the email link automatically."
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-[#5f665f]">
          Continue to your dashboard to confirm your role and account details.
        </p>
        <Link
          className="flex h-12 w-full items-center justify-center rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b]"
          href="/dashboard"
        >
          Go to dashboard
        </Link>
      </div>
    </AuthShell>
  );
}
