// pt-frame.jsx — wraps device frames with PlanThing-styled chrome.
// Adds an artboard label strip below the device.

function PtFrame({ children, platform = 'ios', dark = false, label, sublabel, width, height }) {
  const W = width || (platform === 'ios' ? 360 : 376);
  const H = height || 760;
  const Device = platform === 'ios' ? IOSDevice : AndroidDevice;
  const deviceProps = platform === 'ios'
    ? { width: W, height: H, dark }
    : { width: W, height: H, dark };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      width: W,
    }}>
      <Device {...deviceProps}>
        {children}
      </Device>
      {(label || sublabel) && (
        <div style={{
          fontFamily: '"Space Mono", ui-monospace, monospace',
          color: 'rgba(40,30,20,0.7)',
          fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '0 4px',
        }}>
          <div style={{ fontWeight: 700 }}>{label}</div>
          {sublabel && <div style={{ fontWeight: 400, color: 'rgba(60,50,40,0.5)', marginTop: 2 }}>{sublabel}</div>}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PtFrame });
