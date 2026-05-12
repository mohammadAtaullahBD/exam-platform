import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { upsertUserProfile } from "@/lib/supabase/users";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    const redirectUrl = new URL("/auth/error", request.url);
    redirectUrl.searchParams.set("message", errorDescription ?? error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL("/auth/error", request.url);
    redirectUrl.searchParams.set(
      "message",
      "The verification link is missing a login code. Please request a new email link.",
    );
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const redirectUrl = new URL("/auth/error", request.url);
    redirectUrl.searchParams.set("message", exchangeError.message);
    return NextResponse.redirect(redirectUrl);
  }

  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user) {
    const redirectUrl = new URL("/auth/error", request.url);
    redirectUrl.searchParams.set(
      "message",
      userError?.message ?? "Your email was verified, but the app could not start a session.",
    );
    return NextResponse.redirect(redirectUrl);
  }

  await upsertUserProfile(data.user);

  return NextResponse.redirect(new URL("/auth/verified", request.url));
}
