import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getBoardAccess, requireBoardAccess } from "./helpers/boardAccess";

function normalizeLabelName(name: string) {
  return name.trim().toLowerCase();
}

async function findLabelByName(
  ctx: MutationCtx,
  boardId: Id<"boards">,
  name: string,
) {
  const normalizedName = normalizeLabelName(name);
  const labels = await ctx.db
    .query("labels")
    .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
    .collect();

  return labels.find((label) => normalizeLabelName(label.name) === normalizedName) ?? null;
}

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Label name is required");
    }

    const existing = await findLabelByName(ctx, boardId, trimmedName);
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("labels", { boardId, name: trimmedName, color });
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
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Label name is required");
      }

      const existing = await findLabelByName(ctx, label.boardId, trimmedName);
      if (existing && existing._id !== labelId) {
        throw new Error("A label with that name already exists");
      }

      patch.name = trimmedName;
    }
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
