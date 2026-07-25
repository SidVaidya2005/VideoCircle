function ScopeCanvas() {
  const [running, setRunning] = React.useState(true);
  return (
    <div style={{ position:'relative', width:'100%', height:'100%', background:'var(--bg-1)', overflow:'hidden' }}>
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:`
          linear-gradient(-90deg, rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(-90deg, rgba(255,255,255,.08) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px)
        `,
        backgroundSize:'10px 10px, 10px 10px, 100px 100px, 100px 100px',
      }}/>
      <div style={{
        position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{ display:'flex', gap:10 }}>
          {Array.from({length:13}).map((_,i) => {
            const fromCenter = Math.abs(i - 6);
            return <div key={i} style={{
              width:26, height:26, background:'var(--red-1)', borderRadius:3,
              animation: running ? `scopeAnim 1600ms cubic-bezier(0.83,0,0.17,1) infinite alternate ${fromCenter*55}ms` : 'none',
            }}/>;
          })}
        </div>
      </div>
      <style>{`
        @keyframes scopeAnim {
          from { transform: translateX(-120px) rotate(-180deg); opacity:.5 }
          to   { transform: translateX(120px)  rotate(0deg);    opacity:1  }
        }
      `}</style>
      <div style={{ position:'absolute', top:12, left:16, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--fg-3)' }}>
        scope.canvas &nbsp; <span style={{color:'var(--red-1)'}}>●</span> stagger({'{'}65, from:'center'{'}'})
      </div>
      <button onClick={()=>setRunning(r=>!r)} style={{
        position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)',
        padding:'10px 22px', border:0, borderRadius:'.4rem', cursor:'pointer',
        background: running ? 'rgba(255,255,255,.06)' : 'var(--red-1)',
        color: running ? 'var(--fg-1)' : 'var(--bg-1)',
        fontFamily:'inherit', fontSize:12, fontWeight:700, letterSpacing:'.08em',
      }}>{running ? 'PAUSE' : 'PLAY'}</button>
    </div>
  );
}

window.ScopeCanvas = ScopeCanvas;
