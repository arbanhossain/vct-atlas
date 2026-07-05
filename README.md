# VCT Atlas

A small collection of interactive visualizations of Valorant Champions Tour (VCT)
data, built from publicly available match and roster data on [vlr.gg](https://www.vlr.gg).

**Live:** https://vct-atlas.netlify.app

## Visualizations

| Page | What it shows |
|------|---------------|
| **Where Talent Comes From** (`site/talent-flow/`) | A Sankey linking every Tier‑1 VCT league player's nationality to the leagues they've played in — Americas, EMEA, Pacific, China (2023–2026). |
| **Players by Playstyle** (`site/player-galaxy/`) | A PCA of nine per‑map stats placing every VCT international player on a 2‑D map of playstyle. Roles separate on their own. Zoomable, with a min‑maps slider. |
| **Role Fit** (`site/role-fit/`) | For players who've played more than one role, how good they are at each — scored as a within‑role percentile so the roles compare fairly. |

Each page is a **self‑contained HTML file** (ECharts / Plotly and web fonts are inlined),
so the site is just static files.

## Repo layout

```
site/                      the deployable website (static HTML)
  index.html               landing page
  talent-flow/  player-galaxy/  role-fit/
scripts/                   the code that generates the pages
  build_galaxy.js          -> site/player-galaxy/index.html   (from data/galaxy_full.json)
  build_role_fit.js        -> site/role-fit/index.html        (from data/role_fit.json)
  make_sankey.py           -> site/talent-flow/index.html     (from data/vct_players.csv)
  build_agent_meta.js      agent-meta streamgraph (not published — see note below)
  build_atlas.py           produces the atlas_data aggregates (needs raw match data)
  galaxy_full.py           produces data/galaxy_full.json      (needs raw match data)
  rescrape.py              produces data/vct_players.csv        (scrapes vlr.gg live)
  assets/                  echarts.min.js, fonts-inline.css (inlined into pages)
  data/                    small processed inputs the page builders consume
```

## Rebuilding the pages

The three published pages regenerate from the committed inputs in `scripts/data/`,
no external data or network needed:

```bash
node   scripts/build_galaxy.js   site/player-galaxy/index.html
node   scripts/build_role_fit.js site/role-fit/index.html
python scripts/make_sankey.py    # writes site/talent-flow/index.html
```

## Data provenance

The **raw per‑event match data** and the **vlrggapi scraper** used to collect it are
intentionally **not** part of this repo — they live in a separate data workspace. What
is committed here is the website plus the small, already‑processed inputs in
`scripts/data/`. The `*.py` scripts that build those inputs (`galaxy_full.py`,
`rescrape.py`, `build_atlas.py`) are included for reference but require that external
raw data / live vlr.gg access to run.

> **agent-meta:** an "agent meta over time" streamgraph also exists
> (`scripts/build_agent_meta.js`) but is deliberately not part of the published site.

## Deploy

Static site, publish directory `site/` (see `netlify.toml`):

```bash
netlify deploy --prod --dir=site
```

## Disclaimer

Unofficial, fan‑made, for research and educational purposes. Not affiliated with,
endorsed by, or sponsored by Riot Games or vlr.gg. VALORANT and VALORANT Champions
Tour (VCT) are trademarks of Riot Games, Inc. All player, team and league names are
the property of their respective owners.
