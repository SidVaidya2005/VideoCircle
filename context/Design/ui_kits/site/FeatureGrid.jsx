function FeatureGrid() {
  const features = [
    { title: 'Timer',       desc: 'Schedulable callbacks with full playback controls.', code: 'createTimer({ duration: 1000 })' },
    { title: 'Animation',   desc: 'CSS properties, SVG, DOM attrs, JS objects.',       code: "animate('.box', { x: 320 })" },
    { title: 'Timeline',    desc: 'Orchestrate complex sequences with one API.',       code: 'createTimeline().add(...)' },
    { title: 'Draggable',   desc: 'Physics-backed drag with snap and inertia.',        code: 'createDraggable(el, {...})' },
    { title: 'Easings',     desc: 'Cubic-bezier, spring, irregular, steps.',           code: "ease: 'inOutQuint'" },
    { title: 'Stagger',     desc: 'Sequence delays from center, edges, indices.',      code: "stagger(65, {from:'center'})" },
  ];
  return (
    <section style={{ padding:'60px 28px', maxWidth:1200, margin:'0 auto' }}>
      <div style={{ fontSize:12, letterSpacing:'.16em', color:'var(--fg-3)', textTransform:'uppercase', marginBottom:10 }}>
        <span style={{display:'inline-block',width:5,height:5,background:'var(--red-1)',verticalAlign:'middle',marginRight:8}}/>
        Modules
      </div>
      <h2 style={{ fontSize:34, fontWeight:700, letterSpacing:'-.02em', marginBottom:26, lineHeight:1.05 }}>
        Everything you need. Nothing you don't.
      </h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
        {features.map(f => (
          <div key={f.title} style={{
            background:'var(--bg-2)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'1rem',
            padding:20, display:'flex', flexDirection:'column', gap:10, minHeight:140,
            transition:'border-color .25s ease',
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,75,75,.5)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.08)'}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:16 }}>
              <span style={{display:'inline-block',width:6,height:6,background:'var(--red-1)'}}/>
              {f.title}
            </div>
            <p style={{ fontSize:12.5, color:'var(--fg-2)', lineHeight:1.5, margin:0, flex:1 }}>{f.desc}</p>
            <code style={{
              fontSize:11, color:'var(--fg-1)', background:'var(--bg-3)',
              padding:'6px 8px', borderRadius:4, alignSelf:'flex-start',
              border:'1px solid rgba(255,255,255,.06)',
            }}>{f.code}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

window.FeatureGrid = FeatureGrid;
