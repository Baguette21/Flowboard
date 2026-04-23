import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  normalizeEmail,
  requireCurrentUser,
} from "./helpers/boardAccess";

const MAX_NAME_LENGTH = 60;

export const me = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      return null;
    }

    return {
      _id: currentUser.user._id,
      name: currentUser.user.name ?? null,
      email: currentUser.user.email ?? null,
      imageKey: currentUser.user.imageKey ?? null,
      role: currentUser.user.role === "PRO" ? "PRO" : "FREE",
    };
  },
});

export const emailExists = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    if (!normalizedEmail) {
      return false;
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .unique();

    return existingUser !== null;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);

    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (trimmed.length === 0) {
        throw new Error("Name cannot be empty");
      }
      if (trimmed.length > MAX_NAME_LENGTH) {
        throw new Error(`Name must be at most ${MAX_NAME_LENGTH} characters`);
      }
      await ctx.db.patch(userId, { name: trimmed });
    }

    return null;
  },
});

export const setProfileImageKey = mutation({
  args: {
    imageKey: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { imageKey }) => {
    const { userId, user } = await requireCurrentUser(ctx);
    const previousKey = user.imageKey ?? null;

    if (imageKey === null) {
      await ctx.db.patch(userId, { imageKey: undefined });
    } else {
      await ctx.db.patch(userId, { imageKey });
    }

    return { previousKey };
  },
});
