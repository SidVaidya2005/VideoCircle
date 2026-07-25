function Nav() {
  const linkStyle = {
    color: 'var(--fg-2)',
    fontSize: 12,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    padding: '6px 10px',
    borderRadius: 4,
    cursor: 'pointer',
  };
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 28px',
      background: 'rgba(37,36,35,.82)',
      backdropFilter: 'blur(0)',
      borderBottom: '1px solid rgba(255,255,255,.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontWeight: 700, fontSize: 18 }}>
        <span>anime</span>
        <span style={{ width: 6, height: 6, background: 'var(--red-1)', display: 'inline-block', marginLeft: 2, marginRight: 2 }} />
        <span>js</span>
        <span style={{ fontSize: 10, color: 'var(--fg-3)', marginLeft: 8, letterSpacing: '.08em' }}>V4</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <a style={linkStyle}>DOCS</a>
        <a style={linkStyle}>EXAMPLES</a>
        <a style={linkStyle}>EASINGS</a>
        <a style={linkStyle}>SPONSORS</a>
        <a style={{ ...linkStyle, background: 'var(--white-1)', color: 'var(--bg-1)' }}>GITHUB ↗</a>
      </div>
    </nav>
  );
}

window.Nav = Nav;
