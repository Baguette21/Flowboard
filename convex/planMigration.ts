import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const viewOrderValues = ["board", "calendar", "table", "list", "draw"] as const;

function normalizeViewOrder(value: unknown) {
  const seen = new Set<(typeof viewOrderValues)[number]>();
  const parsed = Array.isArray(value) ? value : [];
  for (const item of parsed) {
    if (viewOrderValues.includes(item) && !seen.has(item)) {
      seen.add(item);
    }
  }
  return [
    ...seen,
    ...viewOrderValues.filter((item) => !seen.has(item)),
  ];
}

async function findMappedPlanId(
  ctx: MutationCtx,
  oldBoardId: Id<"boards">,
) {
  const mapping = await ctx.db
    .query("planMigrationMap")
    .withIndex("by_oldBoardId", (q) => q.eq("oldBoardId", oldBoardId))
    .unique();
  return mapping?.newPlanId ?? null;
}

export const status = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const boards = await ctx.db.query("boards").take(limit);
    let unmigratedBoards = 0;

    for (const board of boards) {
      const mapping = await ctx.db
        .query("planMigrationMap")
        .withIndex("by_oldBoardId", (q) => q.eq("oldBoardId", board._id))
        .unique();
      if (!mapping) {
        unmigratedBoards += 1;
      }
    }

    return {
      checkedBoards: boards.length,
      unmigratedBoards,
      hasMoreToCheck: boards.length === limit,
    };
  },
});

export const migrateNextBatch = mutation({
  args: {
    limit: v.optional(v.number()),
    scanLimit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { limit = 10, scanLimit = 200, dryRun = true }) => {
    const candidateBoards = await ctx.db.query("boards").take(scanLimit);
    const now = Date.now();
    let plansCreated = 0;
    let existingMappings = 0;
    let documentsPatched = 0;
    let checkedBoards = 0;

    for (const board of candidateBoards) {
      if (checkedBoards >= limit) {
        break;
      }
      let planId = await findMappedPlanId(ctx, board._id);
      if (planId) {
        existingMappings += 1;
        continue;
      }

      checkedBoards += 1;

      if (!dryRun) {
        planId = await ctx.db.insert("plans", {
          userId: board.userId,
          name: board.name,
          slug: board.slug,
          color: board.color,
          icon: board.icon,
          drawingDocument: board.drawingDocument,
          isFavorite: board.isFavorite,
          order: board.order,
          archivedAt: board.archivedAt,
          inviteToken: board.inviteToken,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt,
        });
        await ctx.db.insert("planMigrationMap", {
          oldBoardId: board._id,
          newPlanId: planId,
          migratedAt: now,
        });
        plansCreated += 1;
      } else {
        plansCreated += 1;
        continue;
      }

      if (dryRun) {
        continue;
      }

      const columns = await ctx.db
        .query("columns")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const column of columns) {
        if (column.planId !== planId) {
          await ctx.db.patch(column._id, { planId });
          documentsPatched += 1;
        }
      }

      const cards = await ctx.db
        .query("cards")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const card of cards) {
        if (card.planId !== planId) {
          await ctx.db.patch(card._id, { planId });
          documentsPatched += 1;
        }
      }

      const labels = await ctx.db
        .query("labels")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const label of labels) {
        if (label.planId !== planId) {
          await ctx.db.patch(label._id, { planId });
          documentsPatched += 1;
        }
      }

      const attachments = await ctx.db
        .query("cardAttachments")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const attachment of attachments) {
        if (attachment.planId !== planId) {
          await ctx.db.patch(attachment._id, { planId });
          documentsPatched += 1;
        }
      }

      const logs = await ctx.db
        .query("activityLogs")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const log of logs) {
        if (log.planId !== planId) {
          await ctx.db.patch(log._id, { planId });
          documentsPatched += 1;
        }
      }

      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const notification of notifications) {
        if (notification.planId !== planId) {
          await ctx.db.patch(notification._id, { planId });
          documentsPatched += 1;
        }
      }

      const members = await ctx.db
        .query("boardMembers")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const member of members) {
        const existing = await ctx.db
          .query("planMembers")
          .withIndex("by_planId_and_userId", (q) =>
            q.eq("planId", planId).eq("userId", member.userId),
          )
          .unique();
        if (!existing) {
          await ctx.db.insert("planMembers", {
            planId,
            userId: member.userId,
            invitedByUserId: member.invitedByUserId,
            joinedAt: member.joinedAt,
            canBeAssigned: member.canBeAssigned,
          });
          documentsPatched += 1;
        }
      }

      const invites = await ctx.db
        .query("boardInvites")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const invite of invites) {
        const existing = await ctx.db
          .query("planInvites")
          .withIndex("by_planId_and_invitedEmail", (q) =>
            q.eq("planId", planId).eq("invitedEmail", invite.invitedEmail),
          )
          .first();
        if (!existing) {
          await ctx.db.insert("planInvites", {
            planId,
            invitedEmail: invite.invitedEmail,
            invitedUserId: invite.invitedUserId,
            invitedByUserId: invite.invitedByUserId,
            status: invite.status,
            createdAt: invite.createdAt,
            updatedAt: invite.updatedAt,
            respondedAt: invite.respondedAt,
          });
          documentsPatched += 1;
        }
      }

      const preferences = await ctx.db
        .query("boardViewPreferences")
        .withIndex("by_boardId", (q) => q.eq("boardId", board._id))
        .take(1000);
      for (const preference of preferences) {
        const existing = await ctx.db
          .query("planViewPreferences")
          .withIndex("by_userId_and_planId", (q) =>
            q.eq("userId", preference.userId).eq("planId", planId),
          )
          .unique();
        if (!existing) {
          await ctx.db.insert("planViewPreferences", {
            userId: preference.userId,
            planId,
            viewOrder: normalizeViewOrder(preference.viewOrder),
            updatedAt: preference.updatedAt,
          });
          documentsPatched += 1;
        }
      }
    }

    return {
      dryRun,
      scannedBoards: candidateBoards.length,
      checkedBoards,
      plansCreated,
      existingMappings,
      documentsPatched,
    };
  },
});
