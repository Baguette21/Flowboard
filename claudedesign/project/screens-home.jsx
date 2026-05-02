// screens-home.jsx — Home dashboard variants

// Variant A: Mixed feed (boards + notes + drawings together, sectioned)
function ScreenHomeMixed({ t, populated = true }) {
  if (!populated) return <ScreenOnboardEmpty t={t} />;
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Workspace" subtitle="Tuesday · 6 things due" large
        leading={null}
        trailing={<><button style={btnIcon(t)}><PtIcons.search /></button><PtAvatar initials="EC" tint="amber" size={36} t={t} /></>}
      />
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Today strip */}
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: t.accent.tint, border: `1px solid ${t.accent.tintStrong}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 38, height: 38, flexShrink: 0 }}>
            <PtLogo variant="tile" size={38} shadow={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 14px/1.2 ${t.fonts.sans}`, color: t.ink }}>3 tasks due today</div>
            <div style={{ font: `500 12px/1.3 ${t.fonts.sans}`, color: t.muted }}>Launch plan, Brand kit · tap to focus</div>
          </div>
          <PtIcons.arrow size={18} />
        </div>

        <div>
          <PtSection t={t} label="Favorites" count="2" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PtBoardCard t={t} title="Launch Plan" tint="red" letter="L" meta="Apr 30" count={12} layout="tile" />
            <PtBoardCard t={t} title="Brand Kit" tint="violet" letter="B" meta="Today" count={8} layout="tile" />
          </div>
        </div>

        <div>
          <PtSection t={t} label="Boards" count="04" action="See all" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PtBoardCard t={t} title="Roadmap Q3" tint="green" letter="R" meta="3d ago" owner="Eugene" shared count="24" />
            <PtBoardCard t={t} title="Hiring Pipeline" tint="blue" letter="H" meta="Yesterday" owner="Mira" shared count="18" />
            <PtBoardCard t={t} title="Personal" tint="amber" letter="P" meta="Today" count="6" />
          </div>
        </div>

        <div>
          <PtSection t={t} label="Recent notes" count="03" action="See all" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PtNoteCard t={t} tint="amber" title="Onboarding flow rewrite"
              snippet="Trim the welcome screen to two screens. Move the workspace creation step inline. Keep the OTP." date="2h ago" />
            <PtNoteCard t={t} tint="green" title="Garden journal — week 18"
              snippet="Tomatoes are doing well. Need to repot the basil. Order more soil before Saturday." date="Yesterday" />
          </div>
        </div>

        <div>
          <PtSection t={t} label="Drawings" count="02" action="See all" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <DrawTile t={t} title="Site map" tint="teal" />
            <DrawTile t={t} title="Logo sketches" tint="rose" />
          </div>
        </div>
      </div>
      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

function DrawTile({ t, title, tint }) {
  const tt = t.boardTints[tint];
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden', border: `1px solid ${t.whisper}`,
      background: t.paperPanel, boxShadow: t.cardShadow,
    }}>
      <div style={{
        height: 110, background: tt.bg,
        backgroundImage: `repeating-linear-gradient(135deg, ${tt.fg}22 0 1px, transparent 1px 12px)`,
        position: 'relative',
      }}>
        <svg width="100%" height="100%" viewBox="0 0 160 110" style={{ position: 'absolute', inset: 0 }}>
          <path d="M20 80 Q40 30, 70 60 T 130 50" stroke={tt.fg} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="40" cy="40" r="10" stroke={tt.fg} strokeWidth="2" fill="none" />
          <rect x="90" y="20" width="40" height="24" rx="4" stroke={tt.fg} strokeWidth="2" fill="none" />
        </svg>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ font: `600 13px/1.2 ${t.fonts.sans}`, color: t.ink }}>{title}</div>
        <div style={{ font: `500 11px/1.2 ${t.fonts.sans}`, color: t.subtle, marginTop: 2 }}>4 days ago</div>
      </div>
    </div>
  );
}

// Variant B: Tabs (Boards / Notes / Drawings as segmented control)
function ScreenHomeTabs({ t }) {
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Workspace" subtitle="Eugene Carl" large leading={null}
        trailing={<><button style={btnIcon(t)}><PtIcons.search /></button><PtAvatar initials="EC" tint="amber" size={36} t={t} /></>} />
      <div style={{ padding: '4px 18px 16px' }}>
        <div style={{
          display: 'flex', padding: 4, borderRadius: 12,
          background: t.paperPanel, border: `1px solid ${t.whisper}`,
        }}>
          {['Boards', 'Notes', 'Drawings'].map((l, i) => (
            <button key={l} style={{
              flex: 1, height: 34, border: 0, borderRadius: 9,
              background: i === 0 ? (t.dark ? t.paperPanelDeep : '#fff') : 'transparent',
              color: i === 0 ? t.ink : t.muted,
              font: `600 13px/1 ${t.fonts.sans}`,
              boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '4px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {['All', 'Owned', 'Shared', 'Archived'].map((l, i) => (
            <PtChip key={l} t={t} selected={i === 0} style={{ height: 30, padding: '0 12px', flexShrink: 0 }}>{l}</PtChip>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PtBoardCard t={t} title="Launch Plan" tint="red" letter="L" meta="12 tasks · Apr 30" count="3 due" />
          <PtBoardCard t={t} title="Roadmap Q3" tint="green" letter="R" meta="24 tasks · Mira, +3" owner="Mira" shared />
          <PtBoardCard t={t} title="Brand Kit" tint="violet" letter="B" meta="8 tasks · today" />
          <PtBoardCard t={t} title="Hiring Pipeline" tint="blue" letter="H" meta="18 tasks · 2 shared" shared />
          <PtBoardCard t={t} title="Personal" tint="amber" letter="P" meta="6 tasks · just you" />
          <PtBoardCard t={t} title="Travel — Kyoto" tint="teal" letter="K" meta="4 tasks · Sep 12" />
        </div>
      </div>
      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

// Variant C: Today-first (calendar/agenda flavored)
function ScreenHomeToday({ t }) {
  return (
    <PtScreen t={t}>
      <div style={{ padding: '60px 18px 8px' }}>
        <PtMono t={t}>Tuesday · May 1</PtMono>
        <h1 style={{ font: `700 30px/1.1 ${t.fonts.sans}`, color: t.ink, margin: '6px 0 0', letterSpacing: '-0.01em' }}>
          Good morning, <span style={{ color: t.accent.hex, fontStyle: 'italic', fontWeight: 700 }}>Eugene</span>
        </h1>
      </div>
      <div style={{ padding: '14px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{d:'Mo',n:30},{d:'Tu',n:1,a:1},{d:'We',n:2},{d:'Th',n:3},{d:'Fr',n:4},{d:'Sa',n:5},{d:'Su',n:6}].map((x,i)=>(
            <div key={i} style={{
              flex: 1, padding: '8px 0', borderRadius: 10,
              background: x.a ? t.ink : 'transparent',
              color: x.a ? t.paperBg : t.muted,
              textAlign: 'center', border: x.a ? 'none' : `1px solid ${t.whisper}`,
            }}>
              <div style={{ font: `600 10px/1 ${t.fonts.mono}`, letterSpacing: '0.06em', opacity: 0.7 }}>{x.d}</div>
              <div style={{ font: `700 16px/1 ${t.fonts.sans}`, marginTop: 4 }}>{x.n}</div>
            </div>
          ))}
        </div>

        <div>
          <PtSection t={t} label="Today" count="03" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TodayRow t={t} title="Ship onboarding rewrite v2" board="Launch Plan" tint="red" priority="high" time="10:00" />
            <TodayRow t={t} title="Review hiring pipeline" board="Hiring" tint="blue" priority="med" time="14:30" />
            <TodayRow t={t} title="Repot basil" board="Personal" tint="amber" priority="low" time="evening" done />
          </div>
        </div>

        <div>
          <PtSection t={t} label="Pinned boards" count="03" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { t:'Launch', tint:'red', l:'L' },
              { t:'Brand', tint:'violet', l:'B' },
              { t:'Personal', tint:'amber', l:'P' },
            ].map((b,i)=>(
              <div key={i} style={{ aspectRatio: '1 / 1', borderRadius: 14, background: t.paperPanel, border: `1px solid ${t.whisper}`, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <PtIconWell t={t} tint={b.tint} letter={b.l} size={28} radius={8} />
                <div style={{ font: `700 13px/1.2 ${t.fonts.sans}`, color: t.ink }}>{b.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

function TodayRow({ t, title, board, tint, priority, time, done }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 12,
      background: t.paperPanel, border: `1px solid ${t.whisper}`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        border: done ? `0` : `1.5px solid ${t.whisperStrong}`,
        background: done ? t.ink : 'transparent',
        color: t.paperBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{done && <PtIcons.check size={13} />}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `600 14px/1.25 ${t.fonts.sans}`, color: t.ink, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, font: `500 12px/1.2 ${t.fonts.sans}`, color: t.muted }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.boardTints[tint].fg }} />
          <span>{board}</span><span>·</span><span>{time}</span>
        </div>
      </div>
      <PtPriority level={priority} t={t} />
    </div>
  );
}

Object.assign(window, { ScreenHomeMixed, ScreenHomeTabs, ScreenHomeToday, DrawTile, TodayRow });
