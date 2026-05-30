import type { UserRole } from "@/lib/roles";

export type ManagedUser = {
  id: string;
  email: string;
  name: string | null;
  authRole: UserRole;
  profileRole: UserRole | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  isCurrentUser: boolean;
};
