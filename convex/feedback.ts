import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./helpers/boardAccess";

const feedbackCategoryValidator = v.union(
  v.literal("feature"),
  v.literal("improvement"),
  v.literal("bug"),
  v.literal("integration"),
  v.literal("other"),
);

const MAX_TITLE_LENGTH = 120;
const MAX_DETAILS_LENGTH = 4000;

export const submit = mutation({
  args: {
    category: feedbackCategoryValidator,
    title: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const title = args.title.trim();
    const details = args.details.trim();

    if (title.length === 0) {
      throw new Error("Feature title is required");
    }

    if (title.length > MAX_TITLE_LENGTH) {
      throw new Error(`Feature title must be at most ${MAX_TITLE_LENGTH} characters`);
    }

    if (details.length === 0) {
      throw new Error("Please describe what you want implemented");
    }

    if (details.length > MAX_DETAILS_LENGTH) {
      throw new Error(`Details must be at most ${MAX_DETAILS_LENGTH} characters`);
    }

    const now = Date.now();

    return await ctx.db.insert("feedback", {
      userId,
      category: args.category,
      title,
      details,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);

    return await ctx.db
      .query("feedback")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(25);
  },
});
