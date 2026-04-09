import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    authId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
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
    isFavorite: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"]),

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

  columns: defineTable({
    boardId: v.id("boards"),
    title: v.string(),
    order: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_boardId", ["boardId"]),

  cards: defineTable({
    columnId: v.id("columns"),
    boardId: v.id("boards"),
    title: v.string(),
    description: v.optional(v.string()),
    noteContent: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    assignedUserId: v.optional(v.union(v.id("users"), v.null())),
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
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["boardId"],
    }),

  labels: defineTable({
    boardId: v.id("boards"),
    name: v.string(),
    color: v.string(),
  }).index("by_boardId", ["boardId"]),

  cardAttachments: defineTable({
    boardId: v.id("boards"),
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
    .index("by_uploadedByUserId_and_createdAt", ["uploadedByUserId", "createdAt"]),

  activityLogs: defineTable({
    boardId: v.id("boards"),
    cardId: v.optional(v.id("cards")),
    userId: v.string(),
    action: v.string(),
    details: v.string(),
    createdAt: v.number(),
  })
    .index("by_boardId", ["boardId"])
    .index("by_cardId", ["cardId"]),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.optional(v.string()),
    drawingDocument: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  drawings: defineTable({
    userId: v.id("users"),
    title: v.string(),
    drawingDocument: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  notifications: defineTable({
    recipientUserId: v.id("users"),
    actorUserId: v.id("users"),
    boardId: v.id("boards"),
    cardId: v.optional(v.id("cards")),
    type: v.literal("taskAssigned"),
    taskTitle: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipientUserId", ["recipientUserId"])
    .index("by_recipientUserId_and_isRead", ["recipientUserId", "isRead"])
    .index("by_boardId", ["boardId"])
    .index("by_cardId", ["cardId"]),
});
