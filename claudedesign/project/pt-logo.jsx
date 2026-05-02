// pt-logo.jsx — PlanThing brand mark + lockups
// Source-of-truth logo (matches favicon.svg). Use the React component, not <img>,
// so colors and sizes scale with theme/density.

// Variants:
//   "tile"   — dark rounded-square with paper sprout (the favicon)
//   "glyph"  — bare sprout (no tile), inherits currentColor for stem/leaves, uses accent for bud
//   "mono"   — bare sprout, single tone, accent bud
//   "stamp"  — small inline tile, used as nav avatar
//
// All variants render at 1×1 and scale via the `size` prop.

function PtLogo({
  variant = 'tile',
  size = 40,
  // Per-variant overrides:
  tileBg,        // tile bg (default: ink gradient)
  paper = '#E8E4DD',   // stem & leaves color when on dark tile
  accent = '#E63B2E',  // bud color
  stem,          // overrides paper for stem if set
  leaves,        // overrides paper for leaves if set
  shadow = true,
  style,
}) {
  const id = React.useId();

  const Sprout = ({ stemColor, leafColor }) => (
    <>
      {/* Stem */}
      <path d="M 32 48 L 32 20" stroke={stemColor} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Lower-left leaf */}
      <path d="M 32 38 Q 22 42 18 34 Q 24 31 32 34 Z" fill={leafColor} />
      {/* Upper-right leaf */}
      <path d="M 32 30 Q 42 32 46 24 Q 40 21 32 26 Z" fill={leafColor} />
      {/* Bud */}
      <circle cx="32" cy="18" r="4" fill={accent} />
    </>
  );

  if (variant === 'tile' || variant === 'stamp') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
        xmlns="http://www.w3.org/2000/svg" style={style}>
        <defs>
          <linearGradient id={`${id}-bg`} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1A1A1A" />
            <stop offset="1" stopColor="#111111" />
          </linearGradient>
          {shadow && (
            <filter id={`${id}-shadow`} x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feOffset dy="2" />
              <feGaussianBlur stdDeviation="3" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.22 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1" result="shape" />
            </filter>
          )}
        </defs>
        <g filter={shadow ? `url(#${id}-shadow)` : undefined}>
          <rect x="6" y="6" width="52" height="52" rx="16"
            fill={tileBg || `url(#${id}-bg)`} />
          <Sprout stemColor={stem || paper} leafColor={leaves || paper} />
        </g>
      </svg>
    );
  }

  // "glyph" or "mono" — no tile, sprout fills the viewBox proportionally.
  // The sprout source occupies ~28×34 within 64×64; we offset accordingly.
  return (
    <svg width={size} height={size * (38 / 32)} viewBox="14 14 36 38" fill="none"
      xmlns="http://www.w3.org/2000/svg" style={style}>
      <Sprout stemColor={stem || paper} leafColor={leaves || paper} />
    </svg>
  );
}

// Lockup: tile + wordmark
function PtLogoLockup({ size = 36, t, dark, tagline }) {
  const fg = dark ? '#F5F3EE' : '#111';
  const sub = dark ? 'rgba(245,243,238,0.55)' : 'rgba(0,0,0,0.55)';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <PtLogo variant="tile" size={size} shadow={false} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          font: `700 ${Math.round(size * 0.5)}px/1 ${t.fonts.sans}`,
          letterSpacing: '-0.01em', color: fg,
        }}>PlanThing</span>
        {tagline && (
          <span style={{
            font: `500 ${Math.max(10, Math.round(size * 0.28))}px/1.1 ${t.fonts.mono}`,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: sub, marginTop: 4,
          }}>{tagline}</span>
        )}
      </div>
    </div>
  );
}

// A "tint" variant that swaps tile color for any board tint — used in board-list rows
// where each board gets a personalized mark.
function PtLogoTint({ size = 36, tint = 'red', t }) {
  const tt = t.boardTints[tint] || t.boardTints.red;
  return (
    <PtLogo variant="tile" size={size} shadow={false}
      tileBg={tt.bg}
      paper={tt.fg}
      accent={t.accent.hex}
    />
  );
}

Object.assign(window, { PtLogo, PtLogoLockup, PtLogoTint });
