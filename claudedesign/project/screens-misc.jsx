// screens-misc.jsx — Search, Notifications, Board settings, Profile

function ScreenSearch({ t, blank = false }) {
  return (
    <PtScreen t={t}>
      <div style={{ padding: '60px 18px 8px', display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, height: 44, borderRadius: 14,
          background: t.paperPanel, border: `2px solid ${t.ink}`,
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
        }}>
          <PtIcons.search size={18} />
          <span style={{ flex: 1, font: `500 14px/1 ${t.fonts.mono}`, color: t.ink }}>
            {blank ? 'spreadshhet' : 'launch'}
          </span>
          <PtIcons.close size={16} />
        </div>
        <PtButton t={t} kind="ghost" size="sm">Cancel</PtButton>
      </div>
      {blank ? (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{
            width: 96, height: 96, borderRadius: 24, margin: '40px auto 16px',
            background: t.paperPanel, border: `1px solid ${t.whisper}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.subtle,
            position: 'relative',
          }}>
            <PtIcons.search size={36} />
            <div style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 28, height: 28, borderRadius: '50%', background: t.accent.tint,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent.hex,
              border: `1.5px solid ${t.paperBg}`,
            }}><PtIcons.close size={14} /></div>
          </div>
          <h3 style={{ font: `700 18px/1.2 ${t.fonts.sans}`, color: t.ink, margin: '0 0 8px' }}>
            Nothing matches "<span style={{ color: t.accent.hex }}>spreadshhet</span>"
          </h3>
          <p style={{ font: `400 13px/1.5 ${t.fonts.sans}`, color: t.muted, margin: 0, maxWidth: 240, marginInline: 'auto' }}>
            Try a shorter query — maybe <span style={{ color: t.ink, fontWeight: 600 }}>spreadsheet</span>, or browse by board.
          </p>
          <div style={{ marginTop: 20 }}><PtButton t={t} kind="secondary">Clear search</PtButton></div>
        </div>
      ) : (
        <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <PtSection t={t} label="Boards · 2" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PtBoardCard t={t} title={<><span>Launch</span><mark style={{ background: t.accent.tint, color: t.ink, padding: 0 }}> Plan</mark></>} tint="red" letter="L" meta="12 tasks · Apr 30" />
              <PtBoardCard t={t} title={<><mark style={{ background: t.accent.tint, color: t.ink, padding: 0 }}>Launch</mark><span> party planning</span></>} tint="rose" letter="L" meta="8 tasks · archived" />
            </div>
          </div>
          <div>
            <PtSection t={t} label="Tasks · 3" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { t: 'Ship onboarding rewrite v2', b: 'Launch Plan' },
                { t: 'Plan launch pre-meeting', b: 'Launch Plan' },
                { t: 'Soft launch announcement copy', b: 'Marketing' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: t.paperPanel, border: `1px solid ${t.whisper}` }}>
                  <div style={{ font: `600 14px/1.3 ${t.fonts.sans}`, color: t.ink }}>{r.t}</div>
                  <div style={{ font: `500 12px/1 ${t.fonts.mono}`, color: t.subtle, marginTop: 4, letterSpacing: '0.04em' }}>{r.b}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <PtSection t={t} label="Notes · 1" />
            <PtNoteCard t={t} title="Launch playbook draft" snippet="Pre-launch checklist…" date="Apr 18" tint="red" />
          </div>
        </div>
      )}
      <PtBottomNav t={t} active="search" dark={t.dark} />
    </PtScreen>
  );
}

function ScreenNotifications({ t }) {
  const items = [
    { kind: 'invite', who: 'Mira', text: 'invited you to', target: 'Roadmap Q3', when: '5m ago', new: true, tint: 'green' },
    { kind: 'assign', who: 'Eugene', text: 'assigned you', target: 'Wire OTP throttle', when: '1h ago', new: true, tint: 'amber' },
    { kind: 'comment', who: 'Mira', text: 'commented on', target: 'Ship onboarding v2', when: '2h ago', new: true, tint: 'green' },
    { kind: 'permission', who: 'Eugene', text: 'enabled assign for', target: 'Kai', when: 'Yesterday', tint: 'amber' },
    { kind: 'due', who: null, text: 'is due tomorrow', target: 'Polish empty-state set', when: 'Yesterday', tint: 'red' },
  ];
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Inbox" subtitle="3 new" large leading={null}
        trailing={<><button style={btnIcon(t)}><PtIcons.check /></button><button style={btnIcon(t)}><PtIcons.settings /></button></>}
      />
      <div style={{ padding: '4px 18px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <PtChip t={t} selected>All</PtChip>
          <PtChip t={t}>Mentions</PtChip>
          <PtChip t={t}>Invites</PtChip>
          <PtChip t={t}>Due soon</PtChip>
        </div>
        {items.map((n, i) => {
          const Icon = n.kind === 'invite' ? PtIcons.invite
            : n.kind === 'assign' ? PtIcons.user
            : n.kind === 'comment' ? PtIcons.note
            : n.kind === 'permission' ? PtIcons.check
            : PtIcons.clock;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px', borderRadius: 12,
              background: n.new ? t.paperPanel : 'transparent',
              border: `1px solid ${n.new ? t.whisper : 'transparent'}`,
              position: 'relative',
            }}>
              {n.new && <span style={{ position: 'absolute', left: 4, top: 18, width: 6, height: 6, borderRadius: '50%', background: t.accent.hex }} />}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: t.boardTints[n.tint].bg, color: t.boardTints[n.tint].fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}><Icon size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `400 14px/1.4 ${t.fonts.sans}`, color: t.ink }}>
                  {n.who && <b style={{ fontWeight: 700 }}>{n.who}</b>}{' '}{n.text}{' '}
                  <b style={{ fontWeight: 700 }}>{n.target}</b>
                </div>
                <div style={{ font: `500 11px/1 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.06em', marginTop: 6 }}>{n.when.toUpperCase()}</div>
                {n.kind === 'invite' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <PtButton t={t} kind="primary" size="sm">Accept</PtButton>
                    <PtButton t={t} kind="ghost" size="sm">Decline</PtButton>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <PtBottomNav t={t} active="inbox" dark={t.dark} />
    </PtScreen>
  );
}

function ScreenBoardSettings({ t }) {
  const members = [
    { n: 'Eugene Carl',  role: 'Owner',  i: 'EC', t: 'amber',  allow: null },
    { n: 'Mira Reyes',   role: 'Member', i: 'MR', t: 'green',  allow: true },
    { n: 'Kai Park',     role: 'Member', i: 'KP', t: 'blue',   allow: true },
    { n: 'Sana Lim',     role: 'Member', i: 'SL', t: 'rose',   allow: false },
  ];
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Board settings" subtitle="Launch Plan" large
        trailing={<button style={btnIcon(t)}><PtIcons.close /></button>} />
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <PtSection t={t} label="Identity" />
          <div style={{
            background: t.paperPanel, borderRadius: 14, border: `1px solid ${t.whisper}`,
            padding: 14, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <PtIconWell t={t} tint="red" letter="L" size={48} radius={12} />
            <div style={{ flex: 1 }}>
              <div style={{ font: `700 16px/1.2 ${t.fonts.sans}`, color: t.ink }}>Launch Plan</div>
              <div style={{ font: `500 12px/1.3 ${t.fonts.sans}`, color: t.muted, marginTop: 4 }}>Get PlanThing v2 out the door by mid-May.</div>
            </div>
            <PtIcons.pencil size={18} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' }}>
            {Object.keys(t.boardTints).map((k) => (
              <div key={k} style={{
                width: 30, height: 30, borderRadius: 9,
                background: t.boardTints[k].bg, color: t.boardTints[k].fg,
                border: k === 'red' ? `2px solid ${t.ink}` : `1px solid ${t.whisper}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: `700 14px/1 ${t.fonts.sans}`, flexShrink: 0,
              }}>L</div>
            ))}
          </div>
        </div>

        <div>
          <PtSection t={t} label="Members · 04" action="Invite" />
          <div style={{
            background: t.paperPanel, borderRadius: 14, border: `1px solid ${t.whisper}`,
            padding: '4px 14px',
          }}>
            {members.map((m, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0',
                borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${t.whisper}`,
              }}>
                <PtAvatar initials={m.i} tint={m.t} t={t} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 14px/1.2 ${t.fonts.sans}`, color: t.ink }}>{m.n}</div>
                  <div style={{ font: `500 11px/1 ${t.fonts.mono}`, color: t.subtle, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.role}</div>
                </div>
                {m.allow == null ? (
                  <PtMono t={t} style={{ color: t.subtle }}>—</PtMono>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PtMono t={t} style={{ color: m.allow ? t.ink : t.subtle }}>Assign</PtMono>
                    <div style={{
                      width: 36, height: 22, borderRadius: 999,
                      background: m.allow ? t.ink : t.whisperStrong,
                      padding: 2, display: 'flex', alignItems: 'center',
                      justifyContent: m.allow ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: m.allow ? t.paperBg : t.paperBg }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p style={{ font: `400 12px/1.5 ${t.fonts.sans}`, color: t.muted, margin: '8px 4px 0' }}>
            Allow assign lets a member be assigned to tasks. Members can never grant this to others — only the owner can.
          </p>
        </div>

        <div>
          <PtSection t={t} label="Danger" />
          <div style={{ background: t.paperPanel, borderRadius: 14, border: `1px solid ${t.whisper}`, padding: '4px 14px' }}>
            {[
              { l: 'Archive board', d: 'Hide from your workspace, keep the data.' },
              { l: 'Delete board', d: 'This cannot be undone.', danger: true },
            ].map((row, i, arr) => (
              <div key={i} style={{
                padding: '14px 0',
                borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${t.whisper}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `600 14px/1.2 ${t.fonts.sans}`, color: row.danger ? t.accent.hex : t.ink }}>{row.l}</div>
                  <div style={{ font: `400 12px/1.4 ${t.fonts.sans}`, color: t.muted, marginTop: 3 }}>{row.d}</div>
                </div>
                <PtIcons.arrow size={16} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PtScreen>
  );
}

function ScreenProfile({ t }) {
  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="You" subtitle="Eugene Carl" large leading={null}
        trailing={<button style={btnIcon(t)}><PtIcons.settings /></button>} />
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{
          background: t.paperPanel, borderRadius: 16, border: `1px solid ${t.whisper}`,
          padding: 18, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 56, height: 56, flexShrink: 0 }}>
            <PtLogo variant="tile" size={56} shadow={false} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: `700 18px/1.2 ${t.fonts.sans}`, color: t.ink }}>Eugene Carl</div>
            <div style={{ font: `500 13px/1.3 ${t.fonts.mono}`, color: t.muted, marginTop: 4 }}>eugene@planthing.app</div>
          </div>
          <PtButton t={t} kind="secondary" size="sm">Edit</PtButton>
        </div>

        <div>
          <PtSection t={t} label="Workspace" />
          <div style={{ background: t.paperPanel, borderRadius: 14, border: `1px solid ${t.whisper}`, padding: '4px 14px' }}>
            {[
              { l: 'Eugene\'s workspace', d: '6 boards · 3 members', i: PtIcons.board },
              { l: 'Notification preferences', d: 'Email, push, mentions only', i: PtIcons.bell },
              { l: 'Theme & appearance', d: 'System · Sprout Red accent', i: PtIcons.sun },
              { l: 'Reduced motion', d: 'Off', i: PtIcons.sparkles },
            ].map((r, i, arr) => (
              <div key={i} style={{
                padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${t.whisper}`,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: t.paperPanelDeep, color: t.muted, display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <r.i size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `600 14px/1.2 ${t.fonts.sans}`, color: t.ink }}>{r.l}</div>
                  <div style={{ font: `400 12px/1.3 ${t.fonts.sans}`, color: t.muted, marginTop: 2 }}>{r.d}</div>
                </div>
                <PtIcons.arrow size={14} />
              </div>
            ))}
          </div>
        </div>

        <PtButton t={t} kind="ghost" full icon={<PtIcons.signout size={16} />}>Sign out</PtButton>
      </div>
      <PtBottomNav t={t} active="me" dark={t.dark} />
    </PtScreen>
  );
}

Object.assign(window, { ScreenSearch, ScreenNotifications, ScreenBoardSettings, ScreenProfile });
