// pt-icons.jsx — minimal icon set, all 24×24, currentColor, 1.75 stroke
// Hand-picked for PlanThing screens. No external deps.

const ICON = (paths, { size = 22, fill = false, stroke = 1.75 } = {}) =>
  (props) => (
    <svg width={props.size || size} height={props.size || size} viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {paths}
    </svg>
  );

const PtIcons = {
  home:    ICON(<><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"/></>),
  search:  ICON(<><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></>),
  plus:    ICON(<><path d="M12 5v14M5 12h14"/></>),
  bell:    ICON(<><path d="M6 16V11a6 6 0 1112 0v5l1.5 2.5h-15L6 16z"/><path d="M10 20a2 2 0 004 0"/></>),
  user:    ICON(<><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></>),
  back:    ICON(<><path d="M15 5l-7 7 7 7"/></>),
  more:    ICON(<><circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/></>),
  filter:  ICON(<><path d="M4 6h16M7 12h10M10 18h4"/></>),
  close:   ICON(<><path d="M6 6l12 12M18 6L6 18"/></>),
  check:   ICON(<><path d="M5 12.5l4.5 4.5L19 7"/></>),
  star:    ICON(<><path d="M12 4l2.5 5 5.5.8-4 4 1 5.5L12 16.8 6.5 19.3l1-5.5-4-4 5.5-.8L12 4z"/></>),
  starF:   ICON(<path d="M12 4l2.5 5 5.5.8-4 4 1 5.5L12 16.8 6.5 19.3l1-5.5-4-4 5.5-.8L12 4z"/>, { fill: true }),
  board:   ICON(<><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 4.5v15M15 4.5v15"/></>),
  note:    ICON(<><path d="M5 4h10l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M15 4v4h4M8 13h7M8 17h5"/></>),
  draw:    ICON(<><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/></>),
  calendar:ICON(<><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></>),
  inbox:   ICON(<><path d="M4 13l3-7h10l3 7v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"/><path d="M4 13h5l1 2h4l1-2h5"/></>),
  flag:    ICON(<><path d="M5 21V4M5 5h11l-2 4 2 4H5"/></>),
  tag:     ICON(<><path d="M3 12V4h8l10 10-8 8-10-10z"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/></>),
  attach:  ICON(<><path d="M16 8l-7 7a3 3 0 104 4l8-8a5 5 0 10-7-7L6 12"/></>),
  drag:    ICON(<><circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/></>),
  share:   ICON(<><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></>),
  settings:ICON(<><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 002 1.2L10 21h4l.5-2.5a7 7 0 002-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></>),
  invite:  ICON(<><circle cx="9" cy="9" r="3.5"/><path d="M3 19c1-3 3-5 6-5s5 2 6 5"/><path d="M18 8v6M15 11h6"/></>),
  signout: ICON(<><path d="M14 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2"/><path d="M10 12h11M18 9l3 3-3 3"/></>),
  clock:   ICON(<><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>),
  link:    ICON(<><path d="M10 14a4 4 0 005.66 0l3.34-3.34a4 4 0 00-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 00-5.66 0l-3.34 3.34a4 4 0 005.66 5.66l1-1"/></>),
  eye:     ICON(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>),
  eyeOff:  ICON(<><path d="M3 3l18 18"/><path d="M9.5 9.5A3 3 0 0014.5 14.5"/><path d="M6 6.5C3.5 8 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.8"/><path d="M14.5 5.2C13.7 5 12.9 5 12 5 5.5 5 2 12 2 12s.5 1 1.5 2.3"/></>),
  trash:   ICON(<><path d="M5 7h14M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12"/><path d="M9 7V4h6v3"/></>),
  sun:     ICON(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></>),
  moon:    ICON(<><path d="M20 14a8 8 0 11-9-10 6 6 0 009 10z"/></>),
  sparkles:ICON(<><path d="M5 3v4M3 5h4M19 14v4M17 16h4"/><path d="M11 5l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></>),
  arrow:   ICON(<><path d="M5 12h14M13 6l6 6-6 6"/></>),
  bold:    ICON(<><path d="M7 4h6a4 4 0 010 8H7zM7 12h7a4 4 0 010 8H7z"/></>),
  italic:  ICON(<><path d="M14 4h-4M14 20h-4M15 4l-6 16"/></>),
  list:    ICON(<><path d="M4 6h16M4 12h16M4 18h16"/></>),
  bullet:  ICON(<><circle cx="5" cy="6" r="1.4" fill="currentColor"/><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="5" cy="18" r="1.4" fill="currentColor"/><path d="M9 6h12M9 12h12M9 18h12"/></>),
  undo:    ICON(<><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></>),
  pencil:  ICON(<><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/></>),
};

Object.assign(window, { PtIcons });
