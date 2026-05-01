// screens-drawings.jsx — Drawings list + canvas editor

function ScreenDrawingsList({ t }) {
  const tiles = [
    { title: 'Site map', tint: 'teal', date: '4d ago' },
    { title: 'Logo sketches', tint: 'rose', date: '1w ago' },
    { title: 'Onboarding storyboard', tint: 'amber', date: 'Yesterday' },
    { title: 'Kanban motion notes', tint: 'violet', date: '2w ago' },
  ];
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Drawings" subtitle="04 sketches" large leading={null}
        trailing={<><button style={btnIcon(t)}><PtIcons.search /></button><button style={btnIcon(t)}><PtIcons.plus /></button></>}
      />
      <div style={{ padding: '4px 18px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {tiles.map((d, i) => <DrawTile key={i} t={t} {...d} />)}
        </div>
      </div>
      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

function ScreenDrawCanvas({ t }) {
  return (
    <PtScreen t={t} padBottom={false}>
      <div style={{ padding: '60px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={btnIcon(t)}><PtIcons.back /></button>
        <div>
          <div style={{ font: `700 14px/1 ${t.fonts.sans}`, color: t.ink, textAlign: 'center' }}>Site map</div>
          <div style={{ font: `500 11px/1 ${t.fonts.mono}`, color: t.subtle, textAlign: 'center', marginTop: 3, letterSpacing: '0.06em' }}>SAVED · 4D AGO</div>
        </div>
        <button style={btnIcon(t)}><PtIcons.share /></button>
      </div>

      {/* Canvas */}
      <div style={{
        position: 'absolute', left: 14, right: 14, top: 110, bottom: 100,
        borderRadius: 16, overflow: 'hidden',
        background: t.dark ? '#0f0e0a' : '#fafaf6',
        border: `1px solid ${t.whisper}`,
        backgroundImage: t.dark
          ? 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)'
          : 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}>
        <svg width="100%" height="100%" viewBox="0 0 320 540" preserveAspectRatio="xMidYMid meet">
          {/* Boxes */}
          <rect x="120" y="40" width="80" height="38" rx="6" fill="none" stroke={t.ink} strokeWidth="2" />
          <text x="160" y="64" textAnchor="middle" fontFamily={t.fonts.sans} fontSize="13" fontWeight="600" fill={t.ink}>Home</text>

          <rect x="40" y="160" width="80" height="38" rx="6" fill="none" stroke={t.ink} strokeWidth="2" />
          <text x="80" y="184" textAnchor="middle" fontFamily={t.fonts.sans} fontSize="13" fontWeight="600" fill={t.ink}>Boards</text>

          <rect x="200" y="160" width="80" height="38" rx="6" fill="none" stroke={t.ink} strokeWidth="2" />
          <text x="240" y="184" textAnchor="middle" fontFamily={t.fonts.sans} fontSize="13" fontWeight="600" fill={t.ink}>Notes</text>

          <rect x="40" y="280" width="80" height="38" rx="6" fill="none" stroke={t.accent.hex} strokeWidth="2.5" strokeDasharray="0" />
          <text x="80" y="304" textAnchor="middle" fontFamily={t.fonts.sans} fontSize="13" fontWeight="700" fill={t.accent.hex}>Board</text>

          <rect x="200" y="280" width="80" height="38" rx="6" fill="none" stroke={t.ink} strokeWidth="2" />
          <text x="240" y="304" textAnchor="middle" fontFamily={t.fonts.sans} fontSize="13" fontWeight="600" fill={t.ink}>Note</text>

          <rect x="120" y="400" width="80" height="38" rx="6" fill="none" stroke={t.ink} strokeWidth="2" />
          <text x="160" y="424" textAnchor="middle" fontFamily={t.fonts.sans} fontSize="13" fontWeight="600" fill={t.ink}>Task</text>

          {/* Lines */}
          <path d="M155 78 Q120 110, 90 160" stroke={t.muted} strokeWidth="1.5" fill="none" />
          <path d="M165 78 Q210 110, 230 160" stroke={t.muted} strokeWidth="1.5" fill="none" />
          <path d="M80 198 L80 280" stroke={t.muted} strokeWidth="1.5" fill="none" />
          <path d="M240 198 L240 280" stroke={t.muted} strokeWidth="1.5" fill="none" />
          <path d="M120 318 Q140 360, 155 400" stroke={t.accent.hex} strokeWidth="2" fill="none" strokeDasharray="4 4" />

          {/* Sketchy annotation */}
          <text x="40" y="500" fontFamily={t.fonts.mono} fontSize="11" fill={t.muted}>* board → task is the hot path</text>
          <path d="M60 470 Q90 460, 120 450" stroke={t.muted} strokeWidth="1" fill="none" />
        </svg>
      </div>

      {/* Floating tool palette */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 4, padding: 6,
        borderRadius: 999, background: t.dark ? '#0f0e0a' : '#1A1A1A',
        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
      }}>
        {[
          { I: PtIcons.pencil, sel: true },
          { I: PtIcons.bullet },
          { I: PtIcons.tag },
          { I: PtIcons.attach },
          { I: PtIcons.undo },
        ].map((tool, i) => (
          <button key={i} style={{
            width: 40, height: 40, borderRadius: '50%', border: 0,
            background: tool.sel ? '#fff' : 'transparent',
            color: tool.sel ? '#1A1A1A' : 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><tool.I size={18} /></button>
        ))}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
        {['#E63B2E', '#2E8B57', '#2C6EBE', '#F5F3EE'].map((c, i) => (
          <button key={c} style={{
            width: 24, height: 24, borderRadius: '50%', border: i === 0 ? '2px solid #fff' : 'none', background: c,
          }} />
        ))}
      </div>
    </PtScreen>
  );
}

Object.assign(window, { ScreenDrawingsList, ScreenDrawCanvas });
