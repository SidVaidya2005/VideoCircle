function CodeShowcase() {
  const [tab, setTab] = React.useState('animate');
  const samples = {
    animate: `import { animate, stagger } from 'animejs';

animate('.square', {
  x: 320,
  rotate: { from: -180 },
  duration: 1250,
  delay: stagger(65, { from: 'center' }),
  ease: 'inOutQuint',
  loop: true,
  alternate: true
});`,
    timeline: `import { createTimeline } from 'animejs';

const tl = createTimeline()
  .add('.a', { x: 100, duration: 800 })
  .add('.b', { rotate: 360 }, '-=400')
  .add('.c', { opacity: 0 }, '<');`,
    draggable: `import { createDraggable } from 'animejs';

createDraggable('.puck', {
  container: '.board',
  releaseEase: 'outElastic(1, 0.5)',
  snap: 40,
});`,
  };
  const tabStyle = (k) => ({
    fontFamily:'inherit', fontSize:11, letterSpacing:'.08em', textTransform:'uppercase',
    padding:'8px 14px', borderRadius:'.4rem .4rem 0 0', border:0, cursor:'pointer',
    background: tab===k ? 'var(--bg-2)' : 'transparent',
    color: tab===k ? 'var(--fg-1)' : 'var(--fg-3)',
  });

  return (
    <section style={{ padding:'56px 28px', maxWidth:1200, margin:'0 auto' }}>
      <div style={{ fontSize:12, letterSpacing:'.16em', color:'var(--fg-3)', textTransform:'uppercase', marginBottom:10 }}>
        <span style={{display:'inline-block',width:5,height:5,background:'var(--red-1)',verticalAlign:'middle',marginRight:8}}/>
        One function. Any target.
      </div>
      <h2 style={{ fontSize:40, fontWeight:700, letterSpacing:'-.02em', marginBottom:30, lineHeight:1.05 }}>
        Animate anything you can select.
      </h2>

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr .9fr', gap:16, alignItems:'stretch' }}>
        <div>
          <div style={{ display:'flex', gap:2 }}>
            {Object.keys(samples).map(k => <button key={k} style={tabStyle(k)} onClick={()=>setTab(k)}>{k}</button>)}
          </div>
          <pre style={{
            margin:0, background:'var(--bg-2)', border:'1px solid rgba(255,255,255,.08)',
            borderRadius:'0 .4rem .4rem .4rem', padding:20, fontSize:13, lineHeight:1.55,
            overflow:'auto', color:'var(--fg-1)', minHeight:260,
          }}>{samples[tab]}</pre>
        </div>

        <div style={{
          background:'var(--bg-2)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'.4rem',
          position:'relative', overflow:'hidden', minHeight:260,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{
            position:'absolute', inset:0, opacity:.5,
            background:`linear-gradient(-90deg, rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px)`,
            backgroundSize:'24px 24px',
          }}/>
          <div style={{ display:'flex', gap:8, position:'relative' }}>
            {[0,1,2,3,4].map(i => <div key={i+tab} style={{
              width:28, height:28, background:'var(--red-1)', borderRadius:3,
              animation:`demo 1400ms cubic-bezier(0.83,0,0.17,1) infinite alternate ${Math.abs(i-2)*80}ms`,
            }}/>)}
          </div>
          <div style={{
            position:'absolute', top:10, left:12, fontSize:10, letterSpacing:'.1em',
            textTransform:'uppercase', color:'var(--fg-3)',
          }}>PREVIEW &nbsp;<span style={{color:'var(--red-1)'}}>●</span> LIVE</div>
          <style>{`
            @keyframes demo { from{transform:translateX(-80px) rotate(-180deg)} to{transform:translateX(80px) rotate(0)} }
          `}</style>
        </div>
      </div>
    </section>
  );
}

window.CodeShowcase = CodeShowcase;
