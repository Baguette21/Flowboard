import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AccessCtx = QueryCtx | MutationCtx;

export type BoardRole = "owner" | "member";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getCurrentUser(
  ctx: AccessCtx,
): Promise<{ userId: Id<"users">; user: Doc<"users"> } | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }

  return { userId, user };
}

export async function requireCurrentUser(
  ctx: AccessCtx,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const currentUser = await getCurrentUser(ctx);
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  return currentUser;
}

export function requireProUser(user: Doc<"users">) {
  if (user.role !== "PRO") {
    throw new Error("Draw is available to Pro users only");
  }
}

export async function findUserByEmail(
  ctx: AccessCtx,
  email: string,
): Promise<Doc<"users"> | null> {
  const normalizedEmail = normalizeEmail(email);
  const exactMatches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", normalizedEmail))
    .take(5);

  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  if (normalizedEmail === email) {
    return null;
  }

  const fallbackMatches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(5);

  return fallbackMatches[0] ?? null;
}

export async function getBoardMembership(
  ctx: AccessCtx,
  boardId: Id<"boards">,
  userId: Id<"users">,
): Promise<Doc<"boardMembers"> | null> {
  return await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_userId", (q) =>
      q.eq("boardId", boardId).eq("userId", userId),
    )
    .unique();
}

export async function getBoardAccess(
  ctx: AccessCtx,
  boardId: Id<"boards">,
): Promise<
  | {
      board: Doc<"boards">;
      user: Doc<"users">;
      userId: Id<"users">;
      role: BoardRole;
      membership: Doc<"boardMembers"> | null;
    }
  | null
> {
  const currentUser = await getCurrentUser(ctx);
  if (!currentUser) {
    return null;
  }

  const board = await ctx.db.get(boardId);

  if (!board) {
    return null;
  }

  if (board.userId === currentUser.userId) {
    return {
      ...currentUser,
      board,
      role: "owner",
      membership: null,
    };
  }

  const membership = await getBoardMembership(ctx, boardId, currentUser.userId);
  if (!membership) {
    return null;
  }

  return {
    ...currentUser,
    board,
    role: "member",
    membership,
  };
}

export async function requireBoardAccess(
  ctx: AccessCtx,
  boardId: Id<"boards">,
): Promise<{
  board: Doc<"boards">;
  user: Doc<"users">;
  userId: Id<"users">;
  role: BoardRole;
  membership: Doc<"boardMembers"> | null;
}> {
  const access = await getBoardAccess(ctx, boardId);
  if (!access) {
    throw new Error("Not authorized");
  }
  return access;
}

export async function requireBoardOwner(
  ctx: AccessCtx,
  boardId: Id<"boards">,
): Promise<{
  board: Doc<"boards">;
  user: Doc<"users">;
  userId: Id<"users">;
}> {
  const access = await requireBoardAccess(ctx, boardId);
  if (access.role !== "owner") {
    throw new Error("Only the board owner can do that");
  }

  return {
    board: access.board,
    user: access.user,
    userId: access.userId,
  };
}
