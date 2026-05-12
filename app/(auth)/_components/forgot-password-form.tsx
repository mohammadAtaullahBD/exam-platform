"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { AuthMessage } from "./auth-message";

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const redirectTo = `${window.location.origin}/signin`;
    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );

    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Password reset instructions are on their way if that email exists.");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
      {message ? <AuthMessage tone="success">{message}</AuthMessage> : null}

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

      <button
        className="h-12 w-full rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending link..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-[#5f665f]">
        Remembered it?{" "}
        <Link className="font-semibold text-[#47614f]" href="/signin">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
