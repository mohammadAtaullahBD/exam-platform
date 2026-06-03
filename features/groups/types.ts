export type Group = {
  id: string;
  teacherId: string;
  name: string;
  description: string | null;
  inviteToken: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  members: GroupMember[];
};

export type GroupMember = {
  groupId: string;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  joinedAt: string;
  rollNumber: number;
  studentIdentity: string | null;
};

export type StudentGroup = {
  id: string;
  name: string;
  description: string | null;
  teacherName: string;
  joinedAt: string;
};

export type GroupInvite = {
  token: string;
  groupId: string;
  groupName: string;
  description: string | null;
  teacherName: string;
};

export type GroupActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    name?: string[];
    description?: string[];
    email?: string[];
    rollNumber?: string[];
    studentIdentity?: string[];
    studentId?: string[];
    token?: string[];
  };
};

export const initialGroupActionState: GroupActionState = {
  status: "idle",
  message: "",
};
