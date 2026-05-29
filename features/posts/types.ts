export type TeacherPost = {
  id: string;
  teacherId: string;
  content: string;
  createdAt: string;
};

export type FeedPost = TeacherPost & {
  teacherName: string;
};

export type PostActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    content?: string[];
  };
};

export const initialPostActionState: PostActionState = {
  status: "idle",
  message: "",
};

