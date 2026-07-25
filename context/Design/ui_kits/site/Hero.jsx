function Hero() {
  const [playing, setPlaying] = React.useState(true);
  return (
    <section style={{
      position: 'relative',
      padding: '80px 28px 100px',
      textAlign: 'center',
      overflow: 'hidden',
    }}>
      {/* grid backdrop */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none', opacity:.6,
        background: `
          linear-gradient(-90deg, rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(-90deg, rgba(255,255,255,.06) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px)
        `,
        backgroundSize: '10px 10px, 10px 10px, 100px 100px, 100px 100px',
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{
          fontSize: 12, letterSpacing: '.16em', color: 'var(--fg-3)',
          textTransform: 'uppercase', marginBottom: 22,
        }}>V4 &nbsp; <span style={{display:'inline-block',width:5,height:5,background:'var(--red-1)',verticalAlign:'middle'}}/>&nbsp; Available now</div>

        <h1 style={{
          fontSize: 'clamp(56px, 10vw, 120px)', fontWeight: 700,
          lineHeight: 1, letterSpacing: '-0.04em',
          display: 'inline-flex', alignItems: 'baseline',
        }}>
          anime
          <span style={{
            display:'inline-block', width: '0.14em', height: '0.14em',
            background: 'var(--red-1)', marginLeft: '.03em', marginRight: '.04em',
            alignSelf:'flex-end', marginBottom: '.12em',
            boxShadow: '0 0 24px rgba(255,75,75,.5)',
          }}/>
          js
        </h1>

        <p style={{
          marginTop: 28, color: 'var(--fg-2)', fontSize: 18,
          maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5,
        }}>
          Fast, multipurpose, lightweight. A JavaScript animation engine with a simple, yet powerful API. Works with CSS, SVG, DOM attributes and JS objects.
        </p>

        <div style={{ marginTop: 36, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setPlaying(p => !p)} style={{
            fontFamily: 'inherit', fontSize: 13, fontWeight: 700, letterSpacing: '.06em',
            padding: '12px 22px', borderRadius: '.4rem', border: 0, cursor: 'pointer',
            background: 'var(--white-1)', color: 'var(--bg-1)',
          }}>{playing ? 'PAUSE DEMO' : 'PLAY DEMO'}</button>
          <button style={{
            fontFamily: 'inherit', fontSize: 13, fontWeight: 700, letterSpacing: '.06em',
            padding: '12px 22px', borderRadius: '.4rem', border: 0, cursor: 'pointer',
            background: 'rgba(255,255,255,.06)', color: 'var(--fg-1)',
          }}>npm install animejs ↗</button>
        </div>

        {/* staggered squares demo */}
        <div style={{ marginTop: 64, display: 'flex', gap: 10, justifyContent: 'center' }}>
          {[0,1,2,3,4,5,6,7,8].map(i => {
            const fromCenter = Math.abs(i - 4);
            return <div key={i} style={{
              width: 26, height: 26, background: 'var(--red-1)', borderRadius: 3,
              animation: playing ? `heroStagger 1800ms cubic-bezier(0.83,0,0.17,1) infinite alternate ${fromCenter * 65}ms` : 'none',
            }}/>;
          })}
        </div>
        <style>{`
          @keyframes heroStagger {
            from { transform: translateX(-120px) rotate(-180deg); }
            to   { transform: translateX( 120px) rotate(0deg); }
          }
        `}</style>
      </div>
    </section>
  );
}

window.Hero = Hero;
