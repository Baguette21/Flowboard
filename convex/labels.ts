import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getBoardAccess, requireBoardAccess } from "./helpers/boardAccess";

export const listByBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access) {
      return [];
    }

    return await ctx.db
      .query("labels")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
  },
});

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, { boardId, name, color }) => {
    await requireBoardAccess(ctx, boardId);
    return await ctx.db.insert("labels", { boardId, name, color });
  },
});

export const update = mutation({
  args: {
    labelId: v.id("labels"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { labelId, name, color }) => {
    const label = await ctx.db.get(labelId);
    if (!label) {
      throw new Error("Label not found");
    }

    await requireBoardAccess(ctx, label.boardId);
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (color !== undefined) patch.color = color;
    await ctx.db.patch(labelId, patch);
  },
});

export const remove = mutation({
  args: { labelId: v.id("labels") },
  handler: async (ctx, { labelId }) => {
    const label = await ctx.db.get(labelId);
    if (!label) {
      throw new Error("Label not found");
    }

    await requireBoardAccess(ctx, label.boardId);
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", label.boardId))
      .collect();

    for (const card of cards) {
      if (card.labelIds.includes(labelId)) {
        await ctx.db.patch(card._id, {
          labelIds: card.labelIds.filter((id) => id !== labelId),
        });
      }
    }

    await ctx.db.delete(labelId);
  },
});
