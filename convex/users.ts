import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser, normalizeEmail } from "./helpers/boardAccess";

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
