#!/usr/bin/env python3
"""Reproduce the atlas.html player-galaxy PCA, but emit ALL players (projected onto
the PCA fit on the >=25-map players) so the page's min-maps slider can filter live."""
import json, glob, os, sys
from collections import defaultdict
import numpy as np

ROOT = "/home/liquidicalpants/projects/vlrgg"

AGENT_ROLE = {}
for role, ags in {
    "duelist": ["Jett", "Raze", "Yoru", "Neon", "Phoenix", "Reyna", "Iso", "Waylay"],
    "controller": ["Omen", "Viper", "Astra", "Brimstone", "Harbor", "Clove"],
    "initiator": ["Sova", "Skye", "Fade", "Kayo", "Breach", "Gekko", "Tejo"],
    "sentinel": ["Killjoy", "Cypher", "Chamber", "Sage", "Vyse", "Deadlock"],
}.items():
    for a in ags:
        AGENT_ROLE[a] = role

psum = defaultdict(lambda: defaultdict(float))
pcnt = defaultdict(int)
pagents2 = defaultdict(lambda: defaultdict(int))
player_name = {}

for ef in glob.glob(os.path.join(ROOT, "*", "event.json")):
    folder = os.path.dirname(ef)
    mfiles = [f for f in glob.glob(os.path.join(folder, "*.json")) if not f.endswith("event.json")]
    if not mfiles:
        continue
    for mf in mfiles:
        j = json.load(open(mf))
        for g in j.get("data", []) or []:
            for mb in g.get("members", []) or []:
                pid = str(mb.get("id") or "")
                if not pid:
                    continue
                player_name[pid] = mb.get("name", "")
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

FEATS = ["rating", "acs", "adr", "kast", "hs", "kpr", "apr", "fkpr", "fdpr"]
def fvec(pid):
    n = pcnt[pid]
    return [psum[pid]["rating"]/n, psum[pid]["acs"]/n, psum[pid]["adr"]/n, psum[pid]["kast"]/n,
            psum[pid]["hs"]/n, psum[pid]["kills"]/n, psum[pid]["assists"]/n,
            psum[pid]["fk"]/n, psum[pid]["fd"]/n]

def role_of(pid):
    tot = sum(pagents2[pid].values()) or 1
    sh = defaultdict(float)
    for a, c in pagents2[pid].items():
        sh[AGENT_ROLE[a]] += c / tot
    top = max(sh, key=sh.get) if sh else None
    return top if (top and sh[top] > 0.5) else "flex"

# --- fit PCA on the >=25-map players (same as atlas.html) ---
MIN_G = 25
gids = [p for p in pcnt if pcnt[p] >= MIN_G]
Xg = np.array([fvec(p) for p in gids], dtype=float)
mean = Xg.mean(0); sd = Xg.std(0); sd[sd == 0] = 1
Zg = (Xg - mean) / sd
U, S, Vt = np.linalg.svd(Zg, full_matrices=False)
PCg = Zg @ Vt[:2].T
acs_i, fk_i, fd_i = FEATS.index("acs"), FEATS.index("fkpr"), FEATS.index("fdpr")
if np.corrcoef(PCg[:, 0], Zg[:, acs_i])[0, 1] < 0:
    Vt[0] *= -1
if np.corrcoef(PCg[:, 1], Zg[:, fk_i] - Zg[:, fd_i])[0, 1] < 0:
    Vt[1] *= -1

# --- project EVERY player onto that PCA ---
allids = [p for p in pcnt if pcnt[p] >= 1 and player_name.get(p)]
Xa = np.array([fvec(p) for p in allids], dtype=float)
Za = (Xa - mean) / sd
PCa = Za @ Vt[:2].T

players = [{"n": player_name[p], "x": round(float(PCa[i, 0]), 2), "y": round(float(PCa[i, 1]), 2),
            "r": role_of(p), "m": pcnt[p], "a": round(psum[p]["acs"]/pcnt[p]),
            "g": round(psum[p]["rating"]/pcnt[p], 2)}
           for i, p in enumerate(allids)]

out = {"players": players,
       "total": len(players),
       "fitCount": len(gids)}
json.dump(out, open(sys.argv[1], "w"))
print("total players:", len(players), "| >=25 maps:", len(gids),
      "| maps range:", min(p["m"] for p in players), "-", max(p["m"] for p in players))
