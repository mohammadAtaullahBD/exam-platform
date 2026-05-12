import { AuthShell } from "../_components/auth-shell";
import { SignInForm } from "../_components/signin-form";

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  CredentialsSignin: "Those credentials did not match an account.",
  SessionRequired: "Please sign in to continue.",
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const initialError = params.error ? errorMessages[params.error] : undefined;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description="Access exams, dashboards, and role-specific tools from one calm place."
    >
      <SignInForm callbackUrl={callbackUrl} initialError={initialError} />
    </AuthShell>
  );
}
