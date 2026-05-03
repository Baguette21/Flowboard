import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./helpers/planAccess";

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

async function planOwner(ctx: QueryCtx, Plan: Doc<"plans">) {
  const owner = await ctx.db.get(Plan.userId as Id<"users">);
  return {
    name: owner?.name ?? null,
    email: owner?.email ?? null,
  };
}

async function accessiblePlans(ctx: QueryCtx) {
  const current = await getCurrentUser(ctx);

  const ownedPlans = current
    ? await ctx.db
        .query("plans")
        .withIndex("by_userId", (q) => q.eq("userId", current.userId))
        .take(30)
    : [];

  const memberships = current
    ? await ctx.db
        .query("planMembers")
        .withIndex("by_userId", (q) => q.eq("userId", current.userId))
        .take(30)
    : [];

  const ownedPlanIds = new Set(ownedPlans.map((Plan) => Plan._id));
  const sharedPlans = current
    ? (
        await Promise.all(
          memberships
            .filter((membership) => !ownedPlanIds.has(membership.planId))
            .map(async (membership) => await ctx.db.get(membership.planId)),
        )
      ).filter((Plan): Plan is Doc<"plans"> => Plan !== null)
    : [];

  const previewPlans = current ? [] : await ctx.db.query("plans").order("desc").take(12);
  const plans = [...ownedPlans, ...sharedPlans, ...previewPlans]
    .filter((Plan) => !Plan.archivedAt)
    .sort(compareOrderThenUpdated);

  return { current, plans };
}

async function planPayload(
  ctx: QueryCtx,
  Plan: Doc<"plans"> | null,
  current: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  const [columns, cards, labels, memberships] = Plan
    ? await Promise.all([
        ctx.db
          .query("columns")
          .withIndex("by_planId", (q) => q.eq("planId", Plan._id))
          .take(30),
        ctx.db
          .query("cards")
          .withIndex("by_planId", (q) => q.eq("planId", Plan._id))
          .take(150),
        ctx.db
          .query("labels")
          .withIndex("by_planId", (q) => q.eq("planId", Plan._id))
          .take(80),
        ctx.db
          .query("planMembers")
          .withIndex("by_planId", (q) => q.eq("planId", Plan._id))
          .take(50),
      ])
    : [[], [], [], []];

  const memberUsers = await Promise.all(
    memberships.map(async (membership) => ({
      membership,
      user: await ctx.db.get(membership.userId),
    })),
  );
  const owner = Plan ? await ctx.db.get(Plan.userId as Id<"users">) : null;
  const assigneeUsers = [
    ...(owner
      ? [{
          membership: null,
          user: owner,
          canBeAssigned: true,
        }]
      : []),
    ...memberUsers
      .filter(({ user }) => user !== null && user!._id !== Plan?.userId)
      .map(({ membership, user }) => ({
        membership,
        user: user!,
        canBeAssigned: membership.canBeAssigned ?? true,
      })),
  ];
  const viewerMembership = current && Plan
    ? memberships.find((membership) => membership.userId === current.userId) ?? null
    : null;
  const canAssignTasks = Boolean(
    current &&
    Plan &&
    (Plan.userId === current.userId || (viewerMembership?.canBeAssigned ?? false)),
  );

  return {
    canAssignTasks,
    columns: columns.sort((a, b) => a.order.localeCompare(b.order)),
    cards: cards.sort(compareCardOrder).map((card) => ({
      ...card,
      descriptionHTML: undefined,
      noteContent: undefined,
      drawingDocument: undefined,
      commentsCount: 0,
      assignees: assigneeUsers
        .filter(({ user }) => user && card.assignedUserIds?.includes(user._id))
        .map(({ user, canBeAssigned }) => ({
          _id: user!._id,
          name: user!.name ?? null,
          email: user!.email ?? null,
          initials: initialsFor(user),
          canBeAssigned,
        })),
    })),
    labels,
    members: assigneeUsers
      .filter(({ user }) => user !== null)
      .map(({ user, canBeAssigned }) => ({
        _id: user!._id,
        name: user!.name ?? null,
        email: user!.email ?? null,
        initials: initialsFor(user),
        canBeAssigned,
      })),
  };
}

export const snapshot = query({
  args: {
    planId: v.optional(v.id("plans")),
    boardId: v.optional(v.id("boards")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { planId, boardId, search }) => {
    const { current, plans } = await accessiblePlans(ctx);
    const mappedPlanId =
      planId ??
      (boardId
        ? (
            await ctx.db
              .query("planMigrationMap")
              .withIndex("by_oldBoardId", (q) => q.eq("oldBoardId", boardId))
              .unique()
          )?.newPlanId
        : undefined);
    const selectedPlan =
      (mappedPlanId ? plans.find((Plan) => Plan._id === mappedPlanId) : null) ??
      plans.find((Plan) => Plan.isFavorite) ??
      plans[0] ??
      null;

    const payload = await planPayload(ctx, selectedPlan, current);

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

    const owners = await Promise.all(plans.map(async (Plan) => await planOwner(ctx, Plan)));
    const ownerByPlanId = new Map(plans.map((Plan, index) => [Plan._id, owners[index]]));
    const viewPreferences = current
      ? await Promise.all(
          plans.map(async (Plan) => {
            const preference = await ctx.db
              .query("planViewPreferences")
              .withIndex("by_userId_and_planId", (pref) =>
                pref.eq("userId", current.userId).eq("planId", Plan._id),
              )
              .unique();
            return [Plan._id, preference?.viewOrder ?? null] as const;
          }),
        )
      : [];
    const q = search?.trim().toLowerCase() ?? "";
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return {
      viewer: current
        ? {
            id: current.userId,
            name: current.user.name ?? null,
            email: current.user.email ?? null,
            imageKey: current.user.imageKey ?? null,
            role: current.user.role ?? "USER",
          }
        : null,
      plans: plans.map((Plan) => ({
        ...Plan,
        ownerName: ownerByPlanId.get(Plan._id)?.name ?? null,
        ownerEmail: ownerByPlanId.get(Plan._id)?.email ?? null,
      })),
      planViewOrders: Object.fromEntries(
        viewPreferences.filter((entry): entry is readonly [Id<"plans">, NonNullable<(typeof entry)[1]>] => entry[1] !== null),
      ),
      selectedPlan,
      ...payload,
      notes: notes.filter((note) => !note.archivedAt).sort(compareOrderThenUpdated).map((note) => ({
        ...note,
        content: undefined,
        contentHTML: undefined,
        drawingDocument: undefined,
      })),
      drawings: drawings.filter((drawing) => !drawing.archivedAt).sort(compareOrderThenUpdated).map((drawing) => ({
        ...drawing,
        drawingDocument: undefined,
      })),
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

export const planSnapshot = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const { plans } = await accessiblePlans(ctx);
    const selectedPlan = plans.find((Plan) => Plan._id === planId) ?? null;
    const payload = await planPayload(ctx, selectedPlan, null);
    return { selectedPlan, ...payload };
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const { plans } = await accessiblePlans(ctx);
    const q = query.trim();
    if (!q) return { plans: [], cards: [], notes: [], drawings: [] };
    const planIds = new Set(plans.map((Plan) => Plan._id));
    const planMatches = plans
      .filter((Plan) => Plan.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10);
    const cardMatches = (
      await Promise.all(
        plans.slice(0, 12).map((Plan) =>
          ctx.db
            .query("cards")
            .withSearchIndex("search_title", (s) => s.search("title", q).eq("planId", Plan._id))
            .take(8),
        ),
      )
    )
      .flat()
      .filter((card) => planIds.has(card.planId!))
      .slice(0, 30);
    return { plans: planMatches, cards: cardMatches, notes: [], drawings: [] };
  },
});

export const today = query({
  args: {},
  handler: async (ctx) => {
    const { plans } = await accessiblePlans(ctx);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);
    const cards = (
      await Promise.all(
        plans.slice(0, 12).map((Plan) =>
          ctx.db
            .query("cards")
            .withIndex("by_planId", (q) => q.eq("planId", Plan._id))
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
