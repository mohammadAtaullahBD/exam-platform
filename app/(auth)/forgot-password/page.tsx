import { AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "../_components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Password help"
      title="Reset your password"
      description="Enter your account email and we will send a secure reset link if it exists."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
