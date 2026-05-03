import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
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
    }).map((note) => ({
      ...note,
      content: undefined,
      contentHTML: undefined,
      drawingDocument: undefined,
    }));
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
      .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
      .map((note) => ({
        ...note,
        content: undefined,
        contentHTML: undefined,
        drawingDocument: undefined,
      }));
  },
});

async function patchNoteDetails(
  ctx: MutationCtx,
  noteId: Id<"notes">,
  patch: {
    content?: string;
    contentHTML?: string;
    contentVersion?: number;
    drawingDocument?: string;
  },
) {
  const existing = await ctx.db
    .query("noteDetails")
    .withIndex("by_noteId", (q) => q.eq("noteId", noteId))
    .first();
  const next = { ...patch, updatedAt: Date.now() };

  if (existing) {
    await ctx.db.patch(existing._id, next);
    return;
  }

  await ctx.db.insert("noteDetails", {
    noteId,
    ...next,
  });
}

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

    const details = await ctx.db
      .query("noteDetails")
      .withIndex("by_noteId", (q) => q.eq("noteId", noteId))
      .first();

    return {
      ...note,
      content: details?.content ?? note.content,
      contentHTML: details?.contentHTML ?? note.contentHTML,
      contentVersion: details?.contentVersion ?? note.contentVersion,
      drawingDocument: details?.drawingDocument ?? note.drawingDocument,
    };
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

    const detailPatch: {
      content?: string;
      contentHTML?: string;
      contentVersion?: number;
      drawingDocument?: string;
    } = {};

    if (content !== undefined) {
      detailPatch.content = content;
      patch.content = undefined;
    }

    if (contentHTML !== undefined) {
      const currentVersion = note.contentVersion ?? 0;
      if (expectedContentVersion !== undefined && expectedContentVersion !== currentVersion) {
        throw new Error("Note was edited elsewhere — please reload");
      }
      detailPatch.contentHTML = sanitizeHtml(contentHTML);
      detailPatch.contentVersion = currentVersion + 1;
      patch.contentHTML = undefined;
      patch.contentVersion = currentVersion + 1;
    }

    if (drawingDocument !== undefined) {
      detailPatch.drawingDocument = drawingDocument;
      patch.drawingDocument = undefined;
    }

    if (isFavorite !== undefined) {
      patch.isFavorite = isFavorite;
    }

    if (archivedAt !== undefined) {
      patch.archivedAt = archivedAt ?? undefined;
    }

    await ctx.db.patch(noteId, patch);

    if (Object.keys(detailPatch).length > 0) {
      await patchNoteDetails(ctx, noteId, detailPatch);
    }
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

    const details = await ctx.db
      .query("noteDetails")
      .withIndex("by_noteId", (q) => q.eq("noteId", noteId))
      .collect();
    for (const detail of details) {
      await ctx.db.delete(detail._id);
    }

    await ctx.db.delete(noteId);
  },
});

export const migrateDetailsBatch = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 1000 }) => {
    const notes = await ctx.db.query("notes").take(limit);
    let migrated = 0;

    for (const note of notes) {
      if (!note.content && !note.contentHTML && !note.drawingDocument) {
        continue;
      }

      await patchNoteDetails(ctx, note._id, {
        content: note.content,
        contentHTML: note.contentHTML,
        contentVersion: note.contentVersion,
        drawingDocument: note.drawingDocument,
      });
      await ctx.db.patch(note._id, {
        content: undefined,
        contentHTML: undefined,
        drawingDocument: undefined,
      });
      migrated += 1;
    }

    return { migrated };
  },
});
