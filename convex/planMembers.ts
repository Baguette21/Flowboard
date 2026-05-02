import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getPlanAccess, requirePlanAccess } from "./helpers/planAccess";
import { requirePlanOwner } from "./helpers/planAccess";

type MemberSummary = {
  userId: Id<"users">;
  name: string | null;
  email: string | null;
  imageKey: string | null;
  joinedAt: number;
  role: "owner" | "member";
  canBeAssigned: boolean;
};

export const listForPlan = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const access = await getPlanAccess(ctx, planId);
    if (!access) {
      return [];
    }

    const owner = await ctx.db.get(access.plan.userId as Id<"users">);
    const memberships = await ctx.db
      .query("planMembers")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();

    const memberUsers = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        user: await ctx.db.get(membership.userId),
      })),
    );

    const members: MemberSummary[] = [];

    if (owner) {
      members.push({
        userId: owner._id,
        name: owner.name ?? null,
        email: owner.email ?? null,
        imageKey: owner.imageKey ?? null,
        joinedAt: access.plan.createdAt,
        role: "owner",
        canBeAssigned: true,
      });
    }

    for (const entry of memberUsers) {
      if (!entry.user) {
        continue;
      }

      members.push({
        userId: entry.user._id,
        name: entry.user.name ?? null,
        email: entry.user.email ?? null,
        imageKey: entry.user.imageKey ?? null,
        joinedAt: entry.membership.joinedAt,
        role: "member",
        canBeAssigned: entry.membership.canBeAssigned ?? false,
      });
    }

    return members;
  },
});

export const setAssignable = mutation({
  args: {
    planId: v.id("plans"),
    memberUserId: v.id("users"),
    canBeAssigned: v.boolean(),
  },
  handler: async (ctx, { planId, memberUserId, canBeAssigned }) => {
    const { userId } = await requirePlanOwner(ctx, planId);
    const plan = await ctx.db.get(planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    if (plan.userId === memberUserId) {
      throw new Error("The plan owner is always assignable");
    }

    const membership = await ctx.db
      .query("planMembers")
      .withIndex("by_planId_and_userId", (q) =>
        q.eq("planId", planId).eq("userId", memberUserId),
      )
      .unique();

    if (!membership) {
      throw new Error("Member not found");
    }

    await ctx.db.patch(membership._id, { canBeAssigned });

    const member = await ctx.db.get(memberUserId);
    await ctx.db.insert("activityLogs", {
      planId,
      userId,
      action: "updated-member-permission",
      details: `${canBeAssigned ? "Enabled" : "Disabled"} task assignment for ${member?.name ?? member?.email ?? "a member"}`,
      createdAt: Date.now(),
    });
  },
});

export const leavePlan = mutation({
  args: {
    planId: v.id("plans"),
  },
  handler: async (ctx, { planId }) => {
    const access = await requirePlanAccess(ctx, planId);
    const { userId, user, plan, membership } = access;

    if (access.role === "owner") {
      throw new Error("The plan owner cannot leave their own plan");
    }

    if (!membership) {
      throw new Error("Membership not found");
    }

    const assignedCards = await ctx.db
      .query("cards")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();

    for (const card of assignedCards) {
      const nextAssignedUserIds = (card.assignedUserIds ?? []).filter(
        (assignedUserId) => assignedUserId !== userId,
      );

      if (
        card.assignedUserId === userId ||
        nextAssignedUserIds.length !== (card.assignedUserIds ?? []).length
      ) {
        await ctx.db.patch(card._id, {
          assignedUserId:
            card.assignedUserId === userId
              ? (nextAssignedUserIds[0] ?? null)
              : card.assignedUserId,
          assignedUserIds: nextAssignedUserIds,
          updatedAt: Date.now(),
        });
      }
    }

    const boardNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();

    for (const notification of boardNotifications) {
      if (notification.recipientUserId === userId || notification.actorUserId === userId) {
        await ctx.db.delete(notification._id);
      }
    }

    await ctx.db.delete(membership._id);

    await ctx.db.insert("activityLogs", {
      planId,
      userId,
      action: "left-plan",
      details: `${user.name ?? user.email ?? "A collaborator"} left the plan`,
      createdAt: Date.now(),
    });

    return { planId: plan._id };
  },
});
