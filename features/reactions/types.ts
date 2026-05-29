export type ReactionType = "like";

export type ReactionSummary = {
  postId: string;
  type: ReactionType;
  count: number;
  hasReacted: boolean;
};

export type ReactionActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    type?: string[];
  };
};

export const initialReactionActionState: ReactionActionState = {
  status: "idle",
  message: "",
};

