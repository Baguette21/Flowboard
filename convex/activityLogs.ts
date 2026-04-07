import { v } from "convex/values";
import { query } from "./_generated/server";
import { getBoardAccess } from "./helpers/boardAccess";

export const listByBoard = query({
  args: {
    boardId: v.id("boards"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { boardId, limit = 50 }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access) {
      return [];
    }

    return await ctx.db
      .query("activityLogs")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .order("desc")
      .take(limit);
  },
});

export const listByCard = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      return [];
    }

    const access = await getBoardAccess(ctx, card.boardId);
    if (!access) {
      return [];
    }

    return await ctx.db
      .query("activityLogs")
      .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
      .order("desc")
      .take(20);
  },
});
