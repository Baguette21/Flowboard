import { useEffect, useState } from "react";

const APPEARANCE_STORAGE_KEY = "planthing.appearance";

export type AppFont = "inter" | "system" | "serif" | "mono";
export type AppearanceMode = "light" | "dark";

export interface AppearancePalette {
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
}

export interface AppearanceSettings extends AppearancePalette {
  font: AppFont;
  presetId: string;
}

export interface StoredAppearance {
  presetId: string;
  font: AppFont;
  custom: Record<AppearanceMode, AppearancePalette>;
}

export const DEFAULT_LIGHT_PALETTE: AppearancePalette = {
  accentColor: "#E63B2E",
  backgroundColor: "#F5F3EE",
  cardColor: "#E8E4DD",
  textColor: "#111111",
};

export const DEFAULT_DARK_PALETTE: AppearancePalette = {
  accentColor: "#F05C4F",
  backgroundColor: "#161215",
  cardColor: "#26222B",
  textColor: "#F2EDF5",
};

export const DEFAULT_APPEARANCE: StoredAppearance = {
  presetId: "classic",
  font: "inter",
  custom: {
    light: DEFAULT_LIGHT_PALETTE,
    dark: DEFAULT_DARK_PALETTE,
  },
};

export const APPEARANCE_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  font: AppFont;
  light: AppearancePalette;
  dark: AppearancePalette;
}> = [
  {
    id: "classic",
    name: "Classic",
    description: "PlanThing's built-in light and dark theme.",
    font: "inter",
    light: DEFAULT_LIGHT_PALETTE,
    dark: DEFAULT_DARK_PALETTE,
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Neutral gray with low-saturation accents.",
    font: "inter",
    light: {
      accentColor: "#6B7280",
      backgroundColor: "#F2F2F0",
      cardColor: "#E5E5E2",
      textColor: "#1C1C1A",
    },
    dark: {
      accentColor: "#9CA3AF",
      backgroundColor: "#111111",
      cardColor: "#1F1F1F",
      textColor: "#E5E5E5",
    },
  },
  {
    id: "paper",
    name: "Paper",
    description: "Soft document tones with a blue action color.",
    font: "serif",
    light: {
      accentColor: "#2563EB",
      backgroundColor: "#F8F6F1",
      cardColor: "#ECE8DD",
      textColor: "#1D1B16",
    },
    dark: {
      accentColor: "#7CA7FF",
      backgroundColor: "#171A20",
      cardColor: "#212530",
      textColor: "#F4EFE5",
    },
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Mono text and green accent.",
    font: "mono",
    light: {
      accentColor: "#15803D",
      backgroundColor: "#F4F8F1",
      cardColor: "#E4ECDF",
      textColor: "#132017",
    },
    dark: {
      accentColor: "#22C55E",
      backgroundColor: "#0F1411",
      cardColor: "#1A211C",
      textColor: "#E7F3EA",
    },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Cool system UI with a clear cyan accent.",
    font: "system",
    light: {
      accentColor: "#0891B2",
      backgroundColor: "#F3F6F8",
      cardColor: "#E1E7EC",
      textColor: "#111827",
    },
    dark: {
      accentColor: "#22D3EE",
      backgroundColor: "#101820",
      cardColor: "#1B2530",
      textColor: "#EAF2F8",
    },
  },
  {
    id: "custom",
    name: "Custom",
    description: "Your own light and dark palettes.",
    font: "inter",
    light: DEFAULT_LIGHT_PALETTE,
    dark: DEFAULT_DARK_PALETTE,
  },
];

const FONT_VALUES: Record<AppFont, string> = {
  inter: "\"Inter\", -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif",
  system: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Helvetica, Arial, sans-serif",
  serif: "Georgia, \"Times New Roman\", serif",
  mono: "\"Space Mono\", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function getThemeMode(): AppearanceMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function sanitizePalette(
  value: Partial<AppearancePalette> | undefined,
  fallback: AppearancePalette,
): AppearancePalette {
  return {
    accentColor: isHexColor(value?.accentColor)
      ? value.accentColor
      : fallback.accentColor,
    backgroundColor: isHexColor(value?.backgroundColor)
      ? value.backgroundColor
      : fallback.backgroundColor,
    cardColor: isHexColor(value?.cardColor) ? value.cardColor : fallback.cardColor,
    textColor: isHexColor(value?.textColor) ? value.textColor : fallback.textColor,
  };
}

function parseAppearance(value: string | null): StoredAppearance {
  if (!value) return DEFAULT_APPEARANCE;

  try {
    const parsed = JSON.parse(value) as Partial<StoredAppearance> &
      Partial<AppearanceSettings>;
    const presetId =
      typeof parsed.presetId === "string" &&
      APPEARANCE_PRESETS.some((preset) => preset.id === parsed.presetId)
        ? parsed.presetId
        : "classic";
    const font =
      parsed.font && parsed.font in FONT_VALUES
        ? parsed.font
        : APPEARANCE_PRESETS.find((preset) => preset.id === presetId)?.font ??
          DEFAULT_APPEARANCE.font;

    return {
      presetId,
      font,
      custom: {
        light: sanitizePalette(
          parsed.custom?.light ?? parsed,
          DEFAULT_LIGHT_PALETTE,
        ),
        dark: sanitizePalette(parsed.custom?.dark, DEFAULT_DARK_PALETTE),
      },
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function getPresetPalette(presetId: string, mode: AppearanceMode) {
  const preset =
    APPEARANCE_PRESETS.find((item) => item.id === presetId) ??
    APPEARANCE_PRESETS[0];
  return preset[mode];
}

function getEffectiveAppearance(
  settings: StoredAppearance,
  mode = getThemeMode(),
): AppearanceSettings {
  const preset =
    APPEARANCE_PRESETS.find((item) => item.id === settings.presetId) ??
    APPEARANCE_PRESETS[0];
  const palette =
    settings.presetId === "custom"
      ? settings.custom[mode]
      : getPresetPalette(settings.presetId, mode);

  return {
    presetId: settings.presetId,
    font: settings.presetId === "custom" ? settings.font : preset.font,
    ...palette,
  };
}

function applyAppearance(settings: StoredAppearance) {
  const root = document.documentElement;
  const effective = getEffectiveAppearance(settings);

  root.style.setProperty("--font-sans", FONT_VALUES[effective.font]);

  if (effective.presetId === "classic") {
    root.style.removeProperty("--color-brand-accent");
    root.style.removeProperty("--color-brand-bg");
    root.style.removeProperty("--color-brand-primary");
    root.style.removeProperty("--color-brand-text");
    return;
  }

  root.style.setProperty("--color-brand-accent", effective.accentColor);
  root.style.setProperty("--color-brand-bg", effective.backgroundColor);
  root.style.setProperty("--color-brand-primary", effective.cardColor);
  root.style.setProperty("--color-brand-text", effective.textColor);
}

export function initializeAppearance() {
  if (typeof window === "undefined") return;
  applyAppearance(
    parseAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)),
  );
}

export function useAppearance() {
  const [stored, setStored] = useState<StoredAppearance>(() => {
    if (typeof window === "undefined") return DEFAULT_APPEARANCE;
    return parseAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY));
  });
  const [mode, setMode] = useState<AppearanceMode>(() => getThemeMode());

  useEffect(() => {
    applyAppearance(stored);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(stored));
  }, [stored, mode]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const nextMode = getThemeMode();
      setMode(nextMode);
      applyAppearance(stored);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [stored]);

  const setSettings = (next: AppearanceSettings) => {
    setStored((current) => ({
      presetId: "custom",
      font: next.font,
      custom: {
        ...current.custom,
        [mode]: {
          accentColor: next.accentColor,
          backgroundColor: next.backgroundColor,
          cardColor: next.cardColor,
          textColor: next.textColor,
        },
      },
    }));
  };

  const applyPreset = (presetId: string) => {
    const preset = APPEARANCE_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setStored((current) => ({
      presetId,
      font: presetId === "custom" ? current.font : preset.font,
      custom: current.custom,
    }));
  };

  const updateCustomPalette = (
    targetMode: AppearanceMode,
    patch: Partial<AppearancePalette>,
  ) => {
    setStored((current) => ({
      ...current,
      presetId: "custom",
      custom: {
        ...current.custom,
        [targetMode]: {
          ...current.custom[targetMode],
          ...patch,
        },
      },
    }));
  };

  const setFont = (font: AppFont) => {
    setStored((current) => ({ ...current, presetId: "custom", font }));
  };

  const reset = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
    }
    setStored(DEFAULT_APPEARANCE);
  };

  return {
    settings: getEffectiveAppearance(stored, mode),
    stored,
    mode,
    setSettings,
    applyPreset,
    updateCustomPalette,
    setFont,
    reset,
  };
}
