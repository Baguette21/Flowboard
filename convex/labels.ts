import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getPlanAccess, requirePlanAccess } from "./helpers/planAccess";

function normalizeLabelName(name: string) {
  return name.trim().toLowerCase();
}

async function findLabelByName(
  ctx: MutationCtx,
  planId: Id<"plans">,
  name: string,
) {
  const normalizedName = normalizeLabelName(name);
  const labels = await ctx.db
    .query("labels")
    .withIndex("by_planId", (q) => q.eq("planId", planId))
    .collect();

  return labels.find((label) => normalizeLabelName(label.name) === normalizedName) ?? null;
}

export const listByPlan = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const access = await getPlanAccess(ctx, planId);
    if (!access) {
      return [];
    }

    return await ctx.db
      .query("labels")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();
  },
});

export const create = mutation({
  args: {
    planId: v.id("plans"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, { planId, name, color }) => {
    await requirePlanAccess(ctx, planId);
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Label name is required");
    }

    const existing = await findLabelByName(ctx, planId, trimmedName);
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("labels", { planId, name: trimmedName, color });
  },
});

export const update = mutation({
  args: {
    labelId: v.id("labels"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { labelId, name, color }) => {
    const label = await ctx.db.get(labelId);
    if (!label) {
      throw new Error("Label not found");
    }

    await requirePlanAccess(ctx, label.planId!);
    const patch: Record<string, unknown> = {};
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Label name is required");
      }

      const existing = await findLabelByName(ctx, label.planId!, trimmedName);
      if (existing && existing._id !== labelId) {
        throw new Error("A label with that name already exists");
      }

      patch.name = trimmedName;
    }
    if (color !== undefined) patch.color = color;
    await ctx.db.patch(labelId, patch);
  },
});

export const remove = mutation({
  args: { labelId: v.id("labels") },
  handler: async (ctx, { labelId }) => {
    const label = await ctx.db.get(labelId);
    if (!label) {
      throw new Error("Label not found");
    }

    await requirePlanAccess(ctx, label.planId!);
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_planId", (q) => q.eq("planId", label.planId!))
      .collect();

    for (const card of cards) {
      if (card.labelIds.includes(labelId)) {
        await ctx.db.patch(card._id, {
          labelIds: card.labelIds.filter((id) => id !== labelId),
        });
      }
    }

    await ctx.db.delete(labelId);
  },
});
