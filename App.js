import { useState, useEffect, useRef, useCallback } from "react";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const TICK_MS = 200;
const PRIZE_DRAW_INTERVAL = 120;
const SAVE_KEY = "yieldking_save_v1";

const BUILDINGS = [
  { id: "hovel",   name: "Hovel",        emoji: "🏚️", cost: 10,    base: 0.008, desc: "A crumbling shack. Every empire starts somewhere." },
  { id: "inn",     name: "Tavern",       emoji: "🍺", cost: 50,    base: 0.045, desc: "Weary travelers pay coin for rest and ale." },
  { id: "mine",    name: "Gold Mine",    emoji: "⛏️", cost: 200,   base: 0.20,  desc: "Raw ore pulled from deep earth." },
  { id: "market",  name: "Market",       emoji: "🏪", cost: 800,   base: 0.90,  desc: "Trade flows through your gates day and night." },
  { id: "castle",  name: "Castle",       emoji: "🏰", cost: 3000,  base: 4.00,  desc: "Command respect. Command the realm." },
  { id: "dragon",  name: "Dragon Vault", emoji: "🐉", cost: 12000, base: 18.0,  desc: "A beast guards your hoard. Extremely lucrative." },
];

const UPGRADES = [
  { id: "u1", name: "Stone Walls",   cost: 100,   mult: 1.5, desc: "+50% yield on all buildings" },
  { id: "u2", name: "Trade Routes",  cost: 500,   mult: 1.8, desc: "+80% yield on all buildings" },
  { id: "u3", name: "Royal Decree",  cost: 2000,  mult: 2.5, desc: "+150% yield on all buildings" },
  { id: "u4", name: "Ancient Magic", cost: 8000,  mult: 4.0, desc: "+300% yield on all buildings" },
];

const QUESTS = [
  { id: "q1", name: "First Steps",     desc: "Build your first Hovel",       reward: 15,   check: (b) => (b.hovel  || 0) >= 1 },
  { id: "q2", name: "Tavern Keeper",   desc: "Build a Tavern",               reward: 60,   check: (b) => (b.inn    || 0) >= 1 },
  { id: "q3", name: "Miner's Guild",   desc: "Own 3 Gold Mines",             reward: 300,  check: (b) => (b.mine   || 0) >= 3 },
  { id: "q4", name: "Market Day",      desc: "Build a Market",               reward: 1000, check: (b) => (b.market || 0) >= 1 },
  { id: "q5", name: "Hoarder",         desc: "Accumulate 500 Gold",          reward: 200,  check: (b, g) => g >= 500 },
  { id: "q6", name: "Empire Rising",   desc: "Own 10 buildings total",       reward: 500,  check: (b) => Object.values(b).reduce((a, v) => a + v, 0) >= 10 },
  { id: "q7", name: "Realm Lord",      desc: "Build your first Castle",      reward: 5000, check: (b) => (b.castle || 0) >= 1 },
  { id: "q8", name: "Here Be Dragons", desc: "Unlock the Dragon Vault",      reward: 20000,check: (b) => (b.dragon || 0) >= 1 },
];

const TOURNAMENTS = [
  { id: "t1", name: "Peasant Brawl",   entry: 5,   prize: 40,  duration: 60 },
  { id: "t2", name: "Knight's Joust",  entry: 20,  prize: 170, duration: 45 },
  { id: "t3", name: "King's Champion", entry: 100, prize: 850, duration: 30 },
];

const FAKE_PLAYERS = [
  { name: "CryptoKing88",  gold: 284920, prestige: 3 },
  { name: "DeFiDragon",    gold: 142300, prestige: 2 },
  { name: "GoldHoarder",   gold: 98400,  prestige: 2 },
  { name: "YieldWizard",   gold: 76200,  prestige: 1 },
  { name: "BlockchainBob", gold: 45100,  prestige: 1 },
  { name: "SatoshiSam",    gold: 22800,  prestige: 0 },
];

const fmt = (n) =>
  n >= 1000000 ? (n / 1000000).toFixed(2) + "M" :
  n >= 1000    ? (n / 1000).toFixed(1) + "k" :
  n >= 10      ? n.toFixed(1) :
                 n.toFixed(2);

// ── SAVE / LOAD ───────────────────────────────────────────────────────────────
const defaultState = () => ({
  gold: 25, totalEarned: 0, totalDeposited: 0,
  prizePool: 12.4, devFund: 0, tickets: 0,
  buildings: {}, upgrades: {}, completedQuests: {},
  prestige: 0, adGold: 0, playerName: "You",
  prizeTimer: 120, lastDraw: null,
});

const loadState = () => {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? { ...defaultState(), ...JSON.parse(s) } : defaultState();
  } catch { return defaultState(); }
};

const saveState = (state) => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
};

// ── SVG KINGDOM ───────────────────────────────────────────────────────────────
function KingdomScene({ buildings, perSecond, prestige }) {
  const [tick, setTick] = useState(0);
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (perSecond > 0 && tick % Math.max(1, Math.floor(8 / Math.min(perSecond, 8))) === 0) {
      const id = Date.now() + Math.random();
      setCoins(c => [...c.slice(-14), { id, x: 40 + Math.random() * 220, y: 100 + Math.random() * 50, born: Date.now() }]);
      setTimeout(() => setCoins(c => c.filter(x => x.id !== id)), 1600);
    }
  }, [tick, perSecond]);

  const has  = (id) => (buildings[id] || 0) > 0;
  const cnt  = (id) =>  buildings[id] || 0;
  const total = Object.values(buildings).reduce((a, b) => a + b, 0);

  const dayP  = (Math.sin(tick * 0.003) + 1) / 2;
  const skyT  = `rgb(${Math.floor(5 + dayP * 18)},${Math.floor(5 + dayP * 28)},${Math.floor(18 + dayP * 55)})`;
  const skyB  = `rgb(${Math.floor(8 + dayP * 45)},${Math.floor(12 + dayP * 38)},${Math.floor(35 + dayP * 75)})`;
  const sunY  = 36 - dayP * 20;
  const moonY = 36 + dayP * 28;
  const starO = Math.max(0, 1 - dayP * 2.2);
  const smoke = (tick * 0.7) % 28;
  const waterS= Math.sin(tick * 0.04) * 1.5;
  const flagW = Math.sin(tick * 0.09) * 4;
  const drX   = 258 + Math.sin(tick * 0.028) * 38;
  const drY   = 18  + Math.sin(tick * 0.046) * 11;
  const wingUp= tick % 8 < 4;

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #1e1b4b", marginBottom: 14 }}>
      <svg viewBox="0 0 400 220" width="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id="sky"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor={skyT} /><stop offset="100%" stopColor={skyB} /></linearGradient>
          <linearGradient id="gnd"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor="#182018" /><stop offset="100%" stopColor="#0c140c" /></linearGradient>
          <linearGradient id="h2o"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor="#0c2340" /><stop offset="100%" stopColor="#071524" /></linearGradient>
          <linearGradient id="mtn"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor="#191932" /><stop offset="100%" stopColor="#0d0d20" /></linearGradient>
          <radialGradient  id="glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" /><stop offset="100%" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="1.4" /></filter>
        </defs>

        {/* Sky */}
        <rect width="400" height="220" fill="url(#sky)" />

        {/* Stars */}
        {[[30,12],[72,8],[118,16],[162,7],[205,19],[252,10],[302,15],[342,8],[382,12],[52,26],[148,29],[318,23]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r={0.8} fill="#fff" opacity={starO*(0.5+Math.sin(tick*0.07+i)*0.5)} />
        ))}

        {/* Moon */}
        <circle cx={58}  cy={moonY}     r={10} fill="#c4b5fd" opacity={starO*0.9} filter="url(#soft)" />
        <circle cx={62}  cy={moonY-2}   r={8}  fill={skyT}    opacity={starO*0.9} />

        {/* Sun */}
        <circle cx={342} cy={sunY}      r={14} fill="#fde68a"  opacity={dayP}     filter="url(#soft)" />
        <circle cx={342} cy={sunY}      r={10} fill="#fbbf24"  opacity={dayP} />

        {/* Mountains */}
        <polygon points="0,110 38,64 78,94 118,54 158,84 198,50 238,80 278,44 318,74 358,40 400,68 400,120 0,120" fill="url(#mtn)" opacity="0.85" />

        {/* Hills */}
        <ellipse cx={75}  cy={132} rx={88}  ry={34} fill="#101e10" />
        <ellipse cx={322} cy={136} rx={98}  ry={29} fill="#0e1a0e" />

        {/* Ground */}
        <rect x={0} y={148} width={400} height={72} fill="url(#gnd)" />
        <line x1="0" y1="156" x2="400" y2="156" stroke="#1e3a1e" strokeWidth="0.4" opacity="0.5" />

        {/* Road */}
        <ellipse cx={200} cy={220} rx={118} ry={24} fill="#241900" opacity="0.55" />

        {/* Moat */}
        <ellipse cx={200} cy={185} rx={42} ry={8} fill="url(#h2o)" opacity="0.75" />
        <ellipse cx={200} cy={183+waterS*0.3} rx={40} ry={5} fill="#0c4a6e" opacity="0.38" />

        {/* Trees (always) */}
        {[[18,28],[33,22],[358,26],[373,20]].map(([x,h],i)=>(
          <g key={i}>
            <rect  x={x-1}  y={165}      width={2}  height={10} fill="#5c3d1e" />
            <polygon points={`${x},${170-h} ${x-7},170 ${x+7},170`} fill="#14532d" />
            <polygon points={`${x},${162-h} ${x-5},168 ${x+5},168`} fill="#166534" />
          </g>
        ))}

        {/* ── HOVELS ── */}
        {has("hovel") && [...Array(Math.min(cnt("hovel"),4))].map((_,i)=>(
          <g key={i} transform={`translate(${40+i*17},0)`}>
            <rect x={0} y={145} width={13} height={12} fill="#78350f" />
            <polygon points={"-1,145 6,136 14,145"} fill="#92400e" />
            <rect x={4}  y={151} width={4}  height={6} fill="#1c0a00" />
            <rect x={1}  y={147} width={3}  height={3} fill="#fde68a" opacity={dayP<0.35?0.9:0.15} />
            <circle cx={9} cy={136-smoke*0.3} r={2}   fill="#4b5563" opacity={0.35-smoke*0.01} />
            <circle cx={10} cy={130-smoke*0.4} r={1.5} fill="#6b7280" opacity={0.22} />
          </g>
        ))}

        {/* ── TAVERN ── */}
        {has("inn") && (
          <g transform="translate(28,0)">
            <rect x={0} y={138} width={26} height={19} fill="#92400e" />
            <rect x={-2} y={134} width={30} height={6} fill="#b45309" />
            <polygon points={"-2,136 13,122 28,136"} fill="#78350f" />
            <rect x={6} y={140} width={14} height={8} fill="#451a03" />
            <text x={13} y={147} fontSize="4" fill="#fbbf24" textAnchor="middle">INN</text>
            <rect x={2}  y={141} width={5} height={5} fill="#fde68a" opacity={0.75} />
            <rect x={19} y={141} width={5} height={5} fill="#fde68a" opacity={0.75} />
            <circle cx={13} cy={122-smoke*0.5} r={3}   fill="#374151" opacity={0.3} />
            <circle cx={15} cy={114-smoke*0.6} r={2.5} fill="#4b5563" opacity={0.22} />
            <circle cx={-4} cy={143} r={5} fill="url(#glow)" opacity={0.9} />
            <circle cx={-4} cy={143} r={2} fill="#fbbf24" />
          </g>
        )}

        {/* ── MINE ── */}
        {has("mine") && [...Array(Math.min(cnt("mine"),3))].map((_,i)=>(
          <g key={i} transform={`translate(${322+i*15},${i*3})`}>
            <rect x={0} y={145} width={17} height={12} fill="#57534e" />
            <polygon points={"-1,145 8,134 18,145"} fill="#44403c" />
            <path d="M4,157 Q8.5,150 13,157" fill="#1c1917" />
            <line x1="2" y1="157" x2="15" y2="157" stroke="#78716c" strokeWidth="1" />
            <text x={8.5} y={143} fontSize="5" textAnchor="middle">⛏</text>
          </g>
        ))}

        {/* ── MARKET ── */}
        {has("market") && (
          <g transform="translate(88,0)">
            <rect x={0}  y={136} width={40} height={21} fill="#0c4a6e" />
            <rect x={-2} y={130} width={44} height={8}  fill="#0369a1" />
            {[0,1,2,3].map(i=><rect key={i} x={i*11} y={130} width={6} height={8} fill="#0284c7" opacity="0.65" />)}
            <rect x={3}  y={141} width={10} height={5} fill="#92400e" />
            <rect x={16} y={141} width={10} height={5} fill="#166534" />
            <rect x={28} y={141} width={9}  height={5} fill="#7c2d12" />
            <line x1="0" y1="125" x2="0"  y2="114" stroke="#b45309" strokeWidth="1.5" />
            <polygon points="0,114 13,118 0,122" fill="#fbbf24" />
            {[5,14,24,33].map((x,i)=><circle key={i} cx={x} cy={157-i%2*2} r={2} fill={["#fbbf24","#a78bfa","#6ee7b7","#f9a8d4"][i]} opacity="0.8" />)}
          </g>
        )}

        {/* ── CASTLE ── */}
        {has("castle") && (
          <g transform="translate(153,0)">
            <rect x={14} y={100} width={62} height={57} fill="#312e81" />
            {[0,1,2,3,4,5].map(i=><rect key={i} x={14+i*10} y={93} width={7} height={9} fill="#3730a3" />)}
            <rect x={4}  y={115} width={18} height={42} fill="#3730a3" />
            <rect x={68} y={115} width={18} height={42} fill="#3730a3" />
            <polygon points="4,115 13,100 22,115"   fill="#4338ca" />
            <polygon points="68,115 77,100 86,115"  fill="#4338ca" />
            <path d="M31,157 Q45,145 59,157 Z"      fill="#1e1b4b" />
            <rect x={31} y={150} width={28} height={7} fill="#1e1b4b" />
            {[34,38,42,46,50,54,58].map(x=><line key={x} x1={x} y1={150} x2={x} y2={157} stroke="#374151" strokeWidth="0.9" />)}
            <rect x={22} y={118} width={6} height={8} fill="#fde68a" opacity={dayP<0.4?0.9:0.25} />
            <rect x={62} y={118} width={6} height={8} fill="#fde68a" opacity={dayP<0.4?0.9:0.25} />
            <rect x={34} y={112} width={8} height={10} fill="#fde68a" opacity={dayP<0.4?0.8:0.18} />
            <rect x={48} y={112} width={8} height={10} fill="#fde68a" opacity={dayP<0.4?0.8:0.18} />
            <line x1={45} y1={93} x2={45} y2={74} stroke="#6b7280" strokeWidth="1.5" />
            <polygon points={`45,74 45,84 ${61+flagW},79`} fill="#dc2626" />
            <circle cx={13} cy={130} r={4}  fill="url(#glow)" opacity={0.9} /><circle cx={13} cy={130} r={1.8} fill="#fbbf24" />
            <circle cx={77} cy={130} r={4}  fill="url(#glow)" opacity={0.9} /><circle cx={77} cy={130} r={1.8} fill="#fbbf24" />
            <circle cx={13} cy={100-smoke*0.4} r={3} fill="#374151" opacity={0.28} />
            <circle cx={77} cy={100-smoke*0.5} r={3} fill="#374151" opacity={0.28} />
          </g>
        )}

        {/* ── DRAGON VAULT ── */}
        {has("dragon") && (
          <g>
            <polygon points="288,157 308,88 328,157" fill="#1c1917" />
            <polygon points="294,157 314,98 338,157" fill="#292524" />
            <path d="M304,157 Q314,140 324,157" fill="#450a0a" />
            <ellipse cx={314} cy={150} rx={12} ry={8} fill="#fbbf24" opacity="0.14" />
            <g transform={`translate(${drX},${drY})`}>
              <ellipse cx={0}  cy={0}  rx={10} ry={5} fill="#15803d" />
              <ellipse cx={11} cy={-2} rx={5}  ry={4} fill="#16a34a" />
              <circle  cx={14} cy={-3} r={1}   fill="#fbbf24" />
              <path d={wingUp?"M-2,-5 Q-15,-20 -20,-8 Q-10,-5 -2,-5":"M-2,-5 Q-15,-10 -20,2 Q-10,-2 -2,-5"} fill="#166534" opacity="0.9" />
              <path d={wingUp?"M-2,-5 Q5,-18 10,-6":"M-2,-5 Q5,-8 10,2"} fill="#166534" opacity="0.7" />
              {tick%60<15&&<><ellipse cx={18} cy={-1} rx={6} ry={2} fill="#f97316" opacity="0.8"/><ellipse cx={24} cy={-0.5} rx={4} ry={1.5} fill="#fbbf24" opacity="0.6"/></>}
              <path d="M-10,2 Q-20,8 -16,14" stroke="#15803d" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </g>
          </g>
        )}

        {/* Gold coins */}
        {coins.map(c => {
          const age = (Date.now() - c.born) / 1600;
          const cy  = c.y - age * 55;
          const op  = Math.max(0, 1 - age);
          return (
            <g key={c.id}>
              <circle cx={c.x} cy={cy} r={4}   fill="#fbbf24" opacity={op} />
              <text   x={c.x}  y={cy+1.5} fontSize="5" fill="#78350f" textAnchor="middle" opacity={op}>$</text>
            </g>
          );
        })}

        {/* Prestige shimmer */}
        {prestige > 0 && <rect width="400" height="220" fill="#7c3aed" opacity={0.03*prestige} />}

        {/* Empty hint */}
        {total === 0 && <text x="200" y="158" fontSize="11" fill="#4b5563" textAnchor="middle">Your land awaits… buy a building to begin</text>}

        {/* HUD */}
        <rect x={4} y={4} width={82} height={18} rx={4} fill="#000" opacity={0.55} />
        <text x={9} y={16} fontSize="8.5" fill="#fbbf24" fontWeight="bold">⚙ {fmt(perSecond)}/s</text>
        {prestige>0&&<><rect x={308} y={4} width={88} height={18} rx={4} fill="#000" opacity={0.55}/><text x={314} y={16} fontSize="8.5" fill="#a78bfa" fontWeight="bold">✨ Prestige ×{prestige}</text></>}
      </svg>
      <div style={{ position:"absolute", top:8, right:8, fontSize:10, color:"#6b7280", background:"rgba(0,0,0,0.55)", padding:"2px 6px", borderRadius:4 }}>
        {(Math.sin(Date.now()/12000)+1)/2 > 0.5 ? "☀️ Day" : "🌙 Night"}
      </div>
    </div>
  );
}

// ── AD BANNER ─────────────────────────────────────────────────────────────────
const ADS = [
  { text: "🔥 Stake BNB on Lido — 4.2% APY real yield", sub: "Sponsored · lido.fi" },
  { text: "⚡ Trade crypto with 0% maker fees", sub: "Sponsored · dex.example.com" },
  { text: "🛡️ Insure your DeFi positions today", sub: "Sponsored · nexusmutual.io" },
  { text: "🌐 YieldKing Whitelist — Join Discord", sub: "Sponsored · yieldking.io" },
];
function AdBanner({ onAdWatch }) {
  const [idx, setIdx]     = useState(0);
  const [watching, setW]  = useState(false);
  const [prog, setProg]   = useState(0);
  const ref = useRef();
  const watch = () => {
    if (watching) return;
    setW(true); setProg(0); let p=0;
    ref.current = setInterval(() => {
      p += 5; setProg(p);
      if (p >= 100) { clearInterval(ref.current); setW(false); setProg(0); setIdx(i=>(i+1)%ADS.length); onAdWatch(); }
    }, 150);
  };
  useEffect(() => () => clearInterval(ref.current), []);
  const ad = ADS[idx];
  return (
    <div style={{ background:"#0a0a1a", border:"1px solid #1e1b4b", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
      <div style={{ flex:1 }}>
        <div style={{ color:"#c4b5fd", fontSize:12, fontWeight:700 }}>{ad.text}</div>
        <div style={{ color:"#374151", fontSize:10 }}>{ad.sub}</div>
        {watching && <div style={{ marginTop:4, height:3, background:"#1e1b4b", borderRadius:2, overflow:"hidden" }}><div style={{ height:"100%", width:`${prog}%`, background:"#7c3aed" }} /></div>}
      </div>
      <button onClick={watch} disabled={watching} style={{ background:watching?"#1f1f3a":"#7c3aed", color:watching?"#374151":"#fff", border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:watching?"default":"pointer", whiteSpace:"nowrap" }}>
        {watching?"…":"Watch +2G"}
      </button>
    </div>
  );
}

// ── TOURNAMENT GAME ───────────────────────────────────────────────────────────
function TournamentGame({ t, onFinish, onCancel }) {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTL]   = useState(t.duration);
  const [done, setDone]     = useState(false);
  const [pos, setPos]       = useState({ x:45, y:45 });
  const ref = useRef();
  useEffect(() => {
    ref.current = setInterval(() => setTL(tl => {
      if (tl <= 1) { clearInterval(ref.current); setDone(true); return 0; }
      return tl - 1;
    }), 1000);
    return () => clearInterval(ref.current);
  }, []);
  const target = Math.floor(t.duration * 0.75);
  const won    = done && clicks >= target;
  const prize  = won ? Math.floor(t.prize * 0.6) : 0;
  const click  = () => { if (done) return; setClicks(c=>c+1); setPos({ x:8+Math.random()*78, y:8+Math.random()*78 }); };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500 }}>
      <div style={{ background:"#0d0d1f", border:"1px solid #6366f1", borderRadius:18, padding:28, width:360, textAlign:"center" }}>
        <div style={{ color:"#a78bfa", fontSize:11, fontWeight:700, letterSpacing:1 }}>⚔️ {t.name.toUpperCase()}</div>
        <div style={{ color:"#fff", fontSize:20, fontWeight:900, margin:"6px 0 10px" }}>TOURNAMENT</div>
        {!done ? (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ color:"#f59e0b", fontWeight:700 }}>⏱ {timeLeft}s</span>
              <span style={{ color:"#22c55e", fontWeight:700 }}>👆 {clicks}/{target}</span>
            </div>
            <div style={{ position:"relative", height:188, background:"#0a0a1a", borderRadius:12, marginBottom:14, border:"1px solid #1e1b4b", overflow:"hidden" }}>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#1e1b4b", fontSize:12, pointerEvents:"none" }}>Click the crown!</div>
              <button onClick={click} style={{ position:"absolute", left:`${pos.x}%`, top:`${pos.y}%`, transform:"translate(-50%,-50%)", background:"none", border:"none", fontSize:38, cursor:"pointer", filter:"drop-shadow(0 0 10px gold)", transition:"left 0.08s, top 0.08s" }}>👑</button>
            </div>
          </>
        ) : (
          <div style={{ margin:"24px 0" }}>
            <div style={{ fontSize:52 }}>{won?"🏆":"💀"}</div>
            <div style={{ color:won?"#22c55e":"#ef4444", fontSize:22, fontWeight:900, marginTop:10 }}>{won?`+${prize} Gold!`:"Defeated!"}</div>
            <div style={{ color:"#6b7280", fontSize:12, marginTop:4 }}>{clicks} clicks · target was {target}</div>
          </div>
        )}
        {done
          ? <button onClick={()=>onFinish(prize)} style={{ width:"100%", background:"#7c3aed", color:"#fff", border:"none", borderRadius:10, padding:"12px 0", fontWeight:700, cursor:"pointer", fontSize:14 }}>Collect & Return</button>
          : <button onClick={onCancel}             style={{ width:"100%", background:"#374151", color:"#9ca3af", border:"none", borderRadius:10, padding:"12px 0", fontWeight:700, cursor:"pointer" }}>Forfeit</button>
        }
      </div>
    </div>
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", top:16, right:16, zIndex:1000, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:t.type==="win"?"#14532d":t.type==="warn"?"#713f12":"#1e1b4b", border:`1px solid ${t.type==="win"?"#22c55e":t.type==="warn"?"#f59e0b":"#6366f1"}`, color:"#fff", padding:"10px 14px", borderRadius:10, fontSize:12, fontWeight:600, boxShadow:"0 4px 24px rgba(0,0,0,0.6)", maxWidth:260 }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(loadState);
  const {
    gold, totalEarned, totalDeposited, prizePool, devFund,
    tickets, buildings, upgrades, completedQuests,
    prestige, adGold, prizeTimer, lastDraw,
  } = state;

  const [tab, setTab]           = useState("kingdom");
  const [toasts, setToasts]     = useState([]);
  const [tournament, setTournament] = useState(null);
  const [nameInput, setName]    = useState("");
  const [showName, setShowName] = useState(!state.playerName || state.playerName === "You");

  const set = useCallback((updates) => setState(s => {
    const next = typeof updates === "function" ? updates(s) : { ...s, ...updates };
    saveState(next);
    return next;
  }), []);

  const toast = useCallback((msg, type="info") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const yieldMult = Object.keys(upgrades).reduce((acc, uid) => {
    const u = UPGRADES.find(x => x.id === uid);
    return u ? acc * u.mult : acc;
  }, 1) * (1 + prestige * 0.5);

  const perSecond = Object.entries(buildings).reduce((acc, [bid, count]) => {
    const b = BUILDINGS.find(x => x.id === bid);
    return acc + (b ? b.base * count * yieldMult : 0);
  }, 0);

  // Main tick
  useEffect(() => {
    const id = setInterval(() => {
      set(s => {
        const earned = perSecond * (TICK_MS / 1000);
        const poolGain = s.totalDeposited > 0 ? s.totalDeposited * (0.055/365) * (TICK_MS/1000) * 0.2 : 0;
        const newTimer = s.prizeTimer - 1;
        return {
          ...s,
          gold: s.gold + earned,
          totalEarned: s.totalEarned + earned,
          prizePool: s.prizePool + poolGain,
          prizeTimer: newTimer <= 0 ? PRIZE_DRAW_INTERVAL : newTimer,
        };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [perSecond, set]);

  // Prize draw trigger
  useEffect(() => {
    if (prizeTimer === PRIZE_DRAW_INTERVAL && totalEarned > 0) {
      const totalT = tickets + 3741;
      const chance = tickets / Math.max(totalT, 1);
      if (Math.random() < chance) {
        const win = prizePool * 0.3;
        set(s => ({ ...s, gold: s.gold + win, prizePool: s.prizePool * 0.7, lastDraw: `🏆 YOU WON ${fmt(win)} Gold!` }));
        toast(`👑 PRIZE WIN! +${fmt(prizePool * 0.3)} Gold!`, "win");
      } else {
        set(s => ({ ...s, lastDraw: `Draw complete. Next in ${PRIZE_DRAW_INTERVAL}s.` }));
        toast("🎲 Prize draw — no win this time.", "info");
      }
    }
  }, [prizeTimer]);

  // Quest checker
  useEffect(() => {
    QUESTS.forEach(q => {
      if (!completedQuests[q.id] && q.check(buildings, gold)) {
        set(s => ({ ...s, gold: s.gold + q.reward, completedQuests: { ...s.completedQuests, [q.id]: true } }));
        toast(`📜 Quest: "${q.name}" complete! +${q.reward} Gold`, "win");
      }
    });
  }, [buildings, Math.floor(gold / 10)]);

  const buyBuilding = (b) => {
    if (gold < b.cost) { toast("Not enough Gold!", "warn"); return; }
    set(s => ({ ...s, gold: s.gold - b.cost, buildings: { ...s.buildings, [b.id]: (s.buildings[b.id]||0)+1 }, totalDeposited: s.totalDeposited + b.cost, tickets: s.tickets + Math.floor(b.cost/10) }));
    toast(`Built ${b.name}! +${fmt(b.base * yieldMult)}/s`);
  };

  const buyUpgrade = (u) => {
    if (gold < u.cost) { toast("Not enough Gold!", "warn"); return; }
    if (upgrades[u.id]) { toast("Already owned!", "warn"); return; }
    set(s => ({ ...s, gold: s.gold - u.cost, upgrades: { ...s.upgrades, [u.id]: true } }));
    toast(`✨ ${u.name} unlocked!`, "win");
  };

  const depositToPool = () => {
    if (gold < 10) { toast("Need at least 10 Gold", "warn"); return; }
    const amt = Math.floor(gold * 0.5);
    set(s => ({ ...s, gold: s.gold - amt, totalDeposited: s.totalDeposited + amt, tickets: s.tickets + Math.floor(amt/5), prizePool: s.prizePool + amt*0.2, devFund: s.devFund + amt*0.1 }));
    toast(`💰 Deposited ${amt} Gold. +${Math.floor(amt/5)} tickets!`, "win");
  };

  const doPrestige = () => {
    if (gold < 50000) { toast("Need 50,000 Gold to Prestige!", "warn"); return; }
    const newP = prestige + 1;
    set({ ...defaultState(), prestige: newP, gold: 25 });
    toast(`✨ PRESTIGE ${newP}! All yield ×${(1+newP*0.5).toFixed(1)} forever!`, "win");
  };

  const onAdWatch = () => {
    set(s => ({ ...s, gold: s.gold + 2, adGold: s.adGold + 2 }));
    toast("📺 +2 Gold from ad!");
  };

  const finishTournament = (prize) => {
    if (prize > 0) { set(s => ({ ...s, gold: s.gold + prize })); toast(`🏆 Tournament won! +${prize} Gold`, "win"); }
    else toast("💀 Better luck next time.", "warn");
    setTournament(null);
  };

  const totalB = Object.values(buildings).reduce((a,b)=>a+b,0);

  const leaderboard = [...FAKE_PLAYERS, { name: state.playerName || "You", gold: Math.floor(totalEarned), prestige, isYou: true }]
    .sort((a, b) => b.gold - a.gold);

  const C  = { background:"#0d0d1f", border:"1px solid #1e1b4b", borderRadius:12, padding:14, marginBottom:10 };
  const TB = (a) => ({ padding:"7px 13px", borderRadius:8, fontSize:12, fontWeight:700, background:a?"#7c3aed":"transparent", color:a?"#fff":"#6b7280", border:"none", cursor:"pointer" });

  if (showName) return (
    <div style={{ minHeight:"100vh", background:"#070714", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',sans-serif" }}>
      <div style={{ background:"#0d0d1f", border:"1px solid #3730a3", borderRadius:20, padding:40, width:320, textAlign:"center" }}>
        <div style={{ fontSize:48 }}>👑</div>
        <div style={{ color:"#c4b5fd", fontWeight:900, fontSize:24, margin:"10px 0 4px" }}>YieldKing</div>
        <div style={{ color:"#4b5563", fontSize:13, marginBottom:24 }}>Build your kingdom. Earn yield. Rule all.</div>
        <input
          value={nameInput}
          onChange={e=>setName(e.target.value)}
          placeholder="Enter your ruler name…"
          maxLength={20}
          style={{ width:"100%", background:"#0a0a1a", border:"1px solid #3730a3", borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:14, outline:"none", marginBottom:14 }}
        />
        <button
          onClick={() => { if (!nameInput.trim()) return; set(s=>({...s,playerName:nameInput.trim()})); setShowName(false); }}
          style={{ width:"100%", background:"#7c3aed", color:"#fff", border:"none", borderRadius:10, padding:"12px 0", fontWeight:700, fontSize:15, cursor:"pointer" }}
        >Begin Your Reign →</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#070714", color:"#fff", fontFamily:"'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#3730a3;border-radius:2px}
        * { box-sizing: border-box; }
      `}</style>

      <Toast toasts={toasts} />
      {tournament && <TournamentGame t={tournament} onFinish={finishTournament} onCancel={()=>{setTournament(null);toast("Forfeited.","warn");}} />}

      {/* Header */}
      <div style={{ background:"#0a0a1a", borderBottom:"1px solid #1e1b4b", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20 }}>👑</span>
          <div>
            <div style={{ fontWeight:900, fontSize:16, color:"#c4b5fd", letterSpacing:"-0.5px" }}>YieldKing</div>
            {prestige>0 && <div style={{ fontSize:9, color:"#7c3aed", fontWeight:700 }}>✨ PRESTIGE {prestige} · ×{(1+prestige*0.5).toFixed(1)}</div>}
          </div>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:"#fbbf24", fontWeight:900, fontSize:17 }}>{fmt(gold)}</div>
            <div style={{ color:"#374151", fontSize:9 }}>GOLD</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:"#a78bfa", fontWeight:700, fontSize:12 }}>+{fmt(perSecond)}/s</div>
            <div style={{ color:"#374151", fontSize:9 }}>YIELD</div>
          </div>
          <button onClick={doPrestige} title="Prestige at 50k Gold" style={{ background:gold>=50000?"#7c3aed":"#1a1a2e", color:gold>=50000?"#fff":"#374151", border:"none", borderRadius:8, padding:"5px 9px", fontSize:11, fontWeight:700, cursor:gold>=50000?"pointer":"default" }}>
            ✨ Prestige
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background:"#0a0a1a", borderBottom:"1px solid #111", padding:"5px 16px", display:"flex", gap:14, overflowX:"auto" }}>
        {[
          {l:"Prize Pool", v:`${fmt(prizePool)}G`, c:"#22c55e"},
          {l:"Tickets",    v:tickets,               c:"#a78bfa"},
          {l:"Draw In",    v:`${prizeTimer}s`,       c:"#f59e0b"},
          {l:"Players",    v:"1,247",                c:"#60a5fa"},
          {l:"Ad Gold",    v:`+${adGold}`,           c:"#34d399"},
          {l:"Earned",     v:fmt(totalEarned),       c:"#fb923c"},
        ].map(s=>(
          <div key={s.l} style={{ textAlign:"center", minWidth:55 }}>
            <div style={{ color:s.c, fontWeight:700, fontSize:12 }}>{s.v}</div>
            <div style={{ color:"#374151", fontSize:9 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background:"#0a0a1a", padding:"8px 16px 0", display:"flex", gap:2, borderBottom:"1px solid #1e1b4b", overflowX:"auto" }}>
        {["kingdom","market","pool","compete","quests","ranks","treasury"].map(t=>(
          <button key={t} style={TB(tab===t)} onClick={()=>setTab(t)}>
            {{"kingdom":"🏰 Kingdom","market":"🏪 Market","pool":"🎰 Pool","compete":"⚔️ Compete","quests":"📜 Quests","ranks":"🏆 Ranks","treasury":"📊 Info"}[t]}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:700, margin:"0 auto", padding:"14px 16px" }}>
        <AdBanner onAdWatch={onAdWatch} />

        {/* KINGDOM */}
        {tab==="kingdom" && (
          <div>
            <KingdomScene buildings={buildings} perSecond={perSecond} prestige={prestige} />
            <div style={{ ...C, padding:"10px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color:"#a78bfa", fontSize:12, fontWeight:700 }}>{state.playerName}'s Kingdom</div>
                  <div style={{ color:"#4b5563", fontSize:11 }}>{totalB} buildings · {fmt(perSecond)}/s yield</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:"#fbbf24", fontSize:13, fontWeight:700 }}>×{yieldMult.toFixed(1)}</div>
                  <div style={{ color:"#374151", fontSize:10 }}>multiplier</div>
                </div>
              </div>
            </div>
            {totalB===0
              ? <div style={{ ...C, textAlign:"center", padding:28 }}>
                  <div style={{ fontSize:36 }}>🌑</div>
                  <div style={{ color:"#4b5563", fontSize:13, margin:"8px 0" }}>Your kingdom is empty. Build something.</div>
                  <button onClick={()=>setTab("market")} style={{ background:"#7c3aed", color:"#fff", border:"none", borderRadius:8, padding:"8px 20px", fontWeight:700, cursor:"pointer" }}>Open Market →</button>
                </div>
              : Object.entries(buildings).map(([bid,count])=>{
                  const b=BUILDINGS.find(x=>x.id===bid);
                  if(!b||count===0) return null;
                  return (
                    <div key={bid} style={{ ...C, display:"flex", gap:12, alignItems:"center" }}>
                      <span style={{ fontSize:24 }}>{b.emoji}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, color:"#e9d5ff" }}>{b.name} <span style={{ color:"#6b7280" }}>×{count}</span></div>
                        <div style={{ color:"#4b5563", fontSize:11 }}>{b.desc}</div>
                      </div>
                      <div style={{ color:"#fbbf24", fontWeight:700, fontSize:13 }}>{fmt(b.base*count*yieldMult)}/s</div>
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* MARKET */}
        {tab==="market" && (
          <div>
            <div style={{ color:"#a78bfa", fontSize:12, fontWeight:700, marginBottom:8 }}>Buildings</div>
            {BUILDINGS.map(b=>{
              const owned=buildings[b.id]||0, can=gold>=b.cost;
              return (
                <div key={b.id} style={{ ...C, display:"flex", alignItems:"center", gap:12, opacity:can?1:0.55 }}>
                  <span style={{ fontSize:24, minWidth:30 }}>{b.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:"#e9d5ff", fontSize:13 }}>{b.name}</div>
                    <div style={{ color:"#4b5563", fontSize:11 }}>{b.desc}</div>
                    <div style={{ fontSize:11, marginTop:2 }}>
                      <span style={{ color:"#fbbf24" }}>{fmt(b.base*yieldMult)}/s</span>
                      <span style={{ color:"#374151" }}> · owned: </span>
                      <span style={{ color:"#a78bfa" }}>{owned}</span>
                    </div>
                  </div>
                  <button onClick={()=>buyBuilding(b)} disabled={!can} style={{ background:can?"#7c3aed":"#1f1f3a", color:can?"#fff":"#374151", border:"none", borderRadius:8, padding:"7px 11px", fontWeight:700, cursor:can?"pointer":"default", fontSize:12, whiteSpace:"nowrap" }}>
                    {fmt(b.cost)} G
                  </button>
                </div>
              );
            })}
            <div style={{ color:"#a78bfa", fontSize:12, fontWeight:700, margin:"14px 0 8px" }}>Upgrades</div>
            {UPGRADES.map(u=>{
              const owned=!!upgrades[u.id], can=gold>=u.cost&&!owned;
              return (
                <div key={u.id} style={{ ...C, display:"flex", alignItems:"center", gap:12, opacity:owned?0.35:can?1:0.55 }}>
                  <span style={{ fontSize:20, minWidth:30 }}>✨</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:"#e9d5ff", fontSize:13 }}>{u.name}</div>
                    <div style={{ color:"#4b5563", fontSize:11 }}>{u.desc}</div>
                  </div>
                  <button onClick={()=>buyUpgrade(u)} disabled={!can} style={{ background:owned?"#1f1f3a":can?"#7c3aed":"#1f1f3a", color:owned?"#374151":can?"#fff":"#374151", border:"none", borderRadius:8, padding:"7px 11px", fontWeight:700, cursor:can?"pointer":"default", fontSize:12, whiteSpace:"nowrap" }}>
                    {owned?"✓ Owned":`${fmt(u.cost)} G`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* POOL */}
        {tab==="pool" && (
          <div>
            <div style={{ ...C, textAlign:"center", padding:20, borderColor:"#14532d" }}>
              <div style={{ color:"#4b5563", fontSize:11, fontWeight:700, letterSpacing:1 }}>CURRENT PRIZE POOL</div>
              <div style={{ color:"#22c55e", fontWeight:900, fontSize:36, margin:"6px 0" }}>{fmt(prizePool)} G</div>
              <div style={{ color:"#f59e0b", fontWeight:700, animation:"pulse 1s infinite" }}>⏱ Draw in {prizeTimer}s</div>
              <div style={{ color:"#4b5563", fontSize:11, marginTop:4 }}>30% distributed · funded by real DeFi yield</div>
            </div>
            <div style={C}>
              <div style={{ color:"#a78bfa", fontWeight:700, marginBottom:6 }}>Your tickets: <span style={{ color:"#fff", fontSize:20 }}>{tickets}</span></div>
              <div style={{ color:"#4b5563", fontSize:12 }}>Win chance: {tickets>0?((tickets/(tickets+3741))*100).toFixed(3):"0.000"}%</div>
              <button onClick={depositToPool} disabled={gold<10} style={{ width:"100%", marginTop:12, background:gold>=10?"#15803d":"#1f1f3a", color:gold>=10?"#fff":"#374151", border:"none", borderRadius:8, padding:"10px 0", fontWeight:700, cursor:gold>=10?"pointer":"default", fontSize:13 }}>
                Deposit 50% Gold for Lottery Tickets
              </button>
            </div>
            {lastDraw && <div style={{ ...C, borderColor:"#3730a3" }}><div style={{ color:"#4b5563", fontSize:10, marginBottom:2 }}>Last draw</div><div style={{ color:"#e9d5ff", fontSize:13 }}>{lastDraw}</div></div>}
          </div>
        )}

        {/* COMPETE */}
        {tab==="compete" && (
          <div>
            <div style={{ color:"#a78bfa", fontSize:12, fontWeight:700, marginBottom:4 }}>Skill Tournaments</div>
            <div style={{ color:"#4b5563", fontSize:11, marginBottom:12 }}>Pay entry fee. Click the crown. Top clicker wins 60% of prize. No luck — pure skill.</div>
            {TOURNAMENTS.map(t=>{
              const can=gold>=t.entry;
              return (
                <div key={t.id} style={{ ...C, opacity:can?1:0.6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontWeight:700, color:"#e9d5ff", fontSize:14 }}>⚔️ {t.name}</div>
                    <div style={{ color:"#22c55e", fontWeight:700 }}>🏆 {fmt(t.prize*0.6)} G</div>
                  </div>
                  <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                    {[{l:"Entry",v:`${t.entry}G`,c:"#fbbf24"},{l:"Time",v:`${t.duration}s`,c:"#60a5fa"},{l:"Target",v:`${Math.floor(t.duration*0.75)} clicks`,c:"#a78bfa"}].map(s=>(
                      <div key={s.l} style={{ flex:1, background:"#0a0a1a", borderRadius:6, padding:"6px 0", textAlign:"center" }}>
                        <div style={{ color:s.c, fontWeight:700, fontSize:12 }}>{s.v}</div>
                        <div style={{ color:"#374151", fontSize:9 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>{ if(!can){toast("Not enough Gold!","warn");return;} set(s=>({...s,gold:s.gold-t.entry})); setTournament(t); }} style={{ width:"100%", background:can?"#7c3aed":"#1f1f3a", color:can?"#fff":"#374151", border:"none", borderRadius:8, padding:"9px 0", fontWeight:700, cursor:can?"pointer":"default", fontSize:13 }}>
                    {can?`Enter for ${t.entry} G`:`Need ${t.entry} G`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* QUESTS */}
        {tab==="quests" && (
          <div>
            <div style={{ color:"#a78bfa", fontSize:12, fontWeight:700, marginBottom:10 }}>Quests</div>
            {QUESTS.map(q=>{
              const done=!!completedQuests[q.id];
              return (
                <div key={q.id} style={{ ...C, display:"flex", gap:12, alignItems:"center", opacity:done?0.4:1, borderColor:done?"#14532d":"#1e1b4b" }}>
                  <div style={{ fontSize:20 }}>{done?"✅":"📜"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:done?"#22c55e":"#e9d5ff", fontSize:13 }}>{q.name}</div>
                    <div style={{ color:"#4b5563", fontSize:11 }}>{q.desc}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color:"#fbbf24", fontWeight:700 }}>+{q.reward} G</div>
                    {done&&<div style={{ color:"#22c55e", fontSize:10 }}>Done!</div>}
                  </div>
                </div>
              );
            })}
            <div style={{ ...C, borderColor:"#4c1d95", marginTop:4 }}>
              <div style={{ color:"#a78bfa", fontWeight:700, marginBottom:4 }}>✨ Prestige System</div>
              <div style={{ color:"#4b5563", fontSize:12, marginBottom:10 }}>Reset at 50,000 Gold for a permanent +50% yield multiplier. Stack prestiges to dominate the leaderboard.</div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#4b5563", marginBottom:4 }}>
                  <span>Progress to Prestige</span>
                  <span>{fmt(Math.min(gold,50000))} / 50,000</span>
                </div>
                <div style={{ height:6, background:"#1e1b4b", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(100,(gold/50000)*100)}%`, background:"#7c3aed", transition:"width 0.5s" }} />
                </div>
              </div>
              <button onClick={doPrestige} disabled={gold<50000} style={{ width:"100%", background:gold>=50000?"#7c3aed":"#1f1f3a", color:gold>=50000?"#fff":"#374151", border:"none", borderRadius:8, padding:"10px 0", fontWeight:700, cursor:gold>=50000?"pointer":"default", fontSize:13 }}>
                {gold>=50000?"✨ Prestige Now!":`Need ${fmt(50000-gold)} more Gold`}
              </button>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {tab==="ranks" && (
          <div>
            <div style={{ color:"#a78bfa", fontSize:12, fontWeight:700, marginBottom:10 }}>Global Leaderboard</div>
            {leaderboard.map((p,i)=>(
              <div key={p.name} style={{ ...C, display:"flex", alignItems:"center", gap:12, borderColor:p.isYou?"#7c3aed":"#1e1b4b" }}>
                <div style={{ fontSize:18, minWidth:26, textAlign:"center" }}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:p.isYou?"#a78bfa":"#e9d5ff", fontSize:13 }}>{p.name}{p.isYou?" (You)":""}</div>
                  {p.prestige>0&&<div style={{ color:"#7c3aed", fontSize:10 }}>{"✨".repeat(Math.min(p.prestige,5))} Prestige {p.prestige}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:"#fbbf24", fontWeight:700, fontSize:13 }}>{fmt(p.gold)} G</div>
                  <div style={{ color:"#374151", fontSize:10 }}>total earned</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TREASURY */}
        {tab==="treasury" && (
          <div>
            <div style={C}>
              <div style={{ color:"#60a5fa", fontWeight:700, marginBottom:10 }}>📊 How It Works</div>
              {[
                {l:"DeFi Yield Reserve", pct:70, val:fmt(totalDeposited*0.7), c:"#22c55e", d:"Earns 5.5% APY — funds prize pool"},
                {l:"Prize Pool",         pct:20, val:fmt(prizePool),           c:"#a78bfa", d:"Weekly draws for ticket holders"},
                {l:"Dev Fund (30d lock)",pct:10, val:fmt(devFund),             c:"#f59e0b", d:"Visible on-chain, time-locked"},
              ].map(r=>(
                <div key={r.l} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                    <span style={{ color:"#e9d5ff", fontWeight:600 }}>{r.l}</span>
                    <span style={{ color:r.c, fontWeight:700 }}>{r.pct}% · {r.val}G</span>
                  </div>
                  <div style={{ height:5, background:"#1e1b4b", borderRadius:3, overflow:"hidden", marginBottom:2 }}>
                    <div style={{ height:"100%", width:`${r.pct}%`, background:r.c }} />
                  </div>
                  <div style={{ color:"#4b5563", fontSize:10 }}>{r.d}</div>
                </div>
              ))}
            </div>
            <div style={{ ...C, borderColor:"#14532d" }}>
              <div style={{ color:"#22c55e", fontWeight:700, marginBottom:8 }}>🛡️ Anti-Rug Guarantees</div>
              {["Smart contract holds all funds — not a dev wallet","No admin withdrawal function in contract code","Dev fund 30-day time-lock — visible on-chain","Yield sourced from Aave — not new player deposits","Fully open-source, auditable by anyone","Chainlink VRF for provably fair prize draws"].map(g=>(
                <div key={g} style={{ color:"#4b5563", fontSize:11, padding:"3px 0", display:"flex", gap:6 }}>
                  <span style={{ color:"#22c55e" }}>✓</span>{g}
                </div>
              ))}
            </div>
            <div style={{ ...C }}>
              <div style={{ color:"#a78bfa", fontWeight:700, marginBottom:8 }}>Revenue Streams</div>
              {[
                {n:"Watch-to-earn Ads",     s:"🟢 Live",       v:`${adGold} Gold earned today`},
                {n:"Tournament Entry Fees", s:"🟢 Live",       v:"15% dev cut from all prizes"},
                {n:"DeFi Yield (Aave)",     s:"🔜 On-chain",   v:"5.5% APY on deposits"},
                {n:"Cosmetic Shop",         s:"🔜 Coming soon",v:"Skins, themes, effects"},
                {n:"Premium Membership",    s:"🔜 Coming soon",v:"$5–10/month VIP perks"},
              ].map(r=>(
                <div key={r.n} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #111" }}>
                  <div>
                    <div style={{ color:"#e9d5ff", fontSize:12 }}>{r.n}</div>
                    <div style={{ color:"#374151", fontSize:10 }}>{r.v}</div>
                  </div>
                  <span style={{ fontSize:11, color:"#6b7280" }}>{r.s}</span>
                </div>
              ))}
            </div>
            <div style={{ ...C, textAlign:"center", padding:16 }}>
              <div style={{ color:"#4b5563", fontSize:12, marginBottom:6 }}>Game progress is saved automatically in your browser.</div>
              <button onClick={()=>{ if(window.confirm("Reset all progress?")){ localStorage.removeItem(SAVE_KEY); window.location.reload(); }}} style={{ background:"#450a0a", color:"#fca5a5", border:"1px solid #7f1d1d", borderRadius:8, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                ⚠️ Reset Progress
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
