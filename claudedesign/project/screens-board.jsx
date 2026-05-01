// screens-board.jsx — Board detail (kanban variants)

// Variant A: Horizontal swipe — full columns side-by-side, snap.
function ScreenBoardSwipe({ t, dragging = false }) {
  const cols = [
    { name: 'Backlog', count: 6, tint: 'ink', tasks: [
      { title: 'Audit competitor onboarding flows', labels: ['blue'], priority: 'low', due: 'May 6' },
      { title: 'Sketch new sprout illustration', labels: ['rose','amber'], priority: 'med' },
      { title: 'Move marketing copy out of board model', labels: ['ink'], priority: 'low' },
    ]},
    { name: 'In progress', count: 4, tint: 'amber', dragging, tasks: [
      { title: 'Ship onboarding rewrite v2', labels: ['red','violet'], priority: 'high', due: 'Today',
        assignees: [{ i: 'EC', t: 'amber' }, { i: 'MR', t: 'green' }], comments: 4 },
      { title: 'Polish empty-state illustration set', labels: ['rose'], priority: 'med', due: 'May 3',
        assignees: [{ i: 'KP', t: 'blue' }] },
    ]},
    { name: 'Review', count: 2, tint: 'violet', tasks: [
      { title: 'Auth: error copy + reduced motion', labels: ['blue'], priority: 'med', due: 'May 2',
        assignees: [{ i: 'MR', t: 'green' }], comments: 7 },
    ]},
    { name: 'Done', count: 14, tint: 'green', tasks: [
      { title: 'Set up Convex schema for boards', labels: ['green'], done: true, due: 'Apr 28' },
    ]},
  ];

  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Launch Plan" subtitle="Owner · 24 tasks · 4 columns" large
        leading="back"
        trailing={<><button style={btnIcon(t)}><PtIcons.starF /></button><button style={btnIcon(t)}><PtIcons.more /></button></>}
      />

      {/* Column tabs strip */}
      <div style={{ padding: '4px 18px 8px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {cols.map((c, i) => (
          <button key={i} style={{
            flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 999, border: 0,
            background: i === 1 ? t.ink : 'transparent',
            color: i === 1 ? t.paperBg : t.muted,
            font: `600 12px/1 ${t.fonts.sans}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.boardTints[c.tint].fg }} />
            {c.name} · {c.count}
          </button>
        ))}
      </div>

      {/* Horizontal swipe columns. The "current" column shows fully (column 2);
          the previous and next peek at left/right edges so the swipe is discoverable. */}
      <div style={{
        display: 'flex', gap: 12, padding: '4px 18px 24px',
        overflowX: 'auto', scrollSnapType: 'x mandatory',
      }}>
        {cols.map((c, i) => (
          <div key={i} style={{
            flexShrink: 0, width: 'calc(100% - 28px)', scrollSnapAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.boardTints[c.tint].fg }} />
                <span style={{ font: `700 14px/1 ${t.fonts.sans}`, color: t.ink }}>{c.name}</span>
                <span style={{ font: `700 11px/1 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.08em' }}>{c.count}</span>
              </div>
              <PtIcons.more size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.tasks.map((task, j) => (
                <PtTaskCard key={j} t={t} {...task} dragging={c.dragging && j === 0} />
              ))}
              <button style={{
                height: 38, border: `1px dashed ${t.whisperStrong}`, borderRadius: 10,
                background: 'transparent', color: t.muted,
                font: `600 13px/1 ${t.fonts.sans}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <PtIcons.plus size={14} /> Add card
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Page dots */}
      <div style={{ position: 'absolute', bottom: 92, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
        {cols.map((_, i) => (
          <span key={i} style={{
            width: i === 1 ? 18 : 6, height: 6, borderRadius: 999,
            background: i === 1 ? t.ink : t.whisperStrong, transition: 'all 200ms',
          }} />
        ))}
      </div>

      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

// Variant B: Single column with column-switcher pill at top
function ScreenBoardSingle({ t }) {
  return (
    <PtScreen t={t}>
      <div style={{ padding: '60px 18px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={btnIcon(t)}><PtIcons.back /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PtAvatarStack people={[{i:'EC',t:'amber'},{i:'MR',t:'green'},{i:'KP',t:'blue'}]} t={t} />
            <button style={btnIcon(t)}><PtIcons.more /></button>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <PtMono t={t}>Launch Plan · column 2 of 4</PtMono>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
          }}>
            <button style={{ width: 32, height: 32, borderRadius: 10, border: 0, background: t.paperPanel, color: t.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <PtIcons.back size={18} />
            </button>
            <h1 style={{
              flex: 1, font: `700 26px/1.1 ${t.fonts.sans}`, color: t.ink, margin: 0,
              letterSpacing: '-0.01em', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.boardTints.amber.fg }} />
              In progress
            </h1>
            <button style={{ width: 32, height: 32, borderRadius: 10, border: 0, background: t.ink, color: t.paperBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <PtIcons.arrow size={18} />
            </button>
          </div>
        </div>
      </div>
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { title: 'Ship onboarding rewrite v2', labels: ['red','violet'], priority: 'high', due: 'Today',
            assignees: [{ i: 'EC', t: 'amber' }, { i: 'MR', t: 'green' }], comments: 4 },
          { title: 'Polish empty-state illustration set', labels: ['rose'], priority: 'med', due: 'May 3',
            assignees: [{ i: 'KP', t: 'blue' }] },
          { title: 'Wire the OTP throttle to Convex', labels: ['blue','green'], priority: 'med',
            assignees: [{ i: 'MR', t: 'green' }], comments: 2 },
          { title: 'Decide on Sprout Red intensity for dark mode', labels: ['red'], priority: 'low' },
        ].map((task, j) => (
          <PtTaskCard key={j} t={t} {...task} />
        ))}
        <button style={{
          height: 44, border: `1px dashed ${t.whisperStrong}`, borderRadius: 12,
          background: 'transparent', color: t.muted,
          font: `600 14px/1 ${t.fonts.sans}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <PtIcons.plus size={16} /> Add card to In progress
        </button>
      </div>
      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

// Variant C: Stacked vertical (all columns flow down)
function ScreenBoardStacked({ t }) {
  const cols = [
    { name: 'Backlog', tint: 'ink', count: 6,
      tasks: [{ title: 'Audit competitor onboarding', priority: 'low' }] },
    { name: 'In progress', tint: 'amber', count: 4,
      tasks: [
        { title: 'Ship onboarding rewrite v2', labels: ['red'], priority: 'high', due: 'Today',
          assignees: [{ i: 'EC', t: 'amber' }], comments: 4 },
        { title: 'Polish empty-state illustration', labels: ['rose'], priority: 'med', due: 'May 3' },
      ] },
    { name: 'Review', tint: 'violet', count: 2,
      tasks: [{ title: 'Auth: error copy', priority: 'med', comments: 7,
        assignees: [{ i: 'MR', t: 'green' }] }] },
  ];
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Launch Plan" subtitle="24 tasks · 4 columns" large
        trailing={<><button style={btnIcon(t)}><PtIcons.starF /></button><button style={btnIcon(t)}><PtIcons.more /></button></>}
      />
      <div style={{ padding: '4px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {cols.map((c, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.boardTints[c.tint].fg }} />
                <span style={{ font: `700 14px/1 ${t.fonts.sans}`, color: t.ink }}>{c.name}</span>
                <span style={{ font: `700 11px/1 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.08em' }}>{c.count}</span>
              </div>
              <PtIcons.more size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.tasks.map((task, j) => <PtTaskCard key={j} t={t} {...task} />)}
            </div>
          </div>
        ))}
      </div>
      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

// Long-press contextual menu over a card
function ScreenBoardLongPress({ t }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ScreenBoardSwipe t={t} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
      }} />
      <div style={{
        position: 'absolute', top: 220, left: 30, right: 30,
        background: t.dark ? t.paperPanelDeep : '#fff',
        borderRadius: 12, padding: 12,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        transform: 'scale(1.04)',
      }}>
        <PtTaskCard t={t} title="Ship onboarding rewrite v2" labels={['red','violet']} priority="high" due="Today"
          assignees={[{i:'EC',t:'amber'},{i:'MR',t:'green'}]} comments={4} />
      </div>
      <div style={{
        position: 'absolute', top: 410, left: 30, right: 30,
        background: t.sheetBg, borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${t.whisper}`,
        boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
      }}>
        {[
          { l: 'Open task', i: PtIcons.arrow },
          { l: 'Move to…', i: PtIcons.list },
          { l: 'Assign someone', i: PtIcons.user },
          { l: 'Mark complete', i: PtIcons.check },
          { l: 'Delete', i: PtIcons.trash, danger: true },
        ].map((row, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${t.whisper}`,
            color: row.danger ? t.accent.hex : t.ink,
          }}>
            <row.i size={18} />
            <span style={{ font: `500 15px/1 ${t.fonts.sans}` }}>{row.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenBoardSwipe, ScreenBoardSingle, ScreenBoardStacked, ScreenBoardLongPress });
