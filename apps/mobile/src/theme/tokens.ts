import type { Tint } from "@/types";

export const palette = {
  paperBg: "#F5F3EE",
  paperPanel: "#E8E4DD",
  paperPanelDeep: "#DCD7CD",
  sheet: "#FFFCF6",
  ink: "#111111",
  muted: "rgba(0,0,0,0.56)",
  subtle: "rgba(0,0,0,0.36)",
  whisper: "rgba(0,0,0,0.08)",
  whisperStrong: "rgba(0,0,0,0.16)",
  accent: "#E63B2E",
  accentTint: "rgba(230,59,46,0.12)",
  darkBg: "#15130F",
  darkPanel: "#211E19",
  darkSheet: "#2B2720",
  darkInk: "#EEE8DE",
  darkMuted: "rgba(238,232,222,0.62)",
  darkWhisper: "rgba(238,232,222,0.12)",
  tints: {
    red: { fg: "#C8392E", bg: "rgba(230,59,46,0.14)" },
    amber: { fg: "#A87011", bg: "rgba(212,155,30,0.18)" },
    green: { fg: "#2E8B57", bg: "rgba(46,139,87,0.16)" },
    teal: { fg: "#1F7A7A", bg: "rgba(31,122,122,0.15)" },
    blue: { fg: "#2C6EBE", bg: "rgba(44,110,190,0.14)" },
    violet: { fg: "#6B4FB8", bg: "rgba(107,79,184,0.15)" },
    rose: { fg: "#B6437A", bg: "rgba(182,67,122,0.14)" },
    ink: { fg: "#1A1A1A", bg: "rgba(0,0,0,0.08)" },
  } satisfies Record<Tint, { fg: string; bg: string }>,
} as const;

export type MobilePalette = {
  accent: string;
  background: string;
  panel: string;
  text: string;
};

export type MobileAppearancePreset = {
  id: "classic" | "graphite" | "paper" | "terminal" | "slate" | "custom";
  name: string;
  description: string;
  light: MobilePalette;
  dark: MobilePalette;
};

export const mobileAppearancePresets: MobileAppearancePreset[] = [
  {
    id: "classic",
    name: "Classic",
    description: "PlanThing's built-in light and dark theme.",
    light: { accent: palette.accent, background: palette.paperBg, panel: palette.paperPanel, text: palette.ink },
    dark: { accent: "#F05C4F", background: "#161215", panel: "#26222B", text: "#F2EDF5" },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Neutral gray with low-saturation accents.",
    light: { accent: "#6B7280", background: "#F2F2F0", panel: "#E5E5E2", text: "#1C1C1A" },
    dark: { accent: "#9CA3AF", background: "#111111", panel: "#1F1F1F", text: "#E5E5E5" },
  },
  {
    id: "paper",
    name: "Paper",
    description: "Soft document tones with a blue action color.",
    light: { accent: "#2563EB", background: "#F8F6F1", panel: "#ECE8DD", text: "#1D1B16" },
    dark: { accent: "#7CA7FF", background: "#171A20", panel: "#212530", text: "#F4EFE5" },
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Mono text and green accent.",
    light: { accent: "#15803D", background: "#F4F8F1", panel: "#E4ECDF", text: "#132017" },
    dark: { accent: "#22C55E", background: "#0F1411", panel: "#1A211C", text: "#E7F3EA" },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Cool system UI with a clear cyan accent.",
    light: { accent: "#0891B2", background: "#F3F6F8", panel: "#E1E7EC", text: "#111827" },
    dark: { accent: "#22D3EE", background: "#101820", panel: "#1B2530", text: "#EAF2F8" },
  },
  {
    id: "custom",
    name: "Custom",
    description: "Your own light and dark palettes.",
    light: { accent: palette.accent, background: palette.paperBg, panel: palette.paperPanel, text: palette.ink },
    dark: { accent: "#F05C4F", background: "#161215", panel: "#26222B", text: "#F2EDF5" },
  },
];

export function makeTheme(dark: boolean, custom?: Partial<MobilePalette>) {
  const current = custom ?? {};
  return {
    bg: current.background ?? (dark ? palette.darkBg : palette.paperBg),
    panel: current.panel ?? (dark ? palette.darkPanel : palette.paperPanel),
    panelDeep: dark ? palette.darkSheet : palette.paperPanelDeep,
    sheet: dark ? palette.darkSheet : palette.sheet,
    ink: current.text ?? (dark ? palette.darkInk : palette.ink),
    muted: dark ? palette.darkMuted : palette.muted,
    subtle: dark ? "rgba(238,232,222,0.38)" : palette.subtle,
    whisper: dark ? palette.darkWhisper : palette.whisper,
    whisperStrong: dark ? "rgba(238,232,222,0.2)" : palette.whisperStrong,
    accent: current.accent ?? palette.accent,
    accentTint: dark ? "rgba(230,59,46,0.2)" : palette.accentTint,
    dark,
  };
}

export type AppTheme = ReturnType<typeof makeTheme>;

export function tintFrom(value?: string | null, fallback: Tint = "red"): Tint {
  const lower = value?.toLowerCase() ?? "";
  if (lower.includes("6b") || lower.includes("violet")) return "violet";
  if (lower.includes("2e8") || lower.includes("green")) return "green";
  if (lower.includes("2c6") || lower.includes("blue")) return "blue";
  if (lower.includes("a8") || lower.includes("amber")) return "amber";
  if (lower.includes("1f") || lower.includes("teal")) return "teal";
  if (lower.includes("rose")) return "rose";
  if (lower.includes("ink")) return "ink";
  return fallback;
}
