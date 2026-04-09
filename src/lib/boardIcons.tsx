import type { ComponentType } from "react";
import {
  Archive,
  BookOpen,
  Briefcase,
  Camera,
  CircleDollarSign,
  CheckSquare,
  Code2,
  Compass,
  Flame,
  Folder,
  Gamepad2,
  Globe2,
  Heart,
  Home,
  Image,
  KanbanSquare,
  Lightbulb,
  MessageCircle,
  MoonStar,
  NotebookPen,
  Palette,
  Plane,
  Presentation,
  Rocket,
  Shield,
  ShoppingBag,
  Sparkles,
  Sprout,
  Star,
  Target,
  Trophy,
  UtensilsCrossed,
  Wallet,
  WandSparkles,
  Workflow,
  type LucideProps,
} from "lucide-react";

export type BoardIconId =
  | "briefcase"
  | "rocket"
  | "book"
  | "palette"
  | "code"
  | "target"
  | "idea"
  | "sparkles"
  | "check"
  | "globe"
  | "camera"
  | "music"
  | "game"
  | "plant"
  | "heart"
  | "home"
  | "plane"
  | "food"
  | "money"
  | "trophy"
  | "chat"
  | "star"
  | "moon"
  | "fire"
  | "folder"
  | "kanban"
  | "notebook"
  | "compass"
  | "shield"
  | "presentation"
  | "shopping"
  | "dollar"
  | "image"
  | "archive"
  | "workflow";

export type BoardIconOption = {
  id: BoardIconId;
  label: string;
  Icon: ComponentType<LucideProps>;
};

export type BoardAccentOption = {
  id: string;
  label: string;
  color: string;
};

export const BOARD_ICON_OPTIONS: BoardIconOption[] = [
  { id: "briefcase", label: "Briefcase", Icon: Briefcase },
  { id: "folder", label: "Folder", Icon: Folder },
  { id: "kanban", label: "Kanban", Icon: KanbanSquare },
  { id: "book", label: "Book", Icon: BookOpen },
  { id: "notebook", label: "Notebook", Icon: NotebookPen },
  { id: "palette", label: "Palette", Icon: Palette },
  { id: "code", label: "Code", Icon: Code2 },
  { id: "rocket", label: "Rocket", Icon: Rocket },
  { id: "target", label: "Target", Icon: Target },
  { id: "idea", label: "Lightbulb", Icon: Lightbulb },
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "check", label: "Check Square", Icon: CheckSquare },
  { id: "workflow", label: "Workflow", Icon: Workflow },
  { id: "globe", label: "Globe", Icon: Globe2 },
  { id: "compass", label: "Compass", Icon: Compass },
  { id: "camera", label: "Camera", Icon: Camera },
  { id: "image", label: "Image", Icon: Image },
  { id: "game", label: "Gamepad", Icon: Gamepad2 },
  { id: "plant", label: "Sprout", Icon: Sprout },
  { id: "heart", label: "Heart", Icon: Heart },
  { id: "shield", label: "Shield", Icon: Shield },
  { id: "home", label: "Home", Icon: Home },
  { id: "plane", label: "Plane", Icon: Plane },
  { id: "food", label: "Utensils", Icon: UtensilsCrossed },
  { id: "shopping", label: "Shopping Bag", Icon: ShoppingBag },
  { id: "money", label: "Wallet", Icon: Wallet },
  { id: "dollar", label: "Dollar", Icon: CircleDollarSign },
  { id: "trophy", label: "Trophy", Icon: Trophy },
  { id: "presentation", label: "Presentation", Icon: Presentation },
  { id: "chat", label: "Message Circle", Icon: MessageCircle },
  { id: "star", label: "Star", Icon: Star },
  { id: "moon", label: "Moon", Icon: MoonStar },
  { id: "fire", label: "Flame", Icon: Flame },
  { id: "archive", label: "Archive", Icon: Archive },
  { id: "music", label: "Wand", Icon: WandSparkles },
];

export const DEFAULT_BOARD_ICON = BOARD_ICON_OPTIONS[0];

export const BOARD_ACCENT_OPTIONS: BoardAccentOption[] = [
  { id: "ember", label: "Ember", color: "#E63B2E" },
  { id: "flare", label: "Flare", color: "#F97316" },
  { id: "sun", label: "Sun", color: "#EAB308" },
  { id: "mint", label: "Mint", color: "#22C55E" },
  { id: "aqua", label: "Aqua", color: "#06B6D4" },
  { id: "ocean", label: "Ocean", color: "#3B82F6" },
  { id: "violet", label: "Violet", color: "#8B5CF6" },
  { id: "rose", label: "Rose", color: "#EC4899" },
  { id: "ink", label: "Ink", color: "#111111" },
  { id: "stone", label: "Stone", color: "#6B7280" },
];

export const DEFAULT_BOARD_ACCENT = BOARD_ACCENT_OPTIONS[0];

const LEGACY_ICON_COLOR_FALLBACKS: Record<string, BoardIconId> = {
  "#E63B2E": "briefcase",
  "#F97316": "rocket",
  "#3B82F6": "book",
  "#EC4899": "palette",
  "#06B6D4": "code",
  "#22C55E": "target",
  "#8B5CF6": "idea",
};

export function getBoardIconOption(icon?: string | null, color?: string | null) {
  const byId = BOARD_ICON_OPTIONS.find((option) => option.id === icon);
  if (byId) {
    return byId;
  }

  const fallbackId = color ? LEGACY_ICON_COLOR_FALLBACKS[color] : undefined;
  const byColor = BOARD_ICON_OPTIONS.find((option) => option.id === fallbackId);
  return byColor ?? DEFAULT_BOARD_ICON;
}

export function getBoardAccentOption(color?: string | null) {
  return (
    BOARD_ACCENT_OPTIONS.find((option) => option.color === color) ??
    DEFAULT_BOARD_ACCENT
  );
}
