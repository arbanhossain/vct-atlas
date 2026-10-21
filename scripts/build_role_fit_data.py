#!/usr/bin/env python3
"""Build role_fit.json from the raw international-event match data."""
import glob
import json
import os
import sys
from collections import defaultdict

ROOT = "/home/liquidicalpants/projects/vlrgg"
OUT = os.path.join(os.path.dirname(__file__), "data", "role_fit.json")

ROLE_AGENTS = {
    "duelist": ["Jett", "Raze", "Yoru", "Neon", "Phoenix", "Reyna", "Iso", "Waylay"],
    "controller": ["Omen", "Viper", "Astra", "Brimstone", "Harbor", "Clove"],
    "initiator": ["Sova", "Skye", "Fade", "Kayo", "Breach", "Gekko", "Tejo"],
    "sentinel": ["Killjoy", "Cypher", "Chamber", "Sage", "Vyse", "Deadlock"],
}
AGENT_ROLE = {agent: role for role, agents in ROLE_AGENTS.items() for agent in agents}
POOL_MIN = 10
DISPLAY_MIN = 5


def main(output: str) -> None:
    # player -> role -> [maps, rating sum, ACS sum]
    stats = defaultdict(lambda: defaultdict(lambda: [0, 0.0, 0.0]))
    names = {}

    for event_file in glob.glob(os.path.join(ROOT, "*", "event.json")):
        folder = os.path.dirname(event_file)
        for match_file in glob.glob(os.path.join(folder, "*.json")):
            if match_file.endswith("event.json"):
                continue
            with open(match_file, encoding="utf-8") as fh:
                match = json.load(fh)
            for game in match.get("data", []) or []:
                for member in game.get("members", []) or []:
                    player_id = str(member.get("id") or "")
                    agents = member.get("agents", []) or []
                    if not player_id or len(agents) != 1:
                        continue
                    role = AGENT_ROLE.get(agents[0].get("title"))
                    if not role:
                        continue
                    names[player_id] = member.get("name", "")
                    row = stats[player_id][role]
                    row[0] += 1
                    row[1] += member.get("rating") or 0
                    row[2] += member.get("acs") or 0

    pools = {}
    for role in ROLE_AGENTS:
        pools[role] = sorted(
            values[1] / values[0]
            for player_roles in stats.values()
            for candidate_role, values in player_roles.items()
            if candidate_role == role and values[0] >= POOL_MIN
        )

    def percentile(role: str, rating: float) -> float:
        pool = pools[role]
        return round(100 * sum(value <= rating for value in pool) / len(pool), 1)

    players = []
    for player_id, player_roles in stats.items():
        eligible = [(role, values) for role, values in player_roles.items() if values[0] >= DISPLAY_MIN]
        if len(eligible) < 2:
            continue
        eligible.sort(key=lambda item: -item[1][0])
        roles = []
        for role, (maps, rating_sum, acs_sum) in eligible:
            rating = rating_sum / maps
            roles.append({
                "role": role,
                "maps": maps,
                "rating": round(rating, 2),
                "acs": round(acs_sum / maps),
                "pct": percentile(role, rating),
            })
        players.append({"n": names[player_id], "primary": eligible[0][0], "roles": roles})

    players.sort(key=lambda player: -max(role["pct"] for role in player["roles"]))
    with open(output, "w", encoding="utf-8") as fh:
        json.dump({"players": players, "poolMin": POOL_MIN}, fh, ensure_ascii=False)
    print(f"players: {len(players)} | pool minimum: {POOL_MIN} maps | wrote {output}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else OUT)
