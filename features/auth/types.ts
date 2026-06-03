import type { UserRole } from "@/lib/roles";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  role: UserRole;
  createdAt: string | null;
};

export type UpdateProfileState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    name?: string[];
    bio?: string[];
  };
};

export const initialUpdateProfileState: UpdateProfileState = {
  status: "idle",
  message: "",
};
