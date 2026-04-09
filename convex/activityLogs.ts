import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
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

export const creatorsByCardIds = query({
  args: {
    boardId: v.id("boards"),
    cardIds: v.array(v.id("cards")),
  },
  handler: async (ctx, { boardId, cardIds }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access || cardIds.length === 0) {
      return {};
    }

    const entries = await Promise.all(
      cardIds.map(async (cardId) => {
        const logs = await ctx.db
          .query("activityLogs")
          .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
          .collect();

        const createdLog = logs
          .filter((log) => log.action === "created")
          .sort((a, b) => a.createdAt - b.createdAt)[0];

        if (!createdLog) {
          return [cardId, null] as const;
        }

        const user = await ctx.db.get(createdLog.userId as Id<"users">);
        if (!user) {
          return [cardId, null] as const;
        }

        return [
          cardId,
          {
            userId: user._id,
            name: user.name ?? null,
            email: user.email ?? null,
          },
        ] as const;
      }),
    );

    return Object.fromEntries(entries);
  },
});
