import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getBoardAccess,
  requireBoardAccess,
  requireBoardOwner,
  requireCurrentUser,
  type BoardRole,
} from "./helpers/boardAccess";
import { generateOrderKeyAfter } from "./helpers/ordering";

const DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function buildBoardListItem(
  ctx: QueryCtx,
  board: Doc<"boards">,
  role: BoardRole,
) {
  const owner = await ctx.db.get(board.userId as Id<"users">);

  return {
    _id: board._id,
    _creationTime: board._creationTime,
    name: board.name,
    slug: board.slug,
    color: board.color,
    isFavorite: board.isFavorite,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    role,
    ownerName: owner?.name ?? null,
    ownerEmail: owner?.email ?? null,
  };
}

async function generateUniqueSlug(
  ctx: QueryCtx,
  name: string,
  currentBoardId?: Id<"boards">,
): Promise<string> {
  let slug = slugify(name);
  const existing = await ctx.db
    .query("boards")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();

  if (existing && existing._id !== currentBoardId) {
    slug = `${slug}-${Date.now()}`;
  }

  return slug;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);

    const ownedBoards = await ctx.db
      .query("boards")
      .withIndex("by_userId", (q) => q.eq("userId", currentUser.userId))
      .collect();

    const memberships = await ctx.db
      .query("boardMembers")
      .withIndex("by_userId", (q) => q.eq("userId", currentUser.userId))
      .collect();

    const ownedBoardIds = new Set(ownedBoards.map((board) => board._id));
    const sharedBoards = (
      await Promise.all(
        memberships
          .filter((membership) => !ownedBoardIds.has(membership.boardId))
          .map(async (membership) => await ctx.db.get(membership.boardId)),
      )
    ).filter((board): board is Doc<"boards"> => board !== null);

    const boardItems = await Promise.all([
      ...ownedBoards.map(async (board) => await buildBoardListItem(ctx, board, "owner")),
      ...sharedBoards.map(async (board) => await buildBoardListItem(ctx, board, "member")),
    ]);

    return boardItems.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const access = await getBoardAccess(ctx, boardId);
    return access?.board ?? null;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const board = await ctx.db
      .query("boards")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!board) {
      return null;
    }

    const access = await getBoardAccess(ctx, board._id);
    return access?.board ?? null;
  },
});

export const getAccessInfo = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access) {
      return null;
    }

    const owner = await ctx.db.get(access.board.userId as Id<"users">);
    const members = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    return {
      role: access.role,
      isOwner: access.role === "owner",
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      memberCount: members.length + 1,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { name, color }) => {
    const { userId } = await requireCurrentUser(ctx);
    const now = Date.now();
    const slug = await generateUniqueSlug(ctx, name);

    const boardId = await ctx.db.insert("boards", {
      userId,
      name,
      slug,
      color: color ?? "#E8E4DD",
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });

    let order: string | null = null;
    for (const title of DEFAULT_COLUMNS) {
      order = generateOrderKeyAfter(order);
      await ctx.db.insert("columns", {
        boardId,
        title,
        order,
        createdAt: now,
      });
    }

    await ctx.db.insert("activityLogs", {
      boardId,
      userId,
      action: "created",
      details: `Created board "${name}"`,
      createdAt: now,
    });

    return boardId;
  },
});

export const update = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
  },
  handler: async (ctx, { boardId, name, color, isFavorite }) => {
    const { board, userId } = await requireBoardAccess(ctx, boardId);
    const patch: Partial<Doc<"boards">> = {
      updatedAt: Date.now(),
    };

    if (name !== undefined) {
      patch.name = name;
      patch.slug = await generateUniqueSlug(ctx, name, boardId);
    }

    if (color !== undefined) {
      patch.color = color;
    }

    if (isFavorite !== undefined) {
      patch.isFavorite = isFavorite;
    }

    await ctx.db.patch(boardId, patch);

    let details = "Updated board settings";
    if (name !== undefined && name !== board.name) {
      details = `Renamed board to "${name}"`;
    } else if (color !== undefined && color !== board.color) {
      details = "Changed board color";
    } else if (isFavorite !== undefined && isFavorite !== board.isFavorite) {
      details = isFavorite ? "Marked board as favorite" : "Removed board from favorites";
    }

    await ctx.db.insert("activityLogs", {
      boardId,
      userId,
      action: "updated",
      details,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    await requireBoardOwner(ctx, boardId);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
    for (const column of columns) {
      await ctx.db.delete(column._id);
    }

    const labels = await ctx.db
      .query("labels")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
    for (const label of labels) {
      await ctx.db.delete(label._id);
    }

    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    const members = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const invites = await ctx.db
      .query("boardInvites")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    await ctx.db.delete(boardId);
  },
});
