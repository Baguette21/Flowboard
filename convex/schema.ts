import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    authId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    imageKey: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("USER"), v.literal("PRO"))),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_authId", ["authId"]),

  boards: defineTable({
    userId: v.string(),
    name: v.string(),
    slug: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    isFavorite: v.boolean(),
    order: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    inviteToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_inviteToken", ["inviteToken"]),

  plans: defineTable({
    userId: v.string(),
    name: v.string(),
    slug: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    isFavorite: v.boolean(),
    order: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    inviteToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_inviteToken", ["inviteToken"]),

  planMigrationMap: defineTable({
    oldBoardId: v.id("boards"),
    newPlanId: v.id("plans"),
    migratedAt: v.number(),
  })
    .index("by_oldBoardId", ["oldBoardId"])
    .index("by_newPlanId", ["newPlanId"]),

  boardMembers: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    invitedByUserId: v.id("users"),
    joinedAt: v.number(),
    canBeAssigned: v.optional(v.boolean()),
  })
    .index("by_boardId", ["boardId"])
    .index("by_userId", ["userId"])
    .index("by_boardId_and_userId", ["boardId", "userId"]),

  planMembers: defineTable({
    planId: v.id("plans"),
    userId: v.id("users"),
    invitedByUserId: v.id("users"),
    joinedAt: v.number(),
    canBeAssigned: v.optional(v.boolean()),
  })
    .index("by_planId", ["planId"])
    .index("by_userId", ["userId"])
    .index("by_planId_and_userId", ["planId", "userId"]),

  boardViewPreferences: defineTable({
    userId: v.id("users"),
    boardId: v.id("boards"),
    viewOrder: v.array(
      v.union(
        v.literal("board"),
        v.literal("calendar"),
        v.literal("table"),
        v.literal("list"),
        v.literal("draw"),
      ),
    ),
    updatedAt: v.number(),
  })
    .index("by_userId_and_boardId", ["userId", "boardId"])
    .index("by_boardId", ["boardId"]),

  planViewPreferences: defineTable({
    userId: v.id("users"),
    planId: v.id("plans"),
    viewOrder: v.array(
      v.union(
        v.literal("board"),
        v.literal("calendar"),
        v.literal("table"),
        v.literal("list"),
        v.literal("draw"),
      ),
    ),
    updatedAt: v.number(),
  }).index("by_userId_and_planId", ["userId", "planId"]),

  boardInvites: defineTable({
    boardId: v.id("boards"),
    invitedEmail: v.string(),
    invitedUserId: v.optional(v.id("users")),
    invitedByUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_boardId", ["boardId"])
    .index("by_boardId_and_invitedEmail", ["boardId", "invitedEmail"])
    .index("by_invitedEmail_and_status", ["invitedEmail", "status"])
    .index("by_boardId_and_status", ["boardId", "status"]),

  planInvites: defineTable({
    planId: v.id("plans"),
    invitedEmail: v.string(),
    invitedUserId: v.optional(v.id("users")),
    invitedByUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_planId", ["planId"])
    .index("by_planId_and_invitedEmail", ["planId", "invitedEmail"])
    .index("by_invitedEmail_and_status", ["invitedEmail", "status"])
    .index("by_planId_and_status", ["planId", "status"]),

  columns: defineTable({
    boardId: v.optional(v.id("boards")),
    planId: v.optional(v.id("plans")),
    title: v.string(),
    order: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_boardId", ["boardId"])
    .index("by_planId", ["planId"]),

  cards: defineTable({
    columnId: v.id("columns"),
    boardId: v.optional(v.id("boards")),
    planId: v.optional(v.id("plans")),
    title: v.string(),
    description: v.optional(v.string()),
    descriptionHTML: v.optional(v.string()),
    descriptionVersion: v.optional(v.number()),
    noteContent: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    assignedUserId: v.optional(v.union(v.id("users"), v.null())),
    assignedUserIds: v.optional(v.array(v.id("users"))),
    order: v.string(),
    labelIds: v.array(v.id("labels")),
    dueDate: v.optional(v.number()),
    isComplete: v.boolean(),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_columnId", ["columnId"])
    .index("by_boardId", ["boardId"])
    .index("by_planId", ["planId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["boardId", "planId"],
    }),

  cardDetails: defineTable({
    cardId: v.id("cards"),
    descriptionHTML: v.optional(v.string()),
    noteContent: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    descriptionVersion: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_cardId", ["cardId"]),

  labels: defineTable({
    boardId: v.optional(v.id("boards")),
    planId: v.optional(v.id("plans")),
    name: v.string(),
    color: v.string(),
  })
    .index("by_boardId", ["boardId"])
    .index("by_planId", ["planId"]),

  cardAttachments: defineTable({
    boardId: v.optional(v.id("boards")),
    planId: v.optional(v.id("plans")),
    cardId: v.id("cards"),
    key: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    uploadedByUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_cardId", ["cardId"])
    .index("by_boardId", ["boardId"])
    .index("by_planId", ["planId"])
    .index("by_uploadedByUserId_and_createdAt", ["uploadedByUserId", "createdAt"]),

  activityLogs: defineTable({
    boardId: v.optional(v.id("boards")),
    planId: v.optional(v.id("plans")),
    cardId: v.optional(v.id("cards")),
    userId: v.string(),
    action: v.string(),
    details: v.string(),
    createdAt: v.number(),
  })
    .index("by_boardId", ["boardId"])
    .index("by_planId", ["planId"])
    .index("by_cardId", ["cardId"]),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.optional(v.string()),
    contentHTML: v.optional(v.string()),
    contentVersion: v.optional(v.number()),
    drawingDocument: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
    order: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  noteDetails: defineTable({
    noteId: v.id("notes"),
    content: v.optional(v.string()),
    contentHTML: v.optional(v.string()),
    contentVersion: v.optional(v.number()),
    drawingDocument: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_noteId", ["noteId"]),

  drawings: defineTable({
    userId: v.id("users"),
    title: v.string(),
    drawingDocument: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
    order: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  notifications: defineTable({
    recipientUserId: v.id("users"),
    actorUserId: v.id("users"),
    boardId: v.optional(v.id("boards")),
    planId: v.optional(v.id("plans")),
    cardId: v.optional(v.id("cards")),
    type: v.literal("taskAssigned"),
    taskTitle: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipientUserId", ["recipientUserId"])
    .index("by_recipientUserId_and_isRead", ["recipientUserId", "isRead"])
    .index("by_boardId", ["boardId"])
    .index("by_planId", ["planId"])
    .index("by_cardId", ["cardId"]),

  feedback: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("feature"),
      v.literal("improvement"),
      v.literal("bug"),
      v.literal("integration"),
      v.literal("other"),
    ),
    title: v.string(),
    details: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("reviewing"),
      v.literal("planned"),
      v.literal("closed"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_category", ["category"])
    .index("by_status", ["status"]),
});
