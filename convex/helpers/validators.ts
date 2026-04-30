import { v } from "convex/values";

export const priorityValidator = v.optional(
  v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("urgent"),
  ),
);

export const aiTaskDraftValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  columnId: v.optional(v.id("columns")),
  columnTitle: v.optional(v.string()),
  dueDate: v.optional(v.number()),
  priority: priorityValidator,
});

export const colorValidator = v.string(); // hex color

export const slugValidator = v.string(); // url-safe slug
