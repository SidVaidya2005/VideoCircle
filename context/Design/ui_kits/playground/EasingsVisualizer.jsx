function EasingsVisualizer() {
  const eases = [
    { name:'linear',     pts:'0,40 100,0' },
    { name:'inQuad',     pts:'0,40 30,38 60,28 100,0' },
    { name:'outQuad',    pts:'0,40 40,12 70,2 100,0' },
    { name:'inOutQuad',  pts:'0,40 25,35 50,20 75,5 100,0' },
    { name:'inCubic',    pts:'0,40 40,39 70,26 100,0' },
    { name:'outCubic',   pts:'0,40 30,14 60,3 100,0' },
    { name:'inOutQuint', pts:'0,40 30,39 50,20 70,1 100,0' },
    { name:'outQuint',   pts:'0,40 20,20 50,6 80,1 100,0' },
    { name:'outExpo',    pts:'0,40 60,32 80,8 100,0' },
    { name:'inExpo',     pts:'0,40 60,38 90,20 100,0' },
    { name:'outElastic', pts:'0,40 25,-4 45,6 60,-2 80,1 100,0' },
    { name:'outBack',    pts:'0,40 50,-6 80,2 100,0' },
    { name:'outBounce',  pts:'0,40 40,20 55,30 70,10 82,20 92,5 100,0' },
    { name:'spring',     pts:'0,40 20,-4 35,8 50,-2 65,3 80,-1 100,0' },
    { name:'steps',      pts:'0,40 20,40 20,32 40,32 40,24 60,24 60,16 80,16 80,8 100,8 100,0' },
    { name:'irregular',  pts:'0,40 15,28 30,32 45,18 60,22 75,8 100,0' },
  ];
  const [active, setActive] = React.useState('inOutQuint');
  const current = eases.find(e => e.name === active);
  const [p, setP] = React.useState({p1:1,p2:1,p3:1,p4:1});

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', height:'100%', background:'var(--bg-1)' }}>
      {/* LEFT — big graph */}
      <div style={{ position:'relative', padding:24, borderRight:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{
          position:'absolute', inset:24, borderRadius:8, overflow:'hidden',
          background:`
            linear-gradient(-90deg, rgba(255,255,255,.04) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
            linear-gradient(-90deg, rgba(255,255,255,.08) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px)
          `,
          backgroundSize:'10px 10px, 10px 10px, 80px 80px, 80px 80px',
        }}/>
        <div style={{ position:'absolute', left:24, right:24, bottom:24, height:1, background:'var(--red-1)' }}>
          <div style={{ position:'absolute', right:-6, top:-6, width:13, height:13, background:'var(--red-1)' }}/>
        </div>
        <div style={{ position:'absolute', left:24, top:24, bottom:24, width:1, background:'rgba(255,255,255,.25)' }}>
          <div style={{
            position:'absolute', left:-16, top:-10, fontSize:10, padding:'2px 4px',
            background:'var(--bg-1)', border:'1px solid rgba(255,255,255,.25)', color:'var(--fg-1)',
          }}>1.0</div>
        </div>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position:'absolute', inset:24, width:'calc(100% - 48px)', height:'calc(100% - 48px)', overflow:'visible' }}>
          <polyline points={current.pts} fill="none" stroke="#ff4b4b" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
        </svg>
        <div style={{ position:'absolute', top:8, left:28, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--fg-3)' }}>
          eases.visualizer &nbsp;<span style={{color:'var(--red-1)'}}>●</span> {active}
        </div>
      </div>

      {/* RIGHT — config + list */}
      <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
        <div style={{ padding:'20px 18px 8px', boxShadow:'0 10px 10px 0 var(--bg-1)', background:'var(--bg-1)', position:'relative', zIndex:2 }}>
          <input readOnly value={active} style={{
            background:'transparent', border:0, color:'var(--red-1)', fontSize:28, fontWeight:700,
            fontFamily:'inherit', width:'100%', padding:4, letterSpacing:'-.01em',
          }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginTop:8 }}>
            {['p1','p2','p3','p4'].map(k => (
              <fieldset key={k} style={{ border:0, padding:0, margin:0 }}>
                <legend style={{ fontSize:10, color:'var(--fg-3)', letterSpacing:'.08em', marginBottom:4 }}>{k.toUpperCase()}</legend>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <input type="number" value={p[k].toFixed(1)} readOnly style={{
                    background:'transparent', color:'var(--fg-1)', border:0, width:36, fontSize:12,
                    fontFamily:'inherit', textAlign:'right',
                  }}/>
                  <input type="range" min="0" max="2" step="0.1" value={p[k]}
                    onChange={e=>setP({...p, [k]:parseFloat(e.target.value)})}
                    style={{ flex:1, accentColor:'var(--red-1)' }}/>
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <div style={{ padding:'4px 14px 18px', overflow:'auto', flex:1 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:4 }}>
            {eases.map(e => (
              <button key={e.name} onClick={()=>setActive(e.name)} style={{
                position:'relative', display:'flex', flexDirection:'column', alignItems:'center',
                padding:'10px 6px', border:0, cursor:'pointer', borderRadius:'.6rem',
                background: active===e.name ? 'var(--red-1)' : 'rgba(255,255,255,.05)',
                color: active===e.name ? 'var(--bg-1)' : 'var(--fg-1)',
                fontFamily:'inherit', fontSize:11, transition:'background .25s ease-in-out',
              }}>
                <svg viewBox="0 0 100 40" style={{ width:'100%', height:28, overflow:'visible', marginBottom:6 }}>
                  <polyline points={e.pts} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                    stroke={active===e.name ? 'var(--bg-1)' : 'var(--red-1)'}/>
                </svg>
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.EasingsVisualizer = EasingsVisualizer;
