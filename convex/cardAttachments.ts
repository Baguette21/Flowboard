import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getBoardAccess, requireBoardAccess, requireCurrentUser } from "./helpers/boardAccess";

const FREE_UPLOAD_LIMIT = 5;
const UPLOAD_WINDOW_MS = 6 * 60 * 60 * 1000;

type UploadLimitCtx = QueryCtx | MutationCtx;

async function getRecentUploads(
  ctx: UploadLimitCtx,
  userId: Id<"users">,
) {
  const cutoff = Date.now() - UPLOAD_WINDOW_MS;
  const uploads = await ctx.db
    .query("cardAttachments")
    .withIndex("by_uploadedByUserId_and_createdAt", (q) =>
      q.eq("uploadedByUserId", userId).gte("createdAt", cutoff),
    )
    .collect();

  return uploads.sort((a, b) => a.createdAt - b.createdAt);
}

async function getUploadAllowanceForUser(
  ctx: UploadLimitCtx,
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId);
  const role = user?.role === "PRO" ? "PRO" : "USER";

  if (role === "PRO") {
    return {
      role,
      limit: null,
      remaining: null,
      retryAfterMs: 0,
      windowMs: UPLOAD_WINDOW_MS,
    };
  }

  const uploads = await getRecentUploads(ctx, userId);
  const remaining = Math.max(0, FREE_UPLOAD_LIMIT - uploads.length);
  const retryAfterMs =
    uploads.length >= FREE_UPLOAD_LIMIT
      ? Math.max(0, uploads[0].createdAt + UPLOAD_WINDOW_MS - Date.now())
      : 0;

  return {
    role,
    limit: FREE_UPLOAD_LIMIT,
    remaining,
    retryAfterMs,
    windowMs: UPLOAD_WINDOW_MS,
  };
}

async function enforceUploadLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const allowance = await getUploadAllowanceForUser(ctx, userId);
  if (allowance.role === "PRO") {
    return;
  }

  if ((allowance.remaining ?? 0) <= 0) {
    throw new Error(
      "Upload limit reached. Free users can upload 5 images every 6 hours. Ask an admin to set your user role to PRO in the Convex dashboard.",
    );
  }
}

export const listByCard = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    try {
      const card = await ctx.db.get(cardId);
      if (!card) {
        return [];
      }

      const access = await getBoardAccess(ctx, card.boardId);
      if (!access) {
        return [];
      }

      const attachments = await ctx.db
        .query("cardAttachments")
        .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
        .collect();

      return attachments.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("cardAttachments.listByCard failed", error);
      return [];
    }
  },
});

export const getForAccess = query({
  args: { attachmentId: v.id("cardAttachments") },
  handler: async (ctx, { attachmentId }) => {
    try {
      const attachment = await ctx.db.get(attachmentId);
      if (!attachment) {
        return null;
      }

      const access = await getBoardAccess(ctx, attachment.boardId);
      return access ? attachment : null;
    } catch (error) {
      console.error("cardAttachments.getForAccess failed", error);
      return null;
    }
  },
});

export const getUploadAllowance = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);
    return await getUploadAllowanceForUser(ctx, userId);
  },
});

export const create = mutation({
  args: {
    cardId: v.id("cards"),
    key: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Task not found");
    }

    const access = await requireBoardAccess(ctx, card.boardId);
    await enforceUploadLimit(ctx, access.userId);

    const attachmentId = await ctx.db.insert("cardAttachments", {
      boardId: card.boardId,
      cardId: args.cardId,
      key: args.key,
      fileName: args.fileName,
      mimeType: args.mimeType,
      size: args.size,
      uploadedByUserId: access.userId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      boardId: card.boardId,
      cardId: card._id,
      userId: access.userId,
      action: "updated",
      details: `Uploaded attachment "${args.fileName}" to task "${card.title}"`,
      createdAt: Date.now(),
    });

    return attachmentId;
  },
});

export const remove = mutation({
  args: { attachmentId: v.id("cardAttachments") },
  handler: async (ctx, { attachmentId }) => {
    const attachment = await ctx.db.get(attachmentId);
    if (!attachment) {
      throw new Error("Attachment not found");
    }

    const access = await requireBoardAccess(ctx, attachment.boardId);
    const card = await ctx.db.get(attachment.cardId);

    await ctx.db.delete(attachmentId);

    await ctx.db.insert("activityLogs", {
      boardId: attachment.boardId,
      cardId: attachment.cardId,
      userId: access.userId,
      action: "updated",
      details: `Removed attachment "${attachment.fileName}" from task "${card?.title ?? "task"}"`,
      createdAt: Date.now(),
    });

    return { key: attachment.key, cardId: attachment.cardId as Id<"cards"> };
  },
});
