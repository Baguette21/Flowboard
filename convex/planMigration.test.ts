/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("migrates boards into plans and patches dependent documents", async () => {
  const t = convexTest(schema, modules);

  const seeded = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Owner",
      email: "owner@example.com",
    });
    const memberId = await ctx.db.insert("users", {
      name: "Member",
      email: "member@example.com",
    });
    const boardId = await ctx.db.insert("boards", {
      userId,
      name: "Launch",
      slug: "launch",
      color: "#E63B2E",
      isFavorite: true,
      createdAt: 1,
      updatedAt: 2,
    });
    const columnId = await ctx.db.insert("columns", {
      boardId,
      title: "Todo",
      order: "a0",
      createdAt: 1,
    });
    const cardId = await ctx.db.insert("cards", {
      boardId,
      columnId,
      title: "Write copy",
      order: "a0",
      labelIds: [],
      isComplete: false,
      createdAt: 1,
      updatedAt: 1,
    });
    const labelId = await ctx.db.insert("labels", {
      boardId,
      name: "Launch",
      color: "red",
    });
    const inviteId = await ctx.db.insert("boardInvites", {
      boardId,
      invitedEmail: "member@example.com",
      invitedUserId: memberId,
      invitedByUserId: userId,
      status: "pending",
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.insert("boardMembers", {
      boardId,
      userId: memberId,
      invitedByUserId: userId,
      joinedAt: 1,
      canBeAssigned: true,
    });
    await ctx.db.insert("boardViewPreferences", {
      userId,
      boardId,
      viewOrder: ["board", "calendar", "table", "list", "draw"],
      updatedAt: 1,
    });
    await ctx.db.insert("activityLogs", {
      boardId,
      userId,
      action: "created",
      details: "Created board",
      createdAt: 1,
    });
    await ctx.db.insert("notifications", {
      recipientUserId: memberId,
      actorUserId: userId,
      boardId,
      cardId,
      type: "taskAssigned",
      taskTitle: "Write copy",
      isRead: false,
      createdAt: 1,
    });

    return { boardId, columnId, cardId, labelId, inviteId };
  });

  const dryRun = await t.mutation(api.planMigration.migrateNextBatch, {
    dryRun: true,
    limit: 10,
  });
  expect(dryRun.plansCreated).toBe(1);

  await t.mutation(api.planMigration.migrateNextBatch, {
    dryRun: false,
    limit: 10,
  });

  const result = await t.run(async (ctx) => {
    const mapping = await ctx.db
      .query("planMigrationMap")
      .withIndex("by_oldBoardId", (q) => q.eq("oldBoardId", seeded.boardId))
      .unique();
    expect(mapping).not.toBeNull();
    const planId = mapping!.newPlanId;
    const column = await ctx.db.get(seeded.columnId);
    const card = await ctx.db.get(seeded.cardId);
    const label = await ctx.db.get(seeded.labelId);
    const member = await ctx.db
      .query("planMembers")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .unique();
    const invite = await ctx.db
      .query("planInvites")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .unique();
    const preference = await ctx.db
      .query("planViewPreferences")
      .withIndex("by_userId_and_planId", (q) =>
        q.eq("userId", member!.invitedByUserId).eq("planId", planId),
      )
      .unique();

    return {
      planId,
      columnPlanId: column?.planId as Id<"plans"> | undefined,
      cardPlanId: card?.planId as Id<"plans"> | undefined,
      labelPlanId: label?.planId as Id<"plans"> | undefined,
      memberPlanId: member?.planId,
      invitePlanId: invite?.planId,
      viewOrder: preference?.viewOrder,
    };
  });

  expect(result.columnPlanId).toBe(result.planId);
  expect(result.cardPlanId).toBe(result.planId);
  expect(result.labelPlanId).toBe(result.planId);
  expect(result.memberPlanId).toBe(result.planId);
  expect(result.invitePlanId).toBe(result.planId);
  expect(result.viewOrder?.[0]).toBe("board");
});
