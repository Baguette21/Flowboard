import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { generateOrderKeyAfter } from "./helpers/ordering";
import { priorityValidator } from "./helpers/validators";
import { sanitizeHtml, htmlToPlainText } from "./helpers/sanitizeHtml";
import {
  getPlanAccess,
  getPlanMembership,
  requirePlanAccess,
  requireProUser,
} from "./helpers/planAccess";

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
  planId: Id<"plans">,
  planOwnerId: string,
  assignedUserId: Id<"users"> | null,
) {
  if (assignedUserId === null) {
    return;
  }

  if (planOwnerId === assignedUserId) {
    return;
  }

  const membership = await getPlanMembership(ctx, planId, assignedUserId);
  if (!membership) {
    throw new Error("Assignee must be a member of this plan");
  }
}

async function assertValidAssignees(
  ctx: MutationCtx,
  planId: Id<"plans">,
  planOwnerId: string,
  assignedUserIds: Id<"users">[],
) {
  for (const assignedUserId of assignedUserIds) {
    await assertValidAssignee(ctx, planId, planOwnerId, assignedUserId);
  }
}

function normalizeAssigneeIds(
  assignedUserIds?: Id<"users">[],
  assignedUserId?: Id<"users"> | null,
) {
  const ids = assignedUserIds ?? (assignedUserId ? [assignedUserId] : []);
  return [...new Set(ids)];
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
    planId,
    cardId,
    taskTitle,
  }: {
    recipientUserId: Id<"users">;
    actorUserId: Id<"users">;
    planId: Id<"plans">;
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
    planId,
    cardId,
    type: "taskAssigned",
    taskTitle,
    isRead: false,
    createdAt: Date.now(),
  });
}

export const listByPlan = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const access = await getPlanAccess(ctx, planId);
    if (!access) {
      return [];
    }

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();

    return cards.sort(compareCardOrder).map((card) => ({
      ...card,
      descriptionHTML: undefined,
      noteContent: undefined,
      drawingDocument: undefined,
    }));
  },
});

export const listByColumn = query({
  args: { columnId: v.id("columns") },
  handler: async (ctx, { columnId }) => {
    const column = await ctx.db.get(columnId);
    if (!column) {
      return [];
    }

    const access = await getPlanAccess(ctx, column.planId!);
    if (!access) {
      return [];
    }

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_columnId", (q) => q.eq("columnId", columnId))
      .collect();

    return cards.sort(compareCardOrder).map((card) => ({
      ...card,
      descriptionHTML: undefined,
      noteContent: undefined,
      drawingDocument: undefined,
    }));
  },
});

export const get = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      return null;
    }

    const access = await getPlanAccess(ctx, card.planId!);
    if (!access) {
      return null;
    }

    const details = await ctx.db
      .query("cardDetails")
      .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
      .first();

    return {
      ...card,
      descriptionHTML: details?.descriptionHTML ?? card.descriptionHTML,
      noteContent: details?.noteContent ?? card.noteContent,
      drawingDocument: details?.drawingDocument ?? card.drawingDocument,
      descriptionVersion: details?.descriptionVersion ?? card.descriptionVersion,
    };
  },
});

async function patchCardDetails(
  ctx: MutationCtx,
  cardId: Id<"cards">,
  patch: {
    descriptionHTML?: string;
    noteContent?: string;
    drawingDocument?: string;
    descriptionVersion?: number;
  },
) {
  const existing = await ctx.db
    .query("cardDetails")
    .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
    .first();
  const next = { ...patch, updatedAt: Date.now() };

  if (existing) {
    await ctx.db.patch(existing._id, next);
    return;
  }

  await ctx.db.insert("cardDetails", {
    cardId,
    ...next,
  });
}

export const search = query({
  args: {
    planId: v.id("plans"),
    query: v.string(),
  },
  handler: async (ctx, { planId, query: searchQuery }) => {
    const access = await getPlanAccess(ctx, planId);
    if (!access || !searchQuery.trim()) {
      return [];
    }

    return await ctx.db
      .query("cards")
      .withSearchIndex("search_title", (q) =>
        q.search("title", searchQuery).eq("planId", planId),
      )
      .take(20);
  },
});

export const create = mutation({
  args: {
    columnId: v.id("columns"),
    planId: v.id("plans"),
    title: v.string(),
    description: v.optional(v.string()),
    priority: priorityValidator,
    dueDate: v.optional(v.number()),
    assignedUserId: v.optional(v.union(v.id("users"), v.null())),
    assignedUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (
    ctx,
    { columnId, planId, title, description, priority, dueDate, assignedUserId, assignedUserIds },
  ) => {
    const access = await requirePlanAccess(ctx, planId);
    const { userId } = access;
    const nextAssigneeIds = normalizeAssigneeIds(assignedUserIds, assignedUserId);

    if (nextAssigneeIds.length > 0) {
      requireAssignmentAccess(access.role, access.membership?.canBeAssigned ?? false);
    }

    await assertValidAssignees(
      ctx,
      planId,
      access.plan.userId,
      nextAssigneeIds,
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
      planId,
      title,
      description,
      assignedUserId: nextAssigneeIds[0] ?? null,
      assignedUserIds: nextAssigneeIds,
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
      planId,
      cardId,
      userId,
      action: "created",
      details: `Created task "${title}" in ${column?.title ?? "column"}`,
      createdAt: Date.now(),
    });

    for (const assigneeId of nextAssigneeIds) {
      await createAssignmentNotification(ctx, {
        recipientUserId: assigneeId,
        actorUserId: userId,
        planId,
        cardId,
        taskTitle: title,
      });
    }

    return cardId;
  },
});

export const normalizePlanOrders = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    await requirePlanAccess(ctx, planId);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
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
    descriptionHTML: v.optional(v.string()),
    expectedDescriptionVersion: v.optional(v.number()),
    noteContent: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
        v.null(),
      ),
    ),
    dueDate: v.optional(v.number()),
    labelIds: v.optional(v.array(v.id("labels"))),
    assignedUserId: v.optional(v.union(v.id("users"), v.null())),
    assignedUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, { cardId, ...fields }) => {
    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Task not found");
    }

    const access = await requirePlanAccess(ctx, card.planId!);
    const { userId } = access;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (fields.drawingDocument !== undefined) {
      requireProUser(access.user);
    }

    const detailPatch: {
      descriptionHTML?: string;
      noteContent?: string;
      drawingDocument?: string;
      descriptionVersion?: number;
    } = {};

    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.description !== undefined) patch.description = fields.description;
    if (fields.descriptionHTML !== undefined) {
      const currentVersion = card.descriptionVersion ?? 0;
      if (fields.expectedDescriptionVersion !== undefined && fields.expectedDescriptionVersion !== currentVersion) {
        throw new Error("Description was edited elsewhere — please reload");
      }
      const cleaned = sanitizeHtml(fields.descriptionHTML);
      detailPatch.descriptionHTML = cleaned;
      patch.descriptionHTML = undefined;
      patch.descriptionVersion = currentVersion + 1;
      detailPatch.descriptionVersion = currentVersion + 1;
      patch.description = htmlToPlainText(cleaned);
    }
    if (fields.noteContent !== undefined) {
      detailPatch.noteContent = fields.noteContent;
      patch.noteContent = undefined;
      patch.description = deriveDescriptionPreview(fields.noteContent);
    }
    if (fields.drawingDocument !== undefined) {
      detailPatch.drawingDocument = fields.drawingDocument;
      patch.drawingDocument = undefined;
    }
    if (fields.priority !== undefined) patch.priority = fields.priority ?? undefined;
    if (fields.dueDate !== undefined) patch.dueDate = fields.dueDate;
    if (fields.labelIds !== undefined) patch.labelIds = fields.labelIds;
    const hasAssigneeUpdate =
      fields.assignedUserIds !== undefined || fields.assignedUserId !== undefined;

    if (hasAssigneeUpdate) {
      const nextAssigneeIds = normalizeAssigneeIds(
        fields.assignedUserIds,
        fields.assignedUserId,
      );
      requireAssignmentAccess(access.role, access.membership?.canBeAssigned ?? false);
      await assertValidAssignees(
        ctx,
        card.planId!,
        access.plan.userId,
        nextAssigneeIds,
      );
      patch.assignedUserId = nextAssigneeIds[0] ?? null;
      patch.assignedUserIds = nextAssigneeIds;
    }

    await ctx.db.patch(cardId, patch);

    if (Object.keys(detailPatch).length > 0) {
      await patchCardDetails(ctx, cardId, detailPatch);
    }

    if (hasAssigneeUpdate) {
      const previousAssigneeIds = normalizeAssigneeIds(
        card.assignedUserIds,
        card.assignedUserId ?? null,
      );
      const nextAssigneeIds = (patch.assignedUserIds as Id<"users">[]) ?? [];
      const previousSet = new Set(previousAssigneeIds);
      const addedAssigneeIds = nextAssigneeIds.filter((id) => !previousSet.has(id));

      for (const assigneeId of addedAssigneeIds) {
      await createAssignmentNotification(ctx, {
        recipientUserId: assigneeId,
        actorUserId: userId,
        planId: card.planId!,
        cardId,
        taskTitle: fields.title ?? card.title,
      });
      }
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
              : hasAssigneeUpdate
                ? "assignee"
        : "details";

    await ctx.db.insert("activityLogs", {
      planId: card.planId!,
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

    const { userId } = await requirePlanAccess(ctx, card.planId!);
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
        planId: card.planId!,
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

    const { userId } = await requirePlanAccess(ctx, card.planId!);
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
        planId: card.planId!,
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

    const { userId } = await requirePlanAccess(ctx, card.planId!);
    const newStatus = !card.isComplete;

    await ctx.db.patch(cardId, {
      isComplete: newStatus,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      planId: card.planId!,
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

    const { userId } = await requirePlanAccess(ctx, card.planId!);
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

    const details = await ctx.db
      .query("cardDetails")
      .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
      .collect();
    for (const detail of details) {
      await ctx.db.delete(detail._id);
    }

    await ctx.db.insert("activityLogs", {
      planId: card.planId!,
      userId,
      action: "deleted",
      details: `Deleted task "${card.title}"`,
      createdAt: Date.now(),
    });

    await ctx.db.delete(cardId);
  },
});

export const migrateDetailsBatch = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 1000 }) => {
    const cards = await ctx.db.query("cards").take(limit);
    let migrated = 0;

    for (const card of cards) {
      if (!card.descriptionHTML && !card.noteContent && !card.drawingDocument) {
        continue;
      }

      await patchCardDetails(ctx, card._id, {
        descriptionHTML: card.descriptionHTML,
        noteContent: card.noteContent,
        drawingDocument: card.drawingDocument,
        descriptionVersion: card.descriptionVersion,
      });
      await ctx.db.patch(card._id, {
        descriptionHTML: undefined,
        noteContent: undefined,
        drawingDocument: undefined,
      });
      migrated += 1;
    }

    return { migrated };
  },
});
