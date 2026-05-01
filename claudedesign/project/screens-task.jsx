// screens-task.jsx — Task detail variants

// Variant A: Bottom sheet over the board (anchored context, per principles)
function ScreenTaskSheet({ t }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: t.paperBg }}>
      {/* Faded board behind, slightly zoomed out per principles */}
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.94)', transformOrigin: 'top center', opacity: 0.6 }}>
        <ScreenBoardSwipe t={t} />
      </div>
      <PtBottomSheet t={t} height="86%">
        <TaskDetailBody t={t} />
      </PtBottomSheet>
    </div>
  );
}

// Variant B: Full-screen detail page
function ScreenTaskFull({ t }) {
  return (
    <PtScreen t={t} padBottom={false}>
      <div style={{ padding: '60px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={btnIcon(t)}><PtIcons.back /></button>
        <PtMono t={t}>Launch Plan · In progress</PtMono>
        <button style={btnIcon(t)}><PtIcons.more /></button>
      </div>
      <TaskDetailBody t={t} />
    </PtScreen>
  );
}

function TaskDetailBody({ t }) {
  return (
    <div style={{ padding: '14px 20px 100px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto', flex: 1 }}>
      {/* Title row with check */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          border: `1.5px solid ${t.whisperStrong}`,
          flexShrink: 0, marginTop: 4,
        }} />
        <h2 style={{ font: `700 22px/1.25 ${t.fonts.sans}`, color: t.ink, margin: 0, letterSpacing: '-0.01em' }}>
          Ship onboarding rewrite v2
        </h2>
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <PtChip t={t} tint="red">launch</PtChip>
        <PtChip t={t} tint="violet">design</PtChip>
        <PtChip t={t} tint="amber">P0</PtChip>
        <PtChip t={t} icon={<PtIcons.plus size={12} />}>Add</PtChip>
      </div>

      {/* Property grid */}
      <div style={{
        background: t.paperPanel, borderRadius: 14, border: `1px solid ${t.whisper}`,
        padding: '4px 14px', display: 'flex', flexDirection: 'column',
      }}>
        {[
          { l: 'Status',   v: <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:t.boardTints.amber.fg}} />In progress</span> },
          { l: 'Priority', v: <PtPriority level="high" t={t} withLabel /> },
          { l: 'Due',      v: <span style={{ color: t.accent.hex, fontWeight: 600 }}>Today · 6:00 PM</span> },
          { l: 'Assignee', v: <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PtAvatar initials="EC" tint="amber" t={t} size={22} /><span>Eugene</span><PtAvatar initials="MR" tint="green" t={t} size={22} /><span>Mira</span></div> },
          { l: 'Created',  v: <span>Apr 28 · by Eugene</span>, last: true },
        ].map((row, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', minHeight: 44,
            borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${t.whisper}`,
            font: `500 14px/1.3 ${t.fonts.sans}`, color: t.ink,
          }}>
            <span style={{ width: 92, color: t.muted, font: `600 12px/1 ${t.fonts.mono}`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{row.l}</span>
            <span style={{ flex: 1 }}>{row.v}</span>
          </div>
        ))}
      </div>

      {/* Description */}
      <div>
        <PtMono t={t} style={{ marginBottom: 8, display: 'block' }}>Description</PtMono>
        <p style={{ font: `400 14px/1.55 ${t.fonts.sans}`, color: t.ink, margin: 0 }}>
          Trim the welcome to two screens. Move workspace creation inline with sign-up. Keep OTP throttle. Replace the empty-state hero with the new sprout illustration set.
        </p>
        <ul style={{ font: `400 14px/1.65 ${t.fonts.sans}`, color: t.ink, margin: '10px 0 0', paddingLeft: 18 }}>
          <li>Wire reduced-motion off-switch</li>
          <li>Test OTP resend cooldown copy</li>
        </ul>
      </div>

      {/* Activity */}
      <div>
        <PtMono t={t} style={{ marginBottom: 10, display: 'block' }}>Activity · 4</PtMono>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Comment t={t} who="Mira" tint="green" when="2h ago"
            text="Hex on sprout red feels heavy in dark mode. Want to test 70% lightness?" />
          <Comment t={t} who="Eugene" tint="amber" when="1h ago"
            text="Going to keep the canonical hex for accent and only soften it on chips. Pushing." />
        </div>
      </div>
    </div>
  );
}

function Comment({ t, who, tint, when, text }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <PtAvatar initials={who.slice(0,2).toUpperCase()} tint={tint} t={t} size={28} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ font: `700 13px/1 ${t.fonts.sans}`, color: t.ink }}>{who}</span>
          <span style={{ font: `500 11px/1 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.06em' }}>{when}</span>
        </div>
        <div style={{
          background: t.paperPanel, borderRadius: 12, padding: '10px 12px',
          font: `400 13px/1.45 ${t.fonts.sans}`, color: t.ink,
          border: `1px solid ${t.whisper}`,
        }}>{text}</div>
      </div>
    </div>
  );
}

// Variant C: Quick-action sheet (assign-to bottom sheet)
function ScreenTaskAssign({ t }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.96)', opacity: 0.7 }}>
        <ScreenTaskFull t={t} />
      </div>
      <PtBottomSheet t={t} title="Assign to" height={420}>
        <div style={{ padding: '4px 16px 12px' }}>
          <PtSearch t={t} placeholder="Search teammates…" />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
          {[
            { n: 'Eugene Carl', e: 'eugene@planthing.app', i: 'EC', t: 'amber', sel: true },
            { n: 'Mira Reyes', e: 'mira@planthing.app', i: 'MR', t: 'green', sel: true },
            { n: 'Kai Park', e: 'kai@planthing.app', i: 'KP', t: 'blue', allowed: true },
            { n: 'Sana Lim', e: 'sana@planthing.app', i: 'SL', t: 'rose', restricted: true },
          ].map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
              background: p.sel ? t.accent.tint : 'transparent',
            }}>
              <PtAvatar initials={p.i} tint={p.t} t={t} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 14px/1.2 ${t.fonts.sans}`, color: t.ink }}>{p.n}</div>
                <div style={{ font: `500 12px/1 ${t.fonts.mono}`, color: t.subtle }}>{p.e}</div>
              </div>
              {p.restricted ? (
                <span style={{ font: `500 11px/1.2 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.06em', maxWidth: 80, textAlign: 'right' }}>
                  Assign disabled
                </span>
              ) : (
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: p.sel ? t.ink : 'transparent',
                  border: p.sel ? 0 : `1.5px solid ${t.whisperStrong}`,
                  color: t.paperBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{p.sel && <PtIcons.check size={14} />}</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '10px 16px 24px' }}>
          <PtButton t={t} kind="secondary" full>Cancel</PtButton>
          <PtButton t={t} kind="primary" full>Save · 2</PtButton>
        </div>
      </PtBottomSheet>
    </div>
  );
}

Object.assign(window, { ScreenTaskSheet, ScreenTaskFull, ScreenTaskAssign, TaskDetailBody, Comment });
