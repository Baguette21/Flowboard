import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getBoardAccess, requireBoardAccess } from "./helpers/boardAccess";
import { requireBoardOwner } from "./helpers/boardAccess";

type MemberSummary = {
  userId: Id<"users">;
  name: string | null;
  email: string | null;
  imageKey: string | null;
  joinedAt: number;
  role: "owner" | "member";
  canBeAssigned: boolean;
};

export const listForBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access) {
      return [];
    }

    const owner = await ctx.db.get(access.board.userId as Id<"users">);
    const memberships = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    const memberUsers = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        user: await ctx.db.get(membership.userId),
      })),
    );

    const members: MemberSummary[] = [];

    if (owner) {
      members.push({
        userId: owner._id,
        name: owner.name ?? null,
        email: owner.email ?? null,
        imageKey: owner.imageKey ?? null,
        joinedAt: access.board.createdAt,
        role: "owner",
        canBeAssigned: true,
      });
    }

    for (const entry of memberUsers) {
      if (!entry.user) {
        continue;
      }

      members.push({
        userId: entry.user._id,
        name: entry.user.name ?? null,
        email: entry.user.email ?? null,
        imageKey: entry.user.imageKey ?? null,
        joinedAt: entry.membership.joinedAt,
        role: "member",
        canBeAssigned: entry.membership.canBeAssigned ?? false,
      });
    }

    return members;
  },
});

export const setAssignable = mutation({
  args: {
    boardId: v.id("boards"),
    memberUserId: v.id("users"),
    canBeAssigned: v.boolean(),
  },
  handler: async (ctx, { boardId, memberUserId, canBeAssigned }) => {
    const { userId } = await requireBoardOwner(ctx, boardId);
    const board = await ctx.db.get(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    if (board.userId === memberUserId) {
      throw new Error("The board owner is always assignable");
    }

    const membership = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", boardId).eq("userId", memberUserId),
      )
      .unique();

    if (!membership) {
      throw new Error("Member not found");
    }

    await ctx.db.patch(membership._id, { canBeAssigned });

    const member = await ctx.db.get(memberUserId);
    await ctx.db.insert("activityLogs", {
      boardId,
      userId,
      action: "updated-member-permission",
      details: `${canBeAssigned ? "Enabled" : "Disabled"} task assignment for ${member?.name ?? member?.email ?? "a member"}`,
      createdAt: Date.now(),
    });
  },
});

export const leaveBoard = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, { boardId }) => {
    const access = await requireBoardAccess(ctx, boardId);
    const { userId, user, board, membership } = access;

    if (access.role === "owner") {
      throw new Error("The board owner cannot leave their own board");
    }

    if (!membership) {
      throw new Error("Membership not found");
    }

    const assignedCards = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    for (const card of assignedCards) {
      if (card.assignedUserId === userId) {
        await ctx.db.patch(card._id, {
          assignedUserId: null,
          updatedAt: Date.now(),
        });
      }
    }

    const boardNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    for (const notification of boardNotifications) {
      if (notification.recipientUserId === userId || notification.actorUserId === userId) {
        await ctx.db.delete(notification._id);
      }
    }

    await ctx.db.delete(membership._id);

    await ctx.db.insert("activityLogs", {
      boardId,
      userId,
      action: "left-board",
      details: `${user.name ?? user.email ?? "A collaborator"} left the board`,
      createdAt: Date.now(),
    });

    return { boardId: board._id };
  },
});
