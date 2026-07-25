function ClockControls() {
  const [t, setT] = React.useState(new Date());
  const [speed, setSpeed] = React.useState(1);
  const [playing, setPlaying] = React.useState(true);

  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT(new Date(Date.now())), 1000 / speed);
    return () => clearInterval(id);
  }, [playing, speed]);

  const hh = String(t.getHours()).padStart(2,'0');
  const mm = String(t.getMinutes()).padStart(2,'0');
  const ss = String(t.getSeconds()).padStart(2,'0');

  const slot = (ch) => (
    <span style={{
      position:'relative', width:'1ch', height:'2ch', display:'flex',
      alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'1.6em',
    }}>{ch}</span>
  );

  const btns = ['PLAY','PAUSE','REVERSE','ALTERNATE','SLOW MO','SPEED UP','NORMAL','RESET','RESUME','SEEK','COMPLETE','RESTART'];

  return (
    <div style={{
      position:'relative', width:'100%', height:'100%', background:'#1a1a1a',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      color:'#fff',
    }}>
      {/* top params */}
      <div style={{ position:'absolute', top:0, left:0, right:0, padding:'2.5ch 3ch' }}>
        <fieldset style={{ border:0, display:'flex', gap:'1ch', alignItems:'center', marginBottom:'1ch' }}>
          <label style={{ width:'11ch', fontSize:13, color:'var(--fg-2)' }}>currentTime</label>
          <input value={`${hh}:${mm}:${ss}`} readOnly style={{
            background:'transparent', color:'#fff', border:0, borderBottom:'1px dashed rgba(255,255,255,.25)',
            fontFamily:'inherit', textAlign:'right', width:'12ch', fontSize:13,
          }}/>
          <input type="range" min="0" max="86400" value={t.getHours()*3600+t.getMinutes()*60+t.getSeconds()}
            readOnly style={{ flex:1, accentColor:'#fff' }}/>
        </fieldset>
        <fieldset style={{ border:0, display:'flex', gap:'1ch', alignItems:'center' }}>
          <label style={{ width:'11ch', fontSize:13, color:'var(--fg-2)' }}>speed</label>
          <input value={speed.toFixed(2)} readOnly style={{
            background:'transparent', color:'#fff', border:0, borderBottom:'1px dashed rgba(255,255,255,.25)',
            fontFamily:'inherit', textAlign:'right', width:'12ch', fontSize:13,
          }}/>
          <input type="range" min="0.01" max="2" step="0.01" value={speed}
            onChange={e=>setSpeed(parseFloat(e.target.value))}
            style={{ flex:1, accentColor:'#fff' }}/>
        </fieldset>
      </div>

      {/* digital clock */}
      <div style={{ fontSize:36, display:'flex', gap:'1ch' }}>
        {slot(hh[0])}{slot(hh[1])}
        <span style={{ color:'#fff', fontSize:'1.6em' }}>:</span>
        {slot(mm[0])}{slot(mm[1])}
        <span style={{ color:'#fff', fontSize:'1.6em' }}>:</span>
        {slot(ss[0])}{slot(ss[1])}
      </div>

      {/* bottom controls */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, padding:'2ch 3ch',
        display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'.5ch',
      }}>
        {btns.map(b => {
          const active = (b==='PLAY' && playing) || (b==='PAUSE' && !playing);
          return (
            <button key={b} onClick={() => {
              if (b==='PLAY') setPlaying(true);
              if (b==='PAUSE') setPlaying(false);
              if (b==='SLOW MO') setSpeed(0.25);
              if (b==='SPEED UP') setSpeed(1.75);
              if (b==='NORMAL') setSpeed(1);
              if (b==='RESET') setT(new Date());
            }} style={{
              flex:'0 1 18%', minWidth:100, padding:'0 .5ch', height:'4ch',
              border:0, borderRadius:'1ch', margin:'.5ch 0',
              background: active ? '#fff' : '#2A2A2A',
              color: active ? '#2A2A2A' : '#fff',
              fontFamily:'inherit', fontSize:11, letterSpacing:'.06em', fontWeight:700, cursor:'pointer',
            }}>{b}</button>
          );
        })}
      </div>
    </div>
  );
}

window.ClockControls = ClockControls;
