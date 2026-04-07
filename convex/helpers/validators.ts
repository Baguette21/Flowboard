import { v } from "convex/values";

export const priorityValidator = v.optional(
  v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("urgent"),
  ),
);

export const colorValidator = v.string(); // hex color

export const slugValidator = v.string(); // url-safe slug
