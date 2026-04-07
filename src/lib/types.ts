import type { Id } from "../../convex/_generated/dataModel";

export type BoardListItem = {
  _id: Id<"boards">;
  _creationTime: number;
  name: string;
  slug: string;
  color: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  role: "owner" | "member";
  ownerName: string | null;
  ownerEmail: string | null;
};

export type BoardMemberSummary = {
  userId: Id<"users">;
  name: string | null;
  email: string | null;
  joinedAt: number;
  role: "owner" | "member";
  canBeAssigned: boolean;
};
