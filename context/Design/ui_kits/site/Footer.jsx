function Footer() {
  return (
    <footer style={{
      padding:'44px 28px 56px', borderTop:'1px solid rgba(255,255,255,.08)',
      color:'var(--fg-3)', fontSize:12, letterSpacing:'.04em',
      display:'flex', justifyContent:'space-between', alignItems:'baseline', flexWrap:'wrap', gap:14,
    }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:2, fontWeight:700, fontSize:14, color:'var(--fg-1)' }}>
        <span>anime</span>
        <span style={{ width:5, height:5, background:'var(--red-1)', display:'inline-block', marginLeft:1, marginRight:1 }} />
        <span>js</span>
        <span style={{ marginLeft:10, color:'var(--fg-3)', fontWeight:400, letterSpacing:'.1em', fontSize:11 }}>V4.3.6</span>
      </div>
      <div style={{ display:'flex', gap:22, fontSize:11, letterSpacing:'.1em', textTransform:'uppercase' }}>
        <span>© Julian Garnier</span>
        <span>MIT License</span>
        <span>GitHub Sponsors</span>
      </div>
    </footer>
  );
}

window.Footer = Footer;
