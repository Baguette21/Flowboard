import type { Id } from "@convex/_generated/dataModel";
import type { MobileData } from "@/types";

const planId = "demoBoard" as Id<"plans">;
const brandId = "demoBrand" as Id<"plans">;
const backlogId = "todo" as Id<"columns">;
const progressId = "progress" as Id<"columns">;
const reviewId = "review" as Id<"columns">;
const doneId = "done" as Id<"columns">;

export const fallbackData: MobileData = {
  viewer: null,
  plans: [
    { _id: planId, name: "Launch Plan", color: "#E63B2E", isFavorite: true, updatedAt: Date.now(), ownerName: "Preview" },
    { _id: brandId, name: "Brand Kit", color: "#6B4FB8", isFavorite: true, updatedAt: Date.now(), ownerName: "Preview" },
  ],
  selectedPlan: { _id: planId, name: "Launch Plan", color: "#E63B2E", isFavorite: true },
  columns: [
    { _id: backlogId, title: "Backlog", order: "a0", color: "ink" },
    { _id: progressId, title: "In progress", order: "a1", color: "amber" },
    { _id: reviewId, title: "Review", order: "a2", color: "violet" },
    { _id: doneId, title: "Done", order: "a3", color: "green" },
  ],
  cards: [
    { _id: "c1" as Id<"cards">, planId, columnId: backlogId, title: "Audit competitor onboarding flows", description: "Map the first-run screens and note conversion points.", labelIds: ["l1" as Id<"labels">], assignedUserIds: [], assignees: [], order: "a0", priority: "low", isComplete: false },
    { _id: "c2" as Id<"cards">, planId, columnId: progressId, title: "Ship onboarding rewrite v2", description: "Make auth, OTP, and empty states land on real workspace data.", labelIds: ["l2" as Id<"labels">], assignedUserIds: ["u1" as Id<"users">], assignees: [{ _id: "u1" as Id<"users">, name: "Eugene Cabrera", email: "eugene@example.com", initials: "EC", canBeAssigned: true }], commentsCount: 4, order: "a0", priority: "high", dueDate: Date.now(), isComplete: false },
    { _id: "c3" as Id<"cards">, planId, columnId: progressId, title: "Polish empty-state illustration set", labelIds: ["l3" as Id<"labels">], assignedUserIds: [], assignees: [], order: "a1", priority: "medium", isComplete: false },
    { _id: "c4" as Id<"cards">, planId, columnId: reviewId, title: "Auth: error copy + reduced motion", labelIds: ["l4" as Id<"labels">], assignedUserIds: [], assignees: [], commentsCount: 7, order: "a0", priority: "medium", isComplete: false },
    { _id: "c5" as Id<"cards">, planId, columnId: doneId, title: "Set up Convex schema for plans", labelIds: ["l5" as Id<"labels">], assignedUserIds: [], assignees: [], order: "a0", priority: "low", isComplete: true },
  ],
  labels: [
    { _id: "l1" as Id<"labels">, planId, name: "Research", color: "blue" },
    { _id: "l2" as Id<"labels">, planId, name: "Launch", color: "red" },
    { _id: "l3" as Id<"labels">, planId, name: "Design", color: "rose" },
    { _id: "l4" as Id<"labels">, planId, name: "Auth", color: "violet" },
    { _id: "l5" as Id<"labels">, planId, name: "Done", color: "green" },
  ],
  members: [
    { _id: "u1" as Id<"users">, name: "Eugene Cabrera", email: "eugene@example.com", initials: "EC", canBeAssigned: true },
    { _id: "u2" as Id<"users">, name: "Mira Reyes", email: "mira@example.com", initials: "MR", canBeAssigned: true },
  ],
  notes: [
    { _id: "n1" as Id<"notes">, title: "Onboarding flow rewrite", content: "Trim the welcome screen to two screens. Move workspace creation inline.", updatedAt: Date.now() },
    { _id: "n2" as Id<"notes">, title: "Garden journal - week 18", content: "Tomatoes are doing well. Repot basil before Saturday.", updatedAt: Date.now() },
  ],
  drawings: [
    { _id: "d1" as Id<"drawings">, title: "Site map", updatedAt: Date.now() },
    { _id: "d2" as Id<"drawings">, title: "Logo sketches", updatedAt: Date.now() },
  ],
  notifications: [{ _id: "sample" as Id<"notifications">, taskTitle: "Ship onboarding rewrite v2", createdAt: Date.now(), isRead: false }],
  searchResults: [],
  todayCards: [],
};
