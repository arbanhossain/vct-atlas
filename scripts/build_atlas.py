#!/usr/bin/env python3
"""Build atlas_data.js (window.ATLAS) for the VCT Data Atlas dataviz page.
Panels: agent meta streamgraph, rating-rank bump, teammate network, map sidedness."""
import json
import re
import glob
import os
from collections import defaultdict
from itertools import combinations

ROOT = os.path.dirname(os.path.abspath(__file__))

MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}

AGENT_ROLE = {}
for role, ags in {
    "duelist": ["Jett", "Raze", "Yoru", "Neon", "Phoenix", "Reyna", "Iso", "Waylay"],
    "controller": ["Omen", "Viper", "Astra", "Brimstone", "Harbor", "Clove"],
    "initiator": ["Sova", "Skye", "Fade", "Kayo", "Breach", "Gekko", "Tejo"],
    "sentinel": ["Killjoy", "Cypher", "Chamber", "Sage", "Vyse", "Deadlock"],
}.items():
    for a in ags:
        AGENT_ROLE[a] = role
ROLE_COLOR = {"duelist": "#ff4655", "controller": "#7c5cff",
              "initiator": "#23c4b6", "sentinel": "#4f9dff"}


def parse_date(dates):
    # month and year must be found independently — day numbers sit between them
    # (e.g. "Aug 31 – Sep 19, 2022"); we take the FIRST month = the start month.
    y = re.search(r"(\d{4})", dates or "")
    mo = re.search(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b", dates or "")
    return (int(y.group(1)) if y else 0, MONTHS[mo.group(1)] if mo else 1)


def short_label(title, year):
    s = title.replace("Valorant ", "")
    s = re.sub(r"Champions Tour (Stage \d: |20\d\d: )", "", s)
    s = re.sub(r"\s*20\d\d", "", s).strip()
    yy = f"'{str(year)[2:]}"
    return f"{s} {yy}"


# ---- load everything --------------------------------------------------------
events = []
team_region = defaultdict(lambda: defaultdict(int))   # team -> region -> count
player_team = defaultdict(lambda: defaultdict(int))    # pid -> team -> maps
player_name = {}
pmaps = defaultdict(int)                                # pid -> total maps
pair = defaultdict(int)                                 # (a,b) -> maps together
# per-tournament agent counts; per-tournament per-player rating
agent_ct = defaultdict(lambda: defaultdict(int))       # eidx -> agent -> count
agent_tot = defaultdict(int)                            # eidx -> total player-maps
prt = defaultdict(lambda: defaultdict(lambda: [0.0, 0]))  # eidx -> pid -> [sumRating, maps]
map_atk = defaultdict(int); map_def = defaultdict(int)
map_wt = defaultdict(lambda: defaultdict(int))         # map -> win_type -> count

ev_files = []
for ef in glob.glob(os.path.join(ROOT, "*", "event.json")):
    j = json.load(open(ef))
    folder = os.path.dirname(ef)
    mfiles = [f for f in glob.glob(os.path.join(folder, "*.json")) if not f.endswith("event.json")]
    if not mfiles:
        continue  # skip events with no match data (e.g. Champions 2026)
    y, mo = parse_date(j.get("dates", ""))
    # team -> region from match listing
    for m in j.get("matches", []) or []:
        for t in m.get("teams", []) or []:
            if t.get("name") and t.get("region"):
                team_region[t["name"]][t["region"].upper()] += 1
    ev_files.append((y, mo, j.get("id"), j.get("title", ""), folder, mfiles))

ev_files.sort(key=lambda x: (x[0], x[1]))
for eidx, (y, mo, eid, title, folder, mfiles) in enumerate(ev_files):
    events.append({"id": str(eid), "title": title, "short": short_label(title, y),
                   "year": y, "date": f"{y}-{mo:02d}-01"})
    for mf in mfiles:
        j = json.load(open(mf))
        for g in j.get("data", []) or []:
            by_team = defaultdict(list)
            for mb in g.get("members", []) or []:
                pid = str(mb.get("id") or "")
                if not pid:
                    continue
                player_name[pid] = mb.get("name", "")
                pmaps[pid] += 1
                agent_tot[eidx] += 1
                tm = mb.get("team")
                if tm:
                    player_team[pid][tm] += 1
                    by_team[tm].append(pid)
                for a in mb.get("agents", []) or []:
                    t = a.get("title")
                    if t and t in AGENT_ROLE:
                        agent_ct[eidx][t] += 1
                r = mb.get("rating")
                if isinstance(r, (int, float)):
                    prt[eidx][pid][0] += r; prt[eidx][pid][1] += 1
            for tm, ps in by_team.items():
                for a, b in combinations(sorted(set(ps)), 2):
                    pair[(a, b)] += 1
            for rd in g.get("rounds", []) or []:
                side = rd.get("side")
                if side == "attack":
                    map_atk[g.get("map")] += 1
                elif side == "defense":
                    map_def[g.get("map")] += 1
                wt = rd.get("win_type")
                if wt:
                    map_wt[g.get("map")][wt] += 1

NE = len(events)

# ---- 1) streamgraph: agent pick-rate per tournament ------------------------
agents = sorted({a for d in agent_ct.values() for a in d},
                key=lambda a: ({"duelist": 0, "controller": 1, "initiator": 2, "sentinel": 3}[AGENT_ROLE[a]], a))
stream_data = []
for a in agents:
    for eidx, ev in enumerate(events):
        tot = agent_tot[eidx] or 1
        pct = round(100 * agent_ct[eidx].get(a, 0) / tot, 2)
        stream_data.append([ev["date"], pct, a])
stream_colors = [ROLE_COLOR[AGENT_ROLE[a]] for a in agents]

# ---- 2) bump: rating rank of top players across tournaments ----------------
career = defaultdict(lambda: [0.0, 0, 0])  # pid -> [sumRating, maps, tournaments]
for eidx in range(NE):
    for pid, (s, m) in prt[eidx].items():
        if m:
            career[pid][0] += s; career[pid][1] += m; career[pid][2] += 1
elig = [(pid, c[0] / c[1]) for pid, c in career.items() if c[1] >= 30 and c[2] >= 5]
elig.sort(key=lambda x: -x[1])
tracked = [pid for pid, _ in elig[:12]]
BUMP_COLORS = ["#ff4655", "#ffce54", "#23c4b6", "#4f9dff", "#7c5cff", "#ff8f3f",
               "#3fb950", "#f06ec0", "#5fd0ff", "#c0a062", "#9aa4b2", "#e0e0e0"]
bump_series = []
# per tournament, rank tracked players present (maps>=3) by that tournament's avg rating
rank_per_ev = []
for eidx in range(NE):
    present = []
    for pid in tracked:
        s, m = prt[eidx].get(pid, (0, 0))
        if m >= 3:
            present.append((pid, s / m))
    present.sort(key=lambda x: -x[1])
    rank_per_ev.append({pid: i + 1 for i, (pid, _) in enumerate(present)})
for i, pid in enumerate(tracked):
    ranks = [rank_per_ev[e].get(pid) for e in range(NE)]
    bump_series.append({"name": player_name[pid], "color": BUMP_COLORS[i % len(BUMP_COLORS)],
                        "ranks": ranks})

# ---- 3) teammate network ---------------------------------------------------
NODE_MAPS, EDGE_MAPS = 25, 12
def region_of(pid):
    teams = player_team[pid]
    if not teams:
        return "??"
    top_team = max(teams, key=teams.get)
    regs = team_region.get(top_team)
    return max(regs, key=regs.get) if regs else "??"

node_ids = [pid for pid, m in pmaps.items() if m >= NODE_MAPS]
node_set = set(node_ids)
regions = sorted({region_of(pid) for pid in node_ids})
REG_PALETTE = ["#ff4655", "#4f9dff", "#23c4b6", "#ffce54", "#7c5cff", "#3fb950",
               "#ff8f3f", "#f06ec0", "#9aa4b2", "#c0a062", "#5fd0ff", "#e06b6b", "#888"]
reg_idx = {r: i for i, r in enumerate(regions)}
nodes = [{"id": pid, "name": player_name[pid], "value": pmaps[pid],
          "symbolSize": round(6 + pmaps[pid] ** 0.5), "category": reg_idx[region_of(pid)]}
         for pid in node_ids]
links = [{"source": a, "target": b, "value": v}
         for (a, b), v in pair.items() if v >= EDGE_MAPS and a in node_set and b in node_set]
categories = [{"name": r, "itemStyle": {"color": REG_PALETTE[i % len(REG_PALETTE)]}}
              for i, r in enumerate(regions)]

# ---- 4) map sidedness + economy --------------------------------------------
maps_out = []
for mp in map_atk.keys() | map_def.keys():
    a, d = map_atk[mp], map_def[mp]
    tot = a + d or 1
    maps_out.append({"map": mp, "rounds": a + d, "atkPct": round(100 * a / tot, 1),
                     "defPct": round(100 * d / tot, 1), "winTypes": dict(map_wt[mp])})
maps_out.sort(key=lambda x: -x["atkPct"])

# ============================================================================
# SECOND PASS: Elo dynasties, win-probability surface, player galaxy, vetoes
# ============================================================================
import numpy as np

ALIAS = {"Vision Strikers": "DRX", "KIWOOM DRX": "DRX", "ENVY": "OpTic Gaming"}
def canon(t): return ALIAS.get(t, t)

elo = defaultdict(lambda: 1500.0)
elo_hist = defaultdict(dict)        # team -> {eidx: elo}
played_in = defaultdict(set)        # eidx -> {teams}
K = 36

wp = defaultdict(lambda: [0, 0])    # (round_no, diff) -> [team1_map_wins, total]

psum = defaultdict(lambda: defaultdict(float))
pcnt = defaultdict(int)
pagents2 = defaultdict(lambda: defaultdict(int))

veto_ban = defaultdict(int); veto_pick = defaultdict(int); veto_dec = defaultdict(int)
scorelines = defaultdict(int)

for eidx, (y, mo, eid, title, folder, mfiles) in enumerate(ev_files):
    ev = json.load(open(os.path.join(folder, "event.json")))
    meta_m = {str(m.get("id")): m for m in ev.get("matches", []) or []}

    def order_key(mf):
        mm = meta_m.get(os.path.splitext(os.path.basename(mf))[0], {})
        return (mm.get("date", ""), mm.get("time", ""))

    for mf in sorted(mfiles, key=order_key):
        j = json.load(open(mf))
        ts = j.get("teams", []) or []
        if len(ts) == 2 and isinstance(ts[0].get("score"), int) and isinstance(ts[1].get("score"), int):
            a, b = canon(ts[0].get("name")), canon(ts[1].get("name"))
            sa, sb = ts[0]["score"], ts[1]["score"]
            if a and b and sa != sb:
                Ea = 1 / (1 + 10 ** ((elo[b] - elo[a]) / 400))
                res = 1 if sa > sb else 0
                elo[a] += K * (res - Ea); elo[b] += K * ((1 - res) - (1 - Ea))
                played_in[eidx].update([a, b])
        for ban in j.get("bans", []) or []:
            mm = re.match(r"^(.*?)\s+(ban|pick)\s+(.+)$", ban)
            if mm:
                (veto_ban if mm.group(2) == "ban" else veto_pick)[mm.group(3).strip()] += 1
            elif ban.endswith("remains"):
                veto_dec[ban.rsplit(" ", 1)[0].strip()] += 1
        for g in j.get("data", []) or []:
            gt = g.get("teams", []) or []
            if len(gt) == 2 and isinstance(gt[0].get("score"), int):
                s1, s2 = gt[0]["score"], gt[1]["score"]
                scorelines[(max(s1, s2), min(s1, s2))] += 1
                t1won = 1 if s1 > s2 else 0
                for r in g.get("rounds", []) or []:
                    mm = re.match(r"(\d+)-(\d+)", r.get("round_score", ""))
                    if mm:
                        ca, cb = int(mm.group(1)), int(mm.group(2))
                        cell = wp[(ca + cb, ca - cb)]
                        cell[0] += t1won; cell[1] += 1
            for mb in g.get("members", []) or []:
                pid = str(mb.get("id") or "")
                if not pid:
                    continue
                pcnt[pid] += 1
                for k, src in (("rating", "rating"), ("acs", "acs"), ("adr", "adr"),
                               ("kast", "kast"), ("hs", "headshot_percent")):
                    v = mb.get(src)
                    if isinstance(v, (int, float)):
                        psum[pid][k] += v
                psum[pid]["kills"] += mb.get("kills") or 0
                psum[pid]["assists"] += mb.get("assists") or 0
                psum[pid]["fk"] += mb.get("first_kills") or 0
                psum[pid]["fd"] += mb.get("first_deaths") or 0
                for ag in mb.get("agents", []) or []:
                    t = ag.get("title")
                    if t and t in AGENT_ROLE:
                        pagents2[pid][t] += 1
    for t in played_in[eidx]:
        elo_hist[t][eidx] = round(elo[t], 1)

# Elo: top teams by peak rating, plotted across tournaments
peak = {t: max(h.values()) for t, h in elo_hist.items()}
top_teams = sorted(peak, key=lambda t: -peak[t])[:10]
elo_series = [{"name": t, "color": BUMP_COLORS[i % len(BUMP_COLORS)],
               "values": [elo_hist[t].get(e) for e in range(NE)]}
              for i, t in enumerate(top_teams)]

# Win-probability surface (team1 perspective; symmetric by construction)
wp_cells = [[rn, diff, round(c[0] / c[1], 3), c[1]]
            for (rn, diff), c in wp.items() if c[1] >= 8 and rn <= 26 and abs(diff) <= 13]

# Player galaxy via PCA on standardized per-map averages
MIN_G = 25
gids = [pid for pid in pcnt if pcnt[pid] >= MIN_G]
FEATS = ["rating", "acs", "adr", "kast", "hs", "kpr", "apr", "fkpr", "fdpr"]
def fvec(pid):
    n = pcnt[pid]
    return [psum[pid]["rating"]/n, psum[pid]["acs"]/n, psum[pid]["adr"]/n, psum[pid]["kast"]/n,
            psum[pid]["hs"]/n, psum[pid]["kills"]/n, psum[pid]["assists"]/n,
            psum[pid]["fk"]/n, psum[pid]["fd"]/n]
X = np.array([fvec(p) for p in gids], dtype=float)
sd = X.std(0); sd[sd == 0] = 1
Z = (X - X.mean(0)) / sd
U, S, Vt = np.linalg.svd(Z, full_matrices=False)
PC = Z @ Vt[:2].T
acs_i, fk_i, fd_i = FEATS.index("acs"), FEATS.index("fkpr"), FEATS.index("fdpr")
if np.corrcoef(PC[:, 0], Z[:, acs_i])[0, 1] < 0:
    PC[:, 0] *= -1; Vt[0] *= -1
if np.corrcoef(PC[:, 1], Z[:, fk_i] - Z[:, fd_i])[0, 1] < 0:
    PC[:, 1] *= -1; Vt[1] *= -1
def role_of(pid):
    tot = sum(pagents2[pid].values()) or 1
    sh = defaultdict(float)
    for a, c in pagents2[pid].items():
        sh[AGENT_ROLE[a]] += c / tot
    top = max(sh, key=sh.get) if sh else None
    return top if (top and sh[top] > 0.5) else "flex"
galaxy = [{"name": player_name[p], "x": round(float(PC[i, 0]), 2), "y": round(float(PC[i, 1]), 2),
           "role": role_of(p), "maps": pcnt[p], "acs": round(psum[p]["acs"]/pcnt[p]),
           "rating": round(psum[p]["rating"]/pcnt[p], 2)} for i, p in enumerate(gids)]
print("PCA var explained:", np.round((S[:2]**2)/np.sum(S**2), 3))
print("PC1 loadings:", dict(zip(FEATS, np.round(Vt[0], 2))))
print("PC2 loadings:", dict(zip(FEATS, np.round(Vt[1], 2))))

# Vetoes + scoreline distribution
veto = sorted(({"map": mp, "ban": veto_ban[mp], "pick": veto_pick[mp], "decider": veto_dec[mp]}
               for mp in set(veto_ban) | set(veto_pick) | set(veto_dec)),
              key=lambda x: -(x["ban"] + x["pick"] + x["decider"]))
reg = sorted(((a, b, c) for (a, b), c in scorelines.items() if a <= 13), key=lambda x: (x[0], x[1]))
ot = sorted(((a, b, c) for (a, b), c in scorelines.items() if a > 13), key=lambda x: (x[0], x[1]))
scoreline = [{"line": f"{a}-{b}", "n": c} for a, b, c in reg + ot]

# ---- meta / headline numbers ----
meta = {"events": NE, "matches": sum(len(e[5]) for e in ev_files),
        "players": len(pmaps), "rounds": sum(map_atk.values()) + sum(map_def.values()),
        "years": [events[0]["year"], events[-1]["year"]]}

atlas = {"events": events, "stream": {"agents": agents, "colors": stream_colors, "data": stream_data},
         "bump": {"tournaments": [e["short"] for e in events], "series": bump_series},
         "network": {"nodes": nodes, "links": links, "categories": categories},
         "maps": maps_out,
         "elo": {"tournaments": [e["short"] for e in events], "series": elo_series},
         "winprob": wp_cells,
         "galaxy": galaxy,
         "veto": veto, "scoreline": scoreline,
         "meta": meta}

with open(os.path.join(ROOT, "atlas_data.js"), "w") as fh:
    fh.write("window.ATLAS = ")
    json.dump(atlas, fh)
    fh.write(";\n")

print(f"events={NE} agents={len(agents)} bump_players={len(tracked)} "
      f"nodes={len(nodes)} links={len(links)} maps={len(maps_out)} regions={len(regions)}")
print("tracked:", ", ".join(player_name[p] for p in tracked))
print("wrote atlas_data.js")
