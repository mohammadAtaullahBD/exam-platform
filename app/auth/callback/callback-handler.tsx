"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type CallbackState = "loading" | "error";

function getErrorMessage(searchParams: URLSearchParams) {
  return (
    searchParams.get("error_description") ??
    searchParams.get("error") ??
    "The verification link did not include a usable session."
  );
}

export function CallbackHandler() {
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let isMounted = true;

    async function finishVerification() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

      const linkError = getErrorMessage(searchParams);

      if (searchParams.has("error")) {
        throw new Error(linkError);
      }

      const code = searchParams.get("code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          throw error;
        }
      } else {
        throw new Error(
          "The verification link is missing session details. Please request a new email link.",
        );
      }

      await fetch("/api/auth/sync-profile", {
        method: "POST",
      });

      window.history.replaceState(null, "", "/auth/callback");
      window.location.replace("/auth/verified");
    }

    finishVerification().catch((error: unknown) => {
      if (!isMounted) {
        return;
      }

      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The verification link could not be processed.",
      );
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-[#c8d7df] bg-[#f1f7fa] px-4 py-3 text-sm text-[#315465]">
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-[#efc7bd] bg-[#fff2ee] px-4 py-3 text-sm text-[#9f321f]">
        {message}
      </div>
      <Link
        className="flex h-12 w-full items-center justify-center rounded-md bg-[#17211b] px-5 text-sm font-semibold text-white transition hover:bg-[#26352b]"
        href="/signup"
      >
        Create account
      </Link>
    </div>
  );
}
