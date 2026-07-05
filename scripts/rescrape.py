"""Re-scrape VCT Tier-1 league rosters from vlr.gg event STATS pages (players who
actually played, with country flags) — the reliable source the original build missed.
Rebuilds kaggle-upload/vct_players.csv."""
import urllib.request, re, json, time, csv, sys, os

HERE = "/home/liquidicalpants/projects/vlrgg/vlrggapi"
KAGGLE = "/home/liquidicalpants/projects/vlrgg/kaggle-upload"
EVENTS = json.load(open(os.path.join(HERE, "vct_events.json")))  # id -> name

def region_of(name):
    low = name.lower()
    for r in ("americas", "emea", "pacific", "china"):
        if r in low:
            return r.capitalize()
    return None

# per-player-row: href /player/ID, then flag mod-XX, then text-of">NAME
ROW = re.compile(
    r'href="/player/(\d+)/[^"]*"[^>]*>.*?flag mod-([a-z]{2}).*?text-of">\s*([^<]+?)\s*</div>',
    re.DOTALL)

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")

def scrape_event(eid):
    url = f"https://www.vlr.gg/event/stats/{eid}/?min_rounds=0&min_rating=0&agent=all&map_id=all&timespan=all"
    html = fetch(url)
    rows = ROW.findall(html)
    # dedupe by player id within the event
    out = {}
    for pid, cc, name in rows:
        out[pid] = (name.strip(), cc)
    return out

def main(test_only=False):
    players = {}  # pid -> {name, country, regions:set, events:set}
    ids = list(EVENTS.items())
    if test_only:
        ids = [("1925", EVENTS["1925"])]
    for i, (eid, ename) in enumerate(ids, 1):
        reg = region_of(ename)
        try:
            ev = scrape_event(eid)
        except Exception as e:
            print(f"[{i}/{len(ids)}] {eid} {ename} ERROR {e}", flush=True)
            continue
        for pid, (name, cc) in ev.items():
            p = players.setdefault(pid, {"name": name, "country": cc,
                                         "regions": set(), "events": set()})
            p["name"] = name
            p["country"] = cc
            if reg:
                p["regions"].add(reg)
            p["events"].add(eid)
        print(f"[{i}/{len(ids)}] {eid:<5} {ename:<40} region={reg} players={len(ev)}", flush=True)
        if not test_only:
            time.sleep(4.5)  # polite delay

    # France sanity
    fr = sorted([(p["name"], "|".join(sorted(p["regions"]))) for p in players.values()
                 if p["country"] == "fr"], key=lambda x: x[0].lower())
    print(f"\nFRANCE players: {len(fr)}")
    for n, r in fr:
        print(f"   {n:14} {r}")

    if test_only:
        return
    # write CSV
    os.makedirs(KAGGLE, exist_ok=True)
    out = os.path.join(KAGGLE, "vct_players.csv")
    rows = []
    for pid, p in players.items():
        rows.append({"player_id": pid, "player": p["name"], "country": p["country"],
                     "vct_regions": "|".join(sorted(p["regions"])),
                     "vct_events_count": len(p["events"])})
    rows.sort(key=lambda x: (-x["vct_events_count"], x["player"].lower()))
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"\nWrote {out}: {len(rows)} players")

if __name__ == "__main__":
    main(test_only="--test" in sys.argv)
