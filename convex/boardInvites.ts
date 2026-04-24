import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  findUserByEmail,
  getBoardAccess,
  getBoardMembership,
  normalizeEmail,
  requireBoardOwner,
  requireCurrentUser,
} from "./helpers/boardAccess";

function generateInviteToken() {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 24; i++) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    const currentEmail = currentUser.user.email
      ? normalizeEmail(currentUser.user.email)
      : null;

    if (!currentEmail) {
      return [];
    }

    const invites = await ctx.db
      .query("boardInvites")
      .withIndex("by_invitedEmail_and_status", (q) =>
        q.eq("invitedEmail", currentEmail).eq("status", "pending"),
      )
      .collect();

    const items = await Promise.all(
      invites.map(async (invite) => {
        const board = await ctx.db.get(invite.boardId);
        const inviter = await ctx.db.get(invite.invitedByUserId);
        if (!board) {
          return null;
        }

        return {
          _id: invite._id,
          boardId: board._id,
          boardName: board.name,
          boardColor: board.color,
          invitedEmail: invite.invitedEmail,
          createdAt: invite.createdAt,
          invitedByName: inviter?.name ?? null,
          invitedByEmail: inviter?.email ?? null,
        };
      }),
    );

    return items
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listForBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const ownerAccess = await getBoardAccess(ctx, boardId);
    if (!ownerAccess || ownerAccess.role !== "owner") {
      return [];
    }

    const invites = await ctx.db
      .query("boardInvites")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    const items = await Promise.all(
      invites.map(async (invite) => {
        const invitedUser = invite.invitedUserId
          ? await ctx.db.get(invite.invitedUserId)
          : null;

        return {
          _id: invite._id,
          invitedEmail: invite.invitedEmail,
          status: invite.status,
          createdAt: invite.createdAt,
          updatedAt: invite.updatedAt,
          respondedAt: invite.respondedAt ?? null,
          invitedUserName: invitedUser?.name ?? null,
        };
      }),
    );

    return items.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    email: v.string(),
  },
  handler: async (ctx, { boardId, email }) => {
    const { board, user, userId } = await requireBoardOwner(ctx, boardId);
    const invitedEmail = normalizeEmail(email);

    if (!invitedEmail) {
      throw new Error("Enter an email address");
    }

    if (user.email && normalizeEmail(user.email) === invitedEmail) {
      throw new Error("You already own this board");
    }

    const existingInvites = await ctx.db
      .query("boardInvites")
      .withIndex("by_boardId_and_invitedEmail", (q) =>
        q.eq("boardId", boardId).eq("invitedEmail", invitedEmail),
      )
      .collect();

    if (existingInvites.some((invite) => invite.status === "pending")) {
      throw new Error("That person already has a pending invite");
    }

    const invitedUser = await findUserByEmail(ctx, invitedEmail);
    if (invitedUser) {
      if (board.userId === invitedUser._id) {
        throw new Error("You already own this board");
      }

      const membership = await getBoardMembership(ctx, boardId, invitedUser._id);
      if (membership) {
        throw new Error("That user already has access");
      }
    }

    const now = Date.now();
    const inviteId = await ctx.db.insert("boardInvites", {
      boardId,
      invitedEmail,
      invitedUserId: invitedUser?._id,
      invitedByUserId: userId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityLogs", {
      boardId,
      userId,
      action: "invited",
      details: `Invited ${invitedEmail} to collaborate on "${board.name}"`,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.smtp.sendBoardInviteEmail, {
      to: invitedEmail,
      boardName: board.name,
      inviterName: user.name ?? null,
      inviterEmail: user.email ?? null,
    });

    return inviteId;
  },
});

export const accept = mutation({
  args: { inviteId: v.id("boardInvites") },
  handler: async (ctx, { inviteId }) => {
    const { user, userId } = await requireCurrentUser(ctx);
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found");
    }

    const currentEmail = user.email ? normalizeEmail(user.email) : null;
    if (!currentEmail || currentEmail !== invite.invitedEmail) {
      throw new Error("This invite was sent to a different account");
    }

    const board = await ctx.db.get(invite.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    if (board.userId !== userId) {
      const membership = await getBoardMembership(ctx, invite.boardId, userId);
      if (!membership) {
        await ctx.db.insert("boardMembers", {
          boardId: invite.boardId,
          userId,
          invitedByUserId: invite.invitedByUserId,
          joinedAt: Date.now(),
          canBeAssigned: false,
        });
      }
    }

    const now = Date.now();
    await ctx.db.patch(inviteId, {
      status: "accepted",
      invitedUserId: userId,
      respondedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityLogs", {
      boardId: invite.boardId,
      userId,
      action: "accepted-invite",
      details: `${user.email ?? user.name ?? "A collaborator"} joined the board`,
      createdAt: now,
    });

    return { boardId: invite.boardId };
  },
});

export const getLinkInfo = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access || access.role !== "owner") {
      return null;
    }
    return { inviteToken: access.board.inviteToken ?? null };
  },
});

export const ensureLink = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const { board } = await requireBoardOwner(ctx, boardId);
    if (board.inviteToken) {
      return { inviteToken: board.inviteToken };
    }

    let token = generateInviteToken();
    let existing = await ctx.db
      .query("boards")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .first();
    while (existing) {
      token = generateInviteToken();
      existing = await ctx.db
        .query("boards")
        .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
        .first();
    }

    await ctx.db.patch(boardId, { inviteToken: token, updatedAt: Date.now() });
    return { inviteToken: token };
  },
});

export const revokeLink = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    await requireBoardOwner(ctx, boardId);
    await ctx.db.patch(boardId, { inviteToken: undefined, updatedAt: Date.now() });
    return null;
  },
});

export const lookupByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) {
      return null;
    }
    const board = await ctx.db
      .query("boards")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .first();
    if (!board) {
      return null;
    }

    const inviter = await ctx.db.get(board.userId as Id<"users">);
    return {
      boardId: board._id,
      boardName: board.name,
      boardColor: board.color,
      boardIcon: board.icon ?? null,
      inviterName: inviter?.name ?? null,
      inviterEmail: inviter?.email ?? null,
    };
  },
});

export const joinViaLink = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { userId, user } = await requireCurrentUser(ctx);
    if (!token) {
      throw new Error("Invalid invite link");
    }

    const board = await ctx.db
      .query("boards")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .first();
    if (!board) {
      throw new Error("This invite link is no longer active");
    }

    if (board.userId === userId) {
      return { boardId: board._id, alreadyMember: true };
    }

    const existing = await getBoardMembership(ctx, board._id, userId);
    if (existing) {
      return { boardId: board._id, alreadyMember: true };
    }

    const now = Date.now();
    await ctx.db.insert("boardMembers", {
      boardId: board._id,
      userId,
      invitedByUserId: board.userId as Id<"users">,
      joinedAt: now,
      canBeAssigned: false,
    });

    await ctx.db.insert("activityLogs", {
      boardId: board._id,
      userId,
      action: "joined-via-link",
      details: `${user.name ?? user.email ?? "A collaborator"} joined via invite link`,
      createdAt: now,
    });

    return { boardId: board._id, alreadyMember: false };
  },
});

export const decline = mutation({
  args: { inviteId: v.id("boardInvites") },
  handler: async (ctx, { inviteId }) => {
    const { user, userId } = await requireCurrentUser(ctx);
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found");
    }

    const currentEmail = user.email ? normalizeEmail(user.email) : null;
    if (!currentEmail || currentEmail !== invite.invitedEmail) {
      throw new Error("This invite was sent to a different account");
    }

    const now = Date.now();
    await ctx.db.patch(inviteId, {
      status: "declined",
      invitedUserId: userId,
      respondedAt: now,
      updatedAt: now,
    });

    return null;
  },
});
