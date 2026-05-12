export const USER_ROLES = ["student", "teacher", "admin"] as const;
export const PUBLIC_SIGNUP_ROLES = ["student", "teacher"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type PublicSignupRole = (typeof PUBLIC_SIGNUP_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = "student";

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function isPublicSignupRole(value: unknown): value is PublicSignupRole {
  return (
    typeof value === "string" &&
    PUBLIC_SIGNUP_ROLES.includes(value as PublicSignupRole)
  );
}

export function toUserRole(value: unknown): UserRole {
  return isUserRole(value) ? value : DEFAULT_USER_ROLE;
}
