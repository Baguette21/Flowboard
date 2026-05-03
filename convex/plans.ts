import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getPlanAccess,
  requirePlanAccess,
  requirePlanOwner,
  requireCurrentUser,
  requireProUser,
  type PlanRole,
} from "./helpers/planAccess";
import { generateOrderKeyAfter } from "./helpers/ordering";

const DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function buildPlanListItem(
  ctx: QueryCtx,
  plan: Doc<"plans">,
  role: PlanRole,
) {
  const owner = await ctx.db.get(plan.userId as Id<"users">);

  return {
    _id: plan._id,
    _creationTime: plan._creationTime,
    name: plan.name,
    slug: plan.slug,
    color: plan.color,
    icon: plan.icon ?? null,
    isFavorite: plan.isFavorite,
    order: plan.order ?? null,
    archivedAt: plan.archivedAt ?? null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    role,
    ownerName: owner?.name ?? null,
    ownerEmail: owner?.email ?? null,
    ownerImageKey: owner?.imageKey ?? null,
  };
}

function compareSidebarOrder(
  a: { order: string | null; updatedAt: number },
  b: { order: string | null; updatedAt: number },
): number {
  if (a.order && b.order) return a.order.localeCompare(b.order);
  if (a.order) return -1;
  if (b.order) return 1;
  return b.updatedAt - a.updatedAt;
}

async function generateUniqueSlug(
  ctx: QueryCtx,
  name: string,
  currentPlanId?: Id<"plans">,
): Promise<string> {
  let slug = slugify(name);
  const existing = await ctx.db
    .query("plans")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();

  if (existing && existing._id !== currentPlanId) {
    slug = `${slug}-${Date.now()}`;
  }

  return slug;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);

    const ownedPlans = await ctx.db
      .query("plans")
      .withIndex("by_userId", (q) => q.eq("userId", currentUser.userId))
      .collect();

    const memberships = await ctx.db
      .query("planMembers")
      .withIndex("by_userId", (q) => q.eq("userId", currentUser.userId))
      .collect();

    const ownedPlanIds = new Set(ownedPlans.map((plan) => plan._id));
    const sharedPlans = (
      await Promise.all(
        memberships
          .filter((membership) => !ownedPlanIds.has(membership.planId))
          .map(async (membership) => await ctx.db.get(membership.planId)),
      )
    ).filter((plan): plan is Doc<"plans"> => plan !== null);

    const planItems = await Promise.all([
      ...ownedPlans.map(async (plan) => await buildPlanListItem(ctx, plan, "owner")),
      ...sharedPlans.map(async (plan) => await buildPlanListItem(ctx, plan, "member")),
    ]);

    return planItems
      .filter((plan) => plan.archivedAt === null)
      .sort(compareSidebarOrder);
  },
});

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);

    const ownedPlans = await ctx.db
      .query("plans")
      .withIndex("by_userId", (q) => q.eq("userId", currentUser.userId))
      .collect();

    const planItems = await Promise.all(
      ownedPlans.map(async (plan) => await buildPlanListItem(ctx, plan, "owner")),
    );

    return planItems
      .filter((plan) => plan.archivedAt !== null)
      .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
  },
});

export const reorder = mutation({
  args: {
    orders: v.array(
      v.object({ planId: v.id("plans"), order: v.string() }),
    ),
  },
  handler: async (ctx, { orders }) => {
    const { userId } = await requireCurrentUser(ctx);
    for (const { planId, order } of orders) {
      const plan = await ctx.db.get(planId);
      if (!plan || plan.userId !== userId) continue;
      await ctx.db.patch(planId, { order });
    }
  },
});

export const get = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const access = await getPlanAccess(ctx, planId);
    return access?.plan ?? null;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!plan) {
      return null;
    }

    const access = await getPlanAccess(ctx, plan._id);
    return access?.plan ?? null;
  },
});

export const getAccessInfo = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const access = await getPlanAccess(ctx, planId);
    if (!access) {
      return null;
    }

    const owner = await ctx.db.get(access.plan.userId as Id<"users">);
    const members = await ctx.db
      .query("planMembers")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();

    return {
      role: access.role,
      isOwner: access.role === "owner",
      canManageAssignees:
        access.role === "owner" || (access.membership?.canBeAssigned ?? false),
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
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { name, color, icon }) => {
    const { userId } = await requireCurrentUser(ctx);
    const now = Date.now();
    const slug = await generateUniqueSlug(ctx, name);

    const planId = await ctx.db.insert("plans", {
      userId,
      name,
      slug,
      color: color ?? "#E8E4DD",
      icon,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });

    let order: string | null = null;
    for (const title of DEFAULT_COLUMNS) {
      order = generateOrderKeyAfter(order);
      await ctx.db.insert("columns", {
        planId,
        title,
        order,
        createdAt: now,
      });
    }

    await ctx.db.insert("activityLogs", {
      planId,
      userId,
      action: "created",
      details: `Created plan "${name}"`,
      createdAt: now,
    });

    return planId;
  },
});

export const update = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
    archivedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { planId, name, color, icon, drawingDocument, isFavorite, archivedAt }) => {
    const { plan, user, userId, role } = await requirePlanAccess(ctx, planId);
    if (archivedAt !== undefined && role !== "owner") {
      throw new Error("Only the plan owner can archive this plan");
    }

    if (drawingDocument !== undefined) {
      requireProUser(user);
    }

    const patch: Partial<Doc<"plans">> = {
      updatedAt: Date.now(),
    };

    if (name !== undefined) {
      patch.name = name;
      patch.slug = await generateUniqueSlug(ctx, name, planId);
    }

    if (color !== undefined) {
      patch.color = color;
    }

    if (icon !== undefined) {
      patch.icon = icon;
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

    await ctx.db.patch(planId, patch);

    let details = "Updated plan settings";
    if (name !== undefined && name !== plan.name) {
      details = `Renamed plan to "${name}"`;
    } else if (icon !== undefined && icon !== (plan.icon ?? undefined)) {
      details = "Changed plan icon";
    } else if (color !== undefined && color !== plan.color) {
      details = "Changed plan color";
    } else if (isFavorite !== undefined && isFavorite !== plan.isFavorite) {
      details = isFavorite ? "Marked plan as favorite" : "Removed plan from favorites";
    } else if (archivedAt !== undefined) {
      details = archivedAt === null ? "Restored plan from archive" : "Archived plan";
    }

    await ctx.db.insert("activityLogs", {
      planId,
      userId,
      action: "updated",
      details,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    await requirePlanOwner(ctx, planId);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();
    for (const card of cards) {
      const details = await ctx.db
        .query("cardDetails")
        .withIndex("by_cardId", (q) => q.eq("cardId", card._id))
        .collect();
      for (const detail of details) {
        await ctx.db.delete(detail._id);
      }
      await ctx.db.delete(card._id);
    }

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();
    for (const column of columns) {
      await ctx.db.delete(column._id);
    }

    const labels = await ctx.db
      .query("labels")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();
    for (const label of labels) {
      await ctx.db.delete(label._id);
    }

    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    const members = await ctx.db
      .query("planMembers")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const invites = await ctx.db
      .query("planInvites")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    await ctx.db.delete(planId);
  },
});
