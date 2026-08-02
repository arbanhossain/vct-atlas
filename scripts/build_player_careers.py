"""Build scripts/data/player_careers.json: full team-by-team career history
(oldest -> newest) for every Tier-1 VCT player in data/vct_players.csv, sourced
from the per-player raw profiles scraped from vlr.gg (kaggle-upload/players_raw,
external data workspace — see README "Data provenance")."""
import csv, json, os, re

ROOT = "/home/liquidicalpants/projects/vlrgg"
RAW_DIR = os.path.join(ROOT, "kaggle-upload", "players_raw")
HERE = os.path.dirname(__file__)
PLAYERS_CSV = os.path.join(HERE, "data", "vct_players.csv")
OUT = os.path.join(HERE, "data", "player_careers.json")

MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"], 1)}

# vlr.gg's own "no logo on file" placeholder -- not a real crest, so it's
# dropped in favor of the client's generated initials badge.
PLACEHOLDER_LOGO = "https://www.vlr.gg/img/vlr/tmp/vlr.png"


def clean_logo(url):
    url = (url or "").strip()
    return "" if url == PLACEHOLDER_LOGO else url

ROLE_WORDS = {"coach", "stand-in", "staff", "loan", "head coach", "assistant coach"}
NON_TEAM_NAMES = {
    "unsigned", "tbd", "fa", "free agent", "free agents", "inactive", "unknown",
    "retired", "benched", "",
}

# vlr.gg lists "national team" appearances (Nations-style events) as a past team
# too -- these aren't esports orgs, so they're excluded from the club career.
NATIONAL_TEAM_NAMES = {
    "türkiye", "turkiye", "turkey", "brazil", "canada", "finland", "south korea",
    "korea", "united states", "usa", "china", "japan", "russia", "france",
    "germany", "united kingdom", "poland", "indonesia", "philippines", "vietnam",
    "thailand", "singapore", "india", "argentina", "chile", "mexico", "spain",
    "portugal", "sweden", "norway", "denmark", "italy", "belgium", "netherlands",
    "czechia", "czech republic", "morocco", "egypt", "australia", "kazakhstan",
    "ukraine", "serbia", "romania", "latvia", "lithuania", "estonia", "malaysia",
    "hong kong", "taiwan", "mongolia", "cambodia", "bulgaria", "iceland", "ireland",
    "austria", "switzerland", "greece", "hungary", "slovakia", "slovenia", "croatia",
    "bosnia and herzegovina", "north macedonia", "moldova", "belarus", "georgia",
    "armenia", "azerbaijan", "uzbekistan", "kyrgyzstan", "mongolia", "nepal",
    "pakistan", "bangladesh", "sri lanka", "myanmar", "laos", "brunei", "new zealand",
    "peru", "colombia", "ecuador", "bolivia", "uruguay", "paraguay", "venezuela",
    "costa rica", "panama", "guatemala", "dominican republic", "jamaica", "tunisia",
    "algeria", "nigeria", "kenya", "south africa", "saudi arabia", "united arab emirates",
    "qatar", "kuwait", "jordan", "lebanon", "israel", "cyprus", "luxembourg", "malta",
    "monaco", "andorra", "macau", "cambodia", "puerto rico",
}

MON = r"[A-Z][a-z]+"
RANGE_RE = re.compile(rf"^(?P<m1>{MON})\s+(?P<y1>\d{{4}})\s*[–‒-]\s*(?P<m2>{MON})\s+(?P<y2>\d{{4}})$")
SINGLE_RE = re.compile(rf"^(?P<kw>joined in|left in|Inactive from)\s+(?P<m>{MON})\s+(?P<y>\d{{4}})$")
# scraper bug: some team "name" fields have the date text run directly into the
# team name with no separator, e.g. "FNATICApril 2021 – October 2024" or
# "CGN Esportsjoined in January 2025"
NAME_SUFFIX_RANGE_RE = re.compile(
    rf"^(?P<name>.+?)(?P<m1>{MON})\s+(?P<y1>\d{{4}})\s*[–‒-]\s*(?P<m2>{MON})\s+(?P<y2>\d{{4}})$")
NAME_SUFFIX_SINGLE_RE = re.compile(
    rf"^(?P<name>.+?)(?P<kw>joined in|left in|Inactive from)\s+(?P<m>{MON})\s+(?P<y>\d{{4}})$")


def ym(month_name, year):
    m = MONTHS.get(month_name)
    if not m:
        return None
    return f"{year}-{m:02d}"


def label(month_name, year):
    return f"{month_name} {year}"


def parse_date_field(text):
    """Parses a vlr.gg 'dates'/'joined' string into (start, start_label, end, end_label)."""
    text = (text or "").strip()
    if not text or text.lower() in ROLE_WORDS:
        return None, None, None, None
    m = RANGE_RE.match(text)
    if m:
        return (ym(m["m1"], m["y1"]), label(m["m1"], m["y1"]),
                ym(m["m2"], m["y2"]), label(m["m2"], m["y2"]))
    m = SINGLE_RE.match(text)
    if m:
        d, lbl = ym(m["m"], m["y"]), label(m["m"], m["y"])
        return (d, lbl, None, None) if m["kw"] == "joined in" else (None, None, d, lbl)
    return None, None, None, None


def clean_team_entry(t, dates_field):
    """Returns (name, start, start_label, end, end_label), repairing the
    name-swallowed-the-dates bug and merging with the separate dates field."""
    name = (t.get("name") or "").strip()
    start, start_label, end, end_label = None, None, None, None

    m = NAME_SUFFIX_RANGE_RE.match(name)
    if m and m["name"].strip():
        name = m["name"].strip()
        start, start_label = ym(m["m1"], m["y1"]), label(m["m1"], m["y1"])
        end, end_label = ym(m["m2"], m["y2"]), label(m["m2"], m["y2"])
        return name, start, start_label, end, end_label

    m = NAME_SUFFIX_SINGLE_RE.match(name)
    if m and m["name"].strip():
        name = m["name"].strip()
        d, lbl = ym(m["m"], m["y"]), label(m["m"], m["y"])
        if m["kw"] == "joined in":
            start, start_label = d, lbl
        else:
            end, end_label = d, lbl

    # fill in whatever the name-suffix didn't cover from the separate dates field
    f_start, f_start_label, f_end, f_end_label = parse_date_field(dates_field)
    start, start_label = start or f_start, start_label or f_start_label
    end, end_label = end or f_end, end_label or f_end_label
    return name, start, start_label, end, end_label


def is_real_team(name):
    n = name.strip().lower()
    return n not in NON_TEAM_NAMES and n not in NATIONAL_TEAM_NAMES


def build_career(raw):
    stints = []

    ct = raw.get("current_team")
    if ct and ct.get("name") and is_real_team(ct["name"]):
        name, start, start_label, end, end_label = clean_team_entry(ct, ct.get("joined"))
        joined = (ct.get("joined") or "").strip()
        still_active = (not end_label) and (joined.startswith("joined in") or not joined)
        if still_active:
            end_label = "Present"
        stints.append({
            "team": name, "tag": ct.get("tag") or "", "logo": clean_logo(ct.get("logo")),
            "start": start, "start_label": start_label,
            "end": end, "end_label": end_label,
            "current": still_active,
        })

    for t in raw.get("past_teams") or []:
        if not is_real_team(t.get("name") or ""):
            continue
        name, start, start_label, end, end_label = clean_team_entry(t, t.get("dates"))
        if not is_real_team(name):
            continue
        stints.append({
            "team": name, "tag": t.get("tag") or "", "logo": clean_logo(t.get("logo")),
            "start": start, "start_label": start_label,
            "end": end, "end_label": end_label,
            "current": False,
        })

    stints = [s for s in stints if s["team"]]
    # `stints` is in vlr.gg's raw order (current team, then past teams newest -> oldest),
    # which is occasionally inconsistent with the actual dates (stale "current team"
    # entries, etc). Sort chronologically by parsed date instead of trusting raw order;
    # entries with no parseable date are interpolated from their nearest dated neighbors
    # in the raw sequence (which is still a reasonable recency signal).
    n = len(stints)
    vals = [None] * n
    for i, s in enumerate(stints):
        d = s["start"] or s["end"]
        if d:
            y, m = (int(x) for x in d.split("-"))
            vals[i] = y * 12 + m
    for i in range(n):
        if vals[i] is not None:
            continue
        left = next((vals[j] for j in range(i - 1, -1, -1) if vals[j] is not None), None)
        right = next((vals[j] for j in range(i + 1, n) if vals[j] is not None), None)
        if left is not None and right is not None:
            vals[i] = (left + right) / 2
        elif left is not None:
            vals[i] = left - 1
        elif right is not None:
            vals[i] = right + 1
        else:
            vals[i] = 0
    order = sorted(range(n), key=lambda i: (vals[i], -i))
    return [stints[i] for i in order]


def main():
    roster = list(csv.DictReader(open(PLAYERS_CSV)))
    out = []
    missing = 0
    for r in roster:
        pid = r["player_id"]
        path = os.path.join(RAW_DIR, f"{pid}.json")
        if not os.path.exists(path):
            missing += 1
            continue
        raw = json.load(open(path))
        career = build_career(raw)
        if not career:
            continue
        team_names = []
        for s in career:
            if not team_names or team_names[-1] != s["team"]:
                team_names.append(s["team"])
        out.append({
            "id": pid,
            "name": r["player"],
            "country": r["country"],
            "regions": [x for x in r["vct_regions"].split("|") if x],
            "career": career,
            "team_count": len(team_names),
            "stint_count": len(career),
            "current_team": career[-1]["team"] if career else None,
        })
    out.sort(key=lambda p: p["name"].lower())
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"players": out}, open(OUT, "w"), indent=None, separators=(",", ":"))
    print(f"Wrote {OUT}: {len(out)} players ({missing} missing raw profiles)")
    tc = [p["team_count"] for p in out]
    print(f"team_count: min={min(tc)} max={max(tc)} avg={sum(tc)/len(tc):.1f}")
    print(f"players with >=2 teams: {sum(1 for x in tc if x>=2)}")
    print(f"players with >=3 teams: {sum(1 for x in tc if x>=3)}")


if __name__ == "__main__":
    main()
