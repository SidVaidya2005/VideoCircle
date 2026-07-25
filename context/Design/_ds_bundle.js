/* @ds-bundle: {"format":4,"namespace":"NeonTerminal_ca8c7a","components":[],"sourceHashes":{"ui_kits/playground/ClockControls.jsx":"4ad923294ee3","ui_kits/playground/EasingsVisualizer.jsx":"35dbea8317a1","ui_kits/playground/ScopeCanvas.jsx":"c6a4b8ceb24f","ui_kits/site/CodeShowcase.jsx":"31fd605b17c6","ui_kits/site/FeatureGrid.jsx":"928e138d1a4f","ui_kits/site/Footer.jsx":"5f8bd95f0b65","ui_kits/site/Hero.jsx":"e3aa828baf4f","ui_kits/site/Nav.jsx":"7f4f5c5a731c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.NeonTerminal_ca8c7a = window.NeonTerminal_ca8c7a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/playground/ClockControls.jsx
try { (() => {
function ClockControls() {
  const [t, setT] = React.useState(new Date());
  const [speed, setSpeed] = React.useState(1);
  const [playing, setPlaying] = React.useState(true);
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT(new Date(Date.now())), 1000 / speed);
    return () => clearInterval(id);
  }, [playing, speed]);
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const ss = String(t.getSeconds()).padStart(2, '0');
  const slot = ch => /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: '1ch',
      height: '2ch',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '1.6em'
    }
  }, ch);
  const btns = ['PLAY', 'PAUSE', 'REVERSE', 'ALTERNATE', 'SLOW MO', 'SPEED UP', 'NORMAL', 'RESET', 'RESUME', 'SEEK', 'COMPLETE', 'RESTART'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '2.5ch 3ch'
    }
  }, /*#__PURE__*/React.createElement("fieldset", {
    style: {
      border: 0,
      display: 'flex',
      gap: '1ch',
      alignItems: 'center',
      marginBottom: '1ch'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      width: '11ch',
      fontSize: 13,
      color: 'var(--fg-2)'
    }
  }, "currentTime"), /*#__PURE__*/React.createElement("input", {
    value: `${hh}:${mm}:${ss}`,
    readOnly: true,
    style: {
      background: 'transparent',
      color: '#fff',
      border: 0,
      borderBottom: '1px dashed rgba(255,255,255,.25)',
      fontFamily: 'inherit',
      textAlign: 'right',
      width: '12ch',
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "86400",
    value: t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds(),
    readOnly: true,
    style: {
      flex: 1,
      accentColor: '#fff'
    }
  })), /*#__PURE__*/React.createElement("fieldset", {
    style: {
      border: 0,
      display: 'flex',
      gap: '1ch',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      width: '11ch',
      fontSize: 13,
      color: 'var(--fg-2)'
    }
  }, "speed"), /*#__PURE__*/React.createElement("input", {
    value: speed.toFixed(2),
    readOnly: true,
    style: {
      background: 'transparent',
      color: '#fff',
      border: 0,
      borderBottom: '1px dashed rgba(255,255,255,.25)',
      fontFamily: 'inherit',
      textAlign: 'right',
      width: '12ch',
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0.01",
    max: "2",
    step: "0.01",
    value: speed,
    onChange: e => setSpeed(parseFloat(e.target.value)),
    style: {
      flex: 1,
      accentColor: '#fff'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      display: 'flex',
      gap: '1ch'
    }
  }, slot(hh[0]), slot(hh[1]), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#fff',
      fontSize: '1.6em'
    }
  }, ":"), slot(mm[0]), slot(mm[1]), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#fff',
      fontSize: '1.6em'
    }
  }, ":"), slot(ss[0]), slot(ss[1])), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '2ch 3ch',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '.5ch'
    }
  }, btns.map(b => {
    const active = b === 'PLAY' && playing || b === 'PAUSE' && !playing;
    return /*#__PURE__*/React.createElement("button", {
      key: b,
      onClick: () => {
        if (b === 'PLAY') setPlaying(true);
        if (b === 'PAUSE') setPlaying(false);
        if (b === 'SLOW MO') setSpeed(0.25);
        if (b === 'SPEED UP') setSpeed(1.75);
        if (b === 'NORMAL') setSpeed(1);
        if (b === 'RESET') setT(new Date());
      },
      style: {
        flex: '0 1 18%',
        minWidth: 100,
        padding: '0 .5ch',
        height: '4ch',
        border: 0,
        borderRadius: '1ch',
        margin: '.5ch 0',
        background: active ? '#fff' : '#2A2A2A',
        color: active ? '#2A2A2A' : '#fff',
        fontFamily: 'inherit',
        fontSize: 11,
        letterSpacing: '.06em',
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, b);
  })));
}
window.ClockControls = ClockControls;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/playground/ClockControls.jsx", error: String((e && e.message) || e) }); }

// ui_kits/playground/EasingsVisualizer.jsx
try { (() => {
function EasingsVisualizer() {
  const eases = [{
    name: 'linear',
    pts: '0,40 100,0'
  }, {
    name: 'inQuad',
    pts: '0,40 30,38 60,28 100,0'
  }, {
    name: 'outQuad',
    pts: '0,40 40,12 70,2 100,0'
  }, {
    name: 'inOutQuad',
    pts: '0,40 25,35 50,20 75,5 100,0'
  }, {
    name: 'inCubic',
    pts: '0,40 40,39 70,26 100,0'
  }, {
    name: 'outCubic',
    pts: '0,40 30,14 60,3 100,0'
  }, {
    name: 'inOutQuint',
    pts: '0,40 30,39 50,20 70,1 100,0'
  }, {
    name: 'outQuint',
    pts: '0,40 20,20 50,6 80,1 100,0'
  }, {
    name: 'outExpo',
    pts: '0,40 60,32 80,8 100,0'
  }, {
    name: 'inExpo',
    pts: '0,40 60,38 90,20 100,0'
  }, {
    name: 'outElastic',
    pts: '0,40 25,-4 45,6 60,-2 80,1 100,0'
  }, {
    name: 'outBack',
    pts: '0,40 50,-6 80,2 100,0'
  }, {
    name: 'outBounce',
    pts: '0,40 40,20 55,30 70,10 82,20 92,5 100,0'
  }, {
    name: 'spring',
    pts: '0,40 20,-4 35,8 50,-2 65,3 80,-1 100,0'
  }, {
    name: 'steps',
    pts: '0,40 20,40 20,32 40,32 40,24 60,24 60,16 80,16 80,8 100,8 100,0'
  }, {
    name: 'irregular',
    pts: '0,40 15,28 30,32 45,18 60,22 75,8 100,0'
  }];
  const [active, setActive] = React.useState('inOutQuint');
  const current = eases.find(e => e.name === active);
  const [p, setP] = React.useState({
    p1: 1,
    p2: 1,
    p3: 1,
    p4: 1
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      height: '100%',
      background: 'var(--bg-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: 24,
      borderRight: '1px solid rgba(255,255,255,.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 24,
      borderRadius: 8,
      overflow: 'hidden',
      background: `
            linear-gradient(-90deg, rgba(255,255,255,.04) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
            linear-gradient(-90deg, rgba(255,255,255,.08) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px)
          `,
      backgroundSize: '10px 10px, 10px 10px, 80px 80px, 80px 80px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 24,
      height: 1,
      background: 'var(--red-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -6,
      top: -6,
      width: 13,
      height: 13,
      background: 'var(--red-1)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 24,
      top: 24,
      bottom: 24,
      width: 1,
      background: 'rgba(255,255,255,.25)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -16,
      top: -10,
      fontSize: 10,
      padding: '2px 4px',
      background: 'var(--bg-1)',
      border: '1px solid rgba(255,255,255,.25)',
      color: 'var(--fg-1)'
    }
  }, "1.0")), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 40",
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 24,
      width: 'calc(100% - 48px)',
      height: 'calc(100% - 48px)',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: current.pts,
    fill: "none",
    stroke: "#ff4b4b",
    strokeWidth: "1",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    vectorEffect: "non-scaling-stroke"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      left: 28,
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--fg-3)'
    }
  }, "eases.visualizer \xA0", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--red-1)'
    }
  }, "\u25CF"), " ", active)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 18px 8px',
      boxShadow: '0 10px 10px 0 var(--bg-1)',
      background: 'var(--bg-1)',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("input", {
    readOnly: true,
    value: active,
    style: {
      background: 'transparent',
      border: 0,
      color: 'var(--red-1)',
      fontSize: 28,
      fontWeight: 700,
      fontFamily: 'inherit',
      width: '100%',
      padding: 4,
      letterSpacing: '-.01em'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr',
      gap: 6,
      marginTop: 8
    }
  }, ['p1', 'p2', 'p3', 'p4'].map(k => /*#__PURE__*/React.createElement("fieldset", {
    key: k,
    style: {
      border: 0,
      padding: 0,
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("legend", {
    style: {
      fontSize: 10,
      color: 'var(--fg-3)',
      letterSpacing: '.08em',
      marginBottom: 4
    }
  }, k.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: p[k].toFixed(1),
    readOnly: true,
    style: {
      background: 'transparent',
      color: 'var(--fg-1)',
      border: 0,
      width: 36,
      fontSize: 12,
      fontFamily: 'inherit',
      textAlign: 'right'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "2",
    step: "0.1",
    value: p[k],
    onChange: e => setP({
      ...p,
      [k]: parseFloat(e.target.value)
    }),
    style: {
      flex: 1,
      accentColor: 'var(--red-1)'
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 14px 18px',
      overflow: 'auto',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 4
    }
  }, eases.map(e => /*#__PURE__*/React.createElement("button", {
    key: e.name,
    onClick: () => setActive(e.name),
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 6px',
      border: 0,
      cursor: 'pointer',
      borderRadius: '.6rem',
      background: active === e.name ? 'var(--red-1)' : 'rgba(255,255,255,.05)',
      color: active === e.name ? 'var(--bg-1)' : 'var(--fg-1)',
      fontFamily: 'inherit',
      fontSize: 11,
      transition: 'background .25s ease-in-out'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 40",
    style: {
      width: '100%',
      height: 28,
      overflow: 'visible',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: e.pts,
    fill: "none",
    strokeWidth: "1.5",
    vectorEffect: "non-scaling-stroke",
    stroke: active === e.name ? 'var(--bg-1)' : 'var(--red-1)'
  })), /*#__PURE__*/React.createElement("span", null, e.name)))))));
}
window.EasingsVisualizer = EasingsVisualizer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/playground/EasingsVisualizer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/playground/ScopeCanvas.jsx
try { (() => {
function ScopeCanvas() {
  const [running, setRunning] = React.useState(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'var(--bg-1)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: `
          linear-gradient(-90deg, rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(-90deg, rgba(255,255,255,.08) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px)
        `,
      backgroundSize: '10px 10px, 10px 10px, 100px 100px, 100px 100px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, Array.from({
    length: 13
  }).map((_, i) => {
    const fromCenter = Math.abs(i - 6);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 26,
        height: 26,
        background: 'var(--red-1)',
        borderRadius: 3,
        animation: running ? `scopeAnim 1600ms cubic-bezier(0.83,0,0.17,1) infinite alternate ${fromCenter * 55}ms` : 'none'
      }
    });
  }))), /*#__PURE__*/React.createElement("style", null, `
        @keyframes scopeAnim {
          from { transform: translateX(-120px) rotate(-180deg); opacity:.5 }
          to   { transform: translateX(120px)  rotate(0deg);    opacity:1  }
        }
      `), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 16,
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--fg-3)'
    }
  }, "scope.canvas \xA0 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--red-1)'
    }
  }, "\u25CF"), " stagger(", '{', "65, from:'center'", '}', ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setRunning(r => !r),
    style: {
      position: 'absolute',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '10px 22px',
      border: 0,
      borderRadius: '.4rem',
      cursor: 'pointer',
      background: running ? 'rgba(255,255,255,.06)' : 'var(--red-1)',
      color: running ? 'var(--fg-1)' : 'var(--bg-1)',
      fontFamily: 'inherit',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '.08em'
    }
  }, running ? 'PAUSE' : 'PLAY'));
}
window.ScopeCanvas = ScopeCanvas;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/playground/ScopeCanvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/CodeShowcase.jsx
try { (() => {
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
});`
  };
  const tabStyle = k => ({
    fontFamily: 'inherit',
    fontSize: 11,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    padding: '8px 14px',
    borderRadius: '.4rem .4rem 0 0',
    border: 0,
    cursor: 'pointer',
    background: tab === k ? 'var(--bg-2)' : 'transparent',
    color: tab === k ? 'var(--fg-1)' : 'var(--fg-3)'
  });
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '56px 28px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: '.16em',
      color: 'var(--fg-3)',
      textTransform: 'uppercase',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 5,
      height: 5,
      background: 'var(--red-1)',
      verticalAlign: 'middle',
      marginRight: 8
    }
  }), "One function. Any target."), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 40,
      fontWeight: 700,
      letterSpacing: '-.02em',
      marginBottom: 30,
      lineHeight: 1.05
    }
  }, "Animate anything you can select."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.1fr .9fr',
      gap: 16,
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2
    }
  }, Object.keys(samples).map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    style: tabStyle(k),
    onClick: () => setTab(k)
  }, k))), /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      background: 'var(--bg-2)',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: '0 .4rem .4rem .4rem',
      padding: 20,
      fontSize: 13,
      lineHeight: 1.55,
      overflow: 'auto',
      color: 'var(--fg-1)',
      minHeight: 260
    }
  }, samples[tab])), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-2)',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: '.4rem',
      position: 'relative',
      overflow: 'hidden',
      minHeight: 260,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: .5,
      background: `linear-gradient(-90deg, rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px)`,
      backgroundSize: '24px 24px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      position: 'relative'
    }
  }, [0, 1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i + tab,
    style: {
      width: 28,
      height: 28,
      background: 'var(--red-1)',
      borderRadius: 3,
      animation: `demo 1400ms cubic-bezier(0.83,0,0.17,1) infinite alternate ${Math.abs(i - 2) * 80}ms`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      left: 12,
      fontSize: 10,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--fg-3)'
    }
  }, "PREVIEW \xA0", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--red-1)'
    }
  }, "\u25CF"), " LIVE"), /*#__PURE__*/React.createElement("style", null, `
            @keyframes demo { from{transform:translateX(-80px) rotate(-180deg)} to{transform:translateX(80px) rotate(0)} }
          `))));
}
window.CodeShowcase = CodeShowcase;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/CodeShowcase.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/FeatureGrid.jsx
try { (() => {
function FeatureGrid() {
  const features = [{
    title: 'Timer',
    desc: 'Schedulable callbacks with full playback controls.',
    code: 'createTimer({ duration: 1000 })'
  }, {
    title: 'Animation',
    desc: 'CSS properties, SVG, DOM attrs, JS objects.',
    code: "animate('.box', { x: 320 })"
  }, {
    title: 'Timeline',
    desc: 'Orchestrate complex sequences with one API.',
    code: 'createTimeline().add(...)'
  }, {
    title: 'Draggable',
    desc: 'Physics-backed drag with snap and inertia.',
    code: 'createDraggable(el, {...})'
  }, {
    title: 'Easings',
    desc: 'Cubic-bezier, spring, irregular, steps.',
    code: "ease: 'inOutQuint'"
  }, {
    title: 'Stagger',
    desc: 'Sequence delays from center, edges, indices.',
    code: "stagger(65, {from:'center'})"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '60px 28px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: '.16em',
      color: 'var(--fg-3)',
      textTransform: 'uppercase',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 5,
      height: 5,
      background: 'var(--red-1)',
      verticalAlign: 'middle',
      marginRight: 8
    }
  }), "Modules"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: '-.02em',
      marginBottom: 26,
      lineHeight: 1.05
    }
  }, "Everything you need. Nothing you don't."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 10
    }
  }, features.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.title,
    style: {
      background: 'var(--bg-2)',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: '1rem',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: 140,
      transition: 'border-color .25s ease'
    },
    onMouseEnter: e => e.currentTarget.style.borderColor = 'rgba(255,75,75,.5)',
    onMouseLeave: e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 700,
      fontSize: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 6,
      height: 6,
      background: 'var(--red-1)'
    }
  }), f.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: 'var(--fg-2)',
      lineHeight: 1.5,
      margin: 0,
      flex: 1
    }
  }, f.desc), /*#__PURE__*/React.createElement("code", {
    style: {
      fontSize: 11,
      color: 'var(--fg-1)',
      background: 'var(--bg-3)',
      padding: '6px 8px',
      borderRadius: 4,
      alignSelf: 'flex-start',
      border: '1px solid rgba(255,255,255,.06)'
    }
  }, f.code)))));
}
window.FeatureGrid = FeatureGrid;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/FeatureGrid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Footer.jsx
try { (() => {
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: '44px 28px 56px',
      borderTop: '1px solid rgba(255,255,255,.08)',
      color: 'var(--fg-3)',
      fontSize: 12,
      letterSpacing: '.04em',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 2,
      fontWeight: 700,
      fontSize: 14,
      color: 'var(--fg-1)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "anime"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      background: 'var(--red-1)',
      display: 'inline-block',
      marginLeft: 1,
      marginRight: 1
    }
  }), /*#__PURE__*/React.createElement("span", null, "js"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 10,
      color: 'var(--fg-3)',
      fontWeight: 400,
      letterSpacing: '.1em',
      fontSize: 11
    }
  }, "V4.3.6")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 22,
      fontSize: 11,
      letterSpacing: '.1em',
      textTransform: 'uppercase'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 Julian Garnier"), /*#__PURE__*/React.createElement("span", null, "MIT License"), /*#__PURE__*/React.createElement("span", null, "GitHub Sponsors")));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Hero.jsx
try { (() => {
function Hero() {
  const [playing, setPlaying] = React.useState(true);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      padding: '80px 28px 100px',
      textAlign: 'center',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity: .6,
      background: `
          linear-gradient(-90deg, rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(-90deg, rgba(255,255,255,.06) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px)
        `,
      backgroundSize: '10px 10px, 10px 10px, 100px 100px, 100px 100px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: '.16em',
      color: 'var(--fg-3)',
      textTransform: 'uppercase',
      marginBottom: 22
    }
  }, "V4 \xA0 ", /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 5,
      height: 5,
      background: 'var(--red-1)',
      verticalAlign: 'middle'
    }
  }), "\xA0 Available now"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 'clamp(56px, 10vw, 120px)',
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: '-0.04em',
      display: 'inline-flex',
      alignItems: 'baseline'
    }
  }, "anime", /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: '0.14em',
      height: '0.14em',
      background: 'var(--red-1)',
      marginLeft: '.03em',
      marginRight: '.04em',
      alignSelf: 'flex-end',
      marginBottom: '.12em',
      boxShadow: '0 0 24px rgba(255,75,75,.5)'
    }
  }), "js"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 28,
      color: 'var(--fg-2)',
      fontSize: 18,
      maxWidth: 640,
      marginLeft: 'auto',
      marginRight: 'auto',
      lineHeight: 1.5
    }
  }, "Fast, multipurpose, lightweight. A JavaScript animation engine with a simple, yet powerful API. Works with CSS, SVG, DOM attributes and JS objects."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 36,
      display: 'flex',
      gap: 8,
      justifyContent: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlaying(p => !p),
    style: {
      fontFamily: 'inherit',
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.06em',
      padding: '12px 22px',
      borderRadius: '.4rem',
      border: 0,
      cursor: 'pointer',
      background: 'var(--white-1)',
      color: 'var(--bg-1)'
    }
  }, playing ? 'PAUSE DEMO' : 'PLAY DEMO'), /*#__PURE__*/React.createElement("button", {
    style: {
      fontFamily: 'inherit',
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.06em',
      padding: '12px 22px',
      borderRadius: '.4rem',
      border: 0,
      cursor: 'pointer',
      background: 'rgba(255,255,255,.06)',
      color: 'var(--fg-1)'
    }
  }, "npm install animejs \u2197")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 64,
      display: 'flex',
      gap: 10,
      justifyContent: 'center'
    }
  }, [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
    const fromCenter = Math.abs(i - 4);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 26,
        height: 26,
        background: 'var(--red-1)',
        borderRadius: 3,
        animation: playing ? `heroStagger 1800ms cubic-bezier(0.83,0,0.17,1) infinite alternate ${fromCenter * 65}ms` : 'none'
      }
    });
  })), /*#__PURE__*/React.createElement("style", null, `
          @keyframes heroStagger {
            from { transform: translateX(-120px) rotate(-180deg); }
            to   { transform: translateX( 120px) rotate(0deg); }
          }
        `)));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Nav.jsx
try { (() => {
function Nav() {
  const linkStyle = {
    color: 'var(--fg-2)',
    fontSize: 12,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    padding: '6px 10px',
    borderRadius: 4,
    cursor: 'pointer'
  };
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      background: 'rgba(37,36,35,.82)',
      backdropFilter: 'blur(0)',
      borderBottom: '1px solid rgba(255,255,255,.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 2,
      fontWeight: 700,
      fontSize: 18
    }
  }, /*#__PURE__*/React.createElement("span", null, "anime"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      background: 'var(--red-1)',
      display: 'inline-block',
      marginLeft: 2,
      marginRight: 2
    }
  }), /*#__PURE__*/React.createElement("span", null, "js"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--fg-3)',
      marginLeft: 8,
      letterSpacing: '.08em'
    }
  }, "V4")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: linkStyle
  }, "DOCS"), /*#__PURE__*/React.createElement("a", {
    style: linkStyle
  }, "EXAMPLES"), /*#__PURE__*/React.createElement("a", {
    style: linkStyle
  }, "EASINGS"), /*#__PURE__*/React.createElement("a", {
    style: linkStyle
  }, "SPONSORS"), /*#__PURE__*/React.createElement("a", {
    style: {
      ...linkStyle,
      background: 'var(--white-1)',
      color: 'var(--bg-1)'
    }
  }, "GITHUB \u2197")));
}
window.Nav = Nav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Nav.jsx", error: String((e && e.message) || e) }); }

})();
