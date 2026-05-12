import { AuthShell } from "@/app/(auth)/_components/auth-shell";

import { CallbackHandler } from "./callback-handler";

export default function AuthCallbackPage() {
  return (
    <AuthShell
      eyebrow="Verifying"
      title="Confirming your email"
      description="Keep this page open while your account session is created."
    >
      <CallbackHandler />
    </AuthShell>
  );
}
