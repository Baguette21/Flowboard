export const BRAND_COLORS = {
  primary: "var(--color-brand-primary)",
  accent: "var(--color-brand-accent)",
  bg: "var(--color-brand-bg)",
  text: "var(--color-brand-text)",
  dark: "var(--color-brand-dark)",
};

export const BOARD_ACCENT_COLORS = [
  "#E63B2E",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#111111",
  "#6B7280",
];

export const DEFAULT_COLUMN_TITLES = ["To Do", "In Progress", "Review", "Done"];

export const PRIORITY_LABELS = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export const PRIORITY_COLORS = {
  urgent: "#E63B2E",
  high: "#F97316",
  medium: "#EAB308",
  low: "#3B82F6",
} as const;
