const fs = require("fs");
const S = JSON.parse(fs.readFileSync(__dirname + "/data/stream.json", "utf8"));
const { data, roleOf, events } = S;

const roles = ["Duelist", "Controller", "Initiator", "Sentinel"];
// role color families (hue on white bg): warm red, violet, teal, blue
const HUE = { Duelist: 5, Controller: 262, Initiator: 168, Sentinel: 212 };

// peak share per agent (for ordering shades: biggest meta agent = strongest tone)
const peak = {};
data.forEach(([d, v, a]) => { if (v > (peak[a] || 0)) peak[a] = v; });

function hsl(h, s, l) { return `hsl(${h.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(0)}%)`; }

// assign each agent a shade within its role family, ordered by peak desc
const agentColor = {};
const legend = {}; // role -> [{name,color,peak}]
roles.forEach(r => {
  const ags = Object.keys(roleOf).filter(a => roleOf[a] === r)
    .sort((a, b) => (peak[b] || 0) - (peak[a] || 0));
  const n = ags.length;
  legend[r] = [];
  ags.forEach((a, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    const l = 34 + t * 44;      // 34% -> 78% lightness (wide, prominent gradient)
    const s = 82 - t * 30;      // 82% -> 52% saturation
    const c = hsl(HUE[r], s, l);
    agentColor[a] = c;
    legend[r].push({ name: a, color: c, peak: peak[a] || 0 });
  });
});

// themeRiver stacks layers in the order each name first appears in the data.
// Emit agents grouped by role, and within a role sorted by peak (== shade ramp
// order) so each role block reads as one smooth dark->light gradient.
const roleOrder = ["Duelist", "Controller", "Initiator", "Sentinel"];
const agentsOrder = [];
roleOrder.forEach(r => legend[r].forEach(x => agentsOrder.push(x.name)));
const rank = {}; agentsOrder.forEach((a, i) => rank[a] = i);
const orderedData = data.slice().sort((p, q) =>
  (rank[p[2]] - rank[q[2]]) || (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0));
const colors = agentsOrder.map(a => agentColor[a]);

const roleColor = { Duelist: hsl(HUE.Duelist, 64, 52), Controller: hsl(HUE.Controller, 60, 60),
  Initiator: hsl(HUE.Initiator, 60, 44), Sentinel: hsl(HUE.Sentinel, 50, 50) };

const evByDate = {}; events.forEach(e => evByDate[e.date] = e.short);

// inline local echarts (guard against literal </script> in the minified source)
const echartsSrc = fs.readFileSync(__dirname + "/assets/echarts.min.js", "utf8")
  .replace(/<\/script>/gi, "<\\/script>");
// inline fonts (base64 woff2, latin subset)
const fontsCss = fs.readFileSync(__dirname + "/assets/fonts-inline.css", "utf8");

const BLOB = {
  data: orderedData, colors, agentsOrder, roleOf, agentColor,
  events: events.map(e => [e.date, e.short, e.year]),
  legend, roleColor
};

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VCT Agent Meta — Six Years of Pick Rates</title>
<meta name="description" content="How Valorant agent pick rates rose and fell across every VCT international event, 2021–2026.">
<style>${fontsCss}</style>
<script>${echartsSrc}</script>
<style>
  :root{ --ink:#1a1f2b; --body:#3c4250; --muted:#7a828f; --faint:#98a0ad; --line:#e6e8ec; --accent:#4e79a7; }
  *{box-sizing:border-box}
  html,body{margin:0;background:#ffffff;color:var(--body);
    font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6}
  .wrap{max-width:1200px;margin:0 auto;padding:0 26px}
  header.top{max-width:1200px;margin:0 auto;padding:70px 26px 6px;text-align:center}
  header.top .nav{font-size:12.5px;color:var(--muted);margin:0 0 26px}
  header.top .nav a{color:var(--accent);text-decoration:none}
  header.top .nav a:hover{text-decoration:underline}
  h1{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:38px;
    letter-spacing:-.3px;color:var(--ink);margin:0 0 8px}
  header.top .sub{font-size:14px;color:var(--faint);margin:0 auto;max-width:640px}
  #chart{width:100%;height:640px;margin:14px auto 0}
  .roles{display:flex;gap:26px;justify-content:center;flex-wrap:wrap;margin:6px auto 4px;
    font-size:12.5px;color:var(--body)}
  .roles .r{display:inline-flex;align-items:center;gap:7px;font-weight:600}
  .roles .r i{width:26px;height:9px;border-radius:5px;display:inline-block}
  .keywrap{max-width:1000px;margin:22px auto 0;padding:0 26px}
  .key{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
  @media(max-width:820px){.key{grid-template-columns:repeat(2,1fr)}#chart{height:520px}h1{font-size:29px}}
  .key .col h3{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;
    text-transform:uppercase;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
  .key .a{display:flex;align-items:center;gap:8px;font-size:12.5px;margin:0 0 5px;color:var(--body)}
  .key .a i{width:11px;height:11px;border-radius:3px;flex:0 0 auto}
  .key .a .pk{margin-left:auto;color:var(--faint);font-variant-numeric:tabular-nums;font-size:11.5px}
  footer#disclaimer{max-width:960px;margin:40px auto 56px;padding:22px 26px 0;
    border-top:1px solid var(--line);font-size:12.5px;line-height:1.65;color:#6b7280}
  footer#disclaimer h2{font-family:'Playfair Display',Georgia,serif;font-weight:700;
    font-size:17px;color:var(--ink);margin:0 0 10px}
  footer#disclaimer p{margin:0 0 9px}
  footer#disclaimer strong{color:var(--body);font-weight:600}
  footer#disclaimer a{color:var(--accent);text-decoration:none}
  footer#disclaimer a:hover{text-decoration:underline}
</style></head>
<body>
<header class="top">
  <div class="nav"><a href="../">← VCT Atlas</a></div>
  <h1>Six Years of the Agent Meta</h1>
  <p class="sub">Every band is one agent; its width is that agent's share of all player&#8209;maps at
     a given VCT international event. Watch metas swell and collapse — colored by role.</p>
</header>

<div class="roles" id="roles"></div>
<div class="wrap"><div id="chart"></div></div>

<div class="keywrap"><div class="key" id="key"></div></div>

<footer id="disclaimer">
  <h2>About this data</h2>
  <p><strong>What this shows.</strong> Agent pick rates across every VCT international LAN —
  Masters and Champions — from 2021 to 2026. At each event, an agent's band width is its share
  of all agents picked across every player&#8209;map at that tournament, so the bands at any point
  in time sum to 100%. Agents are grouped and colored by role — <strong>Duelist</strong>,
  <strong>Controller</strong>, <strong>Initiator</strong> and <strong>Sentinel</strong> — with a
  distinct shade per agent. The horizontal axis is real time, so the clustered early events and
  the spacing of the franchised era both reflect the actual calendar.</p>
  <p><strong>Source.</strong> Compiled from publicly available match data on
  <a href="https://www.vlr.gg" target="_blank" rel="noopener">vlr.gg</a>. Agent picks reflect the
  composition data recorded for each map at the time of collection (July 2026).</p>
  <p><strong>Disclaimer.</strong> This is an unofficial, fan-made visualization created for
  research and educational purposes. It is not affiliated with, endorsed by, or sponsored by
  Riot Games or vlr.gg. VALORANT and VALORANT Champions Tour (VCT) are trademarks of
  Riot&nbsp;Games,&nbsp;Inc. All agent, player and league names are the property of their
  respective owners.</p>
</footer>

<script>
const A = ${JSON.stringify(BLOB)};
const evShort = {}, evYear = {}; A.events.forEach(([d,s,y])=>{evShort[d]=s;evYear[d]=y;});

// role legend strip
document.getElementById("roles").innerHTML = ["Duelist","Controller","Initiator","Sentinel"]
  .map(r=>\`<span class="r"><i style="background:\${A.roleColor[r]}"></i>\${r}</span>\`).join("");

// per-agent key, grouped by role, ordered by peak
document.getElementById("key").innerHTML = ["Duelist","Controller","Initiator","Sentinel"]
  .map(r=>{
    const rows = A.legend[r].map(a=>
      \`<div class="a"><i style="background:\${a.color}"></i>\${a.name}<span class="pk">\${a.peak.toFixed(1)}%</span></div>\`).join("");
    return \`<div class="col"><h3 style="color:\${A.roleColor[r]}">\${r}</h3>\${rows}</div>\`;
  }).join("");

const chart = echarts.init(document.getElementById("chart"), null, {renderer:"canvas"});
chart.setOption({
  color: A.colors,
  textStyle:{fontFamily:"'Inter',system-ui,sans-serif", color:"#3c4250"},
  singleAxis:{ type:"time", top:22, bottom:38, left:18, right:18,
    axisLabel:{ color:"#7a828f", fontSize:12, margin:14,
      formatter:v=>{ const y=new Date(v).getUTCFullYear(); return "'"+String(y).slice(2); } },
    axisTick:{ show:true, lineStyle:{color:"#d7dbe2"} },
    axisLine:{ lineStyle:{color:"#d7dbe2"} },
    splitLine:{ show:true, lineStyle:{color:"#f0f2f5"} } },
  series:[{ type:"themeRiver", data:A.data, boundaryGap:["12%","12%"],
    emphasis:{ focus:"self", label:{show:false},
      itemStyle:{shadowBlur:12, shadowColor:"rgba(26,31,43,.22)"} },
    blur:{ itemStyle:{opacity:.22} },
    label:{ show:false },
    itemStyle:{ opacity:.94 },
    lineStyle:{ color:"#ffffff", width:.8, opacity:.9 } }]
});

// ECharts' built-in themeRiver item tooltip mis-resolves which band is under the
// cursor (it snaps to the nearest data point, not the stacked band you're over),
// so we identify the band ourselves: polygon hit-test -> nearest palette color ->
// nearest event on the x-axis, and render a custom tooltip.
const _cx = document.createElement("canvas").getContext("2d");
function _toRgb(c){ _cx.fillStyle="#000"; _cx.fillStyle=c; const h=_cx.fillStyle;
  if(h[0]==="#") return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const m=h.match(/\\d+/g); return [+m[0],+m[1],+m[2]]; }
const PAL = A.agentsOrder.map((a,i)=>({a:a, rgb:_toRgb(A.colors[i])}));
const VMAP={};
A.data.forEach(r=>{ VMAP[r[2]+"|"+r[0]]=r[1]; });

let EVX=[];
function refreshEventX(){ try{ EVX = A.events.map(e=>({ date:e[0], short:e[1],
  x:chart.convertToPixel({singleAxisIndex:0}, +new Date(e[0]))[0] })); }catch(err){} }
chart.on("finished", refreshEventX); refreshEventX();

const tip=document.createElement("div");
tip.style.cssText="position:fixed;pointer-events:none;z-index:50;background:#fff;border:1px solid #d0d4dc;"
  +"border-radius:8px;padding:8px 12px;font:12px/1.5 'Inter',system-ui,sans-serif;color:#1f2430;"
  +"box-shadow:0 8px 24px rgba(26,31,43,.14);opacity:0;transition:opacity .08s;max-width:240px";
document.body.appendChild(tip);

function hideTip(){ tip.style.opacity="0"; }

chart.getZr().on("mousemove", ev=>{
  const zx=ev.offsetX, zy=ev.offsetY;
  const list=chart.getZr().storage.getDisplayList();
  let el=null;
  for(let i=0;i<list.length;i++){ const e=list[i];
    if(e.type==="ec-polygon" && e.contain && e.contain(zx,zy)){ el=e; break; } }
  if(!el){ hideTip(); return; }
  const f=_toRgb(el.style.fill); let agent=null, bd=1e9;
  for(let i=0;i<PAL.length;i++){ const p=PAL[i],
    dr=p.rgb[0]-f[0], dg=p.rgb[1]-f[1], db=p.rgb[2]-f[2], d=dr*dr+dg*dg+db*db;
    if(d<bd){ bd=d; agent=p.a; } }
  let best=EVX[0], bx=1e9;
  for(let i=0;i<EVX.length;i++){ const dd=Math.abs(EVX[i].x-zx); if(dd<bx){ bx=dd; best=EVX[i]; } }
  if(!best){ hideTip(); return; }
  const val=VMAP[agent+"|"+best.date], col=A.agentColor[agent]||"#1f2430";
  tip.innerHTML='<div style="font-weight:700;color:'+col+';margin-bottom:2px">'+agent
    +' <span style="color:#7a828f;font-weight:500">· '+A.roleOf[agent]+'</span></div>'
    +'<div style="color:#5a606c">'+(best.short||best.date)+'</div>'
    +'<div style="margin-top:3px"><b style="font-size:14px">'+(val!=null?val:0)+'%</b> '
    +'<span style="color:#7a828f">of picks</span></div>';
  tip.style.opacity="1";
  const cr=chart.getDom().getBoundingClientRect();
  let px=cr.left+zx+16, py=cr.top+zy+16;
  if(px+tip.offsetWidth>innerWidth-8)  px=cr.left+zx-tip.offsetWidth-16;
  if(py+tip.offsetHeight>innerHeight-8) py=cr.top+zy-tip.offsetHeight-16;
  tip.style.left=px+"px"; tip.style.top=py+"px";
  // NB: ECharts' native hover emphasis (focus:'self') dims the other bands — it is
  // geometry-based, so it fades the correct band. We deliberately do NOT dispatch
  // highlight by dataIndex (themeRiver mis-maps index->band, dimming the wrong one).
});
chart.getZr().on("globalout", hideTip);
addEventListener("resize", ()=>{ chart.resize(); refreshEventX(); });
</script>
</body></html>`;

fs.mkdirSync(__dirname + "/../out", { recursive: true });
const target = process.argv[2];
fs.writeFileSync(target, html);
console.log("wrote", target, html.length, "bytes");
