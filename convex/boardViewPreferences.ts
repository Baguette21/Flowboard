import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireBoardAccess } from "./helpers/boardAccess";

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

type BoardViewMode = (typeof defaultViewOrder)[number];

function normalizeViewOrder(value: BoardViewMode[]) {
  const seen = new Set<BoardViewMode>();
  const next = value.filter((item) => {
    if (!defaultViewOrder.includes(item) || seen.has(item)) return false;
    seen.add(item);
    return true;
  });
  return [...next, ...defaultViewOrder.filter((item) => !seen.has(item))];
}

export const get = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const { userId } = await requireBoardAccess(ctx, boardId);
    const preference = await ctx.db
      .query("boardViewPreferences")
      .withIndex("by_userId_and_boardId", (q) =>
        q.eq("userId", userId).eq("boardId", boardId),
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
    boardId: v.id("boards"),
    viewOrder: viewOrderValidator,
  },
  handler: async (ctx, { boardId, viewOrder }) => {
    const { userId } = await requireBoardAccess(ctx, boardId);
    const nextOrder = normalizeViewOrder(viewOrder);
    const existing = await ctx.db
      .query("boardViewPreferences")
      .withIndex("by_userId_and_boardId", (q) =>
        q.eq("userId", userId).eq("boardId", boardId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        viewOrder: nextOrder,
        updatedAt: Date.now(),
      });
      return null;
    }

    await ctx.db.insert("boardViewPreferences", {
      userId,
      boardId,
      viewOrder: nextOrder,
      updatedAt: Date.now(),
    });
    return null;
  },
});
