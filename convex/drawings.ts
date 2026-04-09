import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./helpers/boardAccess";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);

    const drawings = await ctx.db
      .query("drawings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return drawings.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { drawingId: v.id("drawings") },
  handler: async (ctx, { drawingId }) => {
    const { userId } = await requireCurrentUser(ctx);
    const drawing = await ctx.db.get(drawingId);

    if (!drawing || drawing.userId !== userId) {
      return null;
    }

    return drawing;
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, { title }) => {
    const { userId } = await requireCurrentUser(ctx);
    const now = Date.now();

    const drawingId = await ctx.db.insert("drawings", {
      userId,
      title: title ?? "Untitled",
      createdAt: now,
      updatedAt: now,
    });

    return drawingId;
  },
});

export const update = mutation({
  args: {
    drawingId: v.id("drawings"),
    title: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
  },
  handler: async (ctx, { drawingId, title, drawingDocument }) => {
    const { userId } = await requireCurrentUser(ctx);
    const drawing = await ctx.db.get(drawingId);

    if (!drawing || drawing.userId !== userId) {
      throw new Error("Drawing not found or access denied");
    }

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (title !== undefined) {
      patch.title = title;
    }

    if (drawingDocument !== undefined) {
      patch.drawingDocument = drawingDocument;
    }

    await ctx.db.patch(drawingId, patch);
  },
});

export const remove = mutation({
  args: { drawingId: v.id("drawings") },
  handler: async (ctx, { drawingId }) => {
    const { userId } = await requireCurrentUser(ctx);
    const drawing = await ctx.db.get(drawingId);

    if (!drawing || drawing.userId !== userId) {
      throw new Error("Drawing not found or access denied");
    }

    await ctx.db.delete(drawingId);
  },
});
