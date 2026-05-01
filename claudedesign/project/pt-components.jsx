// pt-components.jsx — PlanThing UI primitives
// Used across all screens. Pass `t` (theme) explicitly so screens stay pure.

// ─── Buttons ─────────────────────────────────────────────────
function PtButton({ children, kind = 'primary', size = 'md', t, full, icon, onClick, style }) {
  const h = size === 'sm' ? 36 : 44;
  const pad = size === 'sm' ? '0 14px' : '0 20px';
  const base = {
    height: h, padding: pad, border: 0, borderRadius: 999,
    font: `600 ${size === 'sm' ? 13 : 14}px/1 ${t.fonts.sans}`,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: 'pointer', width: full ? '100%' : 'auto', whiteSpace: 'nowrap',
  };
  const styles = {
    primary: { background: t.ink, color: t.paperBg },
    secondary: { background: t.paperPanel, color: t.ink, border: `1px solid ${t.whisper}` },
    ghost: { background: 'transparent', color: t.ink },
    accent: { background: t.accent.hex, color: '#fff' },
    danger: { background: 'transparent', color: t.accent.hex, border: `1px solid ${t.accent.hex}` },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...styles[kind], ...style }}>
      {icon}{children}
    </button>
  );
}

// ─── Mono Label ──────────────────────────────────────────────
function PtMono({ children, t, style }) {
  return (
    <span style={{
      font: `700 11px/1.2 ${t.fonts.mono}`, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: t.muted, ...style,
    }}>{children}</span>
  );
}

// ─── Icon Well ───────────────────────────────────────────────
function PtIconWell({ tint = 'red', letter, icon, size = 36, radius = 10, t }) {
  const tt = t.boardTints[tint] || t.boardTints.red;
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: tt.bg, color: tt.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      font: `700 ${Math.round(size * 0.42)}px/1 ${t.fonts.sans}`,
    }}>
      {icon || letter}
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────
function PtAvatar({ initials = 'EC', size = 28, tint = 'amber', t }) {
  const tt = t.boardTints[tint] || t.boardTints.amber;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: tt.bg, color: tt.fg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      font: `600 ${Math.round(size * 0.4)}px/1 ${t.fonts.sans}`,
      border: `1px solid ${t.whisper}`,
    }}>{initials}</div>
  );
}

function PtAvatarStack({ people = [], t, max = 3 }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <PtAvatar initials={p.i} tint={p.t} t={t} />
        </div>
      ))}
      {rest > 0 && (
        <div style={{
          marginLeft: -8, width: 28, height: 28, borderRadius: '50%',
          background: t.paperPanelDeep, color: t.muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          font: `600 11px/1 ${t.fonts.sans}`, border: `1px solid ${t.whisper}`,
        }}>+{rest}</div>
      )}
    </div>
  );
}

// ─── Chip / Tag ─────────────────────────────────────────────
function PtChip({ children, tint, t, selected, icon, style }) {
  const tt = tint ? (t.boardTints[tint] || t.boardTints.red) : null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 26, padding: '0 10px', borderRadius: 999,
      background: tt ? tt.bg : t.paperPanelDeep,
      color: tt ? tt.fg : t.ink,
      font: `600 12px/1 ${t.fonts.sans}`,
      border: selected ? `1.5px solid ${t.ink}` : `1px solid ${t.whisper}`,
      ...style,
    }}>{icon}{children}</span>
  );
}

// ─── Priority dot ───────────────────────────────────────────
function PtPriority({ level = 'med', t, withLabel = false }) {
  const map = {
    low:  { c: t.boardTints.blue.fg, label: 'Low' },
    med:  { c: t.boardTints.amber.fg, label: 'Medium' },
    high: { c: t.accent.hex, label: 'High' },
  };
  const m = map[level];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.muted, font: `600 12px/1 ${t.fonts.sans}` }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.c, display: 'inline-block' }} />
      {withLabel && m.label}
    </span>
  );
}

// ─── Bottom Nav ──────────────────────────────────────────────
function PtBottomNav({ t, active = 'home', onCreate, hideOnEdit, dark }) {
  if (hideOnEdit) return null;
  const items = [
    { id: 'home',    label: 'Home',    Icon: PtIcons.home },
    { id: 'search',  label: 'Search',  Icon: PtIcons.search },
    { id: 'create',  label: '',         Icon: PtIcons.plus, primary: true },
    { id: 'inbox',   label: 'Inbox',   Icon: PtIcons.bell },
    { id: 'me',      label: 'Me',      Icon: PtIcons.user },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 24, paddingTop: 8,
      background: dark
        ? 'linear-gradient(to top, rgba(23,21,15,0.96) 60%, rgba(23,21,15,0))'
        : 'linear-gradient(to top, rgba(245,243,238,0.96) 60%, rgba(245,243,238,0))',
      borderTop: `0.5px solid ${t.whisper}`,
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: 56, padding: '0 8px' }}>
        {items.map((it) => {
          const isActive = it.id === active;
          if (it.primary) {
            return (
              <button key={it.id} onClick={onCreate} style={{
                width: 48, height: 48, borderRadius: 16, border: 0,
                background: t.ink, color: t.paperBg, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              }}>
                <it.Icon size={24} />
              </button>
            );
          }
          return (
            <button key={it.id} style={{
              minWidth: 56, height: 48, padding: '4px 8px', border: 0, background: 'transparent',
              color: isActive ? t.ink : t.subtle, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <it.Icon size={22} />
              <span style={{ font: `600 10px/1 ${t.fonts.sans}`, letterSpacing: 0.2 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────
function PtSection({ label, action, t, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 4px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <PtMono t={t}>{label}</PtMono>
        {count != null && (
          <span style={{ font: `700 11px/1.2 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.08em' }}>{count}</span>
        )}
      </div>
      {action && (
        <span style={{ font: `600 12px/1 ${t.fonts.sans}`, color: t.muted, cursor: 'pointer' }}>{action}</span>
      )}
    </div>
  );
}

// ─── Board Card ──────────────────────────────────────────────
function PtBoardCard({ title, meta, tint = 'red', letter = 'B', shared, owner, count, t, layout = 'list' }) {
  if (layout === 'tile') {
    return (
      <div style={{
        background: t.paperPanel, borderRadius: 14, padding: 16,
        border: `1px solid ${t.whisper}`, boxShadow: t.cardShadow,
        display: 'flex', flexDirection: 'column', gap: 12,
        minHeight: 132, position: 'relative',
      }}>
        <PtIconWell tint={tint} letter={letter} t={t} size={32} radius={9} />
        <div>
          <div style={{ font: `700 16px/1.2 ${t.fonts.sans}`, color: t.ink, marginBottom: 4 }}>{title}</div>
          <div style={{ font: `500 11px/1.3 ${t.fonts.sans}`, color: t.subtle }}>{meta}</div>
        </div>
        {count != null && (
          <div style={{ position: 'absolute', top: 14, right: 14, font: `700 10px/1 ${t.fonts.mono}`, color: t.muted, letterSpacing: '0.08em' }}>
            {count} TASKS
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: 14, background: t.paperPanel, borderRadius: 12,
      border: `1px solid ${t.whisper}`,
      boxShadow: t.cardShadow,
    }}>
      <PtIconWell tint={tint} letter={letter} t={t} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `700 16px/1.2 ${t.fonts.sans}`, color: t.ink, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {title}
          {shared && (
            <span style={{ display: 'inline-flex', color: t.subtle }}>
              <PtIcons.invite size={13} />
            </span>
          )}
        </div>
        <div style={{ font: `500 12px/1.3 ${t.fonts.sans}`, color: t.subtle, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{meta}</span>
          {owner && <><span>·</span><span>{owner}</span></>}
        </div>
      </div>
      {count != null && (
        <div style={{ font: `700 10px/1 ${t.fonts.mono}`, color: t.muted, letterSpacing: '0.08em', marginTop: 4 }}>
          {count}
        </div>
      )}
    </div>
  );
}

// ─── Note Card ──────────────────────────────────────────────
function PtNoteCard({ title, snippet, date, tint = 'amber', t }) {
  return (
    <div style={{
      background: t.paperPanel, borderRadius: 12, padding: 14,
      border: `1px solid ${t.whisper}`, boxShadow: t.cardShadow,
      display: 'flex', flexDirection: 'column', gap: 8,
      borderLeft: `3px solid ${(t.boardTints[tint] || t.boardTints.amber).fg}`,
    }}>
      <div style={{ font: `700 15px/1.25 ${t.fonts.sans}`, color: t.ink }}>{title}</div>
      <div style={{ font: `400 13px/1.45 ${t.fonts.sans}`, color: t.muted, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {snippet}
      </div>
      <div style={{ font: `600 11px/1 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.06em' }}>{date}</div>
    </div>
  );
}

// ─── Task Card (kanban) ─────────────────────────────────────
function PtTaskCard({ title, labels = [], priority, due, assignees, comments, t, done, dragging }) {
  return (
    <div style={{
      background: t.dark ? t.paperPanelDeep : '#fff',
      borderRadius: 10, padding: '12px 12px 10px',
      border: `1px solid ${t.whisper}`,
      boxShadow: dragging
        ? '0 14px 30px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)'
        : '0 1px 2px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.05)',
      transform: dragging ? 'rotate(-2deg) scale(1.02)' : 'none',
      transition: 'box-shadow 180ms ease, transform 180ms ease',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {labels.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {labels.map((l, i) => (
            <span key={i} style={{
              height: 5, width: 28, borderRadius: 3,
              background: (t.boardTints[l] || t.boardTints.red).fg,
            }} />
          ))}
        </div>
      )}
      <div style={{
        font: `600 14px/1.3 ${t.fonts.sans}`, color: t.ink,
        textDecoration: done ? 'line-through' : 'none',
        opacity: done ? 0.5 : 1,
      }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.muted, font: `500 11px/1 ${t.fonts.sans}` }}>
          {priority && <PtPriority level={priority} t={t} />}
          {due && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <PtIcons.calendar size={12} />{due}
            </span>
          )}
          {comments != null && comments > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <PtIcons.note size={12} />{comments}
            </span>
          )}
        </div>
        {assignees && assignees.length > 0 && <PtAvatarStack people={assignees} t={t} max={2} />}
      </div>
    </div>
  );
}

// ─── Bottom Sheet (decorative, non-interactive) ─────────────
function PtBottomSheet({ children, t, height = 'auto', title, withGrabber = true, dimmed = true, style }) {
  return (
    <>
      {dimmed && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)',
          backdropFilter: 'blur(2px)',
        }} />
      )}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: t.sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        boxShadow: t.sheetShadow,
        height, maxHeight: '85%',
        display: 'flex', flexDirection: 'column',
        ...style,
      }}>
        {withGrabber && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.whisperStrong }} />
          </div>
        )}
        {title && (
          <div style={{ padding: '12px 20px 8px', font: `700 18px/1.2 ${t.fonts.sans}`, color: t.ink }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </>
  );
}

// ─── Top App Bar (custom for PlanThing, replaces IOSNavBar) ─
function PtAppBar({ t, title, leading = 'back', trailing, large = true, subtitle, onSearch }) {
  const Lead = leading === 'back' ? PtIcons.back : leading === 'menu' ? PtIcons.list : null;
  return (
    <div style={{ padding: '8px 14px 4px', background: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
        {Lead ? (
          <button style={{
            width: 36, height: 36, borderRadius: 12, border: 0,
            background: t.paperPanel, color: t.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: t.cardShadow,
          }}><Lead /></button>
        ) : <div style={{ width: 36 }} />}
        <div style={{ display: 'flex', gap: 8 }}>
          {trailing}
        </div>
      </div>
      {large && title && (
        <div style={{ paddingTop: 10 }}>
          <div style={{ font: `700 ${t.density.titleSize}px/1.1 ${t.fonts.sans}`, color: t.ink, letterSpacing: '-0.01em' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ font: `500 13px/1.3 ${t.fonts.sans}`, color: t.muted, marginTop: 4 }}>{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Search bar ──────────────────────────────────────────────
function PtSearch({ t, placeholder = 'Search your things…', value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      height: 44, padding: '0 14px', borderRadius: 14,
      background: t.paperPanel, border: `1px solid ${t.whisper}`,
      color: t.muted,
    }}>
      <PtIcons.search size={18} />
      <span style={{ font: `500 14px/1 ${t.fonts.mono}`, color: value ? t.ink : t.subtle, flex: 1 }}>
        {value || placeholder}
      </span>
    </div>
  );
}

// ─── Reusable screen shell ──────────────────────────────────
function PtScreen({ t, children, bg, style, padBottom = true }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: bg || t.paperBg, color: t.ink,
      fontFamily: t.fonts.sans, overflow: 'hidden',
      ...style,
    }}>
      <div style={{ position: 'absolute', inset: 0, paddingBottom: padBottom ? 80 : 0, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, {
  PtButton, PtMono, PtIconWell, PtAvatar, PtAvatarStack, PtChip, PtPriority,
  PtBottomNav, PtSection, PtBoardCard, PtNoteCard, PtTaskCard,
  PtBottomSheet, PtAppBar, PtSearch, PtScreen,
});
