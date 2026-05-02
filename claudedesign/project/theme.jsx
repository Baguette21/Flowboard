// theme.jsx — PlanThing design tokens, themeable

const PT_PALETTES = {
  light: {
    paperBg: '#F5F3EE',
    paperPanel: '#E8E4DD',
    paperPanelDeep: '#DCD7CD',
    headerWash: '#E9E4DC',
    sidebar: '#1A1A1A',
    sidebarText: 'rgba(245,243,238,0.8)',
    sidebarTextActive: '#F5F3EE',
    ink: '#111111',
    inkDeep: '#1A1A1A',
    muted: 'rgba(0,0,0,0.55)',
    subtle: 'rgba(0,0,0,0.35)',
    whisper: 'rgba(0,0,0,0.08)',
    whisperStrong: 'rgba(0,0,0,0.14)',
    link: '#0075de',
    sheetBg: '#F5F3EE',
    cardShadow:
      'rgba(0,0,0,0.04) 0 4px 18px, rgba(0,0,0,0.027) 0 2.025px 7.84688px, rgba(0,0,0,0.02) 0 0.8px 2.925px, rgba(0,0,0,0.01) 0 0.175px 1.04062px',
    sheetShadow: '0 -16px 40px rgba(0,0,0,0.12), 0 -4px 12px rgba(0,0,0,0.06)',
  },
  dark: {
    paperBg: '#17150F',
    paperPanel: '#21201A',
    paperPanelDeep: '#2B2A24',
    headerWash: '#1D1B15',
    sidebar: '#0C0B08',
    sidebarText: 'rgba(245,243,238,0.7)',
    sidebarTextActive: '#F5F3EE',
    ink: '#F5F3EE',
    inkDeep: '#FFFFFF',
    muted: 'rgba(245,243,238,0.55)',
    subtle: 'rgba(245,243,238,0.35)',
    whisper: 'rgba(255,255,255,0.06)',
    whisperStrong: 'rgba(255,255,255,0.14)',
    link: '#5fb8ff',
    sheetBg: '#1D1B15',
    cardShadow: '0 4px 18px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
    sheetShadow: '0 -16px 40px rgba(0,0,0,0.5), 0 -4px 12px rgba(0,0,0,0.3)',
  },
};

const PT_ACCENTS = {
  sprout: { name: 'Sprout Red', hex: '#E63B2E', tint: 'rgba(230,59,46,0.12)', tintStrong: 'rgba(230,59,46,0.22)' },
  garden: { name: 'Garden', hex: '#2E8B57', tint: 'rgba(46,139,87,0.13)', tintStrong: 'rgba(46,139,87,0.24)' },
  ink: { name: 'Ink', hex: '#111111', tint: 'rgba(17,17,17,0.08)', tintStrong: 'rgba(17,17,17,0.16)' },
  sun: { name: 'Sun', hex: '#D49B1E', tint: 'rgba(212,155,30,0.16)', tintStrong: 'rgba(212,155,30,0.28)' },
};

// Board / category accent palette — used as icon-well tints, label dots, etc.
// All low-chroma, paper-friendly.
const PT_BOARD_TINTS = {
  red:    { fg: '#C8392E', bg: 'rgba(230,59,46,0.13)' },
  amber:  { fg: '#A87011', bg: 'rgba(212,155,30,0.18)' },
  olive:  { fg: '#5E6A2A', bg: 'rgba(123,143,46,0.18)' },
  green:  { fg: '#2E8B57', bg: 'rgba(46,139,87,0.16)' },
  teal:   { fg: '#1F7A7A', bg: 'rgba(31,122,122,0.15)' },
  blue:   { fg: '#2C6EBE', bg: 'rgba(44,110,190,0.14)' },
  violet: { fg: '#6B4FB8', bg: 'rgba(107,79,184,0.15)' },
  rose:   { fg: '#B6437A', bg: 'rgba(182,67,122,0.14)' },
  ink:    { fg: '#1A1A1A', bg: 'rgba(0,0,0,0.08)' },
};

function ptTheme({ dark = false, accent = 'sprout', density = 'cozy' } = {}) {
  const c = dark ? PT_PALETTES.dark : PT_PALETTES.light;
  const a = PT_ACCENTS[accent] || PT_ACCENTS.sprout;
  const dens = density === 'compact'
    ? { cardPad: 14, rowPad: 10, gap: 8, screenPad: 14, titleSize: 26 }
    : { cardPad: 18, rowPad: 14, gap: 12, screenPad: 18, titleSize: 30 };
  return {
    dark, accent: a, density: dens, densityName: density,
    boardTints: PT_BOARD_TINTS,
    fonts: {
      sans: 'Inter, -apple-system, "SF Pro Text", system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
      mono: '"Space Mono", ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
    },
    radii: { sm: 8, md: 12, lg: 16, xl: 28, pill: 999 },
    ...c,
  };
}

Object.assign(window, { ptTheme, PT_PALETTES, PT_ACCENTS, PT_BOARD_TINTS });
