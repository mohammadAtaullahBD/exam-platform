export type PostComment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
};

export type CommentActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    content?: string[];
  };
};

export const initialCommentActionState: CommentActionState = {
  status: "idle",
  message: "",
};

