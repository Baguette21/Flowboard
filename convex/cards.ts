import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { generateOrderKeyAfter } from "./helpers/ordering";
import { priorityValidator } from "./helpers/validators";
import {
  getBoardAccess,
  getBoardMembership,
  requireBoardAccess,
} from "./helpers/boardAccess";

function compareCardOrder(
  a: { order: string; createdAt: number; _id: Id<"cards"> },
  b: { order: string; createdAt: number; _id: Id<"cards"> },
) {
  const orderComparison = a.order.localeCompare(b.order);
  if (orderComparison !== 0) {
    return orderComparison;
  }

  const createdAtComparison = a.createdAt - b.createdAt;
  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  return a._id.localeCompare(b._id);
}

function extractTextFragments(node: unknown, fragments: string[]) {
  if (typeof node === "string") {
    fragments.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      extractTextFragments(item, fragments);
    }
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  const record = node as Record<string, unknown>;

  if (typeof record.text === "string") {
    fragments.push(record.text);
  }

  if ("content" in record) {
    extractTextFragments(record.content, fragments);
  }

  if ("children" in record) {
    extractTextFragments(record.children, fragments);
  }
}

function deriveDescriptionPreview(content?: string) {
  if (!content?.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    const fragments: string[] = [];
    extractTextFragments(parsed, fragments);
    const preview = fragments.join(" ").replace(/\s+/g, " ").trim();
    return preview || undefined;
  } catch {
    const preview = content.replace(/\s+/g, " ").trim();
    return preview || undefined;
  }
}

async function assertValidAssignee(
  ctx: MutationCtx,
  boardId: Id<"boards">,
  boardOwnerId: string,
  assignedUserId: Id<"users"> | null,
) {
  if (assignedUserId === null) {
    return;
  }

  if (boardOwnerId === assignedUserId) {
    return;
  }

  const membership = await getBoardMembership(ctx, boardId, assignedUserId);
  if (!membership) {
    throw new Error("Assignee must be a member of this board");
  }
}

function requireAssignmentAccess(
  role: "owner" | "member",
  canAssign: boolean,
) {
  if (role === "owner") {
    return;
  }

  if (!canAssign) {
    throw new Error("You do not have permission to assign tasks");
  }
}

async function createAssignmentNotification(
  ctx: MutationCtx,
  {
    recipientUserId,
    actorUserId,
    boardId,
    cardId,
    taskTitle,
  }: {
    recipientUserId: Id<"users">;
    actorUserId: Id<"users">;
    boardId: Id<"boards">;
    cardId: Id<"cards">;
    taskTitle: string;
  },
) {
  if (recipientUserId === actorUserId) {
    return;
  }

  await ctx.db.insert("notifications", {
    recipientUserId,
    actorUserId,
    boardId,
    cardId,
    type: "taskAssigned",
    taskTitle,
    isRead: false,
    createdAt: Date.now(),
  });
}

export const listByBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access) {
      return [];
    }

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    return cards.sort(compareCardOrder);
  },
});

export const listByColumn = query({
  args: { columnId: v.id("columns") },
  handler: async (ctx, { columnId }) => {
    const column = await ctx.db.get(columnId);
    if (!column) {
      return [];
    }

    const access = await getBoardAccess(ctx, column.boardId);
    if (!access) {
      return [];
    }

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_columnId", (q) => q.eq("columnId", columnId))
      .collect();

    return cards.sort(compareCardOrder);
  },
});

export const get = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      return null;
    }

    const access = await getBoardAccess(ctx, card.boardId);
    return access ? card : null;
  },
});

export const search = query({
  args: {
    boardId: v.id("boards"),
    query: v.string(),
  },
  handler: async (ctx, { boardId, query: searchQuery }) => {
    const access = await getBoardAccess(ctx, boardId);
    if (!access || !searchQuery.trim()) {
      return [];
    }

    return await ctx.db
      .query("cards")
      .withSearchIndex("search_title", (q) =>
        q.search("title", searchQuery).eq("boardId", boardId),
      )
      .take(20);
  },
});

export const create = mutation({
  args: {
    columnId: v.id("columns"),
    boardId: v.id("boards"),
    title: v.string(),
    description: v.optional(v.string()),
    priority: priorityValidator,
    dueDate: v.optional(v.number()),
    assignedUserId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (
    ctx,
    { columnId, boardId, title, description, priority, dueDate, assignedUserId },
  ) => {
    const access = await requireBoardAccess(ctx, boardId);
    const { userId } = access;

    if (assignedUserId !== undefined && assignedUserId !== null) {
      requireAssignmentAccess(access.role, access.membership?.canBeAssigned ?? false);
    }

    await assertValidAssignee(
      ctx,
      boardId,
      access.board.userId,
      assignedUserId ?? null,
    );

    const existing = await ctx.db
      .query("cards")
      .withIndex("by_columnId", (q) => q.eq("columnId", columnId))
      .collect();
    const sorted = existing.sort(compareCardOrder);
    const lastKey = sorted.length > 0 ? sorted[sorted.length - 1].order : null;
    const order = generateOrderKeyAfter(lastKey);

    const cardId = await ctx.db.insert("cards", {
      columnId,
      boardId,
      title,
      description,
      assignedUserId: assignedUserId ?? null,
      order,
      labelIds: [],
      isComplete: false,
      priority,
      dueDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const column = await ctx.db.get(columnId);
    await ctx.db.insert("activityLogs", {
      boardId,
      cardId,
      userId,
      action: "created",
      details: `Created task "${title}" in ${column?.title ?? "column"}`,
      createdAt: Date.now(),
    });

    if (assignedUserId !== undefined && assignedUserId !== null) {
      await createAssignmentNotification(ctx, {
        recipientUserId: assignedUserId,
        actorUserId: userId,
        boardId,
        cardId,
        taskTitle: title,
      });
    }

    return cardId;
  },
});

export const normalizeBoardOrders = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    await requireBoardAccess(ctx, boardId);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    const cardsByColumn = new Map<Id<"columns">, typeof cards>();
    for (const card of cards) {
      const current = cardsByColumn.get(card.columnId) ?? [];
      current.push(card);
      cardsByColumn.set(card.columnId, current);
    }

    let updatedCount = 0;

    for (const [, columnCards] of cardsByColumn) {
      const sortedCards = [...columnCards].sort(compareCardOrder);
      let previousOrder: string | null = null;

      for (const card of sortedCards) {
        const nextOrder = generateOrderKeyAfter(previousOrder);
        previousOrder = nextOrder;

        if (card.order === nextOrder) {
          continue;
        }

        await ctx.db.patch(card._id, {
          order: nextOrder,
          updatedAt: Date.now(),
        });
        updatedCount += 1;
      }
    }

    return { updatedCount };
  },
});

export const update = mutation({
  args: {
    cardId: v.id("cards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    noteContent: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    priority: priorityValidator,
    dueDate: v.optional(v.number()),
    labelIds: v.optional(v.array(v.id("labels"))),
    assignedUserId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, { cardId, ...fields }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Task not found");
    }

    const access = await requireBoardAccess(ctx, card.boardId);
    const { userId } = access;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.description !== undefined) patch.description = fields.description;
    if (fields.noteContent !== undefined) {
      patch.noteContent = fields.noteContent;
      patch.description = deriveDescriptionPreview(fields.noteContent);
    }
    if (fields.drawingDocument !== undefined) {
      patch.drawingDocument = fields.drawingDocument;
    }
    if (fields.priority !== undefined) patch.priority = fields.priority;
    if (fields.dueDate !== undefined) patch.dueDate = fields.dueDate;
    if (fields.labelIds !== undefined) patch.labelIds = fields.labelIds;
    if (fields.assignedUserId !== undefined) {
      requireAssignmentAccess(access.role, access.membership?.canBeAssigned ?? false);
      await assertValidAssignee(
        ctx,
        card.boardId,
        access.board.userId,
        fields.assignedUserId,
      );
      patch.assignedUserId = fields.assignedUserId;
    }

    await ctx.db.patch(cardId, patch);

    if (
      fields.assignedUserId !== undefined &&
      fields.assignedUserId !== card.assignedUserId &&
      fields.assignedUserId !== null
    ) {
      await createAssignmentNotification(ctx, {
        recipientUserId: fields.assignedUserId,
        actorUserId: userId,
        boardId: card.boardId,
        cardId,
        taskTitle: fields.title ?? card.title,
      });
    }

    const changedField = fields.title
      ? "title"
      : fields.description !== undefined
        ? "description"
        : fields.noteContent !== undefined
          ? "note"
        : fields.drawingDocument !== undefined
          ? "drawing"
        : fields.priority !== undefined
          ? "priority"
          : fields.dueDate !== undefined
            ? "due date"
            : fields.labelIds !== undefined
              ? "labels"
              : fields.assignedUserId !== undefined
                ? "assignee"
        : "details";

    await ctx.db.insert("activityLogs", {
      boardId: card.boardId,
      cardId,
      userId,
      action: "updated",
      details: `Updated ${changedField} of task "${fields.title ?? card.title}"`,
      createdAt: Date.now(),
    });
  },
});

export const move = mutation({
  args: {
    cardId: v.id("cards"),
    targetColumnId: v.id("columns"),
    newOrder: v.string(),
  },
  handler: async (ctx, { cardId, targetColumnId, newOrder }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Task not found");
    }

    const { userId } = await requireBoardAccess(ctx, card.boardId);
    const sourceColumn = await ctx.db.get(card.columnId);
    const targetColumn = await ctx.db.get(targetColumnId);
    const previousColumnId = card.columnId;

    await ctx.db.patch(cardId, {
      columnId: targetColumnId,
      order: newOrder,
      updatedAt: Date.now(),
    });

    if (previousColumnId !== targetColumnId) {
      await ctx.db.insert("activityLogs", {
        boardId: card.boardId,
        cardId,
        userId,
        action: "moved",
        details: `Moved task "${card.title}" from "${sourceColumn?.title}" to "${targetColumn?.title}"`,
        createdAt: Date.now(),
      });
    }
  },
});

export const moveToColumnEnd = mutation({
  args: {
    cardId: v.id("cards"),
    targetColumnId: v.id("columns"),
  },
  handler: async (ctx, { cardId, targetColumnId }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Task not found");
    }

    const { userId } = await requireBoardAccess(ctx, card.boardId);
    const sourceColumn = await ctx.db.get(card.columnId);
    const targetColumn = await ctx.db.get(targetColumnId);
    const previousColumnId = card.columnId;

    const existingTargetCards = await ctx.db
      .query("cards")
      .withIndex("by_columnId", (q) => q.eq("columnId", targetColumnId))
      .collect();
    const sortedTargetCards = existingTargetCards
      .filter((existingCard) => existingCard._id !== cardId)
      .sort(compareCardOrder);
    const lastKey =
      sortedTargetCards.length > 0
        ? sortedTargetCards[sortedTargetCards.length - 1].order
        : null;

    await ctx.db.patch(cardId, {
      columnId: targetColumnId,
      order: generateOrderKeyAfter(lastKey),
      updatedAt: Date.now(),
    });

    if (previousColumnId !== targetColumnId) {
      await ctx.db.insert("activityLogs", {
        boardId: card.boardId,
        cardId,
        userId,
        action: "moved",
        details: `Moved task "${card.title}" from "${sourceColumn?.title}" to "${targetColumn?.title}"`,
        createdAt: Date.now(),
      });
    }
  },
});

export const toggleComplete = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Task not found");
    }

    const { userId } = await requireBoardAccess(ctx, card.boardId);
    const newStatus = !card.isComplete;

    await ctx.db.patch(cardId, {
      isComplete: newStatus,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      boardId: card.boardId,
      cardId,
      userId,
      action: newStatus ? "completed" : "reopened",
      details: `${newStatus ? "Completed" : "Reopened"} task "${card.title}"`,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Task not found");
    }

    const { userId } = await requireBoardAccess(ctx, card.boardId);
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    await ctx.db.insert("activityLogs", {
      boardId: card.boardId,
      userId,
      action: "deleted",
      details: `Deleted task "${card.title}"`,
      createdAt: Date.now(),
    });

    await ctx.db.delete(cardId);
  },
});
