# Market Cluster Policy

This project uses deterministic market clusters for catalog routing in `app.js` and precompute expansion in `scripts/sync_car_presets.py`.

## Why clusters exist

No single global official API publishes trim-complete EV specs + regional on-sale status for all countries.
So the app uses a documented proxy strategy:

1. Prefer direct country market slice where available (`US`, `IN`, `CA`, etc.)
2. Else use cluster proxy markets (`MARKET_PROXY_BY_CLUSTER`)
3. Else use cross-market fallback

## Official references used for grouping direction

- Global EV reporting regions: IEA Global EV Outlook (`China`, `Europe`, `United States`, rest of world)
  - https://www.iea.org/reports/global-ev-outlook-2025/trends-in-electric-cars
- North America trade bloc baseline: USMCA parties (`United States`, `Mexico`, `Canada`)
  - https://ustr.gov/trade-agreements/free-trade-agreements/united-states-mexico-canada-agreement
- Europe scope baseline: EU member states + EFTA members + UK market usage in auto reporting
  - https://european-union.europa.eu/principles-countries-history/country-profiles_en
  - https://www.efta.int/about-efta/the-efta-states
- ASEAN baseline for Southeast Asia routing
  - https://www.asean.org/member-states/
- RCEP / East Asia context for `CN`, `JP`, `KR` + ASEAN adjacency
  - https://www.dfat.gov.au/trade/agreements/in-force/rcep/regional-comprehensive-economic-partnership
- Africa continental trade context (for `ZA`, `MA`, `EG` proxy routing)
  - https://au-afcfta.org/state-parties/

## Current runtime cluster intent

- `NA`: USMCA-oriented North America (`US`, `CA` direct; `MX` uses proxy)
- `EU`: Europe corridor (`DE` proxy + `TR` adjacency)
- `SA`: South Asia (`IN`, `LK`)
- `SEA`: ASEAN-oriented Southeast Asia (`SG`, `TH`, `MY`, `ID`, `VN`, `PH`)
- `EA`: East Asia (`CN`, `JP`, `KR`)
- `MEA`: Africa/Middle East routing with Africa proxy markets (`ZA`, `MA`, `EG`)
- `OC`: Australia/New Zealand (`AU`, `NZ`)

## Important constraint

These are routing clusters, not legal sales guarantees. Individual model availability is inferred via deterministic make/battery filters in `REGIONAL_MARKET_EXPANSION_RULES` and should be treated as catalog heuristics until direct market feeds are available.

## Region-native source maintenance

Region-native ingestion is now backed by maintained seed feeds:

- `data/sources/eu-native.seed.json`
- `data/sources/asean-native.seed.json`
- `data/sources/jpkr-native.seed.json`
- `data/sources/row-native.seed.json`

Sync enforces `--max-seed-age-days` (default `60`). If seed snapshots age past that threshold, publish fails to force source refresh.
