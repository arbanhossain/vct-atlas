const fs = require("fs");
const path = require("path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "data/kill_leaderboard.json"), "utf8"));
const fontsCss = fs.readFileSync(path.join(__dirname, "assets/fonts-inline.css"), "utf8");
const output = process.argv[2] || path.join(__dirname, "../site/kill-leaders/index.html");
const blob = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VCT International Kill Leaders — VCT Atlas</title>
<meta name="description" content="Every player's career kills at VCT international events, with a match-by-match breakdown.">
<style>${fontsCss}</style>
<style>
  :root{--ink:#1a1f2b;--body:#3c4250;--muted:#7a828f;--faint:#98a0ad;--line:#e6e8ec;--soft:#f6f7f9;--accent:#4e79a7;--red:#e15759}
  *{box-sizing:border-box}
  html,body{margin:0;background:#fff;color:var(--body);font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5}
  .wrap{max-width:940px;margin:0 auto;padding:0 26px}
  header{padding:68px 0 28px;text-align:center}
  .nav{font-size:12.5px;margin-bottom:24px}.nav a,.source a{color:var(--accent);text-decoration:none}.nav a:hover,.source a:hover{text-decoration:underline}
  h1{font-family:'Playfair Display',Georgia,serif;font-size:40px;line-height:1.15;letter-spacing:-.4px;color:var(--ink);margin:0 0 10px}
  .sub{max-width:650px;margin:0 auto;color:var(--muted);font-size:14px}
  .facts{display:flex;justify-content:center;gap:28px;flex-wrap:wrap;margin:25px 0 0}
  .fact b{display:block;font-family:'Playfair Display',Georgia,serif;color:var(--ink);font-size:25px;line-height:1.1}.fact span{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--faint)}
  .controls{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.96);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:13px 0;backdrop-filter:blur(8px)}
  .control-inner{max-width:940px;margin:auto;padding:0 26px;display:flex;align-items:center;gap:14px}
  .search{width:100%;border:1px solid #d9dde3;border-radius:9px;padding:10px 13px;font:inherit;font-size:14px;color:var(--ink);outline:none}.search:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(78,121,167,.12)}
  .shown{font-size:12px;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
  main{padding:24px 0 46px}
  .table-shell{border:1px solid var(--line);border-radius:12px;overflow:hidden}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  th{background:var(--soft);padding:10px 14px;text-align:left;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
  th.rank,td.rank{width:65px;text-align:center}th.kills,td.kills{width:125px;text-align:right}th.matches,td.matches{width:110px;text-align:right}
  tr.player{cursor:pointer;border-top:1px solid var(--line);transition:background .12s}tbody tr.player:first-child{border-top:0}tr.player:hover,tr.player:focus{background:#fafbfc;outline:none}tr.player.open{background:#f4f7fa}
  td{padding:13px 14px;font-size:14px}td.rank{color:var(--faint);font-size:12px;font-variant-numeric:tabular-nums}.name{font-weight:650;color:var(--ink)}
  .chev{display:inline-block;color:var(--accent);font-size:11px;width:18px;transition:transform .15s}.open .chev{transform:rotate(90deg)}
  td.kills{font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}td.matches{color:var(--muted);font-variant-numeric:tabular-nums}
  tr.detail td{padding:0;background:#fbfcfd;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .match-list{padding:6px 18px 12px 80px}.match{display:grid;grid-template-columns:90px minmax(0,1fr) 74px;gap:14px;padding:10px 0;border-bottom:1px solid #edf0f3;align-items:center}.match:last-child{border-bottom:0}
  .date{font-size:11.5px;color:var(--faint);font-variant-numeric:tabular-nums}.event{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.versus{color:var(--ink);font-size:13px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stage{font-weight:400;color:var(--faint)}
  .mkills{text-align:right;font-weight:700;color:var(--ink);font-size:13px;font-variant-numeric:tabular-nums}.mkills small{display:block;color:var(--faint);font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.06em}
  .match a{color:inherit;text-decoration:none}.match a:hover .versus{color:var(--accent)}
  .empty{text-align:center;padding:50px 20px;color:var(--muted)}
  .source{border-top:1px solid var(--line);padding:24px 0 56px;font-size:12.5px;line-height:1.65;color:var(--muted)}
  @media(max-width:620px){.wrap,.control-inner{padding-left:15px;padding-right:15px}header{padding-top:44px}h1{font-size:31px}.facts{gap:18px}.fact b{font-size:21px}th.rank,td.rank{width:44px}th.matches,td.matches{display:none}th.kills,td.kills{width:90px}.match-list{padding-left:15px}.match{grid-template-columns:78px minmax(0,1fr) 55px;gap:8px}.event{white-space:normal}.stage{display:none}td{padding:12px 9px}}
</style></head><body>
<header class="wrap">
  <div class="nav"><a href="../">← VCT Atlas</a></div>
  <h1>International Kill Leaders</h1>
  <p class="sub">Every kill recorded at a VCT international event. Select a player to see their match-by-match total, newest first.</p>
  <div class="facts">
    <div class="fact"><b id="player-total"></b><span>players</span></div>
    <div class="fact"><b id="kill-total"></b><span>kills</span></div>
    <div class="fact"><b id="match-total"></b><span>matches</span></div>
    <div class="fact"><b id="event-total"></b><span>events</span></div>
  </div>
</header>
<div class="controls"><div class="control-inner">
  <input class="search" id="search" type="search" placeholder="Search player…" aria-label="Search players" autocomplete="off">
  <span class="shown" id="shown"></span>
</div></div>
<main class="wrap"><div class="table-shell">
  <table><thead><tr><th class="rank">Rank</th><th>Player</th><th class="matches">Matches</th><th class="kills">Kills</th></tr></thead><tbody id="body"></tbody></table>
  <div class="empty" id="empty" hidden>No players found.</div>
</div></main>
<footer class="source"><div class="wrap"><strong>Source.</strong> Per-map match data from VCT international Masters and Champions events, 2021–2026, collected from <a href="https://www.vlr.gg" target="_blank" rel="noopener">vlr.gg</a>. Match totals are the sum of the player's recorded map kills. Exhibition placeholder rows with zero kills are excluded.<br><br>Unofficial, fan-made project for research and educational use. Not affiliated with Riot Games or vlr.gg.</div></footer>
<script>
const DATA=${blob};
const players=DATA.players.map(function(p,i){p.rank=i+1;return p});
const body=document.getElementById('body'),search=document.getElementById('search'),shown=document.getElementById('shown'),empty=document.getElementById('empty');
const fmt=new Intl.NumberFormat('en-US');
document.getElementById('player-total').textContent=fmt.format(DATA.meta.players);
document.getElementById('kill-total').textContent=fmt.format(DATA.meta.kills);
document.getElementById('match-total').textContent=fmt.format(DATA.meta.matches);
document.getElementById('event-total').textContent=fmt.format(DATA.meta.events);
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function dateLabel(s){if(!s)return 'Date unknown';return new Intl.DateTimeFormat('en',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(s))}
function closeOpen(){const detail=body.querySelector('tr.detail');if(detail)detail.remove();const open=body.querySelector('tr.open');if(open){open.classList.remove('open');open.setAttribute('aria-expanded','false')}}
function openPlayer(row,p){
  if(row.classList.contains('open')){closeOpen();return}
  closeOpen();row.classList.add('open');row.setAttribute('aria-expanded','true');
  const detail=document.createElement('tr');detail.className='detail';
  const cell=document.createElement('td');cell.colSpan=4;
  cell.innerHTML='<div class="match-list">'+p.matches.map(function(m){
    const stage=m.stage?' <span class="stage">· '+esc(m.stage)+'</span>':'';
    return '<div class="match"><div class="date">'+esc(dateLabel(m.date))+'</div><a href="https://www.vlr.gg/'+encodeURIComponent(m.id)+'" target="_blank" rel="noopener"><div class="event">'+esc(m.event)+stage+'</div><div class="versus">'+esc(m.team1)+' vs '+esc(m.team2)+'</div></a><div class="mkills">'+fmt.format(m.kills)+'<small>kills</small></div></div>';
  }).join('')+'</div>';
  detail.appendChild(cell);row.after(detail);
}
function render(){
  closeOpen();const q=search.value.trim().toLocaleLowerCase();
  const filtered=q?players.filter(function(p){return p.name.toLocaleLowerCase().includes(q)}):players;
  body.textContent='';empty.hidden=filtered.length>0;shown.textContent=fmt.format(filtered.length)+' shown';
  filtered.forEach(function(p){
    const row=document.createElement('tr');row.className='player';row.tabIndex=0;row.setAttribute('aria-expanded','false');
    row.innerHTML='<td class="rank">'+p.rank+'</td><td><span class="chev">›</span><span class="name">'+esc(p.name)+'</span></td><td class="matches">'+fmt.format(p.matches.length)+'</td><td class="kills">'+fmt.format(p.kills)+'</td>';
    row.addEventListener('click',function(){openPlayer(row,p)});row.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openPlayer(row,p)}});body.appendChild(row);
  });
}
search.addEventListener('input',render);render();
</script></body></html>`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(`wrote ${output} (${data.meta.players} players, ${data.meta.kills} kills)`);
