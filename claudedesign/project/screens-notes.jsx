// screens-notes.jsx — Notes list + editor

function ScreenNotesList({ t }) {
  const notes = [
    { title: 'Onboarding flow rewrite', snippet: 'Trim the welcome to two screens. Move the workspace creation step inline with sign-up. Keep the OTP throttle.', date: '2h ago', tint: 'red' },
    { title: 'Garden journal — week 18', snippet: 'Tomatoes are doing well. Need to repot the basil before Saturday. Order more soil.', date: 'Yesterday', tint: 'green' },
    { title: 'Brand workshop notes', snippet: 'Sprout red is punctuation, not wallpaper. Paper before chrome. Flat until useful.', date: '3d ago', tint: 'amber' },
    { title: 'Hiring criteria — designer', snippet: 'Strong product sense. Comfortable in dense product surfaces. Has shipped a real native app.', date: 'Apr 27', tint: 'blue' },
    { title: 'Kyoto trip plan', snippet: 'Sep 12-19. Stay near Gion. Tea ceremony in Uji. Day trip to Nara for the deer park.', date: 'Apr 24', tint: 'teal' },
    { title: 'Convex schema sketches', snippet: 'boards, columns, tasks, labels, members, invites, notifications, otpAttempts.', date: 'Apr 22', tint: 'violet' },
  ];
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Notes" subtitle="06 notes · 2 favorites" large leading={null}
        trailing={<><button style={btnIcon(t)}><PtIcons.search /></button><button style={btnIcon(t)}><PtIcons.plus /></button></>}
      />
      <div style={{ padding: '4px 18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <PtChip t={t} selected>All</PtChip>
          <PtChip t={t}>Favorites</PtChip>
          <PtChip t={t}>By board</PtChip>
        </div>
        {notes.map((n, i) => (
          <PtNoteCard key={i} t={t} {...n} />
        ))}
      </div>
      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

function ScreenNoteEditor({ t, focused = false }) {
  return (
    <PtScreen t={t} padBottom={!focused}>
      <div style={{ padding: '60px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={btnIcon(t)}><PtIcons.back /></button>
        <PtMono t={t}>Saved · just now</PtMono>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnIcon(t)}><PtIcons.starF /></button>
          <button style={btnIcon(t)}><PtIcons.more /></button>
        </div>
      </div>
      <div style={{ padding: '14px 22px 100px' }}>
        <h1 style={{ font: `700 28px/1.15 ${t.fonts.sans}`, color: t.ink, margin: 0, letterSpacing: '-0.01em' }}>
          Onboarding flow rewrite
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, font: `500 12px/1 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.06em' }}>
          <span>MAY 1 · 2026</span><span>·</span><PtIcons.link size={12} /><span>LAUNCH PLAN</span>
        </div>

        <div style={{ marginTop: 20, font: `400 16px/1.55 ${t.fonts.sans}`, color: t.ink }}>
          <p style={{ margin: '0 0 14px' }}>Trim the welcome to two screens. Move workspace creation inline with sign-up so the user lands on a real board faster.</p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '18px 0 8px' }}>
            <span style={{ font: `700 17px/1 ${t.fonts.sans}`, color: t.ink }}>What survives</span>
          </div>
          <ul style={{ margin: '0 0 14px', paddingLeft: 18 }}>
            <li style={{ marginBottom: 4 }}>OTP throttle (1 minute cooldown)</li>
            <li style={{ marginBottom: 4 }}>Empty-state hero illustration</li>
            <li>Reduced-motion off-switch</li>
          </ul>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '18px 0 8px' }}>
            <span style={{ font: `700 17px/1 ${t.fonts.sans}`, color: t.ink }}>Open questions</span>
          </div>
          <p style={{ margin: '0 0 12px' }}>Should the workspace name be required up front, or can we infer it from the user's name and let them rename later?</p>

          <div style={{
            display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12,
            background: t.accent.tint, border: `1px solid ${t.accent.tintStrong}`,
            font: `500 13px/1.45 ${t.fonts.sans}`, color: t.ink,
          }}>
            <PtIcons.flag size={16} />
            <span><b>Decision:</b> infer "Eugene's workspace", let them rename in settings.</span>
          </div>
          <div style={{ height: 1, background: t.whisper, margin: '20px 0' }} />
          <p style={{ font: `400 14px/1.45 ${t.fonts.sans}`, color: t.muted, margin: 0, fontStyle: 'italic' }}>
            Linked to <span style={{ color: t.link, fontStyle: 'normal' }}>Launch Plan / Ship onboarding rewrite v2</span>.
          </p>
        </div>
      </div>

      {/* Dynamic action bar — replaces nav while editing (per principles) */}
      {focused ? (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '8px 12px 24px',
          background: t.dark ? 'rgba(23,21,15,0.96)' : 'rgba(245,243,238,0.96)',
          backdropFilter: 'blur(20px)', borderTop: `0.5px solid ${t.whisper}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {[PtIcons.bold, PtIcons.italic, PtIcons.list, PtIcons.bullet, PtIcons.attach, PtIcons.link].map((I, i) => (
            <button key={i} style={{
              width: 40, height: 40, borderRadius: 10, border: 0,
              background: 'transparent', color: t.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><I size={20} /></button>
          ))}
          <div style={{ flex: 1 }} />
          <PtButton t={t} kind="primary" size="sm">Done</PtButton>
        </div>
      ) : (
        <PtBottomNav t={t} active="home" dark={t.dark} />
      )}
    </PtScreen>
  );
}

Object.assign(window, { ScreenNotesList, ScreenNoteEditor });
