const fs = require("fs");
const DATA = JSON.parse(fs.readFileSync(__dirname + "/data/role_fit.json", "utf8"));

const ROLES = [
  { key: "duelist",    label: "Duelist",    color: "hsl(5,64%,52%)" },
  { key: "controller", label: "Controller", color: "hsl(262,55%,60%)" },
  { key: "initiator",  label: "Initiator",  color: "hsl(168,58%,42%)" },
  { key: "sentinel",   label: "Sentinel",   color: "hsl(212,58%,52%)" },
];

const BLOB = { players: DATA.players, poolMin: DATA.poolMin, roles: ROLES, defMin: 15 };

const echartsSrc = fs.readFileSync(__dirname + "/assets/echarts.min.js", "utf8")
  .replace(/<\/script>/gi, "<\\/script>");
const fontsCss = fs.readFileSync(__dirname + "/assets/fonts-inline.css", "utf8");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VCT — Role Fit</title>
<meta name="description" content="For VCT players who've played more than one role, how good are they at each — ranked against everyone else who plays that role.">
<style>${fontsCss}</style>
<script>${echartsSrc}</script>
<style>
  :root{ --ink:#1a1f2b; --body:#3c4250; --muted:#7a828f; --faint:#98a0ad; --line:#e6e8ec; --accent:#4e79a7; }
  *{box-sizing:border-box}
  html,body{margin:0;background:#ffffff;color:var(--body);
    font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6}
  .wrap{max-width:1000px;margin:0 auto;padding:0 26px}
  header.top{max-width:1000px;margin:0 auto;padding:70px 26px 6px;text-align:center}
  header.top .nav{font-size:12.5px;color:var(--muted);margin:0 0 26px}
  header.top .nav a{color:var(--accent);text-decoration:none}
  header.top .nav a:hover{text-decoration:underline}
  h1{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:38px;
    letter-spacing:-.3px;color:var(--ink);margin:0 0 8px}
  header.top .sub{font-size:14px;color:var(--faint);margin:0 auto;max-width:660px}
  .roles{display:flex;gap:22px;justify-content:center;flex-wrap:wrap;margin:16px auto 2px;
    font-size:12.5px;color:var(--body)}
  .roles .r{display:inline-flex;align-items:center;gap:7px;font-weight:600}
  .roles .r i{width:12px;height:12px;border-radius:50%;display:inline-block}
  .control{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;
    max-width:640px;margin:14px auto 0;padding:0 26px}
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
  #chart{width:100%;margin:12px auto 0}
  @media(max-width:820px){h1{font-size:29px}}
  footer#disclaimer{max-width:900px;margin:34px auto 56px;padding:22px 26px 0;
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
  <h1>Role Fit</h1>
  <p class="sub">Plenty of players have logged real time on more than one role. So which do they
     actually play <em>better</em>? Each dot is a role; the further right, the higher that player
     ranks <strong>among everyone who plays that role</strong> — so the roles compare fairly.</p>
</header>

<div class="roles" id="roles"></div>
<div class="control">
  <span class="count" id="count"></span>
  <span class="sld">min maps per role
    <input type="range" id="minmaps" min="5" max="30" value="15" step="1">
    <b id="minval">15</b>
  </span>
</div>
<div class="wrap"><div id="chart"></div></div>

<footer id="disclaimer">
  <h2>How to read it</h2>
  <p>Every player here has played at least two roles (default: 15+ maps on each — use the slider to
  loosen or tighten that). For each role, the dot's position is that player's
  <strong>percentile within the role</strong>: 50 is a dead-average sentinel/duelist/etc., 90 is
  top&#8209;10%. The connecting line spans their best and worst roles, so a long line is a
  specialist and a tight cluster is a true flex. Dot size scales with maps played on that role —
  small dots are small samples, read them lightly. Hover any dot for the raw numbers.</p>

  <h2>Why percentiles instead of raw rating</h2>
  <p>You <em>can't</em> compare a player's raw stats across roles, because the roles sit at
  different baselines — duelists average <strong>224 ACS</strong>, sentinels 199, controllers and
  initiators ~185, and even vlr.gg rating runs a few points higher for entry roles. A 0.90 rating
  is a poor duelist but a fine controller. So each role-performance is scored <strong>relative to
  that role's own players</strong> (percentile of average vlr.gg rating, among everyone with 10+
  maps on the role). That's what makes "better initiator than duelist" a fair statement rather than
  an artifact of the position.</p>
  <p><strong>Source.</strong> Per-map data from VCT international events (Masters &amp; Champions,
  2021&ndash;2026) on <a href="https://www.vlr.gg" target="_blank" rel="noopener">vlr.gg</a>. Only
  maps where a player's agent maps cleanly to one role are counted.</p>
  <p><strong>Disclaimer.</strong> Unofficial, fan-made, for research and educational use. Not
  affiliated with or endorsed by Riot Games or vlr.gg. VALORANT and VCT are trademarks of
  Riot&nbsp;Games,&nbsp;Inc.</p>
</footer>

<script>
const A = ${JSON.stringify(BLOB)};
const COL = {}; A.roles.forEach(r => COL[r.key] = r.color);
const LABEL = {}; A.roles.forEach(r => LABEL[r.key] = r.label);
const PRIM = {}; A.players.forEach(p => PRIM[p.n] = p.primary);

document.getElementById("roles").innerHTML = A.roles
  .map(r => \`<span class="r"><i style="background:\${r.color}"></i>\${r.label}</span>\`).join("");

const chartDom = document.getElementById("chart");
const chart = echarts.init(chartDom, null, { renderer: "canvas" });
const sizeOf = m => Math.sqrt(m) * 1.25 + 6;

function rowsFor(min) {
  return A.players
    .map(p => ({ n: p.n, primary: p.primary, rs: p.roles.filter(r => r.maps >= min) }))
    .filter(p => p.rs.length >= 2)
    .map(p => {
      const ps = p.rs.map(r => r.pct);
      p.lo = Math.min.apply(null, ps); p.hi = Math.max.apply(null, ps);
      p.spread = p.hi - p.lo;
      return p;
    })
    .sort((a, b) => (b.spread - a.spread) || (b.hi - a.hi) || a.n.localeCompare(b.n));
}

// rich text styles so each player's name is tinted by their primary role
const richLabel = {};
A.roles.forEach(r => { richLabel[r.key] = { color: r.color, fontWeight: 600, fontSize: 11 }; });

function render() {
  const min = +slider.value;
  minval.textContent = min;
  const rows = rowsFor(min);
  countEl.innerHTML = "<b>" + rows.length + "</b> players"
    + "<span class='sep'>·</span> min " + min + " maps per role";

  const names = rows.map(p => p.n);               // top (highest spread) first
  const dotSeries = A.roles.map(role => ({
    name: role.label, type: "scatter", z: 3,
    data: rows.flatMap(p => {
      const r = p.rs.find(x => x.role === role.key);
      return r ? [{ value: [r.pct, p.n], role: role.key, maps: r.maps,
                    rating: r.rating, acs: r.acs, pct: r.pct, pname: p.n }] : [];
    }),
    symbolSize: (val, params) => sizeOf(params.data.maps),
    itemStyle: { color: role.color, borderColor: "#ffffff", borderWidth: 1.5 },
    emphasis: { scale: 1.4, itemStyle: { shadowBlur: 8, shadowColor: "rgba(26,31,43,.3)" } },
  }));
  const connectors = rows.map(p => [{ coord: [p.lo, p.n] }, { coord: [p.hi, p.n] }]);
  const base = {
    type: "scatter", data: [], silent: true, z: 1,
    markLine: {
      symbol: "none", animation: false, label: { show: false },
      lineStyle: { color: "#c6ccd6", width: 2, type: "solid" },
      data: connectors,
    },
  };
  const ref = {
    type: "scatter", data: [], silent: true, z: 0,
    markLine: {
      symbol: "none", animation: false, silent: true,
      lineStyle: { color: "#e4e7ec", width: 1, type: "dashed" },
      label: { show: true, formatter: "role avg", position: "end",
               color: "#b6bcc6", fontSize: 10 },
      data: [{ xAxis: 50 }],
    },
  };

  chartDom.style.height = (rows.length * 22 + 66) + "px";
  chart.resize();
  chart.setOption({
    color: A.roles.map(r => r.color),
    textStyle: { fontFamily: "'Inter',system-ui,sans-serif", color: "#3c4250" },
    grid: { left: 108, right: 28, top: 10, bottom: 46 },
    tooltip: {
      trigger: "item", backgroundColor: "#ffffff", borderColor: "#d0d4dc", borderWidth: 1,
      padding: [8, 12], extraCssText: "box-shadow:0 8px 24px rgba(26,31,43,.14);border-radius:8px",
      textStyle: { color: "#1f2430", fontSize: 12 },
      formatter: p => {
        const d = p.data;
        return "<div style='font-weight:700;color:" + COL[d.role] + ";margin-bottom:2px'>"
          + d.pname + " <span style='color:#7a828f;font-weight:500'>· " + LABEL[d.role] + "</span></div>"
          + "<div style='color:#5a606c;font-variant-numeric:tabular-nums'>"
          + "<b>" + Math.round(d.pct) + "th</b> pct in role &nbsp;·&nbsp; " + d.rating + " rating"
          + " &nbsp;·&nbsp; " + d.acs + " ACS &nbsp;·&nbsp; " + d.maps + " maps</div>";
      },
    },
    xAxis: {
      type: "value", min: 0, max: 100, position: "bottom",
      name: "← weaker for the role      within-role percentile      stronger for the role →",
      nameLocation: "middle", nameGap: 28, nameTextStyle: { color: "#7a828f", fontSize: 12 },
      axisLabel: { color: "#a2a9b4", fontSize: 11, formatter: "{value}" },
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: "#f0f2f5" } },
    },
    yAxis: {
      type: "category", data: names, inverse: true,
      axisLabel: {
        margin: 12,
        formatter: v => "{" + (PRIM[v] || "duelist") + "|" + v + "}",
        rich: richLabel,
      },
      axisLine: { lineStyle: { color: "#e6e8ec" } },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: "#f7f8fa" } },
    },
    series: [base, ref, ...dotSeries],
  }, { notMerge: true });
}

const countEl = document.getElementById("count");
const slider = document.getElementById("minmaps");
const minval = document.getElementById("minval");
slider.addEventListener("input", render);
render();
addEventListener("resize", () => chart.resize());
</script>
</body></html>`;

const target = process.argv[2];
fs.writeFileSync(target, html);
console.log("wrote", target, html.length, "bytes");
