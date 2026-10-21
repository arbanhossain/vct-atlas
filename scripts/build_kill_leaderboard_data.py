#!/usr/bin/env python3
"""Build the all-time international kill leaderboard from raw VLR match JSON."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

DEFAULT_ROOT = Path("/home/liquidicalpants/projects/vlrgg")
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "data" / "kill_leaderboard.json"
EVENT_FOLDER = re.compile(r"^(\d+)-")


def parse_date(value: str) -> datetime:
    if not value:
        return datetime.min
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def build(root: Path) -> dict:
    players: dict[str, dict] = {}
    event_ids: set[str] = set()
    match_count = 0

    folders = sorted(
        (path for path in root.iterdir() if path.is_dir() and EVENT_FOLDER.match(path.name)),
        key=lambda path: int(EVENT_FOLDER.match(path.name).group(1)),
    )
    for folder in folders:
        event_file = folder / "event.json"
        if not event_file.exists():
            continue
        event_info = json.loads(event_file.read_text(encoding="utf-8"))
        folder_event_id = str(event_info.get("id") or EVENT_FOLDER.match(folder.name).group(1))
        folder_title = event_info.get("title", "")

        for match_file in sorted(folder.glob("*.json")):
            if match_file.name == "event.json":
                continue
            match = json.loads(match_file.read_text(encoding="utf-8"))
            teams = match.get("teams") or []
            maps = match.get("data") or []
            if len(teams) < 2 or not maps:
                continue

            event = match.get("event") or {}
            event_id = str(event.get("id") or folder_event_id)
            event_title = event.get("series") or folder_title
            date = event.get("date") or ""
            team1 = teams[0].get("name", "")
            team2 = teams[1].get("name", "")
            match_id = match_file.stem
            per_match: dict[str, dict] = {}

            for game in maps:
                for member in game.get("members") or []:
                    name = str(member.get("name") or "").strip()
                    player_id = str(member.get("id") or "").strip()
                    if not name:
                        continue
                    key = player_id or "name:" + name.casefold()
                    row = per_match.setdefault(key, {"id": player_id, "name": name, "kills": 0, "maps": 0})
                    row["name"] = name
                    row["kills"] += int(member.get("kills") or 0)
                    row["maps"] += 1

            for key, row in per_match.items():
                # Exhibition pages sometimes contain placeholder participants with a
                # zero-stat row. They did not record a kill and do not belong in this
                # leaderboard or its match drilldown.
                if row["kills"] <= 0:
                    continue
                player = players.setdefault(key, {
                    "id": row["id"], "name": row["name"], "kills": 0,
                    "maps": 0, "matches": [],
                })
                player["name"] = row["name"]
                player["kills"] += row["kills"]
                player["maps"] += row["maps"]
                player["matches"].append({
                    "id": match_id,
                    "date": date,
                    "event_id": event_id,
                    "event": event_title,
                    "stage": event.get("stage") or "",
                    "team1": team1,
                    "team2": team2,
                    "kills": row["kills"],
                    "maps": row["maps"],
                })

            event_ids.add(event_id)
            match_count += 1

    output_players = []
    for player in players.values():
        player["matches"].sort(key=lambda row: (parse_date(row["date"]), int(row["id"])), reverse=True)
        output_players.append(player)
    output_players.sort(key=lambda row: (-row["kills"], row["name"].casefold(), row["id"]))

    dates = [row["date"] for player in output_players for row in player["matches"] if row["date"]]
    return {
        "meta": {
            "events": len(event_ids),
            "matches": match_count,
            "players": len(output_players),
            "kills": sum(player["kills"] for player in output_players),
            "first_date": min(dates) if dates else "",
            "last_date": max(dates) if dates else "",
        },
        "players": output_players,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="raw VCT data workspace")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    payload = build(args.root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    meta = payload["meta"]
    print(f'{meta["players"]} players | {meta["matches"]} matches | {meta["events"]} events | {meta["kills"]} kills')
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
