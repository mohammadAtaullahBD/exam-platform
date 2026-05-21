import { AuthShell } from "../_components/auth-shell";
import { SignUpForm } from "../_components/signup-form";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Choose student or teacher access to get started with your workspace."
    >
      <SignUpForm />
    </AuthShell>
  );
}
