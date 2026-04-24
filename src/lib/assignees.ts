import type { Doc, Id } from "../../convex/_generated/dataModel";

export function getAssignedUserIds(card: Doc<"cards">): Id<"users">[] {
  return card.assignedUserIds ?? (card.assignedUserId ? [card.assignedUserId] : []);
}

export function areAssignedUserIdsEqual(
  left: Id<"users">[],
  right: Id<"users">[],
) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}
