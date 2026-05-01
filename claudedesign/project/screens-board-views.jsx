// screens-board-views.jsx — Alternate board views: List, Calendar, Table
// PlanThing supports multiple ways to look at the same board data.

// Shared: a small segmented "view switcher" pill row that sits below the app bar.
function PtViewSwitcher({ t, active = 'kanban' }) {
  const items = [
    { id: 'kanban',   label: 'Board',    Icon: PtIcons.board },
    { id: 'list',     label: 'List',     Icon: PtIcons.list },
    { id: 'calendar', label: 'Calendar', Icon: PtIcons.calendar },
    { id: 'table',    label: 'Table',    Icon: PtIcons.tag },
  ];
  return (
    <div style={{
      margin: '4px 18px 10px',
      padding: 4,
      background: t.paperPanel,
      border: `1px solid ${t.whisper}`,
      borderRadius: 14,
      display: 'flex',
      gap: 2,
    }}>
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <button key={it.id} style={{
            flex: 1, height: 34, border: 0, borderRadius: 10,
            background: isActive ? (t.dark ? t.paperPanelDeep : '#fff') : 'transparent',
            color: isActive ? t.ink : t.muted,
            font: `600 12px/1 ${t.fonts.sans}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>
            <it.Icon size={14} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── List view ──────────────────────────────────────────────
// All tasks flow as one vertical list. Group headers separate columns.
// Status pill on the right keeps each row's column visible without nesting cards.
function ScreenBoardList({ t }) {
  const groups = [
    { name: 'In progress', tint: 'amber', tasks: [
      { title: 'Ship onboarding rewrite v2', priority: 'high', due: 'Today',
        labels: ['red','violet'], assignees: [{i:'EC',t:'amber'},{i:'MR',t:'green'}], comments: 4 },
      { title: 'Polish empty-state illustration set', priority: 'med', due: 'May 3',
        labels: ['rose'], assignees: [{i:'KP',t:'blue'}] },
      { title: 'Wire OTP throttle to Convex', priority: 'med',
        labels: ['blue','green'], assignees: [{i:'MR',t:'green'}], comments: 2 },
      { title: 'Decide Sprout Red intensity for dark mode', priority: 'low', labels: ['red'] },
    ]},
    { name: 'Review', tint: 'violet', tasks: [
      { title: 'Auth: error copy + reduced motion', priority: 'med', due: 'May 2',
        labels: ['blue'], assignees: [{i:'MR',t:'green'}], comments: 7 },
      { title: 'Audit board permission edges', priority: 'med', labels: ['violet'] },
    ]},
    { name: 'Backlog', tint: 'ink', tasks: [
      { title: 'Sketch new sprout illustration', priority: 'med', labels: ['rose','amber'] },
      { title: 'Move marketing copy out of board model', priority: 'low', labels: ['ink'] },
    ]},
  ];

  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Launch Plan" subtitle="24 tasks · sorted by priority" large
        leading="back"
        trailing={<><button style={btnIcon(t)}><PtIcons.filter /></button><button style={btnIcon(t)}><PtIcons.more /></button></>}
      />
      <PtViewSwitcher t={t} active="list" />

      <div style={{ padding: '0 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groups.map((g, gi) => (
          <div key={gi}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 4px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.boardTints[g.tint].fg }} />
                <span style={{ font: `700 13px/1 ${t.fonts.sans}`, color: t.ink }}>{g.name}</span>
                <span style={{ font: `700 11px/1 ${t.fonts.mono}`, color: t.subtle, letterSpacing: '0.08em' }}>{g.tasks.length}</span>
              </div>
              <span style={{ font: `600 12px/1 ${t.fonts.sans}`, color: t.muted }}>Add</span>
            </div>

            {/* Whitespace-grouped rows: NO inner cards. Just dividers. */}
            <div style={{
              background: t.paperPanel, borderRadius: 14,
              border: `1px solid ${t.whisper}`, overflow: 'hidden',
            }}>
              {g.tasks.map((task, j) => (
                <div key={j} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderBottom: j === g.tasks.length - 1 ? 'none' : `0.5px solid ${t.whisper}`,
                }}>
                  <PtPriority level={task.priority} t={t} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      font: `600 14px/1.3 ${t.fonts.sans}`, color: t.ink,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{task.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      {task.labels && task.labels.slice(0, 3).map((l, k) => (
                        <span key={k} style={{ width: 18, height: 4, borderRadius: 2,
                          background: (t.boardTints[l] || t.boardTints.red).fg }} />
                      ))}
                      {task.due && (
                        <span style={{ font: `500 11px/1 ${t.fonts.sans}`, color: t.muted, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <PtIcons.calendar size={11} />{task.due}
                        </span>
                      )}
                      {task.comments != null && task.comments > 0 && (
                        <span style={{ font: `500 11px/1 ${t.fonts.sans}`, color: t.muted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <PtIcons.note size={11} />{task.comments}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.assignees && task.assignees.length > 0 && <PtAvatarStack people={task.assignees} t={t} max={2} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

// ─── Calendar view ──────────────────────────────────────────
// Month grid up top, then a list of the selected day's tasks below.
// One-direction-per-section: month is a fixed grid; tasks below scroll vertically.
function ScreenBoardCalendar({ t }) {
  const month = 'May 2025';
  const days = ['M','T','W','T','F','S','S'];

  // 5 weeks; tag each cell with task counts so dots can render.
  // 0 = empty, n = number of dots
  const cells = [
    [null, null, null, 1,    2,    null, null],   // 1, 2
    [null, null, 0,    3,    1,    null, null],   // 6, 7, 8
    [null, null, 1,    null, 2,    null, null],   // 13, 15
    [null, 1,    null, null, null, null, 1   ],   // 19, 25 (today, selected)
    [null, null, null, null, null, null, null],
  ];
  const dayNumbers = [
    [null, null, null, 1,  2,  3,  4 ],
    [5,    6,    7,    8,  9,  10, 11],
    [12,   13,   14,   15, 16, 17, 18],
    [19,   20,   21,   22, 23, 24, 25],
    [26,   27,   28,   29, 30, 31, null],
  ];
  const today = 25;
  const selected = 25;

  const dayTasks = [
    { title: 'Ship onboarding rewrite v2', time: '10:00', priority: 'high',
      tint: 'amber', col: 'In progress',
      assignees: [{i:'EC',t:'amber'},{i:'MR',t:'green'}] },
    { title: 'Auth: error copy + reduced motion', time: '14:00', priority: 'med',
      tint: 'violet', col: 'Review',
      assignees: [{i:'MR',t:'green'}] },
  ];

  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Launch Plan" subtitle="6 tasks due this week" large
        leading="back"
        trailing={<><button style={btnIcon(t)}><PtIcons.filter /></button><button style={btnIcon(t)}><PtIcons.more /></button></>}
      />
      <PtViewSwitcher t={t} active="calendar" />

      {/* Month header */}
      <div style={{
        margin: '0 18px 8px', padding: '4px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: `700 18px/1.2 ${t.fonts.sans}`, color: t.ink }}>{month}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={{ width: 32, height: 32, borderRadius: 10, border: 0, background: t.paperPanel, color: t.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <PtIcons.back size={16} />
          </button>
          <button style={{ width: 32, height: 32, borderRadius: 10, border: 0, background: t.paperPanel, color: t.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <PtIcons.arrow size={16} />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div style={{
        margin: '0 18px', padding: '0 2px 6px',
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0,
      }}>
        {days.map((d, i) => (
          <div key={i} style={{
            font: `700 10px/1 ${t.fonts.mono}`, color: t.subtle,
            letterSpacing: '0.1em', textAlign: 'center',
          }}>{d}</div>
        ))}
      </div>

      {/* Month grid — single card, no nested cards inside */}
      <div style={{
        margin: '0 18px 18px',
        background: t.paperPanel, borderRadius: 14,
        border: `1px solid ${t.whisper}`, padding: 8,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {dayNumbers.flat().map((n, i) => {
            const r = Math.floor(i / 7), c = i % 7;
            const dots = cells[r][c];
            const isToday = n === today;
            const isSelected = n === selected;
            const isEmpty = n == null;
            return (
              <div key={i} style={{
                aspectRatio: '1 / 1.05',
                borderRadius: 8,
                background: isSelected ? t.ink : 'transparent',
                color: isEmpty ? 'transparent' : isSelected ? t.paperBg : t.ink,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, position: 'relative',
              }}>
                <span style={{
                  font: `${isToday || isSelected ? 700 : 500} 13px/1 ${t.fonts.sans}`,
                }}>
                  {n != null && (
                    isToday && !isSelected
                      ? <span style={{
                          width: 24, height: 24, borderRadius: '50%',
                          border: `1.5px solid ${t.accent.hex}`, color: t.accent.hex,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          font: `700 12px/1 ${t.fonts.sans}`,
                        }}>{n}</span>
                      : n
                  )}
                </span>
                {dots != null && dots > 0 && (
                  <div style={{ display: 'flex', gap: 2, position: 'absolute', bottom: 5 }}>
                    {Array.from({ length: Math.min(dots, 3) }).map((_, k) => (
                      <span key={k} style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: isSelected ? t.paperBg :
                          [t.boardTints.amber.fg, t.boardTints.violet.fg, t.accent.hex][k] || t.muted,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day's tasks — whitespace-grouped, no card-in-card */}
      <div style={{ padding: '0 18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
          <PtMono t={t}>Sun · May 25 · Today</PtMono>
          <span style={{ font: `600 12px/1 ${t.fonts.sans}`, color: t.muted }}>{dayTasks.length} tasks</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dayTasks.map((task, j) => (
            <div key={j} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 14px',
              background: t.paperPanel, borderRadius: 12,
              border: `1px solid ${t.whisper}`,
              borderLeft: `3px solid ${t.boardTints[task.tint].fg}`,
            }}>
              <div style={{
                width: 44, font: `700 12px/1 ${t.fonts.mono}`, color: t.muted,
                letterSpacing: '0.04em',
              }}>{task.time}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 14px/1.3 ${t.fonts.sans}`, color: t.ink }}>{task.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, color: t.muted, font: `500 11px/1 ${t.fonts.sans}` }}>
                  <span>{task.col}</span>
                  <span>·</span>
                  <PtPriority level={task.priority} t={t} />
                </div>
              </div>
              {task.assignees && <PtAvatarStack people={task.assignees} t={t} max={2} />}
            </div>
          ))}
        </div>
      </div>

      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

// ─── Table view ─────────────────────────────────────────────
// Sticky first column (Title), horizontal scroll for the property columns.
// One-direction-per-section: vertical for rows, horizontal for properties.
function ScreenBoardTable({ t }) {
  const rows = [
    { title: 'Ship onboarding rewrite v2', status: 'In progress', statusTint: 'amber',
      priority: 'high', due: 'Today', assignee: { i: 'EC', t: 'amber' }, est: '4d' },
    { title: 'Polish empty-state illustration', status: 'In progress', statusTint: 'amber',
      priority: 'med', due: 'May 3', assignee: { i: 'KP', t: 'blue' }, est: '2d' },
    { title: 'Wire OTP throttle to Convex', status: 'In progress', statusTint: 'amber',
      priority: 'med', due: 'May 5', assignee: { i: 'MR', t: 'green' }, est: '1d' },
    { title: 'Auth: error copy + reduced motion', status: 'Review', statusTint: 'violet',
      priority: 'med', due: 'May 2', assignee: { i: 'MR', t: 'green' }, est: '3h' },
    { title: 'Audit board permission edges', status: 'Review', statusTint: 'violet',
      priority: 'med', due: 'May 4', assignee: { i: 'EC', t: 'amber' }, est: '6h' },
    { title: 'Sketch new sprout illustration', status: 'Backlog', statusTint: 'ink',
      priority: 'med', due: '—', assignee: { i: 'KP', t: 'blue' }, est: '2d' },
    { title: 'Move marketing copy out of board model', status: 'Backlog', statusTint: 'ink',
      priority: 'low', due: '—', assignee: { i: 'EC', t: 'amber' }, est: '4h' },
  ];

  const titleColW = 168;
  const cellH = 48;
  const props = [
    { key: 'status',   label: 'Status',   width: 120 },
    { key: 'priority', label: 'Priority', width: 96 },
    { key: 'due',      label: 'Due',      width: 90 },
    { key: 'assignee', label: 'Owner',    width: 80 },
    { key: 'est',      label: 'Est',      width: 70 },
  ];

  const cellBase = {
    height: cellH,
    display: 'flex', alignItems: 'center',
    padding: '0 12px',
    font: `500 13px/1.2 ${t.fonts.sans}`, color: t.ink,
    borderBottom: `0.5px solid ${t.whisper}`,
    flexShrink: 0,
  };
  const headerBase = {
    height: 32,
    display: 'flex', alignItems: 'center',
    padding: '0 12px',
    font: `700 11px/1 ${t.fonts.mono}`,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: t.subtle,
    background: t.paperBg,
    borderBottom: `1px solid ${t.whisper}`,
    flexShrink: 0,
  };

  return (
    <PtScreen t={t}>
      <PtAppBar t={t} title="Launch Plan" subtitle="24 rows · 5 properties" large
        leading="back"
        trailing={<><button style={btnIcon(t)}><PtIcons.filter /></button><button style={btnIcon(t)}><PtIcons.more /></button></>}
      />
      <PtViewSwitcher t={t} active="table" />

      {/* Single outer card; the table inside is built from rows + columns,
          no nested cards (per the principle). */}
      <div style={{
        margin: '0 18px 24px',
        background: t.paperPanel, borderRadius: 14,
        border: `1px solid ${t.whisper}`,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex' }}>
          {/* Sticky title column */}
          <div style={{ width: titleColW, flexShrink: 0, borderRight: `0.5px solid ${t.whisper}`, background: t.paperPanel }}>
            <div style={{ ...headerBase, justifyContent: 'flex-start' }}>Task</div>
            {rows.map((r, j) => (
              <div key={j} style={{
                ...cellBase, gap: 8, fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: t.boardTints[r.statusTint].fg, flexShrink: 0,
                }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
              </div>
            ))}
          </div>

          {/* Scrollable property columns */}
          <div style={{ flex: 1, overflowX: 'auto' }}>
            <div style={{ display: 'flex', minWidth: 'min-content' }}>
              {props.map((p) => (
                <div key={p.key} style={{ width: p.width, flexShrink: 0, borderRight: `0.5px solid ${t.whisper}` }}>
                  <div style={{ ...headerBase }}>{p.label}</div>
                  {rows.map((r, j) => (
                    <div key={j} style={cellBase}>
                      {p.key === 'status' && (
                        <PtChip tint={r.statusTint} t={t} style={{ height: 22, padding: '0 8px', font: `600 11px/1 ${t.fonts.sans}` }}>
                          {r.status}
                        </PtChip>
                      )}
                      {p.key === 'priority' && <PtPriority level={r.priority} t={t} withLabel />}
                      {p.key === 'due' && (
                        <span style={{
                          font: `500 12px/1 ${t.fonts.sans}`,
                          color: r.due === 'Today' ? t.accent.hex : t.muted,
                        }}>{r.due}</span>
                      )}
                      {p.key === 'assignee' && <PtAvatar initials={r.assignee.i} tint={r.assignee.t} size={26} t={t} />}
                      {p.key === 'est' && (
                        <span style={{ font: `500 12px/1 ${t.fonts.mono}`, color: t.muted }}>{r.est}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {/* End cap with "+" to add property */}
              <div style={{ width: 56, flexShrink: 0 }}>
                <div style={{ ...headerBase, justifyContent: 'center' }}>
                  <PtIcons.plus size={12} />
                </div>
                {rows.map((_, j) => (
                  <div key={j} style={{ ...cellBase, padding: 0 }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add row */}
        <div style={{
          height: 44, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 14px', color: t.muted,
          font: `600 13px/1 ${t.fonts.sans}`,
          borderTop: `0.5px solid ${t.whisper}`,
        }}>
          <PtIcons.plus size={14} /> New row
        </div>
      </div>

      <PtBottomNav t={t} active="home" dark={t.dark} />
    </PtScreen>
  );
}

Object.assign(window, { ScreenBoardList, ScreenBoardCalendar, ScreenBoardTable, PtViewSwitcher });
