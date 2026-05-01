// app.jsx — Compose all screens into the design canvas + tweaks panel

const PT_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "accent": "sprout",
  "density": "cozy",
  "kanbanMode": "swipe",
  "populated": true,
  "platform": "ios"
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(PT_TWEAK_DEFAULTS);
  const tLight = ptTheme({ dark: false, accent: tw.accent, density: tw.density });
  const tDark  = ptTheme({ dark: true,  accent: tw.accent, density: tw.density });
  const t = tw.dark ? tDark : tLight;

  // Pick the active board screen by tweak
  const ActiveBoard = tw.kanbanMode === 'single' ? ScreenBoardSingle
    : tw.kanbanMode === 'stacked' ? ScreenBoardStacked
    : ScreenBoardSwipe;

  // Helper to wrap any screen in a frame
  const Frame = ({ children, label, sub, platform = tw.platform, dark = tw.dark }) => (
    <PtFrame platform={platform} dark={dark} label={label} sublabel={sub}>
      {children}
    </PtFrame>
  );

  return (
    <>
      <DesignCanvas>
        <DCSection id="brand" title="Brand · System" subtitle="Working garden — paper, ink, sprout red">
          <DCArtboard id="logo" label="Logo · The mark" width={420} height={620}>
            <div style={{
              width: 420, height: 620, borderRadius: 16,
              background: t.paperBg, color: t.ink, padding: 32,
              fontFamily: t.fonts.sans, border: `1px solid ${t.whisper}`,
              display: 'flex', flexDirection: 'column', gap: 18,
            }}>
              <PtMono t={t}>The PlanThing mark</PtMono>
              <div style={{
                background: t.paperPanel, borderRadius: 14, border: `1px solid ${t.whisper}`,
                padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PtLogo variant="tile" size={140} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'Tile', node: <PtLogo variant="tile" size={56} shadow={false} /> },
                  { label: 'Glyph', node: <div style={{ background: t.paperPanelDeep, borderRadius: 10, padding: 8, display: 'flex' }}><PtLogo variant="glyph" size={40} paper={t.ink} accent={t.accent.hex} /></div> },
                  { label: 'On dark', node: <div style={{ background: '#111', borderRadius: 10, padding: 8, display: 'flex' }}><PtLogo variant="glyph" size={40} paper="#E8E4DD" accent={t.accent.hex} /></div> },
                ].map((v) => (
                  <div key={v.label} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '14px 8px', background: t.paperPanel, borderRadius: 12,
                    border: `1px solid ${t.whisper}`,
                  }}>
                    <div style={{ height: 56, display: 'flex', alignItems: 'center' }}>{v.node}</div>
                    <span style={{ font: `700 10px/1 ${t.fonts.mono}`, color: t.muted, letterSpacing: '0.08em' }}>{v.label.toUpperCase()}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <PtMono t={t}>Anatomy</PtMono>
                <div style={{ font: `400 13px/1.5 ${t.fonts.sans}`, color: t.muted }}>
                  A paper sprout in an ink tile. Two soft leaves, one stem, a sprout-red bud — the only place the accent appears in the mark. The bud reads as "the new thing growing."
                </div>
              </div>

              <PtLogoLockup t={t} size={32} tagline="The working garden" />
            </div>
          </DCArtboard>
          <DCArtboard id="cover" label="Cover" width={420} height={620}>
            <div style={{
              width: 420, height: 620, borderRadius: 16,
              background: t.paperBg, color: t.ink,
              padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 14,
              fontFamily: t.fonts.sans,
              boxShadow: '0 18px 50px rgba(0,0,0,0.08)',
              border: `1px solid ${t.whisper}`,
            }}>
              <PtMono t={t}>PlanThing · Mobile · v1</PtMono>
              <h1 style={{ font: `700 44px/1.02 ${t.fonts.sans}`, margin: '8px 0 0', letterSpacing: '-0.02em' }}>
                Plans that <span style={{ color: t.accent.hex, fontStyle: 'italic' }}>grow</span><br />with you.
              </h1>
              <p style={{ font: `400 15px/1.5 ${t.fonts.sans}`, color: t.muted, margin: '8px 0 0', maxWidth: 320 }}>
                A native take on the working garden — boards, notes, and drawings on one calm paper surface, sized for the hand.
              </p>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(t.boardTints).map(([k, v]) => (
                  <div key={k} style={{ width: 28, height: 28, borderRadius: 8, background: v.bg, border: `1px solid ${t.whisper}` }} />
                ))}
              </div>
              <div style={{ font: `500 12px/1.5 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.04em' }}>
                10 screens · 2 platforms · 3 board layouts · 4 accents · light / dark
              </div>
            </div>
          </DCArtboard>
          <DCArtboard id="principles" label="Principles" width={420} height={620}>
            <div style={{
              width: 420, height: 620, borderRadius: 16,
              background: t.paperPanel, color: t.ink,
              padding: '32px 32px', fontFamily: t.fonts.sans,
              border: `1px solid ${t.whisper}`,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <PtMono t={t}>Mobile principles applied</PtMono>
              {[
                { k: '01', t: 'Bottom bar over sidebar', b: '5 items, 44px hit targets, primary action centered.' },
                { k: '02', t: 'Type scaled up', b: 'Body 15-16px, large titles 26-30px. Mono labels stay 11-12px.' },
                { k: '03', t: 'One direction per section', b: 'Kanban: horizontal swipe between columns, vertical scroll within.' },
                { k: '04', t: 'No double-nested cards', b: 'Cards group with whitespace inside. Property rows over inner cards.' },
                { k: '05', t: 'Bottom sheets keep context', b: 'Task detail, assignee, filters all slide up. Background dims and zooms 4%.' },
                { k: '06', t: 'Long press = right click', b: 'Card menu blurs the board, lifts the target.' },
                { k: '07', t: 'Dynamic actions', b: 'Note editor hides bottom nav, reveals format bar.' },
                { k: '08', t: 'Designed empty states', b: 'Onboarding hero + soft "no results" with a way out.' },
              ].map((row) => (
                <div key={row.k} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ font: `700 11px/1.2 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.08em', width: 22 }}>{row.k}</span>
                  <div>
                    <div style={{ font: `700 14px/1.25 ${t.fonts.sans}`, color: t.ink }}>{row.t}</div>
                    <div style={{ font: `400 13px/1.4 ${t.fonts.sans}`, color: t.muted, marginTop: 2 }}>{row.b}</div>
                  </div>
                </div>
              ))}
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="onboarding" title="Onboarding · Auth" subtitle="Welcome → sign-up → OTP → empty state">
          <DCArtboard id="welcome" label="Welcome" width={360} height={760}>
            <Frame label="WELCOME"><ScreenWelcome t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="signup" label="Sign up" width={360} height={760}>
            <Frame label="SIGN UP"><ScreenSignUp t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="otp" label="OTP" width={360} height={760}>
            <Frame label="OTP VERIFY"><ScreenOTP t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="signin" label="Sign in" width={360} height={760}>
            <Frame label="SIGN IN"><ScreenSignIn t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="empty" label="First-run empty" width={360} height={760}>
            <Frame label="EMPTY · FIRST RUN"><ScreenOnboardEmpty t={t} /></Frame>
          </DCArtboard>
        </DCSection>

        <DCSection id="home" title="Home dashboard · 3 variants" subtitle="A · Mixed feed   B · Tabs   C · Today-first">
          <DCArtboard id="home-a" label="A · Mixed feed" width={360} height={760}>
            <Frame label="HOME A" sub="Sectioned feed">
              {tw.populated ? <ScreenHomeMixed t={t} /> : <ScreenOnboardEmpty t={t} />}
            </Frame>
          </DCArtboard>
          <DCArtboard id="home-b" label="B · Tabs" width={360} height={760}>
            <Frame label="HOME B" sub="Segmented control"><ScreenHomeTabs t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="home-c" label="C · Today" width={360} height={760}>
            <Frame label="HOME C" sub="Agenda first"><ScreenHomeToday t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="home-android" label="Android · A" width={376} height={780}>
            <Frame platform="android" label="HOME · ANDROID" sub="Material 3 chrome">
              {tw.populated ? <ScreenHomeMixed t={t} /> : <ScreenOnboardEmpty t={t} />}
            </Frame>
          </DCArtboard>
          <DCArtboard id="home-dark" label="Dark mode" width={360} height={760}>
            <Frame dark={true} label="HOME · DARK">
              <ScreenHomeMixed t={tDark} />
            </Frame>
          </DCArtboard>
        </DCSection>

        <DCSection id="board-views" title="Board views · List · Calendar · Table" subtitle="Same board, four ways to look at it">
          <DCArtboard id="view-list" label="List view" width={360} height={760}>
            <Frame label="LIST VIEW" sub="Grouped by column, no card-in-card"><ScreenBoardList t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="view-calendar" label="Calendar view" width={360} height={760}>
            <Frame label="CALENDAR VIEW" sub="Month grid + selected day"><ScreenBoardCalendar t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="view-table" label="Table view" width={360} height={760}>
            <Frame label="TABLE VIEW" sub="Sticky title col · scroll properties"><ScreenBoardTable t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="view-list-dark" label="List · dark" width={360} height={760}>
            <Frame dark label="LIST · DARK"><ScreenBoardList t={tDark} /></Frame>
          </DCArtboard>
          <DCArtboard id="view-cal-dark" label="Calendar · dark" width={360} height={760}>
            <Frame dark label="CAL · DARK"><ScreenBoardCalendar t={tDark} /></Frame>
          </DCArtboard>
        </DCSection>

        <DCSection id="board" title="Board detail · 3 kanban layouts" subtitle="Toggle layout in Tweaks · long-press shows context menu">
          <DCArtboard id="board-swipe" label="A · Horizontal swipe" width={360} height={760}>
            <Frame label="BOARD A" sub="One column visible, peek neighbors"><ScreenBoardSwipe t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="board-single" label="B · Single column" width={360} height={760}>
            <Frame label="BOARD B" sub="Switcher pill at top"><ScreenBoardSingle t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="board-stacked" label="C · Stacked vertical" width={360} height={760}>
            <Frame label="BOARD C" sub="All columns flow down"><ScreenBoardStacked t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="board-drag" label="Drag in progress" width={360} height={760}>
            <Frame label="BOARD · DRAGGING">
              <ScreenBoardSwipe t={t} dragging={true} />
            </Frame>
          </DCArtboard>
          <DCArtboard id="board-longpress" label="Long-press menu" width={360} height={760}>
            <Frame label="LONG PRESS">
              <ScreenBoardLongPress t={t} />
            </Frame>
          </DCArtboard>
          <DCArtboard id="board-active" label="Active layout" width={360} height={760}>
            <Frame label={`ACTIVE · ${tw.kanbanMode.toUpperCase()}`}>
              <ActiveBoard t={t} />
            </Frame>
          </DCArtboard>
        </DCSection>

        <DCSection id="task" title="Task detail · 3 variants" subtitle="A · Bottom sheet (anchored) · B · Full-screen · C · Assignee picker">
          <DCArtboard id="task-sheet" label="A · Sheet over board" width={360} height={760}>
            <Frame label="TASK A" sub="Anchored sheet · 86% height"><ScreenTaskSheet t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="task-full" label="B · Full screen" width={360} height={760}>
            <Frame label="TASK B" sub="Dedicated page"><ScreenTaskFull t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="task-assign" label="C · Assign sheet" width={360} height={760}>
            <Frame label="TASK · ASSIGN" sub="Allow-assign restriction visible"><ScreenTaskAssign t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="task-android" label="Android · sheet" width={376} height={780}>
            <Frame platform="android" label="TASK · ANDROID"><ScreenTaskSheet t={t} /></Frame>
          </DCArtboard>
        </DCSection>

        <DCSection id="notes" title="Notes" subtitle="List → editor → focused-edit dynamic actions">
          <DCArtboard id="notes-list" label="Notes list" width={360} height={760}>
            <Frame label="NOTES LIST"><ScreenNotesList t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="notes-editor" label="Note · reading" width={360} height={760}>
            <Frame label="NOTE · READ"><ScreenNoteEditor t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="notes-focused" label="Note · editing" width={360} height={760}>
            <Frame label="NOTE · FOCUSED" sub="Nav hidden, format bar revealed"><ScreenNoteEditor t={t} focused={true} /></Frame>
          </DCArtboard>
        </DCSection>

        <DCSection id="drawings" title="Drawings" subtitle="List → canvas">
          <DCArtboard id="draw-list" label="Drawings list" width={360} height={760}>
            <Frame label="DRAWINGS"><ScreenDrawingsList t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="draw-canvas" label="Canvas" width={360} height={760}>
            <Frame label="CANVAS"><ScreenDrawCanvas t={t} /></Frame>
          </DCArtboard>
        </DCSection>

        <DCSection id="utility" title="Search · Inbox · Settings · Profile" subtitle="The supporting cast">
          <DCArtboard id="search-results" label="Search · results" width={360} height={760}>
            <Frame label="SEARCH"><ScreenSearch t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="search-blank" label="Search · no results" width={360} height={760}>
            <Frame label="SEARCH · BLANK STATE"><ScreenSearch t={t} blank={true} /></Frame>
          </DCArtboard>
          <DCArtboard id="inbox" label="Notifications" width={360} height={760}>
            <Frame label="INBOX"><ScreenNotifications t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="settings" label="Board settings" width={360} height={760}>
            <Frame label="SETTINGS · ALLOW ASSIGN"><ScreenBoardSettings t={t} /></Frame>
          </DCArtboard>
          <DCArtboard id="profile" label="Profile" width={360} height={760}>
            <Frame label="PROFILE"><ScreenProfile t={t} /></Frame>
          </DCArtboard>
        </DCSection>

        <DCSection id="dark" title="Dark mode parity" subtitle="Same flows on dark paper">
          <DCArtboard id="d-home" label="Home · dark" width={360} height={760}>
            <Frame dark label="HOME"><ScreenHomeMixed t={tDark} /></Frame>
          </DCArtboard>
          <DCArtboard id="d-board" label="Board · dark" width={360} height={760}>
            <Frame dark label="BOARD"><ScreenBoardSwipe t={tDark} /></Frame>
          </DCArtboard>
          <DCArtboard id="d-task" label="Task · dark" width={360} height={760}>
            <Frame dark label="TASK"><ScreenTaskFull t={tDark} /></Frame>
          </DCArtboard>
          <DCArtboard id="d-note" label="Note · dark" width={360} height={760}>
            <Frame dark label="NOTE · FOCUSED"><ScreenNoteEditor t={tDark} focused={true} /></Frame>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakToggle label="Dark mode" value={tw.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakRadio label="Accent" value={tw.accent}
          options={[
            { value: 'sprout', label: 'Sprout' },
            { value: 'garden', label: 'Garden' },
            { value: 'ink',    label: 'Ink' },
            { value: 'sun',    label: 'Sun' },
          ]}
          onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Density" value={tw.density}
          options={[{ value: 'cozy', label: 'Cozy' }, { value: 'compact', label: 'Compact' }]}
          onChange={(v) => setTweak('density', v)} />

        <TweakSection label="Layout" />
        <TweakRadio label="Kanban" value={tw.kanbanMode}
          options={[
            { value: 'swipe',   label: 'Swipe' },
            { value: 'single',  label: 'Single' },
            { value: 'stacked', label: 'Stacked' },
          ]}
          onChange={(v) => setTweak('kanbanMode', v)} />
        <TweakRadio label="Platform" value={tw.platform}
          options={[{ value: 'ios', label: 'iOS' }, { value: 'android', label: 'Android' }]}
          onChange={(v) => setTweak('platform', v)} />

        <TweakSection label="State" />
        <TweakToggle label="Populated workspace" value={tw.populated} onChange={(v) => setTweak('populated', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
