import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./helpers/planAccess";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipientUserId", (q) => q.eq("recipientUserId", userId))
      .order("desc")
      .take(50);

    return await Promise.all(
      notifications.map(async (notification) => {
        const actor = await ctx.db.get(notification.actorUserId);
        const Plan = await ctx.db.get(notification.planId!);

        return {
          _id: notification._id,
          type: notification.type,
          taskTitle: notification.taskTitle,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          planId: notification.planId!,
          boardName: Plan?.name ?? "Plan",
          boardColor: Plan?.color ?? "#111111",
          actorName: actor?.name ?? null,
          actorEmail: actor?.email ?? null,
        };
      }),
    );
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const { userId } = await requireCurrentUser(ctx);
    const notification = await ctx.db.get(notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.recipientUserId !== userId) {
      throw new Error("Not authorized");
    }

    if (!notification.isRead) {
      await ctx.db.patch(notificationId, { isRead: true });
    }
  },
});
