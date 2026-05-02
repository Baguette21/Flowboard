import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireProUser } from "./helpers/boardAccess";
import { sanitizeHtml } from "./helpers/sanitizeHtml";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return notes.filter((note) => !note.archivedAt).sort((a, b) => {
      if (a.order && b.order) return a.order.localeCompare(b.order);
      if (a.order) return -1;
      if (b.order) return 1;
      return b.updatedAt - a.updatedAt;
    });
  },
});

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return notes
      .filter((note) => note.archivedAt)
      .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
  },
});

export const reorder = mutation({
  args: {
    orders: v.array(
      v.object({ noteId: v.id("notes"), order: v.string() }),
    ),
  },
  handler: async (ctx, { orders }) => {
    const { userId } = await requireCurrentUser(ctx);
    for (const { noteId, order } of orders) {
      const note = await ctx.db.get(noteId);
      if (!note || note.userId !== userId) continue;
      await ctx.db.patch(noteId, { order });
    }
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
      isFavorite: false,
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
    contentHTML: v.optional(v.string()),
    expectedContentVersion: v.optional(v.number()),
    drawingDocument: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
    archivedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { noteId, title, content, contentHTML, expectedContentVersion, drawingDocument, isFavorite, archivedAt }) => {
    const { userId, user } = await requireCurrentUser(ctx);
    const note = await ctx.db.get(noteId);

    if (!note || note.userId !== userId) {
      throw new Error("Note not found or access denied");
    }

    if (drawingDocument !== undefined) {
      requireProUser(user);
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

    if (contentHTML !== undefined) {
      const currentVersion = note.contentVersion ?? 0;
      if (expectedContentVersion !== undefined && expectedContentVersion !== currentVersion) {
        throw new Error("Note was edited elsewhere — please reload");
      }
      patch.contentHTML = sanitizeHtml(contentHTML);
      patch.contentVersion = currentVersion + 1;
    }

    if (drawingDocument !== undefined) {
      patch.drawingDocument = drawingDocument;
    }

    if (isFavorite !== undefined) {
      patch.isFavorite = isFavorite;
    }

    if (archivedAt !== undefined) {
      patch.archivedAt = archivedAt ?? undefined;
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
