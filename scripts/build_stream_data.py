#!/usr/bin/env python3
"""Build stream.json for the agent-meta chart from international match data."""
import glob
import json
import os
import re
from collections import defaultdict

ROOT = "/home/liquidicalpants/projects/vlrgg"
OUT = os.path.join(os.path.dirname(__file__), "data", "stream.json")
MONTHS = {month: index for index, month in enumerate(
          ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
ROLE_AGENTS = {
    "Duelist": ["Jett", "Raze", "Yoru", "Neon", "Phoenix", "Reyna", "Iso", "Waylay"],
    "Controller": ["Omen", "Viper", "Astra", "Brimstone", "Harbor", "Clove"],
    "Initiator": ["Sova", "Skye", "Fade", "Kayo", "Breach", "Gekko", "Tejo"],
    "Sentinel": ["Killjoy", "Cypher", "Chamber", "Sage", "Vyse", "Deadlock"],
}
ROLE_OF = {agent: role for role, agents in ROLE_AGENTS.items() for agent in agents}
ROLE_ORDER = {role: index for index, role in enumerate(ROLE_AGENTS)}


def parse_date(dates):
    year = re.search(r"(\d{4})", dates or "")
    month = re.search(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b", dates or "")
    return int(year.group(1)) if year else 0, MONTHS[month.group(1)] if month else 1


def short_label(title, year):
    label = title.replace("Valorant ", "")
    label = re.sub(r"Champions Tour (Stage \d: |20\d\d: )", "", label)
    label = re.sub(r"\s*20\d\d", "", label).strip()
    return f"{label} '{str(year)[2:]}"


def main():
    source_events = []
    for event_file in glob.glob(os.path.join(ROOT, "*", "event.json")):
        with open(event_file, encoding="utf-8") as fh:
            event = json.load(fh)
        folder = os.path.dirname(event_file)
        matches = [path for path in glob.glob(os.path.join(folder, "*.json")) if not path.endswith("event.json")]
        if not matches:
            continue
        year, month = parse_date(event.get("dates", ""))
        source_events.append((year, month, event, matches))
    source_events.sort(key=lambda item: (item[0], item[1]))

    events = []
    counts = defaultdict(lambda: defaultdict(int))
    totals = defaultdict(int)
    for event_index, (year, month, event, matches) in enumerate(source_events):
        title = event.get("title", "")
        events.append({"id": str(event.get("id")), "title": title,
                       "short": short_label(title, year), "year": year,
                       "date": f"{year}-{month:02d}-01"})
        for match_file in matches:
            with open(match_file, encoding="utf-8") as fh:
                match = json.load(fh)
            for game in match.get("data", []) or []:
                for member in game.get("members", []) or []:
                    totals[event_index] += 1
                    for agent in member.get("agents", []) or []:
                        title = agent.get("title")
                        if title in ROLE_OF:
                            counts[event_index][title] += 1

    agents = sorted({agent for event in counts.values() for agent in event},
                    key=lambda agent: (ROLE_ORDER[ROLE_OF[agent]], agent))
    data = []
    for agent in agents:
        for event_index, event in enumerate(events):
            data.append([event["date"], round(100 * counts[event_index].get(agent, 0) /
                                                   (totals[event_index] or 1), 2), agent])

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"data": data, "roleOf": {agent: ROLE_OF[agent] for agent in agents},
                   "events": events}, fh, ensure_ascii=False)
    print(f"events: {len(events)} | agents: {len(agents)} | wrote {OUT}")


if __name__ == "__main__":
    main()
