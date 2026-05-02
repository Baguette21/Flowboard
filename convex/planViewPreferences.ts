import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePlanAccess } from "./helpers/planAccess";

const viewOrderValidator = v.array(
  v.union(
    v.literal("board"),
    v.literal("calendar"),
    v.literal("table"),
    v.literal("list"),
    v.literal("draw"),
  ),
);

const defaultViewOrder = ["board", "calendar", "table", "list", "draw"] as const;

type PlanViewMode = (typeof defaultViewOrder)[number];

function normalizeViewOrder(value: PlanViewMode[]) {
  const seen = new Set<PlanViewMode>();
  const next = value.filter((item) => {
    if (!defaultViewOrder.includes(item) || seen.has(item)) return false;
    seen.add(item);
    return true;
  });
  return [...next, ...defaultViewOrder.filter((item) => !seen.has(item))];
}

export const get = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const { userId } = await requirePlanAccess(ctx, planId);
    const preference = await ctx.db
      .query("planViewPreferences")
      .withIndex("by_userId_and_planId", (q) =>
        q.eq("userId", userId).eq("planId", planId),
      )
      .unique();

    return {
      hasPreference: preference !== null,
      viewOrder: preference
        ? normalizeViewOrder(preference.viewOrder)
        : [...defaultViewOrder],
    };
  },
});

export const set = mutation({
  args: {
    planId: v.id("plans"),
    viewOrder: viewOrderValidator,
  },
  handler: async (ctx, { planId, viewOrder }) => {
    const { userId } = await requirePlanAccess(ctx, planId);
    const nextOrder = normalizeViewOrder(viewOrder);
    const existing = await ctx.db
      .query("planViewPreferences")
      .withIndex("by_userId_and_planId", (q) =>
        q.eq("userId", userId).eq("planId", planId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        viewOrder: nextOrder,
        updatedAt: Date.now(),
      });
      return null;
    }

    await ctx.db.insert("planViewPreferences", {
      userId,
      planId,
      viewOrder: nextOrder,
      updatedAt: Date.now(),
    });
    return null;
  },
});
