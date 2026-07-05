"""Build a standalone HTML Sankey: player country -> Tier 1 VCT league."""
import csv, collections, json, os

CSV = os.path.join(os.path.dirname(__file__), "data", "vct_players.csv")
OUT = os.environ.get(
    "SANKEY_OUT",
    os.path.join(os.path.dirname(__file__), "..", "site", "talent-flow", "index.html"),
)

NAMES = {
    "cn": "China", "kr": "South Korea", "us": "United States", "tr": "Turkey",
    "br": "Brazil", "tw": "Taiwan", "jp": "Japan", "ca": "Canada", "ru": "Russia",
    "id": "Indonesia", "ph": "Philippines", "pl": "Poland", "cl": "Chile",
    "lt": "Lithuania", "th": "Thailand", "sg": "Singapore", "fr": "France",
    "gb": "United Kingdom", "cz": "Czechia", "ar": "Argentina", "hk": "Hong Kong",
    "vn": "Vietnam", "fi": "Finland", "de": "Germany", "se": "Sweden",
    "un": "Unknown", "au": "Australia", "lv": "Latvia", "ee": "Estonia",
    "my": "Malaysia", "ua": "Ukraine", "kh": "Cambodia", "ma": "Morocco",
    "eg": "Egypt", "pt": "Portugal", "kz": "Kazakhstan", "kg": "Kyrgyzstan",
    "ro": "Romania", "it": "Italy", "co": "Colombia", "be": "Belgium",
    "mk": "North Macedonia", "do": "Dominican Rep.", "dk": "Denmark", "es": "Spain",
    "rs": "Serbia", "no": "Norway", "nl": "Netherlands", "md": "Moldova", "mx": "Mexico",
}
LEAGUE_COLOR = {
    "Americas": "#e15759", "Emea": "#4e79a7", "Pacific": "#59a14f", "China": "#edc948",
}
COUNTRY_NODE = "rgba(120,128,145,0.55)"
LEAGUE_LABEL = {"Americas": "VCT Americas", "Emea": "VCT EMEA",
                "Pacific": "VCT Pacific", "China": "VCT China"}


def flag(code):
    if code in ("un", "") or len(code) != 2:
        return "🏳️"
    return "".join(chr(0x1F1E6 + ord(c) - ord("a")) for c in code.lower())


def hex_to_rgba(h, a):
    h = h.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"rgba({r},{g},{b},{a})"


def main():
    rows = list(csv.DictReader(open(CSV)))
    flow = collections.Counter()          # (country, league) -> player count
    flow_players = collections.defaultdict(list)  # (country, league) -> [names]
    country_total = collections.Counter()   # flow-sum (node height): multi-region counted per league
    country_unique = collections.Counter()  # distinct players from a country (shown in the label)
    for r in rows:
        cc = r["country"] or "un"
        regions = [x for x in r["vct_regions"].split("|") if x]
        if regions:
            country_unique[cc] += 1
        for reg in regions:
            flow[(cc, reg)] += 1
            flow_players[(cc, reg)].append(r["player"])
            country_total[cc] += 1

    # Group countries with fewer than MIN players into "Other" (MIN=1 shows all).
    MIN = 1
    small = {c for c in country_total if country_total[c] < MIN}
    if small:
        for (c, lg), v in list(flow.items()):
            if c in small:
                flow[("other", lg)] += v
                flow_players[("other", lg)].extend(flow_players.pop((c, lg)))
                del flow[(c, lg)]
        country_total["other"] = sum(country_total[c] for c in small)
        for c in small:
            del country_total[c]
        NAMES["other"] = f"Other ({len(small)} countries)"

    # both columns sorted by size, descending (largest at top)
    countries = [c for c, _ in country_total.most_common()]
    league_total = {lg: sum(v for (cc, r), v in flow.items() if r == lg)
                    for lg in ("Americas", "Emea", "Pacific", "China")}
    # fixed top-to-bottom order
    leagues = ["China", "Pacific", "Americas", "Emea"]

    def stack_y(vals, lo=0.03, hi=0.985):
        """Value-proportional vertical centers so nodes stack in given order, no overlap."""
        total = sum(vals) or 1
        span = hi - lo
        ys, run = [], 0
        for v in vals:
            ys.append(lo + (run + v / 2) / total * span)
            run += v
        return ys

    # node index: countries then leagues
    idx = {}
    labels, node_colors, node_x, node_y = [], [], [], []
    cy = stack_y([country_total[c] for c in countries])
    for c, y in zip(countries, cy):
        idx[("c", c)] = len(labels)
        labels.append(f"{flag(c)} {NAMES.get(c, c.upper())} ({country_unique[c]})")
        node_colors.append(COUNTRY_NODE)
        node_x.append(0.001)
        node_y.append(y)
    ly = stack_y([league_total[lg] for lg in leagues])
    for lg, y in zip(leagues, ly):
        idx[("l", lg)] = len(labels)
        labels.append(f"{LEAGUE_LABEL[lg]} ({league_total[lg]})")
        node_colors.append(LEAGUE_COLOR[lg])
        node_x.append(0.999)
        node_y.append(y)

    src, tgt, val, link_colors, link_labels = [], [], [], [], []
    for (c, lg), v in sorted(flow.items(), key=lambda kv: -kv[1]):
        src.append(idx[("c", c)])
        tgt.append(idx[("l", lg)])
        val.append(v)
        link_colors.append(hex_to_rgba(LEAGUE_COLOR[lg], 0.38))
        names = sorted(flow_players[(c, lg)], key=str.lower)
        # wrap names 4 per line so long lists (e.g. China→China) stay readable
        wrapped = "<br>".join(", ".join(names[i:i + 4]) for i in range(0, len(names), 4))
        link_labels.append(
            f"<b>{flag(c)} {NAMES.get(c, c.upper())} → {LEAGUE_LABEL[lg]}</b> "
            f"· {v} player{'s' if v != 1 else ''}<br>"
            f"<span style='color:#5a606c'>{wrapped}</span>"
        )

    H = max(1000, len(countries) * 30 + 200)
    TOP, BOT, LMARGIN, RMARGIN = 108, 60, 175, 175

    # Labels are drawn as an HTML overlay (positioned from the real rendered node
    # rects, so alignment is exact). Countries with < SHOW_MIN players are not
    # labelled individually — their nodes/flows/hover stay, but the labels are
    # replaced by a single "Others" label. node_meta is in node (data) order.
    SHOW_MIN = 5
    node_meta = []
    for c in countries:
        node_meta.append({
            "side": "left", "show": country_unique[c] >= SHOW_MIN,
            "text": f"{flag(c)} {NAMES.get(c, c.upper())} ({country_unique[c]})",
            "color": "#3c4250", "weight": "400",
        })
    for lg in leagues:
        node_meta.append({
            "side": "right", "show": True,
            "text": f"{LEAGUE_LABEL[lg]} ({league_total[lg]})",
            "color": LEAGUE_COLOR[lg], "weight": "700",
        })
    others_count = sum(1 for c in countries if country_unique[c] < SHOW_MIN)
    others_text = f"Others ({others_count} countries)"

    fig = {
        "data": [{
            "type": "sankey",
            "arrangement": "fixed",
            "node": {
                "pad": 6, "thickness": 16,
                "line": {"color": "rgba(0,0,0,0.12)", "width": 0.5},
                "label": ["" for _ in labels], "customdata": labels, "color": node_colors,
                "x": node_x, "y": node_y,
                "hovertemplate": "%{customdata}<extra></extra>",
            },
            "link": {
                "source": src, "target": tgt, "value": val,
                "color": link_colors, "customdata": link_labels,
                "hovertemplate": "%{customdata}<extra></extra>",
                "hoverlabel": {"bgcolor": "#ffffff", "bordercolor": "#d0d4dc",
                               "font": {"color": "#1f2430", "size": 12}},
            },
        }],
        "layout": {
            "title": {"text": "Where VCT Tier&nbsp;1 Talent Comes From",
                      "font": {"family": "'Playfair Display', Georgia, serif", "size": 30, "color": "#1a1f2b"},
                      "x": 0.5, "xanchor": "center", "y": 1, "yanchor": "top", "pad": {"t": 22}},
            "font": {"family": "'Inter', system-ui, sans-serif", "size": 13, "color": "#3c4250"},
            "paper_bgcolor": "#ffffff", "plot_bgcolor": "#ffffff",
            "height": H,
            "margin": {"l": LMARGIN, "r": RMARGIN, "t": TOP, "b": BOT},
            "annotations": [{
                "showarrow": False, "x": 0.5, "y": 1, "xref": "paper", "yref": "paper",
                "xanchor": "center", "yanchor": "bottom", "yshift": 14,
                "font": {"family": "'Inter', system-ui, sans-serif", "size": 14, "color": "#7a828f"},
                "text": "Player nationality → every league they’ve played in&nbsp;&nbsp;·&nbsp;&nbsp;2023–2026",
            }, {
                "showarrow": False, "x": 0, "y": -0.035, "xref": "paper", "yref": "paper",
                "xanchor": "left", "font": {"size": 11, "color": "#8a909c"},
                "text": ("Flow = number of players from a country rostered in that league. "
                         "Multi-region players are counted once per league. "
                         f"{len(rows)} players · {len(countries)} countries · source: vlr.gg"),
            }],
        },
    }

    n_players = len(rows)
    n_events = 35
    collected = "July 2026"

    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VCT Talent Atlas — Country → League</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js" charset="utf-8"></script>
<style>
  html,body{{margin:0;background:#ffffff;color:#3c4250;
    font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
  #wrap{{position:relative;max-width:1200px;margin:0 auto}}
  #chart{{width:100%}}
  .sankey-label{{position:absolute;font-size:11.5px;font-weight:500;letter-spacing:.01em;
    line-height:1.1;white-space:nowrap;transform:translateY(-50%);pointer-events:none}}
  .sankey-label.left{{text-align:right}}
  .sankey-label.right{{text-align:left;font-size:13.5px;font-weight:600;letter-spacing:.02em}}
  .sankey-label.others{{font-style:italic;font-weight:400;color:#98a0ad}}
  footer#disclaimer{{max-width:960px;margin:0 auto 56px;padding:22px 26px 0;
    border-top:1px solid #e6e8ec;font-size:12.5px;line-height:1.65;color:#6b7280}}
  footer#disclaimer h2{{font-family:'Playfair Display',Georgia,serif;font-weight:700;
    font-size:17px;color:#1a1f2b;margin:0 0 10px}}
  footer#disclaimer p{{margin:0 0 9px}}
  footer#disclaimer strong{{color:#3c4250;font-weight:600}}
  footer#disclaimer a{{color:#4e79a7;text-decoration:none}}
  footer#disclaimer a:hover{{text-decoration:underline}}
</style></head>
<body><div id="wrap"><div id="chart"></div><div id="labels"></div></div>
<footer id="disclaimer">
  <h2>About this data</h2>
  <p><strong>What this shows.</strong> Every player rostered in a Tier&nbsp;1 VCT international
  league — VCT Americas, EMEA, Pacific and China — across the 2023–2026 seasons (Kickoff,
  Stage&nbsp;1 and Stage&nbsp;2), spanning {n_players} players across {n_events} league events.
  A ribbon links a player's nationality to a league if they were rostered on one of that
  league's teams. Players who competed in more than one region are counted once per league,
  so the league totals add up to more than the number of unique players.</p>
  <p><strong>Source.</strong> Compiled from publicly available match and roster data on
  <a href="https://www.vlr.gg" target="_blank" rel="noopener">vlr.gg</a>. Player nationalities,
  handles and teams reflect vlr.gg profiles at the time of collection ({collected}) and may
  since have changed.</p>
  <p><strong>Disclaimer.</strong> This is an unofficial, fan-made visualization created for
  research and educational purposes. It is not affiliated with, endorsed by, or sponsored by
  Riot Games or vlr.gg. VALORANT and VALORANT Champions Tour (VCT) are trademarks of
  Riot&nbsp;Games,&nbsp;Inc. All player, team and league names are the property of their
  respective owners.</p>
</footer>
<script>
  const fig = {json.dumps(fig)};
  const nodeMeta = {json.dumps(node_meta)};
  const othersText = {json.dumps(others_text)};
  const GAP = 8;

  Plotly.newPlot("chart", fig.data, fig.layout, {{responsive:true, displayModeBar:false}})
    .then(placeLabels);

  function placeLabels() {{
    const wrap = document.getElementById("wrap");
    const box = document.getElementById("labels");
    box.innerHTML = "";
    const wb = wrap.getBoundingClientRect();
    const rects = [...document.querySelectorAll(
      "g.sankey g.node-rect, g.sankey rect.node-rect, .sankey .node rect")];
    if (rects.length !== nodeMeta.length) return;

    let leftX = Infinity, rightX = 0, smallTop = Infinity, smallBot = -Infinity;
    rects.forEach((r, i) => {{
      const b = r.getBoundingClientRect();
      const m = nodeMeta[i];
      if (m.side === "left") leftX = Math.min(leftX, b.left - wb.left);
      else rightX = Math.max(rightX, b.right - wb.left);
    }});

    const add = (cls, text, color, weight, x, cy, anchorRight) => {{
      const d = document.createElement("div");
      d.className = "sankey-label " + cls;
      d.textContent = text;
      if (color) d.style.color = color;
      if (weight) d.style.fontWeight = weight;
      d.style.top = cy + "px";
      if (anchorRight) {{ d.style.left = "0px"; d.style.width = x + "px"; }}
      else d.style.left = x + "px";
      box.appendChild(d);
    }};

    rects.forEach((r, i) => {{
      const b = r.getBoundingClientRect();
      const m = nodeMeta[i];
      const cy = b.top - wb.top + b.height / 2;
      if (m.side === "left") {{
        if (m.show) add("left", m.text, m.color, m.weight, leftX - GAP, cy, true);
        else {{ smallTop = Math.min(smallTop, b.top - wb.top);
                smallBot = Math.max(smallBot, b.bottom - wb.top); }}
      }} else {{
        add("right", m.text, m.color, m.weight, rightX + GAP, cy, false);
      }}
    }});
    if (smallBot > 0) add("left others", othersText, null, null,
                          leftX - GAP, (smallTop + smallBot) / 2, true);
  }}

  let t; window.addEventListener("resize", () => {{ clearTimeout(t);
    t = setTimeout(placeLabels, 150); }});
</script></body></html>"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w").write(html)
    print(f"Wrote {OUT}")
    print(f"{len(rows)} players, {len(countries)} countries, {len(val)} flows")
    print("Top flows:")
    for (c, lg), v in sorted(flow.items(), key=lambda kv: -kv[1])[:8]:
        print(f"  {NAMES.get(c,c):<14} -> {LEAGUE_LABEL[lg]:<14} {v}")


if __name__ == "__main__":
    main()
