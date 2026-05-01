// screens-auth.jsx — Onboarding + Auth (Sign in, Sign up, OTP)

function ScreenWelcome({ t }) {
  return (
    <PtScreen t={t} padBottom={false}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '60px 24px 32px' }}>
        {/* Brand mark — favicon sprout */}
        <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18 }}>
          <PtLogo variant="tile" size={64} />
          <PtLogoLockup t={t} dark={t.dark} size={28} tagline="The working garden" />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16 }}>
          <h1 style={{ font: `700 38px/1.05 ${t.fonts.sans}`, color: t.ink, margin: 0, letterSpacing: '-0.02em' }}>
            Plans that <span style={{ color: t.accent.hex, fontStyle: 'italic' }}>grow</span> with you.
          </h1>
          <p style={{ font: `400 16px/1.45 ${t.fonts.sans}`, color: t.muted, margin: 0, maxWidth: 280 }}>
            Boards, notes, and drawings on one calm surface. Shape it around your work — not the other way around.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>
          <PtButton t={t} kind="primary" full>Create your workspace</PtButton>
          <PtButton t={t} kind="ghost" full>I already have an account</PtButton>
        </div>
      </div>
    </PtScreen>
  );
}

function PtField({ t, label, value, placeholder, mono, trailing, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <PtMono t={t}>{label}</PtMono>
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 48, padding: '0 14px', borderRadius: 14,
        background: t.paperPanel,
        border: `1.5px solid ${error ? t.accent.hex : t.whisper}`,
      }}>
        <span style={{
          flex: 1, color: value ? t.ink : t.subtle,
          font: `${mono ? 500 : 400} 15px/1 ${mono ? t.fonts.mono : t.fonts.sans}`,
        }}>{value || placeholder}</span>
        {trailing}
      </div>
      {error && (
        <span style={{ font: `500 12px/1.3 ${t.fonts.sans}`, color: t.accent.hex }}>{error}</span>
      )}
    </div>
  );
}

function ScreenSignIn({ t }) {
  return (
    <PtScreen t={t} padBottom={false}>
      <div style={{ padding: '60px 24px 32px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <button style={{ width: 36, height: 36, borderRadius: 12, border: 0, background: t.paperPanel, color: t.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PtIcons.back />
        </button>
        <div style={{ marginTop: 28, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PtLogo variant="tile" size={48} />
          <PtMono t={t}>Welcome back</PtMono>
          <h1 style={{ font: `700 28px/1.1 ${t.fonts.sans}`, color: t.ink, margin: 0, letterSpacing: '-0.01em' }}>
            Sign in to PlanThing
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PtField t={t} label="Email" value="eugene@planthing.app" mono />
          <PtField t={t} label="Password" value="••••••••••" trailing={<span style={{ color: t.muted }}><PtIcons.eyeOff size={18} /></span>} />
          <span style={{ font: `600 13px/1 ${t.fonts.sans}`, color: t.link, alignSelf: 'flex-end' }}>Forgot password?</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PtButton t={t} kind="primary" full>Sign in</PtButton>
          <div style={{ textAlign: 'center', font: `400 13px/1 ${t.fonts.sans}`, color: t.muted }}>
            New here? <span style={{ color: t.ink, fontWeight: 600 }}>Create an account</span>
          </div>
        </div>
      </div>
    </PtScreen>
  );
}

function ScreenSignUp({ t }) {
  return (
    <PtScreen t={t} padBottom={false}>
      <div style={{ padding: '60px 24px 32px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <button style={{ width: 36, height: 36, borderRadius: 12, border: 0, background: t.paperPanel, color: t.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PtIcons.back />
        </button>
        <div style={{ marginTop: 28, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PtLogo variant="tile" size={44} />
          <PtMono t={t}>Step 1 of 2</PtMono>
          <h1 style={{ font: `700 28px/1.1 ${t.fonts.sans}`, color: t.ink, margin: 0, letterSpacing: '-0.01em' }}>
            Make your account
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PtField t={t} label="Your name" value="Eugene Carl" />
          <PtField t={t} label="Email" value="eugene@planthing.app" mono />
          <PtField t={t} label="Password" placeholder="At least 8 characters" />
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '12px 14px', borderRadius: 12,
            background: t.paperPanel, border: `1px solid ${t.whisper}`,
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: t.ink, color: t.paperBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <PtIcons.check size={13} />
            </div>
            <span style={{ font: `400 13px/1.4 ${t.fonts.sans}`, color: t.muted }}>
              I agree to the <span style={{ color: t.ink, fontWeight: 600 }}>Terms</span> and <span style={{ color: t.ink, fontWeight: 600 }}>Privacy</span>.
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <PtButton t={t} kind="primary" full>Continue</PtButton>
      </div>
    </PtScreen>
  );
}

function ScreenOTP({ t }) {
  const code = ['4', '7', '2', '', '', ''];
  return (
    <PtScreen t={t} padBottom={false}>
      <div style={{ padding: '60px 24px 32px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <button style={{ width: 36, height: 36, borderRadius: 12, border: 0, background: t.paperPanel, color: t.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PtIcons.back />
        </button>
        <div style={{ marginTop: 28, marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PtLogo variant="tile" size={44} />
          <PtMono t={t}>Step 2 of 2</PtMono>
          <h1 style={{ font: `700 26px/1.15 ${t.fonts.sans}`, color: t.ink, margin: '8px 0 12px', letterSpacing: '-0.01em' }}>
            Confirm your email
          </h1>
          <p style={{ font: `400 14px/1.45 ${t.fonts.sans}`, color: t.muted, margin: 0 }}>
            We sent a 6-digit code to <span style={{ color: t.ink, fontWeight: 600 }}>eugene@planthing.app</span>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 24, marginBottom: 16 }}>
          {code.map((d, i) => (
            <div key={i} style={{
              flex: 1, height: 56, borderRadius: 12,
              background: d ? t.paperPanel : 'transparent',
              border: i === 3
                ? `2px solid ${t.ink}`
                : `1.5px solid ${d ? t.whisperStrong : t.whisper}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              font: `700 24px/1 ${t.fonts.mono}`, color: t.ink,
            }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.muted, font: `500 12px/1 ${t.fonts.sans}` }}>
          <PtIcons.clock size={14} />
          <span>Resend code in 0:42</span>
        </div>
        <div style={{ flex: 1 }} />
        <PtButton t={t} kind="primary" full>Verify and continue</PtButton>
      </div>
    </PtScreen>
  );
}

function ScreenOnboardEmpty({ t }) {
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Workspace" subtitle="Eugene's workspace" leading={null} large
        trailing={<><button style={btnIcon(t)}><PtIcons.search /></button><button style={btnIcon(t)}><PtIcons.more /></button></>} />
      <div style={{
        height: 'calc(100% - 80px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', gap: 16,
      }}>
        {/* Stacked-paper hero with the sprout mark on top */}
        <div style={{ position: 'relative', width: 156, height: 156, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 8, borderRadius: 28, background: t.paperPanel, border: `1px solid ${t.whisper}`, transform: 'rotate(-6deg)', boxShadow: t.cardShadow }} />
          <div style={{ position: 'absolute', inset: 18, borderRadius: 24, background: t.paperPanelDeep, transform: 'rotate(4deg)' }} />
          <div style={{ position: 'relative', transform: 'rotate(-2deg)' }}>
            <PtLogo variant="tile" size={88} />
          </div>
        </div>
        <h2 style={{ font: `700 22px/1.2 ${t.fonts.sans}`, color: t.ink, margin: 0, letterSpacing: '-0.01em' }}>
          Plant your first board
        </h2>
        <p style={{ font: `400 14px/1.5 ${t.fonts.sans}`, color: t.muted, margin: 0, maxWidth: 240 }}>
          Boards are where your tasks live. Add columns and cards to shape it however your plan needs.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'stretch', maxWidth: 280, margin: '8px auto 0' }}>
          <PtButton t={t} kind="primary" full icon={<PtIcons.plus size={16} />}>New board</PtButton>
          <PtButton t={t} kind="secondary" full icon={<PtIcons.note size={16} />}>Start a note instead</PtButton>
        </div>
      </div>
      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

const btnIcon = (t) => ({
  width: 36, height: 36, borderRadius: 12, border: 0,
  background: t.paperPanel, color: t.ink,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', boxShadow: t.cardShadow,
});

Object.assign(window, { ScreenWelcome, ScreenSignIn, ScreenSignUp, ScreenOTP, ScreenOnboardEmpty, PtField, btnIcon });
