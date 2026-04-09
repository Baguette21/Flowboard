import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./helpers/boardAccess";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const { userId } = await requireCurrentUser(ctx);
    const note = await ctx.db.get(noteId);

    if (!note || note.userId !== userId) {
      return null;
    }

    return note;
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, { title }) => {
    const { userId } = await requireCurrentUser(ctx);
    const now = Date.now();

    const noteId = await ctx.db.insert("notes", {
      userId,
      title: title ?? "Untitled",
      createdAt: now,
      updatedAt: now,
    });

    return noteId;
  },
});

export const update = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, { noteId, title, content }) => {
    const { userId } = await requireCurrentUser(ctx);
    const note = await ctx.db.get(noteId);

    if (!note || note.userId !== userId) {
      throw new Error("Note not found or access denied");
    }

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (title !== undefined) {
      patch.title = title;
    }

    if (content !== undefined) {
      patch.content = content;
    }

    await ctx.db.patch(noteId, patch);
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const { userId } = await requireCurrentUser(ctx);
    const note = await ctx.db.get(noteId);

    if (!note || note.userId !== userId) {
      throw new Error("Note not found or access denied");
    }

    await ctx.db.delete(noteId);
  },
});
