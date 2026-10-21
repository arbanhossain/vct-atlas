const fs = require("fs");

// all players, each projected onto the PCA fit on the >=25-map players
// (produced by galaxy_full.py — the >=25 coords match atlas.html exactly)
const FULL = JSON.parse(fs.readFileSync(__dirname + "/data/galaxy_full.json", "utf8"));

// role palette — consistent with the agent-meta page's role hues, plus Flex (neutral)
const ROLES = [
  { key: "duelist",    label: "Duelist",    color: "hsl(5,64%,52%)" },
  { key: "controller", label: "Controller", color: "hsl(262,55%,60%)" },
  { key: "initiator",  label: "Initiator",  color: "hsl(168,58%,42%)" },
  { key: "sentinel",   label: "Sentinel",   color: "hsl(212,58%,52%)" },
  { key: "flex",       label: "Flex",       color: "hsl(222,12%,60%)" },
];

// fix the axis extent to a stable core (>=10 maps) so the slider filters without
// rescaling the whole view; a few extreme low-map outliers just clip at the edge.
const core = FULL.players.filter(p => p.m >= 10);
const span = arr => [Math.min(...arr), Math.max(...arr)];
const [x0, x1] = span(core.map(p => p.x)), [y0, y1] = span(core.map(p => p.y));
const padX = (x1 - x0) * 0.06, padY = (y1 - y0) * 0.09;

const BLOB = {
  roles: ROLES,
  players: FULL.players,
  total: FULL.total,
  defMin: 25,
  axis: { xmin:+(x0-padX).toFixed(2), xmax:+(x1+padX).toFixed(2),
          ymin:+(y0-padY).toFixed(2), ymax:+(y1+padY).toFixed(2) },
};

const echartsSrc = fs.readFileSync(__dirname + "/assets/echarts.min.js", "utf8")
  .replace(/<\/script>/gi, "<\\/script>");
const fontsCss = fs.readFileSync(__dirname + "/assets/fonts-inline.css", "utf8");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VCT — Players by Playstyle</title>
<meta name="description" content="A PCA of nine per-map stats placing every VCT international player on a 2D map of playstyle, colored by role.">
<style>${fontsCss}</style>
<script>${echartsSrc}</script>
<style>
  :root{ --ink:#1a1f2b; --body:#3c4250; --muted:#7a828f; --faint:#98a0ad; --line:#e6e8ec; --accent:#4e79a7; }
  *{box-sizing:border-box}
  html,body{margin:0;background:#ffffff;color:var(--body);
    font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6}
  .wrap{max-width:1120px;margin:0 auto;padding:0 26px}
  header.top{max-width:1120px;margin:0 auto;padding:70px 26px 6px;text-align:center}
  header.top .nav{font-size:12.5px;color:var(--muted);margin:0 0 26px}
  header.top .nav a{color:var(--accent);text-decoration:none}
  header.top .nav a:hover{text-decoration:underline}
  h1{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:38px;
    letter-spacing:-.3px;color:var(--ink);margin:0 0 8px}
  header.top .sub{font-size:14px;color:var(--faint);margin:0 auto;max-width:660px}
  .roles{display:flex;gap:22px;justify-content:center;flex-wrap:wrap;margin:16px auto 2px;
    font-size:12.5px;color:var(--body)}
  .roles .r{display:inline-flex;align-items:center;gap:7px;font-weight:600;cursor:default}
  .roles .r i{width:12px;height:12px;border-radius:50%;display:inline-block}
  .control{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;
    max-width:640px;margin:16px auto 0;padding:0 26px}
  .control .count{font-size:13px;color:var(--body);font-variant-numeric:tabular-nums;white-space:nowrap}
  .control .count b{color:var(--ink);font-weight:700}
  .control .count .sep{color:var(--faint);margin:0 5px}
  .control .sld{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted);white-space:nowrap}
  .control input[type=range]{width:190px;height:4px;-webkit-appearance:none;appearance:none;
    background:var(--line);border-radius:3px;outline:none;cursor:pointer}
  .control input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid #fff;
    box-shadow:0 1px 4px rgba(26,31,43,.3);cursor:pointer}
  .control input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;
    background:var(--accent);border:2px solid #fff;box-shadow:0 1px 4px rgba(26,31,43,.3);cursor:pointer}
  .control .sld b{color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums;min-width:1.6em;text-align:right}
  .control .chk{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);
    cursor:pointer;user-select:none}
  .control .chk input{width:14px;height:14px;accent-color:var(--accent);cursor:pointer}
  #chart{width:100%;height:660px;margin:6px auto 0;cursor:grab}
  #chart:active{cursor:grabbing}
  .hint{text-align:center;font-size:12px;color:var(--faint);margin:8px 0 0}
  .hint a{color:var(--accent);text-decoration:none}
  .hint a:hover{text-decoration:underline}
  @media(max-width:820px){#chart{height:520px}h1{font-size:29px}}
  footer#disclaimer{max-width:960px;margin:34px auto 56px;padding:22px 26px 0;
    border-top:1px solid var(--line);font-size:12.5px;line-height:1.65;color:#6b7280}
  footer#disclaimer h2{font-family:'Playfair Display',Georgia,serif;font-weight:700;
    font-size:17px;color:var(--ink);margin:0 0 10px}
  footer#disclaimer p{margin:0 0 9px}
  footer#disclaimer ul{margin:0 0 9px;padding:0 0 0 18px}
  footer#disclaimer li{margin:0 0 4px}
  footer#disclaimer strong{color:var(--body);font-weight:600}
  footer#disclaimer a{color:var(--accent);text-decoration:none}
  footer#disclaimer a:hover{text-decoration:underline}
</style></head>
<body>
<header class="top">
  <div class="nav"><a href="../">← VCT Atlas</a></div>
  <h1>Players by Playstyle</h1>
  <p class="sub">Every player at a VCT international event, placed by playstyle. A PCA of nine
     per&#8209;map stats — rating, ACS, ADR, KAST, HS%, kills, assists, first kills &amp; first deaths —
     projected to two dimensions. Roles separate on their own.</p>
</header>

<div class="roles" id="roles"></div>
<div class="control">
  <span class="count" id="count"></span>
  <span class="sld">min maps
    <input type="range" id="minmaps" min="1" max="50" value="25" step="1">
    <b id="minval">25</b>
  </span>
  <label class="chk"><input type="checkbox" id="names"> names</label>
</div>
<div class="wrap"><div id="chart"></div>
  <p class="hint" id="hint">Scroll to zoom &middot; drag to pan &middot; hover for any player &middot; <a href="#" id="reset">reset view</a></p>
</div>

<footer id="disclaimer">
  <h2>About this data</h2>
  <p><strong>What this shows.</strong> Each dot is one of the ${FULL.total} players who appeared at a VCT
  international event (2021&ndash;2026). Use the <strong>min&#8209;maps slider</strong> to set how
  many international maps a player must have played to appear &mdash; it defaults to 25, which shows
  the ${FULL.fitCount} established regulars; drag it down to reveal one&#8209;off and short&#8209;stint players
  (whose positions are noisier, since they average over far fewer maps). Their position comes from a
  principal component analysis (PCA) of nine per&#8209;map performance stats, reduced to two axes.
  The PCA is fit on the 25+&#8209;map players and everyone else is projected onto it. The
  horizontal axis runs from <strong>support &amp; utility</strong> play on the left to
  <strong>fragging &amp; entry</strong> on the right; the vertical axis roughly captures
  <strong>efficiency &amp; survival</strong>. Dots are sized by maps played and colored by the
  player's primary role &mdash; the roles cluster on their own, which is what the PCA is meant to
  reveal. Hover any dot for the player and their rating, ACS and map count.</p>
  <p><strong>Source.</strong> Compiled from publicly available match data on
  <a href="https://www.vlr.gg" target="_blank" rel="noopener">vlr.gg</a>, reflecting stats recorded
  at the time of collection (October 2026).</p>

  <h2>How the metrics are calculated</h2>
  <p>Each player is summarised by <strong>nine per&#8209;map averages</strong>, taken across every
  international map they have played (minimum 25 maps):</p>
  <ul>
    <li><strong>Rating</strong> &mdash; vlr.gg's overall performance rating, a composite where about
      1.00 is average.</li>
    <li><strong>ACS</strong> &mdash; Average Combat Score: Riot's per&#8209;round score built from
      damage dealt, kills and multi&#8209;kills.</li>
    <li><strong>ADR</strong> &mdash; Average Damage per Round.</li>
    <li><strong>KAST%</strong> &mdash; share of rounds in which the player got a <strong>K</strong>ill,
      <strong>A</strong>ssist, <strong>S</strong>urvived, or was <strong>T</strong>raded.</li>
    <li><strong>HS%</strong> &mdash; headshot percentage.</li>
    <li><strong>Kills</strong> and <strong>Assists</strong> per map.</li>
    <li><strong>First Kills</strong> and <strong>First Deaths</strong> per map &mdash; opening duels
      won and lost.</li>
  </ul>
  <p>Every stat is first <strong>standardised to a z&#8209;score</strong> (mean&nbsp;0, standard
  deviation&nbsp;1) across all players, so a big-number stat like ADR can't drown out a percentage
  like HS%. A <strong>principal component analysis (PCA)</strong> then finds the two directions
  along which players differ most, and each player is projected onto them: the first component
  becomes the horizontal axis, the second the vertical. The axes are oriented so that moving
  <strong>right</strong> tracks higher ACS &mdash; <em>fragging &amp; entry</em> &mdash; and moving
  <strong>up</strong> tracks a better first&#8209;kill&nbsp;/&nbsp;first&#8209;death balance and
  overall <em>efficiency &amp; survival</em>. Role is never fed into the PCA, so the way the roles
  separate is emergent, not built in.</p>
  <p><strong>Disclaimer.</strong> This is an unofficial, fan-made visualization created for
  research and educational purposes. It is not affiliated with, endorsed by, or sponsored by
  Riot Games or vlr.gg. VALORANT and VALORANT Champions Tour (VCT) are trademarks of
  Riot&nbsp;Games,&nbsp;Inc. All player, team and league names are the property of their
  respective owners.</p>
</footer>

<script>
const A = ${JSON.stringify(BLOB)};
const COL = {}; A.roles.forEach(r => COL[r.key] = r.color);

document.getElementById("roles").innerHTML = A.roles
  .map(r => \`<span class="r"><i style="background:\${r.color}"></i>\${r.label}</span>\`).join("");

const chart = echarts.init(document.getElementById("chart"), null, {renderer:"canvas"});

// circle diameter (px) for a player, from maps played
const sizeOf = m => Math.sqrt(m) * 1.5 + 5;

// build the per-role scatter series: show players with >= th maps; names when on
const roleSeries = (th, names) => A.roles.map(r => ({
  name: r.label, type: "scatter",
  data: A.players.filter(p => p.r === r.key && p.m >= th)
    .map(p => ({ value:[p.x, p.y], name:p.n, m:p.m, a:p.a, g:p.g })),
  symbolSize: (val, params) => sizeOf(params.data.m),
  itemStyle: { color: r.color, opacity: .86, borderColor: "#ffffff", borderWidth: 1 },
  emphasis: { focus: "series", scale: 1.35,
    label: { show: true, formatter: p => p.data.name },
    itemStyle: { borderColor: "#ffffff", borderWidth: 1.5, shadowBlur: 10, shadowColor: "rgba(26,31,43,.28)" } },
  blur: { itemStyle: { opacity: .12 }, label: { show: false } },
  label: {
    show: !!names, position: "top", distance: 3, color: "#5a606c", fontSize: 11, fontWeight: 500,
    formatter: p => p.data.name,
  },
  labelLayout: names ? { hideOverlap: true, moveOverlap: "shiftY" } : undefined,
}));

// faint zero reference cross (constant series, kept at index 0)
const zeroLines = { type: "line", data: [], markLine: {
  silent: true, symbol: "none", animation: false,
  lineStyle: { color: "#dfe3ea", type: "dashed", width: 1 },
  label: { show: false }, data: [ { xAxis: 0 }, { yAxis: 0 } ],
} };

chart.setOption({
  color: A.roles.map(r => r.color),
  textStyle: { fontFamily: "'Inter',system-ui,sans-serif", color: "#3c4250" },
  legend: {
    top: 0, show: false,   // custom legend strip above; keep ECharts legend off
  },
  grid: { left: 48, right: 30, top: 22, bottom: 52, containLabel: false },
  dataZoom: [
    { type: "inside", xAxisIndex: 0, yAxisIndex: 0, filterMode: "none",
      zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false },
  ],
  tooltip: {
    trigger: "item", backgroundColor: "#ffffff", borderColor: "#d0d4dc", borderWidth: 1,
    padding: [8,12], extraCssText: "box-shadow:0 8px 24px rgba(26,31,43,.14);border-radius:8px",
    textStyle: { color: "#1f2430", fontSize: 12 },
    formatter: p => {
      const d = p.data;
      return \`<div style="font-weight:700;color:\${COL[A.players.find(x=>x.n===d.name)?.r]||'#1f2430'};margin-bottom:2px">\`
        + \`\${d.name} <span style="color:#7a828f;font-weight:500">· \${p.seriesName}</span></div>\`
        + \`<div style="color:#5a606c;font-variant-numeric:tabular-nums">\`
        + \`<b>\${d.g}</b> rating &nbsp;·&nbsp; \${d.a} ACS &nbsp;·&nbsp; \${d.m} maps</div>\`;
    },
  },
  xAxis: {
    type: "value", min: A.axis.xmin, max: A.axis.xmax, splitNumber: 6,
    name: "← support / utility        fragging & entry →",
    nameLocation: "middle", nameGap: 30,
    nameTextStyle: { color: "#7a828f", fontSize: 12.5 },
    axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false },
    splitLine: { lineStyle: { color: "#f0f2f5" } },
  },
  yAxis: {
    type: "value", min: A.axis.ymin, max: A.axis.ymax, splitNumber: 6,
    name: "efficiency & survival →",
    nameLocation: "middle", nameGap: 24, nameRotate: 90,
    nameTextStyle: { color: "#7a828f", fontSize: 12.5 },
    axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false },
    splitLine: { lineStyle: { color: "#f0f2f5" } },
  },
  series: [ zeroLines, ...roleSeries(A.defMin, false) ],
});

// --- controls: min-maps slider + names toggle ---
const countEl = document.getElementById("count");
const slider = document.getElementById("minmaps");
const minval = document.getElementById("minval");
const namesChk = document.getElementById("names");
function apply() {
  const th = +slider.value;
  minval.textContent = th;
  const shown = A.players.filter(p => p.m >= th).length;
  countEl.innerHTML = "<b>" + shown + "</b> of " + A.total + " players"
    + "<span class='sep'>·</span> min " + th + " map" + (th === 1 ? "" : "s");
  chart.setOption({ series: [ zeroLines, ...roleSeries(th, namesChk.checked) ] });
}
slider.addEventListener("input", apply);
namesChk.addEventListener("change", apply);
apply();

addEventListener("resize", () => chart.resize());
document.getElementById("reset").addEventListener("click", e => {
  e.preventDefault();
  chart.dispatchAction({ type: "dataZoom", start: 0, end: 100, xAxisIndex: 0 });
  chart.dispatchAction({ type: "dataZoom", start: 0, end: 100, yAxisIndex: 0 });
});
</script>
</body></html>`;

const target = process.argv[2];
fs.writeFileSync(target, html);
console.log("wrote", target, html.length, "bytes");
