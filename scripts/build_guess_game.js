const fs = require("fs");
const path = require("path");

const CAREERS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/player_careers.json"), "utf8")
);

// trim to only what the client needs, keep payload lean
const PLAYERS = CAREERS.players.map((p) => ({
  id: p.id,
  name: p.name,
  country: p.country,
  regions: p.regions,
  teamCount: p.team_count,
  career: p.career.map((s) => ({
    team: s.team,
    logo: s.logo,
    s: s.start_label,
    e: s.end_label,
    cur: s.current,
  })),
}));

const fontsCss = fs.readFileSync(
  path.join(__dirname, "assets/fonts-inline.css"),
  "utf8"
);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VCT Atlas — Guess the Player</title>
<meta name="description" content="Guess the Tier 1 VCT player from their complete team career trajectory — three guesses per player.">
<style>${fontsCss}</style>
<style>
  :root{ --ink:#1a1f2b; --body:#3c4250; --muted:#7a828f; --faint:#98a0ad; --line:#e6e8ec;
    --accent:#4e79a7; --good:#59a14f; --bad:#e15759; --goodbg:#eef6ec; --badbg:#fbebea; }
  *{box-sizing:border-box}
  html,body{margin:0;background:#ffffff;color:var(--body);
    font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6}
  .wrap{max-width:880px;margin:0 auto;padding:0 26px}
  header.top{max-width:880px;margin:0 auto;padding:70px 26px 6px;text-align:center}
  header.top .nav{font-size:12.5px;color:var(--muted);margin:0 0 26px}
  header.top .nav a{color:var(--accent);text-decoration:none}
  header.top .nav a:hover{text-decoration:underline}
  h1{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:38px;
    letter-spacing:-.3px;color:var(--ink);margin:0 0 8px}
  header.top .sub{font-size:14px;color:var(--faint);margin:0 auto;max-width:600px}

  .statbar{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;margin:22px auto 0;
    font-size:12.5px;color:var(--muted)}
  .statbar b{color:var(--ink);font-variant-numeric:tabular-nums;font-weight:700}

  .control{display:flex;align-items:center;justify-content:center;gap:22px;flex-wrap:wrap;
    max-width:640px;margin:16px auto 0;padding:0 26px}
  .control .sld{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted);white-space:nowrap}
  .control input[type=range]{width:150px;height:4px;-webkit-appearance:none;appearance:none;
    background:var(--line);border-radius:3px;outline:none;cursor:pointer}
  .control input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid #fff;
    box-shadow:0 0 0 1px var(--accent);cursor:pointer}
  .control input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;
    background:var(--accent);border:2px solid #fff;box-shadow:0 0 0 1px var(--accent);cursor:pointer}
  .control b{color:var(--ink)}
  .control select{font:inherit;font-size:12.5px;color:var(--body);background:#fff;
    border:1px solid var(--line);border-radius:7px;padding:5px 9px;cursor:pointer}

  .board{max-width:820px;margin:34px auto 0;padding:0 26px}
  .trail{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
  .card{width:126px;min-height:104px;border-radius:12px;border:1px solid var(--line);
    padding:10px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;gap:6px;background:#fff;transition:transform .25s ease,box-shadow .25s ease}
  .card.revealed{border-color:#dde1e7;box-shadow:0 2px 10px rgba(26,31,43,.05)}
  .card.revealed.pop{animation:pop .38s ease}
  @keyframes pop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1)}}
  .card img{width:38px;height:38px;object-fit:contain}
  .card .badge{width:38px;height:38px;border-radius:50%;background:var(--accent);color:#fff;
    display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
  .card .team{font-size:12px;font-weight:600;color:var(--ink);line-height:1.25}
  .card .dates{font-size:10.5px;color:var(--faint)}
  .card.win{border-color:var(--good);background:var(--goodbg)}

  .attempts{display:flex;gap:7px;justify-content:center;align-items:center;margin:28px auto 10px;
    font-size:12px;color:var(--muted)}
  .attempts .pip{width:11px;height:11px;border-radius:50%;background:var(--line);
    transition:background .2s ease}
  .attempts .pip.used{background:var(--bad)}
  .attempts .pip.used.hit{background:var(--good)}

  .guessarea{max-width:520px;margin:0 auto 0;padding:0 26px;position:relative}
  .guessrow{display:flex;gap:8px}
  .guessrow input{flex:1;font:inherit;font-size:15px;padding:11px 14px;border:1.5px solid var(--line);
    border-radius:10px;color:var(--ink);outline:none;transition:border-color .15s ease}
  .guessrow input:focus{border-color:var(--accent)}
  .guessrow button{font:inherit;font-size:14px;font-weight:600;padding:11px 18px;border-radius:10px;
    border:none;background:var(--ink);color:#fff;cursor:pointer;white-space:nowrap}
  .guessrow button:hover{background:#000}
  .guessrow button:disabled{background:var(--line);color:var(--faint);cursor:default}
  .aclist{position:absolute;left:26px;right:26px;top:48px;background:#fff;border:1px solid var(--line);
    border-radius:10px;box-shadow:0 12px 30px rgba(26,31,43,.12);max-height:260px;overflow-y:auto;z-index:5}
  .aclist div{padding:9px 14px;font-size:13.5px;cursor:pointer;display:flex;justify-content:space-between}
  .aclist div span.cc{color:var(--faint);font-size:12px}
  .aclist div:hover,.aclist div.active{background:#f4f6f8}

  .actionrow{display:flex;gap:10px;justify-content:center;margin:14px auto 0;
    position:relative;z-index:6}
  .actionrow button{font:inherit;font-size:12.5px;font-weight:600;color:var(--muted);
    background:none;border:1px solid var(--line);border-radius:8px;padding:8px 13px;cursor:pointer}
  .actionrow button:hover{color:var(--ink);border-color:#c7cdd6}

  .wrongs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:16px auto 0;max-width:600px}
  .wrongs span{font-size:11.5px;color:var(--bad);background:var(--badbg);border-radius:6px;
    padding:3px 8px;text-decoration:line-through;text-decoration-color:rgba(225,87,89,.5)}

  .result{max-width:560px;margin:26px auto 0;padding:20px 24px;border-radius:14px;text-align:center}
  .result.win{background:var(--goodbg);border:1px solid #cfe6c9}
  .result.lose{background:var(--badbg);border:1px solid #f0c9c8}
  .result h2{font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:0 0 4px;color:var(--ink)}
  .result p{margin:0;font-size:13.5px;color:var(--body)}
  .result .flag{font-size:20px;margin-right:6px}
  .sharebtn{margin-top:12px;font:inherit;font-size:12.5px;font-weight:600;color:var(--accent);
    background:#fff;border:1px solid var(--line);border-radius:8px;padding:7px 12px;cursor:pointer}
  .newbtn{margin-top:16px;font:inherit;font-size:14px;font-weight:700;color:#fff;background:var(--ink);
    border:none;border-radius:10px;padding:12px 22px;cursor:pointer}
  .newbtn:hover{background:#000}
  .center{text-align:center}

  footer#disclaimer{max-width:820px;margin:56px auto 56px;padding:22px 26px 0;
    border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
  footer#disclaimer h2{font-family:'Playfair Display',Georgia,serif;font-weight:700;
    font-size:15px;color:var(--ink);margin:18px 0 6px}
  footer#disclaimer p{margin:0 0 9px}
  footer#disclaimer strong{color:var(--body);font-weight:600}
  footer#disclaimer a{color:var(--accent);text-decoration:none}
  footer#disclaimer a:hover{text-decoration:underline}
</style></head>
<body>
<header class="top">
  <div class="nav"><a href="../">← VCT Atlas</a></div>
  <h1>Guess the Player</h1>
  <p class="sub">One Tier&nbsp;1 VCT player, their whole team career laid out at once.
     You get three guesses.</p>
</header>

<div class="statbar" id="statbar"></div>
<div class="control">
  <span class="sld">min teams in career
    <input type="range" id="minteams" min="2" max="10" value="3" step="1">
    <b id="minval">3</b>
  </span>
  <select id="region">
    <option value="all">All regions</option>
    <option value="Americas">Americas</option>
    <option value="Emea">EMEA</option>
    <option value="Pacific">Pacific</option>
    <option value="China">China</option>
  </select>
</div>

<div class="board">
  <div class="trail" id="trail"></div>
</div>

<div class="attempts" id="attempts"></div>

<div class="guessarea">
  <div class="guessrow">
    <input id="guessInput" type="text" autocomplete="off" spellcheck="false"
      placeholder="Type a player name…">
    <button id="guessBtn">Guess</button>
  </div>
  <div class="aclist" id="acList" style="display:none"></div>
</div>

<div class="wrongs" id="wrongs"></div>
<div class="actionrow" id="actionrow">
  <button id="giveupBtn">Give up</button>
</div>

<div id="resultZone" class="center"></div>

<footer id="disclaimer">
  <h2>How to play</h2>
  <p>Every round picks a random Tier&nbsp;1 player and shows their <strong>entire team career
  at once</strong>, oldest team first. You get <strong>three guesses</strong> to name the
  player — use them wisely, or hit "give up" to reveal the answer. Use the region and
  minimum&#8209;teams filters to tune the difficulty: more teams on the timeline means more
  clues, so it's an easier round.</p>
  <h2>Data</h2>
  <p>Full team histories for every player who has appeared in a VCT partnered league
  (Americas, EMEA, Pacific, China — Kickoff through Stage&nbsp;2, 2023&ndash;2026), scraped
  from player profile pages on
  <a href="https://www.vlr.gg" target="_blank" rel="noopener">vlr.gg</a>. A handful of teams
  without listed dates keep their approximate position in the timeline. Stats (streak, played)
  are stored only in your browser.</p>
  <p><strong>Disclaimer.</strong> Unofficial, fan-made, for research and educational use. Not
  affiliated with or endorsed by Riot Games or vlr.gg. VALORANT and VCT are trademarks of
  Riot&nbsp;Games,&nbsp;Inc. Team and player names/logos belong to their respective owners.</p>
</footer>

<script>
const PLAYERS = ${JSON.stringify(PLAYERS)};
const REGION_LABEL = {Americas:"Americas", Emea:"EMEA", Pacific:"Pacific", China:"China"};

function flag(cc){
  if(!cc || cc==="un" || cc.length!==2) return "🏳️";
  return String.fromCodePoint(...[...cc.toLowerCase()].map(c=>0x1F1E6 + c.charCodeAt(0) - 97));
}

const STATS_KEY = "vctAtlasGuessStats";
function loadStats(){
  try{ return JSON.parse(localStorage.getItem(STATS_KEY)) || {played:0,won:0,streak:0,best:0}; }
  catch(e){ return {played:0,won:0,streak:0,best:0}; }
}
function saveStats(s){ try{ localStorage.setItem(STATS_KEY, JSON.stringify(s)); }catch(e){} }
let stats = loadStats();
function renderStats(){
  document.getElementById("statbar").innerHTML =
    '<span>Streak <b>'+stats.streak+'</b></span>' +
    '<span>Best <b>'+stats.best+'</b></span>' +
    '<span>Played <b>'+stats.played+'</b></span>' +
    '<span>Won <b>'+stats.won+'</b></span>';
}

const minSlider = document.getElementById("minteams");
const minVal = document.getElementById("minval");
const regionSel = document.getElementById("region");
try{
  minSlider.value = localStorage.getItem("vctAtlasGuessMinTeams") || 3;
  regionSel.value = localStorage.getItem("vctAtlasGuessRegion") || "all";
}catch(e){}
minVal.textContent = minSlider.value;

function pool(){
  const mt = +minSlider.value, reg = regionSel.value;
  return PLAYERS.filter(p => p.teamCount >= mt && (reg==="all" || p.regions.includes(reg)));
}

const MAX_GUESSES = 3;
let round = null; // {player, guesses:0, wonAt:null, wrong:[], status}
let lastId = null;

function pickPlayer(){
  const p = pool();
  if(!p.length) return null;
  let choice = p[Math.floor(Math.random()*p.length)];
  if(p.length > 1){
    let tries = 0;
    while(choice.id === lastId && tries < 8){ choice = p[Math.floor(Math.random()*p.length)]; tries++; }
  }
  lastId = choice.id;
  return choice;
}

function newRound(){
  const p = pickPlayer();
  document.getElementById("resultZone").innerHTML = "";
  document.getElementById("guessInput").value = "";
  document.getElementById("guessInput").disabled = false;
  document.getElementById("guessBtn").disabled = false;
  document.getElementById("actionrow").style.display = "flex";
  hideAc();
  if(!p){
    document.getElementById("trail").innerHTML =
      '<p style="color:var(--muted);font-size:13px">No players match these filters — widen them.</p>';
    round = null;
    return;
  }
  round = { player: p, guesses: 0, wonAt: null, wrong: [], status: "playing" };
  renderTrail();
  renderWrongs();
  renderAttempts();
  document.getElementById("guessInput").focus();
}

function renderTrail(){
  const c = round.player.career;
  const html = c.map((s,i)=>{
    const cls = "card revealed pop" + (round.status==="won" ? " win" : "");
    const img = s.logo
      ? '<img src="'+s.logo+'" alt="" onerror="this.replaceWith(badge('+JSON.stringify(s.team)+'))">'
      : badgeHtml(s.team);
    return '<div class="'+cls+'" style="animation-delay:'+(i*35)+'ms">'+img+
      '<div class="team">'+escapeHtml(s.team)+'</div>'+
      '<div class="dates">'+escapeHtml((s.s||"?")+" – "+(s.e||"?"))+'</div></div>';
  }).join("");
  document.getElementById("trail").innerHTML = html;
}
function renderAttempts(){
  const pips = [];
  for(let i=0;i<MAX_GUESSES;i++){
    let cls = "pip";
    if(round.wonAt !== null && i === round.wonAt-1) cls += " used hit";
    else if(i < round.guesses) cls += " used";
    pips.push('<span class="'+cls+'"></span>');
  }
  const left = MAX_GUESSES - round.guesses;
  const label = round.status !== "playing" ? "" :
    (left===1 ? "1 guess left" : left+" guesses left");
  document.getElementById("attempts").innerHTML = pips.join("") +
    (label ? '<span style="margin-left:6px">'+label+'</span>' : "");
}
function badgeHtml(team){
  const initials = team.replace(/[^A-Za-z0-9 ]/g,"").split(" ").filter(Boolean)
    .slice(0,2).map(w=>w[0].toUpperCase()).join("") || "?";
  return '<div class="badge">'+initials+'</div>';
}
window.badge = function(team){
  const d = document.createElement("div");
  d.innerHTML = badgeHtml(team);
  return d.firstChild;
};
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function renderWrongs(){
  document.getElementById("wrongs").innerHTML =
    round.wrong.map(w => '<span>'+escapeHtml(w)+'</span>').join("");
}

function endRound(won){
  round.status = won ? "won" : "lost";
  renderTrail();
  renderAttempts();
  document.getElementById("guessInput").disabled = true;
  document.getElementById("guessBtn").disabled = true;
  document.getElementById("actionrow").style.display = "none";
  hideAc();

  stats.played++;
  if(won){ stats.won++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
  else { stats.streak = 0; }
  saveStats(stats);
  renderStats();

  const p = round.player;
  const used = round.guesses;
  const zone = document.getElementById("resultZone");
  const cls = won ? "win" : "lose";
  const sub = won
    ? (used===1 ? "Guessed it on the first try." : "Guessed it in "+used+"/"+MAX_GUESSES+" tries.")
    : "Out of guesses — full career shown above (" + p.career.length + " teams).";
  zone.innerHTML =
    '<div class="result '+cls+'"><h2><span class="flag">'+flag(p.country)+'</span>'+escapeHtml(p.name)+'</h2>'+
    '<p>'+sub+'</p>'+
    '<button class="sharebtn" id="shareBtn">Copy result</button></div>'+
    '<div><button class="newbtn" id="nextBtn">Next player →</button></div>';
  document.getElementById("nextBtn").onclick = newRound;
  document.getElementById("shareBtn").onclick = () => shareResult(won, used);
}

function shareResult(won, used){
  const boxes = Array.from({length: MAX_GUESSES}, (_,i) =>
    i < used-1 ? "⬛" : (i===used-1 ? (won?"🟩":"🟥") : "⬜")).join("");
  const text = "VCT Atlas — Guess the Player\\n" + boxes + "\\n" +
    (won ? used+"/"+MAX_GUESSES+" guesses" : "X/"+MAX_GUESSES+" guesses") +
    " · streak "+stats.streak;
  navigator.clipboard?.writeText(text).then(()=>{
    const b = document.getElementById("shareBtn");
    if(b){ const orig=b.textContent; b.textContent="Copied!"; setTimeout(()=>b.textContent=orig,1400); }
  }).catch(()=>{});
}

function tryGuess(name){
  if(!round || round.status !== "playing" || !name.trim()) return;
  const norm = name.trim().toLowerCase();
  round.guesses++;
  if(norm === round.player.name.toLowerCase()){
    round.wonAt = round.guesses;
    endRound(true);
    return;
  }
  if(!round.wrong.some(w => w.toLowerCase()===norm)) round.wrong.push(name.trim());
  renderWrongs();
  renderAttempts();
  document.getElementById("guessInput").value = "";
  hideAc();
  if(round.guesses >= MAX_GUESSES) endRound(false);
}

function giveUp(){
  if(!round || round.status!=="playing") return;
  endRound(false);
}

// autocomplete
const input = document.getElementById("guessInput");
const acList = document.getElementById("acList");
let acActive = -1, acItems = [];
function hideAc(){ acList.style.display="none"; acList.innerHTML=""; acActive=-1; acItems=[]; }
function showAc(matches){
  acItems = matches;
  acActive = -1;
  if(!matches.length){ hideAc(); return; }
  acList.innerHTML = matches.map((p,i) =>
    '<div data-i="'+i+'">'+escapeHtml(p.name)+' <span class="cc">'+flag(p.country)+'</span></div>'
  ).join("");
  acList.style.display = "block";
  Array.from(acList.children).forEach((el,i) => {
    el.onmousedown = (e) => { e.preventDefault(); input.value = matches[i].name; hideAc(); };
  });
}
input.addEventListener("input", () => {
  const v = input.value.trim().toLowerCase();
  if(!v){ hideAc(); return; }
  const matches = PLAYERS.filter(p => p.name.toLowerCase().includes(v)).slice(0,8);
  showAc(matches);
});
input.addEventListener("keydown", (e) => {
  if(acItems.length && (e.key==="ArrowDown" || e.key==="ArrowUp")){
    e.preventDefault();
    acActive = e.key==="ArrowDown" ? Math.min(acActive+1, acItems.length-1) : Math.max(acActive-1, 0);
    Array.from(acList.children).forEach((el,i)=>el.classList.toggle("active", i===acActive));
    return;
  }
  if(e.key==="Enter"){
    e.preventDefault();
    if(acActive >= 0 && acItems[acActive]) input.value = acItems[acActive].name;
    tryGuess(input.value);
  }
});
document.addEventListener("mousedown", (e) => {
  if(!acItems.length) return;
  if(e.target === input || acList.contains(e.target)) return;
  hideAc();
});
document.getElementById("guessBtn").addEventListener("click", () => tryGuess(input.value));
document.getElementById("giveupBtn").addEventListener("click", giveUp);

minSlider.addEventListener("input", () => {
  minVal.textContent = minSlider.value;
  try{ localStorage.setItem("vctAtlasGuessMinTeams", minSlider.value); }catch(e){}
  newRound();
});
regionSel.addEventListener("change", () => {
  try{ localStorage.setItem("vctAtlasGuessRegion", regionSel.value); }catch(e){}
  newRound();
});

renderStats();
newRound();
</script>
</body></html>
`;

const OUT = path.join(__dirname, "..", "site", "guess-the-player", "index.html");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB), ${PLAYERS.length} players embedded`);
