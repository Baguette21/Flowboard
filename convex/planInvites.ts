import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  findUserByEmail,
  getPlanAccess,
  getPlanMembership,
  normalizeEmail,
  requirePlanOwner,
  requireCurrentUser,
} from "./helpers/planAccess";

function generateInviteToken() {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 24; i++) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    const currentEmail = currentUser.user.email
      ? normalizeEmail(currentUser.user.email)
      : null;

    if (!currentEmail) {
      return [];
    }

    const invites = await ctx.db
      .query("planInvites")
      .withIndex("by_invitedEmail_and_status", (q) =>
        q.eq("invitedEmail", currentEmail).eq("status", "pending"),
      )
      .collect();

    const items = await Promise.all(
      invites.map(async (invite) => {
        const plan = await ctx.db.get(invite.planId);
        const inviter = await ctx.db.get(invite.invitedByUserId);
        if (!plan) {
          return null;
        }

        return {
          _id: invite._id,
          planId: plan._id,
          boardName: plan.name,
          boardColor: plan.color,
          invitedEmail: invite.invitedEmail,
          createdAt: invite.createdAt,
          invitedByName: inviter?.name ?? null,
          invitedByEmail: inviter?.email ?? null,
        };
      }),
    );

    return items
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listForPlan = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const ownerAccess = await getPlanAccess(ctx, planId);
    if (!ownerAccess || ownerAccess.role !== "owner") {
      return [];
    }

    const invites = await ctx.db
      .query("planInvites")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .collect();

    const items = await Promise.all(
      invites.map(async (invite) => {
        const invitedUser = invite.invitedUserId
          ? await ctx.db.get(invite.invitedUserId)
          : null;

        return {
          _id: invite._id,
          invitedEmail: invite.invitedEmail,
          status: invite.status,
          createdAt: invite.createdAt,
          updatedAt: invite.updatedAt,
          respondedAt: invite.respondedAt ?? null,
          invitedUserName: invitedUser?.name ?? null,
        };
      }),
    );

    return items.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    planId: v.id("plans"),
    email: v.string(),
  },
  handler: async (ctx, { planId, email }) => {
    const { plan, user, userId } = await requirePlanOwner(ctx, planId);
    const invitedEmail = normalizeEmail(email);

    if (!invitedEmail) {
      throw new Error("Enter an email address");
    }

    if (user.email && normalizeEmail(user.email) === invitedEmail) {
      throw new Error("You already own this plan");
    }

    const existingInvites = await ctx.db
      .query("planInvites")
      .withIndex("by_planId_and_invitedEmail", (q) =>
        q.eq("planId", planId).eq("invitedEmail", invitedEmail),
      )
      .collect();

    if (existingInvites.some((invite) => invite.status === "pending")) {
      throw new Error("That person already has a pending invite");
    }

    const invitedUser = await findUserByEmail(ctx, invitedEmail);
    if (invitedUser) {
      if (plan.userId === invitedUser._id) {
        throw new Error("You already own this plan");
      }

      const membership = await getPlanMembership(ctx, planId, invitedUser._id);
      if (membership) {
        throw new Error("That user already has access");
      }
    }

    const now = Date.now();
    const inviteId = await ctx.db.insert("planInvites", {
      planId,
      invitedEmail,
      invitedUserId: invitedUser?._id,
      invitedByUserId: userId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityLogs", {
      planId,
      userId,
      action: "invited",
      details: `Invited ${invitedEmail} to collaborate on "${plan.name}"`,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.smtp.sendBoardInviteEmail, {
      to: invitedEmail,
      boardName: plan.name,
      inviterName: user.name ?? null,
      inviterEmail: user.email ?? null,
    });

    return inviteId;
  },
});

export const accept = mutation({
  args: { inviteId: v.id("planInvites") },
  handler: async (ctx, { inviteId }) => {
    const { user, userId } = await requireCurrentUser(ctx);
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found");
    }

    const currentEmail = user.email ? normalizeEmail(user.email) : null;
    if (!currentEmail || currentEmail !== invite.invitedEmail) {
      throw new Error("This invite was sent to a different account");
    }

    const plan = await ctx.db.get(invite.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    if (plan.userId !== userId) {
      const membership = await getPlanMembership(ctx, invite.planId, userId);
      if (!membership) {
        await ctx.db.insert("planMembers", {
          planId: invite.planId,
          userId,
          invitedByUserId: invite.invitedByUserId,
          joinedAt: Date.now(),
          canBeAssigned: false,
        });
      }
    }

    const now = Date.now();
    await ctx.db.patch(inviteId, {
      status: "accepted",
      invitedUserId: userId,
      respondedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityLogs", {
      planId: invite.planId,
      userId,
      action: "accepted-invite",
      details: `${user.email ?? user.name ?? "A collaborator"} joined the plan`,
      createdAt: now,
    });

    return { planId: invite.planId };
  },
});

export const getLinkInfo = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const access = await getPlanAccess(ctx, planId);
    if (!access || access.role !== "owner") {
      return null;
    }
    return { inviteToken: access.plan.inviteToken ?? null };
  },
});

export const ensureLink = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const { plan } = await requirePlanOwner(ctx, planId);
    if (plan.inviteToken) {
      return { inviteToken: plan.inviteToken };
    }

    let token = generateInviteToken();
    let existing = await ctx.db
      .query("plans")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .first();
    while (existing) {
      token = generateInviteToken();
      existing = await ctx.db
        .query("plans")
        .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
        .first();
    }

    await ctx.db.patch(planId, { inviteToken: token, updatedAt: Date.now() });
    return { inviteToken: token };
  },
});

export const revokeLink = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    await requirePlanOwner(ctx, planId);
    await ctx.db.patch(planId, { inviteToken: undefined, updatedAt: Date.now() });
    return null;
  },
});

export const lookupByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) {
      return null;
    }
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .first();
    if (!plan) {
      return null;
    }

    const inviter = await ctx.db.get(plan.userId as Id<"users">);
    return {
      planId: plan._id,
      boardName: plan.name,
      boardColor: plan.color,
      boardIcon: plan.icon ?? null,
      inviterName: inviter?.name ?? null,
      inviterEmail: inviter?.email ?? null,
    };
  },
});

export const joinViaLink = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { userId, user } = await requireCurrentUser(ctx);
    if (!token) {
      throw new Error("Invalid invite link");
    }

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .first();
    if (!plan) {
      throw new Error("This invite link is no longer active");
    }

    if (plan.userId === userId) {
      return { planId: plan._id, alreadyMember: true };
    }

    const existing = await getPlanMembership(ctx, plan._id, userId);
    if (existing) {
      return { planId: plan._id, alreadyMember: true };
    }

    const now = Date.now();
    await ctx.db.insert("planMembers", {
      planId: plan._id,
      userId,
      invitedByUserId: plan.userId as Id<"users">,
      joinedAt: now,
      canBeAssigned: false,
    });

    await ctx.db.insert("activityLogs", {
      planId: plan._id,
      userId,
      action: "joined-via-link",
      details: `${user.name ?? user.email ?? "A collaborator"} joined via invite link`,
      createdAt: now,
    });

    return { planId: plan._id, alreadyMember: false };
  },
});

export const decline = mutation({
  args: { inviteId: v.id("planInvites") },
  handler: async (ctx, { inviteId }) => {
    const { user, userId } = await requireCurrentUser(ctx);
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found");
    }

    const currentEmail = user.email ? normalizeEmail(user.email) : null;
    if (!currentEmail || currentEmail !== invite.invitedEmail) {
      throw new Error("This invite was sent to a different account");
    }

    const now = Date.now();
    await ctx.db.patch(inviteId, {
      status: "declined",
      invitedUserId: userId,
      respondedAt: now,
      updatedAt: now,
    });

    return null;
  },
});
