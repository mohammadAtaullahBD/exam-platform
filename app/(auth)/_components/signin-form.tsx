"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { AuthMessage } from "./auth-message";

type SignInFormProps = {
  callbackUrl: string;
  initialError?: string;
};

export function SignInForm({ callbackUrl, initialError }: SignInFormProps) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

      <label className="block">
        <span className="text-sm font-medium text-[#26352b]">Email</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#26352b]">Password</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex items-center gap-2 text-[#5f665f]">
          <input
            className="h-4 w-4 accent-[#58735f]"
            type="checkbox"
            name="remember"
          />
          Remember me
        </label>
        <Link className="font-medium text-[#47614f]" href="/forgot-password">
          Forgot password?
        </Link>
      </div>

      <button
        className="h-12 w-full rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-[#5f665f]">
        New here?{" "}
        <Link className="font-semibold text-[#47614f]" href="/signup">
          Create an account
        </Link>
      </p>
    </form>
  );
}
