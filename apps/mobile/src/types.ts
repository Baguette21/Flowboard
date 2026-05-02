import type { Id } from "@convex/_generated/dataModel";

export type Tint = "red" | "amber" | "green" | "teal" | "blue" | "violet" | "rose" | "ink";

export type ScreenKey =
  | "welcome"
  | "signin"
  | "signup"
  | "otp"
  | "empty"
  | "homeMixed"
  | "homeTabs"
  | "homeToday"
  | "create"
  | "boardList"
  | "boardCalendar"
  | "boardTable"
  | "boardSwipe"
  | "boardSingle"
  | "boardStacked"
  | "boardDrag"
  | "boardLongPress"
  | "boardSettings"
  | "taskSheet"
  | "taskFull"
  | "taskAssign"
  | "notesList"
  | "noteEditor"
  | "noteFocused"
  | "drawingsList"
  | "drawCanvas"
  | "search"
  | "searchBlank"
  | "inbox"
  | "settings"
  | "profile";

export type MobilePlan = {
  _id: Id<"plans">;
  name: string;
  color?: string | null;
  isFavorite?: boolean;
  updatedAt?: number;
  ownerName?: string | null;
  ownerEmail?: string | null;
};

export type MobileColumn = {
  _id: Id<"columns">;
  title: string;
  color?: string | null;
  order?: string;
};

export type MobileCard = {
  _id: Id<"cards">;
  planId: Id<"plans">;
  columnId: Id<"columns">;
  title: string;
  description?: string;
  descriptionHTML?: string;
  descriptionVersion?: number;
  noteContent?: string;
  labelIds?: Id<"labels">[];
  assignedUserId?: Id<"users"> | null;
  assignedUserIds?: Id<"users">[];
  assignees?: MobileMember[];
  commentsCount?: number;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  dueDate?: number;
  isComplete?: boolean;
  order?: string;
  createdAt?: number;
  updatedAt?: number;
};

export type MobileNote = {
  _id: Id<"notes">;
  title: string;
  content?: string;
  contentHTML?: string;
  contentVersion?: number;
  updatedAt?: number;
};

export type MobileDrawing = {
  _id: Id<"drawings">;
  title: string;
  updatedAt?: number;
};

export type MobileLabel = {
  _id: Id<"labels">;
  planId: Id<"plans">;
  name: string;
  color: string;
};

export type MobileMember = {
  _id: Id<"users">;
  name?: string | null;
  email?: string | null;
  initials: string;
  canBeAssigned?: boolean;
};

export type MobileNotification = {
  _id: Id<"notifications">;
  taskTitle: string;
  createdAt?: number;
  isRead?: boolean;
};

export type MobileData = {
  viewer: {
    id?: Id<"users">;
    name?: string | null;
    email?: string | null;
    imageKey?: string | null;
    role?: string | null;
  } | null;
  plans: MobilePlan[];
  planViewOrders?: Record<string, Array<"board" | "calendar" | "table" | "list" | "draw">>;
  selectedPlan: MobilePlan | null;
  columns: MobileColumn[];
  cards: MobileCard[];
  labels: MobileLabel[];
  members: MobileMember[];
  notes: MobileNote[];
  drawings: MobileDrawing[];
  notifications: MobileNotification[];
  searchResults?: MobileCard[];
  todayCards?: MobileCard[];
};

export type MobileDataStatus = "loading" | "live" | "fallback" | "unauthenticated";
