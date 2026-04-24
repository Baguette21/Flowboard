import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function deleteBoardCascade(ctx: any, boardId: Id<"boards">) {
  const cards = await ctx.db
    .query("cards")
    .withIndex("by_boardId", (q: any) => q.eq("boardId", boardId))
    .collect();
  for (const card of cards) {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_cardId", (q: any) => q.eq("cardId", card._id))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    const attachments = await ctx.db
      .query("cardAttachments")
      .withIndex("by_cardId", (q: any) => q.eq("cardId", card._id))
      .collect();
    for (const attachment of attachments) {
      await ctx.db.delete(attachment._id);
    }

    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_cardId", (q: any) => q.eq("cardId", card._id))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    await ctx.db.delete(card._id);
  }

  const columns = await ctx.db
    .query("columns")
    .withIndex("by_boardId", (q: any) => q.eq("boardId", boardId))
    .collect();
  for (const column of columns) {
    await ctx.db.delete(column._id);
  }

  const labels = await ctx.db
    .query("labels")
    .withIndex("by_boardId", (q: any) => q.eq("boardId", boardId))
    .collect();
  for (const label of labels) {
    await ctx.db.delete(label._id);
  }

  const boardLogs = await ctx.db
    .query("activityLogs")
    .withIndex("by_boardId", (q: any) => q.eq("boardId", boardId))
    .collect();
  for (const log of boardLogs) {
    await ctx.db.delete(log._id);
  }

  const members = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId", (q: any) => q.eq("boardId", boardId))
    .collect();
  for (const member of members) {
    await ctx.db.delete(member._id);
  }

  const invites = await ctx.db
    .query("boardInvites")
    .withIndex("by_boardId", (q: any) => q.eq("boardId", boardId))
    .collect();
  for (const invite of invites) {
    await ctx.db.delete(invite._id);
  }

  const boardNotifications = await ctx.db
    .query("notifications")
    .withIndex("by_boardId", (q: any) => q.eq("boardId", boardId))
    .collect();
  for (const notification of boardNotifications) {
    await ctx.db.delete(notification._id);
  }

  await ctx.db.delete(boardId);
}

export const deleteUsersByEmail = internalMutation({
  args: {
    emails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const deleted: string[] = [];
    const notFound: string[] = [];

    for (const rawEmail of args.emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) {
        continue;
      }

      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .unique();

      if (!user) {
        notFound.push(email);
        continue;
      }

      const boards = await ctx.db
        .query("boards")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      for (const board of boards) {
        await deleteBoardCascade(ctx, board._id);
      }

      const memberships = await ctx.db
        .query("boardMembers")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      for (const membership of memberships) {
        await ctx.db.delete(membership._id);
      }

      const notes = await ctx.db
        .query("notes")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      for (const note of notes) {
        await ctx.db.delete(note._id);
      }

      const drawings = await ctx.db
        .query("drawings")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      for (const drawing of drawings) {
        await ctx.db.delete(drawing._id);
      }

      const uploadedAttachments = await ctx.db
        .query("cardAttachments")
        .withIndex("by_uploadedByUserId_and_createdAt", (q) =>
          q.eq("uploadedByUserId", user._id),
        )
        .collect();
      for (const attachment of uploadedAttachments) {
        await ctx.db.delete(attachment._id);
      }

      const receivedNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_recipientUserId", (q) => q.eq("recipientUserId", user._id))
        .collect();
      for (const notification of receivedNotifications) {
        await ctx.db.delete(notification._id);
      }

      const authAccounts = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
        .collect();
      for (const account of authAccounts) {
        await ctx.db.delete(account._id);
      }

      await ctx.db.delete(user._id);
      deleted.push(email);
    }

    return { deleted, notFound };
  },
});

export const cleanupOrphanedPasswordAccounts = internalMutation({
  args: {
    emails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const removed: string[] = [];

    for (const rawEmail of args.emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) {
        continue;
      }

      const accounts = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .collect();

      for (const account of accounts) {
        const user = await ctx.db.get(account.userId);
        if (!user || user.email !== email) {
          await ctx.db.delete(account._id);
          removed.push(email);
        }
      }
    }

    return { removed };
  },
});

export const cleanupOrphanedPasswordAccountsNow = mutation({
  args: {
    emails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const removed: string[] = [];

    for (const rawEmail of args.emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) {
        continue;
      }

      const accounts = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .collect();

      for (const account of accounts) {
        const user = await ctx.db.get(account.userId);
        if (!user || user.email !== email) {
          await ctx.db.delete(account._id);
          removed.push(email);
        }
      }
    }

    return { removed };
  },
});
