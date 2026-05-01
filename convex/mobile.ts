import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./helpers/boardAccess";

function compareOrderThenUpdated(
  a: { order?: string; updatedAt: number },
  b: { order?: string; updatedAt: number },
) {
  if (a.order && b.order) return a.order.localeCompare(b.order);
  if (a.order) return -1;
  if (b.order) return 1;
  return b.updatedAt - a.updatedAt;
}

function compareCardOrder(
  a: { order: string; createdAt: number; _id: Id<"cards"> },
  b: { order: string; createdAt: number; _id: Id<"cards"> },
) {
  const orderComparison = a.order.localeCompare(b.order);
  if (orderComparison !== 0) return orderComparison;
  const createdAtComparison = a.createdAt - b.createdAt;
  if (createdAtComparison !== 0) return createdAtComparison;
  return a._id.localeCompare(b._id);
}

function initialsFor(user: Pick<Doc<"users">, "name" | "email"> | null) {
  const source = user?.name ?? user?.email ?? "PT";
  const parts = source.replace(/@.*/, "").split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
}

async function boardOwner(ctx: QueryCtx, board: Doc<"boards">) {
  const owner = await ctx.db.get(board.userId as Id<"users">);
  return {
    name: owner?.name ?? null,
    email: owner?.email ?? null,
  };
}

async function accessibleBoards(ctx: QueryCtx) {
  const current = await getCurrentUser(ctx);

  const ownedBoards = current
    ? await ctx.db
        .query("boards")
        .withIndex("by_userId", (q) => q.eq("userId", current.userId))
        .take(30)
    : [];

  const memberships = current
    ? await ctx.db
        .query("boardMembers")
        .withIndex("by_userId", (q) => q.eq("userId", current.userId))
        .take(30)
    : [];

  const ownedBoardIds = new Set(ownedBoards.map((board) => board._id));
  const sharedBoards = current
    ? (
        await Promise.all(
          memberships
            .filter((membership) => !ownedBoardIds.has(membership.boardId))
            .map(async (membership) => await ctx.db.get(membership.boardId)),
        )
      ).filter((board): board is Doc<"boards"> => board !== null)
    : [];

  const previewBoards = current ? [] : await ctx.db.query("boards").order("desc").take(12);
  const boards = [...ownedBoards, ...sharedBoards, ...previewBoards]
    .filter((board) => !board.archivedAt)
    .sort(compareOrderThenUpdated);

  return { current, boards };
}

async function boardPayload(ctx: QueryCtx, board: Doc<"boards"> | null) {
  const [columns, cards, labels, memberships] = board
    ? await Promise.all([
        ctx.db
          .query("columns")
          .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
          .take(30),
        ctx.db
          .query("cards")
          .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
          .take(150),
        ctx.db
          .query("labels")
          .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
          .take(80),
        ctx.db
          .query("boardMembers")
          .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
          .take(50),
      ])
    : [[], [], [], []];

  const memberUsers = await Promise.all(
    memberships.map(async (membership) => ({
      membership,
      user: await ctx.db.get(membership.userId),
    })),
  );

  return {
    columns: columns.sort((a, b) => a.order.localeCompare(b.order)),
    cards: cards.sort(compareCardOrder).map((card) => ({
      ...card,
      commentsCount: 0,
      assignees: memberUsers
        .filter(({ user }) => user && card.assignedUserIds?.includes(user._id))
        .map(({ user, membership }) => ({
          _id: user!._id,
          name: user!.name ?? null,
          email: user!.email ?? null,
          initials: initialsFor(user),
          canBeAssigned: membership.canBeAssigned ?? true,
        })),
    })),
    labels,
    members: memberUsers
      .filter(({ user }) => user !== null)
      .map(({ user, membership }) => ({
        _id: user!._id,
        name: user!.name ?? null,
        email: user!.email ?? null,
        initials: initialsFor(user),
        canBeAssigned: membership.canBeAssigned ?? true,
      })),
  };
}

export const snapshot = query({
  args: {
    boardId: v.optional(v.id("boards")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { boardId, search }) => {
    const { current, boards } = await accessibleBoards(ctx);
    const selectedBoard =
      (boardId ? boards.find((board) => board._id === boardId) : null) ??
      boards.find((board) => board.isFavorite) ??
      boards[0] ??
      null;

    const payload = await boardPayload(ctx, selectedBoard);

    const notes = current
      ? await ctx.db
          .query("notes")
          .withIndex("by_userId_updatedAt", (q) => q.eq("userId", current.userId))
          .order("desc")
          .take(20)
      : [];

    const drawings = current
      ? await ctx.db
          .query("drawings")
          .withIndex("by_userId_updatedAt", (q) => q.eq("userId", current.userId))
          .order("desc")
          .take(20)
      : [];

    const notifications = current
      ? await ctx.db
          .query("notifications")
          .withIndex("by_recipientUserId", (q) => q.eq("recipientUserId", current.userId))
          .order("desc")
          .take(30)
      : [];

    const owners = await Promise.all(boards.map(async (board) => await boardOwner(ctx, board)));
    const ownerByBoardId = new Map(boards.map((board, index) => [board._id, owners[index]]));
    const q = search?.trim().toLowerCase() ?? "";
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return {
      viewer: current
        ? {
            id: current.userId,
            name: current.user.name ?? null,
            email: current.user.email ?? null,
            role: current.user.role ?? "USER",
          }
        : null,
      boards: boards.map((board) => ({
        ...board,
        ownerName: ownerByBoardId.get(board._id)?.name ?? null,
        ownerEmail: ownerByBoardId.get(board._id)?.email ?? null,
      })),
      selectedBoard,
      ...payload,
      notes: notes.filter((note) => !note.archivedAt).sort(compareOrderThenUpdated),
      drawings: drawings.filter((drawing) => !drawing.archivedAt).sort(compareOrderThenUpdated),
      notifications,
      searchResults: q
        ? payload.cards.filter((card) => card.title.toLowerCase().includes(q)).slice(0, 20)
        : payload.cards.slice(0, 20),
      todayCards: payload.cards
        .filter((card) => card.dueDate !== undefined && card.dueDate <= today.getTime())
        .slice(0, 20),
    };
  },
});

export const boardSnapshot = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const { boards } = await accessibleBoards(ctx);
    const selectedBoard = boards.find((board) => board._id === boardId) ?? null;
    const payload = await boardPayload(ctx, selectedBoard);
    return { selectedBoard, ...payload };
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const { boards } = await accessibleBoards(ctx);
    const q = query.trim();
    if (!q) return { boards: [], cards: [], notes: [], drawings: [] };
    const boardIds = new Set(boards.map((board) => board._id));
    const boardMatches = boards
      .filter((board) => board.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10);
    const cardMatches = (
      await Promise.all(
        boards.slice(0, 12).map((board) =>
          ctx.db
            .query("cards")
            .withSearchIndex("search_title", (s) => s.search("title", q).eq("boardId", board._id))
            .take(8),
        ),
      )
    )
      .flat()
      .filter((card) => boardIds.has(card.boardId))
      .slice(0, 30);
    return { boards: boardMatches, cards: cardMatches, notes: [], drawings: [] };
  },
});

export const today = query({
  args: {},
  handler: async (ctx) => {
    const { boards } = await accessibleBoards(ctx);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);
    const cards = (
      await Promise.all(
        boards.slice(0, 12).map((board) =>
          ctx.db
            .query("cards")
            .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
            .take(80),
        ),
      )
    ).flat();
    return cards
      .filter((card) => card.dueDate !== undefined && card.dueDate <= dayEnd.getTime())
      .sort(compareCardOrder)
      .slice(0, 40);
  },
});
