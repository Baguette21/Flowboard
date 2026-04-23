# Notion-Inspired UI Revamp for Text Cards

## Context

The current text cards across the app (`BoardCard`, `NoteCard`, Kanban `Card`, calendar day cells, column envelopes) feel cluttered and dated. They use a mix of heavy `border-2`, decorative 3-bar bottom accents, and DM Serif Display italic titles — combined with heavy-opacity washes of user-assigned custom colors (board color, column color, calendar accent) that visually clash with the warm beige canvas.

Per `DESIGN.md` (Notion-inspired system), cards should feel like quality paper: whisper-thin borders, barely-there multi-layer shadows, clean Inter-family typography, and minimal chrome. The user has confirmed:
- **Keep the warm beige palette** (page bg, sidebar, header tokens stay).
- **Fix how custom colors are applied** to boards and the calendar — today's full-saturation washes look bad.
- **Switch card titles** from DM Serif Display italic to Inter-style (sans, 700, tight tracking).
- **Remove decorative bottom color bars** on `BoardCard` / `NoteCard`.
- Cover **both light and dark** modes.

Goal: keep every layout and feature intact (icons, titles, metadata, dropdowns, dnd, calendar logic, color pickers) — only the *visual styling* of card surfaces and the way custom colors integrate with them change.

---

## Approach

### 1. Typography + design tokens in `src/index.css`

- Add Google Fonts import (top of file) for **Inter** weights 400/500/600/700 with OpenType features `"lnum", "locl"`.
- In `@theme`: keep the beige `--color-brand-*` tokens untouched. Replace `--font-sans: "Space Grotesk"` with `--font-sans: "Inter"` (keeps every existing `font-sans` usage; heavier weight variants handled at usage sites). Keep `--font-serif` and `--font-mono` entries so any intentional serif/mono still works.
- Add new Notion-derived tokens (light values; dark values mirrored under `:root.dark`):
  - `--color-text-muted: rgba(0,0,0,0.55)` (≈ #615d59 role)
  - `--color-text-subtle: rgba(0,0,0,0.35)` (≈ #a39e98 role)
  - `--color-border-whisper: rgba(0,0,0,0.08)`
  - `--color-border-whisper-strong: rgba(0,0,0,0.14)` (hover)
  - `--color-link: #0075de` (Notion Blue — used only for focus rings / links, not bulk UI)
  - Dark mode analogs: `rgba(255,255,255,0.60)`, `rgba(255,255,255,0.38)`, `rgba(255,255,255,0.08)`, `rgba(255,255,255,0.15)`, `#62aef0`.
- Add a `@layer utilities` block with three utilities used repeatedly:
  - `.card-whisper` — `border: 1px solid var(--color-border-whisper)`.
  - `.card-elevation` — the 4-layer Notion card shadow stack (`rgba(0,0,0,0.04) 0 4px 18px, rgba(0,0,0,0.027) 0 2.025px 7.84688px, rgba(0,0,0,0.02) 0 0.8px 2.925px, rgba(0,0,0,0.01) 0 0.175px 1.04062px`). Under `:root.dark` swap r,g,b to `255,255,255` so shadows are readable.
  - `.card-elevation-hover` — slightly denser stack for hover (max opacity 0.06).
  - `.tracking-display` — `letter-spacing: -0.25px` for card titles.

### 2. `src/components/board/BoardCard.tsx`

Keep all behavior (navigate, favorite toggle, dropdown, confirm delete, shared badge).

Replace the outer `<div>` class/style:

```
className="group relative select-none cursor-pointer bg-brand-primary card-whisper card-elevation
           rounded-[12px] p-5 transition-all duration-150
           hover:card-elevation-hover hover:border-[color:var(--color-border-whisper-strong)]"
// remove inline style that set borderTopColor + borderTopWidth: 4
```

- Delete the 4px colored top border and the `absolute top-0 left-8 right-8` color-bar `<div>`.
- Delete the final `<div className="mt-6 flex gap-1.5">…three colored bars…</div>`.
- Title `<h3>`: change to `font-sans font-bold text-[22px] leading-tight tracking-display text-brand-text truncate`.
- Icon tile (the `h-9 w-9`): keep `board.color` tint at 0x22 alpha — this is where the board color now lives.
- Add a small 6px round dot next to the date using `board.color` as a second subtle color cue:
  `<span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: board.color }} />`.
- Date: keep the logic, restyle to `font-sans text-[12px] font-medium text-[color:var(--color-text-subtle)]` (drop mono/uppercase/tracking-widest).
- "Shared" chip + "Owner:" line: retint with `text-[color:var(--color-text-muted)]` and whisper border.

### 3. `src/components/notes/NoteCard.tsx`

Mirror the `BoardCard` treatment.
- Outer card: swap `border-2 border-brand-text/10 rounded-[14px] p-6` for `card-whisper card-elevation rounded-[12px] p-5 hover:card-elevation-hover hover:border-[color:var(--color-border-whisper-strong)]` on `bg-brand-primary`.
- Remove the three `bg-brand-accent/…` decorative bars at the bottom.
- Icon tile stays (brand accent tint) — this is the single pop of color.
- Title: `font-sans font-bold text-[22px] leading-tight tracking-display truncate` (remove `font-serif italic`).
- Preview text: `text-[15px] leading-relaxed text-[color:var(--color-text-muted)] line-clamp-2`.
- Empty-note placeholder: `text-[color:var(--color-text-subtle)]` (no italic needed).
- Date: same treatment as `BoardCard` (sans, `--color-text-subtle`).

### 4. `src/components/card/Card.tsx` (Kanban task card)

Fix the biggest offender: column color currently washes the entire card background at 0x16/0x24 alpha, which looks muddy on beige. Replace with a **2px left-edge accent**.

- Remove the inline `style` that sets `backgroundColor`/`borderColor` from `statusColor`.
- Always render `bg-brand-primary` and `card-whisper`.
- When `statusColor` is provided, add `borderLeft: 3px solid ${statusColor}` via inline style (or a `paddingLeft: 11px` compensation) to produce a clean ribbon cue.
- Change className base to:
  ```
  "relative w-full cursor-pointer select-none rounded-[8px] card-whisper bg-brand-primary
   px-3 py-2.5 transition-all duration-150
   hover:card-elevation hover:border-[color:var(--color-border-whisper-strong)]"
  ```
- Title: `text-[14px] font-medium leading-snug text-brand-text` (promote slightly from current 13px muted).
- Labels/priority/due/complete/assignee block unchanged in structure; keep the colored pill labels and priority pills (meaningful color, and they're small). Optional: change label/priority `rounded-md` to `rounded-full` to hit DESIGN.md pill spec.
- `isDragging`: keep `scale-105 rotate-1 opacity-30 shadow-2xl` for feedback (works well).

### 5. `src/components/column/Column.tsx`

The envelope currently fills `${column.color}0D` over beige — this reads as muddy tint. Neutralize it:

- Remove the inline `style` that sets `borderColor`/`backgroundColor` from `column.color`.
- Envelope becomes: `"flex flex-col rounded-[10px] card-whisper bg-brand-primary/60 p-3"`.
- Column color continues to live on the `ColumnHeader` pill and on each card's new left accent ribbon — that is enough color language.

### 6. `src/components/column/ColumnHeader.tsx`

Keep the pill drag handle — it's the primary expression of column color and works. Small polish:

- Pill classes: `"inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold text-white select-none shadow-sm transition hover:brightness-110 hover:scale-[1.02]"`.
- Card count: keep in the pill but use `font-sans text-[11px] opacity-75` (not mono).

### 7. `src/components/board/BoardCalendarView.tsx`

Desaturate all usages of `calendarColor`. Keep the feature (color picker, live recolor).

- **Weekday row bottom border**: replace `style={{ borderBottom: \`2px solid ${tint(calendarColor, 0.25)}\` }}` with `className="border-b border-[color:var(--color-border-whisper)]"`.
- **Weekday labels**: drop the `tint(calendarColor, …)` color; use `text-[color:var(--color-text-subtle)]` for weekends, `text-[color:var(--color-text-muted)]` for weekdays.
- **Today cell**: remove `style={{ boxShadow: \`inset 0 2px 0 ${calendarColor}\` }}`. Keep the filled accent circle on the date number (that's the one bold touch — good).
- **Day cells**: border uses `--color-border-whisper`, today-weekend bg tints kept as `bg-brand-text/[0.015]` (already neutral).
- **Task chips inside cells**: replace the full tinted background + 2px left border with a cleaner treatment — `bg-brand-primary card-whisper` plus a 2px left border at full saturation `statusColor`. Overdue: keep `tint(statusColor, 0.12)` fill as the overdue-only accent.
- **Accent picker button**: keep color swatch dot but lose `ring-2 ring-white/30` → use `card-whisper` around the dot for a cleaner Notion-style swatch.
- **Empty state icon tile**: keep `tint(calendarColor, 0.12)` (this is a single contextual splash — fine).

### 8. `src/components/ui/Badge.tsx` (minor)

Already `rounded-full`. One adjustment so badges match the DESIGN.md pill spec without altering callers:
- Change uppercase + mono + tracking-widest defaults to a lighter `font-sans font-semibold text-[11px] tracking-[0.125px] normal-case`. Existing callers that want the old look can pass a `className` override; review `LabelBadge` and any badge-y callsites to confirm nothing depends on the uppercase mono look visually (quick grep during implementation).

---

## Files modified

Primary:
- `src/index.css`
- `src/components/board/BoardCard.tsx`
- `src/components/notes/NoteCard.tsx`
- `src/components/card/Card.tsx`
- `src/components/column/Column.tsx`
- `src/components/column/ColumnHeader.tsx`
- `src/components/board/BoardCalendarView.tsx`

Minor:
- `src/components/ui/Badge.tsx`

No new files. No layout/markup restructuring. No Convex / routing / data changes.

---

## Reused existing utilities

- `cn()` at `src/lib/utils.ts` — continue to use for className merging.
- `tint()` helper local to `BoardCalendarView.tsx` — keep; we just call it less often.
- Existing `Dropdown`, `ConfirmDialog`, `Star`/`FileText`/`MoreHorizontal` lucide icons — untouched.
- `getBoardIconOption` at `src/lib/boardIcons.ts` — untouched.
- `extractPlainTextFromBlockNoteContent` — untouched.
- Existing brand CSS variables in `index.css` are preserved; we *add* new tokens rather than rewriting the palette.

---

## Verification

1. `pnpm dev` and navigate:
   - `/` — home page BoardCard and NoteCard grids. Confirm: no 3-bar bottom accents, no top 4px color border, Inter bold titles, whisper 1px border with subtle shadow, hover lifts the shadow instead of the card.
   - `/board/:id` — Kanban view. Confirm: cards have a 3px colored ribbon on their left matching the column color; no full-card tint. Column envelope is neutral beige, only the colored pill + ribbon carry column color.
   - `/board/:id` Calendar view — pick each accent color in the picker. Confirm: no saturated bottom border under weekday row, no inset-top today-shadow, today circle still uses the accent, task chips show a cleaner left ribbon not a tinted wash.
   - `/notes` — NoteCard grid. Confirm: title is sans bold, icon tile still accent-tinted, no decorative bars at bottom.
2. Toggle dark mode (existing toggle). Confirm the new shadows and whisper borders are visible (they use white-alpha under `:root.dark`) and text tokens stay legible.
3. Run `pnpm build` to catch any TS / Tailwind v4 token issues from the new CSS variable references used via `text-[color:var(--…)]` bracket syntax.
4. Manual click-through: favorite/unfavorite a board, delete a note, drag a Kanban card between columns, open `CardDetail`, add a card from calendar cell — every feature should behave identically to before.
