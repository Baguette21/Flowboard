import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AccessCtx = QueryCtx | MutationCtx;

export type PlanRole = "owner" | "member";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getCurrentUser(
  ctx: AccessCtx,
): Promise<{ userId: Id<"users">; user: Doc<"users"> } | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }

  return { userId, user };
}

export async function requireCurrentUser(
  ctx: AccessCtx,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const currentUser = await getCurrentUser(ctx);
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  return currentUser;
}

export function requireProUser(user: Doc<"users">) {
  if (user.role !== "PRO") {
    throw new Error("Draw is available to Pro users only");
  }
}

export async function findUserByEmail(
  ctx: AccessCtx,
  email: string,
): Promise<Doc<"users"> | null> {
  const normalizedEmail = normalizeEmail(email);
  const exactMatches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", normalizedEmail))
    .take(5);

  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  if (normalizedEmail === email) {
    return null;
  }

  const fallbackMatches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(5);

  return fallbackMatches[0] ?? null;
}

export async function getPlanMembership(
  ctx: AccessCtx,
  planId: Id<"plans">,
  userId: Id<"users">,
): Promise<Doc<"planMembers"> | null> {
  return await ctx.db
    .query("planMembers")
    .withIndex("by_planId_and_userId", (q) =>
      q.eq("planId", planId).eq("userId", userId),
    )
    .unique();
}

export async function getPlanAccess(
  ctx: AccessCtx,
  planId: Id<"plans">,
): Promise<
  | {
      plan: Doc<"plans">;
      user: Doc<"users">;
      userId: Id<"users">;
      role: PlanRole;
      membership: Doc<"planMembers"> | null;
    }
  | null
> {
  const currentUser = await getCurrentUser(ctx);
  if (!currentUser) {
    return null;
  }

  const plan = await ctx.db.get(planId);

  if (!plan) {
    return null;
  }

  if (plan.userId === currentUser.userId) {
    return {
      ...currentUser,
      plan,
      role: "owner",
      membership: null,
    };
  }

  const membership = await getPlanMembership(ctx, planId, currentUser.userId);
  if (!membership) {
    return null;
  }

  return {
    ...currentUser,
    plan,
    role: "member",
    membership,
  };
}

export async function requirePlanAccess(
  ctx: AccessCtx,
  planId: Id<"plans">,
): Promise<{
  plan: Doc<"plans">;
  user: Doc<"users">;
  userId: Id<"users">;
  role: PlanRole;
  membership: Doc<"planMembers"> | null;
}> {
  const access = await getPlanAccess(ctx, planId);
  if (!access) {
    throw new Error("Not authorized");
  }
  return access;
}

export async function requirePlanOwner(
  ctx: AccessCtx,
  planId: Id<"plans">,
): Promise<{
  plan: Doc<"plans">;
  user: Doc<"users">;
  userId: Id<"users">;
}> {
  const access = await requirePlanAccess(ctx, planId);
  if (access.role !== "owner") {
    throw new Error("Only the plan owner can do that");
  }

  return {
    plan: access.plan,
    user: access.user,
    userId: access.userId,
  };
}
