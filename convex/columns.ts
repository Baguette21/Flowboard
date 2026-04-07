import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getBoardAccess, requireBoardAccess } from "./helpers/boardAccess";
import { generateOrderKeyAfter } from "./helpers/ordering";

export const listByBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access) {
      return [];
    }

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    return columns.sort((a, b) => a.order.localeCompare(b.order));
  },
});

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    title: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { boardId, title, color }) => {
    const { userId } = await requireBoardAccess(ctx, boardId);

    const existing = await ctx.db
      .query("columns")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
    const sorted = existing.sort((a, b) => a.order.localeCompare(b.order));
    const lastKey = sorted.length > 0 ? sorted[sorted.length - 1].order : null;
    const order = generateOrderKeyAfter(lastKey);

    const columnId = await ctx.db.insert("columns", {
      boardId,
      title,
      order,
      color,
      createdAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      boardId,
      userId,
      action: "created",
      details: `Added column "${title}"`,
      createdAt: Date.now(),
    });

    return columnId;
  },
});

export const update = mutation({
  args: {
    columnId: v.id("columns"),
    title: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { columnId, title, color }) => {
    const column = await ctx.db.get(columnId);
    if (!column) {
      throw new Error("Column not found");
    }

    const { userId } = await requireBoardAccess(ctx, column.boardId);
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (color !== undefined) patch.color = color;

    await ctx.db.patch(columnId, patch);

    if (title) {
      await ctx.db.insert("activityLogs", {
        boardId: column.boardId,
        userId,
        action: "updated",
        details: `Renamed column to "${title}"`,
        createdAt: Date.now(),
      });
    }
  },
});

export const reorder = mutation({
  args: {
    columnId: v.id("columns"),
    newOrder: v.string(),
  },
  handler: async (ctx, { columnId, newOrder }) => {
    const column = await ctx.db.get(columnId);
    if (!column) {
      throw new Error("Column not found");
    }

    await requireBoardAccess(ctx, column.boardId);
    await ctx.db.patch(columnId, { order: newOrder });
  },
});

export const remove = mutation({
  args: {
    columnId: v.id("columns"),
    deleteCards: v.optional(v.boolean()),
  },
  handler: async (ctx, { columnId, deleteCards = true }) => {
    const column = await ctx.db.get(columnId);
    if (!column) {
      throw new Error("Column not found");
    }

    const { userId } = await requireBoardAccess(ctx, column.boardId);

    if (deleteCards) {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_columnId", (q) => q.eq("columnId", columnId))
        .collect();
      for (const card of cards) {
        const logs = await ctx.db
          .query("activityLogs")
          .withIndex("by_cardId", (q) => q.eq("cardId", card._id))
          .collect();
        for (const log of logs) {
          await ctx.db.delete(log._id);
        }
        await ctx.db.delete(card._id);
      }
    } else {
      const otherColumns = await ctx.db
        .query("columns")
        .withIndex("by_boardId", (q) => q.eq("boardId", column.boardId))
        .collect();
      const firstColumn = otherColumns
        .filter((candidate) => candidate._id !== columnId)
        .sort((a, b) => a.order.localeCompare(b.order))[0];

      if (firstColumn) {
        const cards = await ctx.db
          .query("cards")
          .withIndex("by_columnId", (q) => q.eq("columnId", columnId))
          .collect();
        for (const card of cards) {
          await ctx.db.patch(card._id, { columnId: firstColumn._id });
        }
      }
    }

    await ctx.db.insert("activityLogs", {
      boardId: column.boardId,
      userId,
      action: "deleted",
      details: `Deleted column "${column.title}"`,
      createdAt: Date.now(),
    });

    await ctx.db.delete(columnId);
  },
});
