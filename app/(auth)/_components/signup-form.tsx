"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthMessage } from "./auth-message";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signedUpEmail, setSignedUpEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSignedUpEmail("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "student");

    let response: Response;

    try {
      response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, role }),
      });
    } catch {
      setIsSubmitting(false);
      setError("Could not reach the signup service. Please try again.");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to create account.");
      return;
    }

    event.currentTarget.reset();
    setSignedUpEmail(email);
    setMessage(
      payload.message ??
        "Account created. Check your email to verify your account before signing in.",
    );
    window.setTimeout(() => {
      router.push("/auth/check-email");
    }, 900);
  }

  if (signedUpEmail) {
    return (
      <div className="space-y-5">
        <AuthMessage tone="success">
          Signup succeeded. We sent a verification email to{" "}
          <span className="font-semibold">{signedUpEmail}</span>.
        </AuthMessage>
        <p className="text-sm leading-6 text-[#5f665f]">
          Open the email and click the confirmation link. After verification,
          you can continue to your dashboard.
        </p>
        <Link
          className="flex h-12 w-full items-center justify-center rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b]"
          href="/auth/check-email"
        >
          View next steps
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
      {message ? <AuthMessage tone="success">{message}</AuthMessage> : null}

      <label className="block">
        <span className="text-sm font-medium text-[#26352b]">Full name</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="name"
          type="text"
          autoComplete="name"
          disabled={isSubmitting}
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#26352b]">Email</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="email"
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#26352b]">Password</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-[#cfc7ba] bg-white px-4 text-base outline-none transition focus:border-[#58735f] focus:ring-4 focus:ring-[#58735f]/15"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          disabled={isSubmitting}
          required
        />
      </label>

      <fieldset disabled={isSubmitting}>
        <legend className="text-sm font-medium text-[#26352b]">
          Account type
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {[
            ["student", "Student"],
            ["teacher", "Teacher"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex h-12 items-center gap-2 rounded-md border border-[#cfc7ba] px-4 text-sm font-medium text-[#26352b]"
            >
              <input
                className="h-4 w-4 accent-[#58735f]"
                name="role"
                type="radio"
                value={value}
                defaultChecked={value === "student"}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        className="h-12 w-full rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-[#5f665f]">
        Already have an account?{" "}
        <Link className="font-semibold text-[#47614f]" href="/signin">
          Sign in
        </Link>
      </p>
    </form>
  );
}
