# EV Mapping

A lightweight web app that estimates EV reachability from your current battery status and plots nearby chargers on an OpenStreetMap map.

## What it does

- Accepts location + EV status (battery capacity, SOC, reserve, efficiency).
- Includes EV model presets that auto-fill battery and efficiency values.
- Includes an optional compare panel (up to 3 EVs) to benchmark reach and charger availability.
- Infers market from resolved location/GPS on the client and auto-selects a recommended model preset.
- Computes estimated one-way range and round-trip radius.
- Visualizes reachability rings on a map (`Reach`: one-way outer ring, round-trip inner ring).
- Uses pin markers for known charging stations inside your one-way reach zone.
- Supports verification profiles:
  - `Independent parties`: wider open-data coverage
  - `Official channels`: conservative reach estimate + official/provider-curated source preference
- Loads nearby charging points using:
  - OpenChargeMap API
  - OpenStreetMap Overpass API
  - Auto mode merges both sources and de-duplicates nearby duplicates
- Lets you click a charger and estimate road distance/time via OSRM routing.

## Stack

- Plain HTML/CSS/JavaScript (no build step)
- [Leaflet](https://leafletjs.com/) for map rendering
- [OpenStreetMap tiles](https://www.openstreetmap.org/)
- [Nominatim](https://nominatim.openstreetmap.org/) for geocoding
- [OpenChargeMap](https://openchargemap.org/) and [Overpass](https://overpass-api.de/)
- [OSRM demo server](https://project-osrm.org/) for routing

## Run locally

From the project directory:

```bash
python3 -m http.server 8080
```

Then open:

http://localhost:8080

## Deploy on Vercel

This project is a static site (no build step), and is configured for Vercel with `vercel.json`.

1. In Vercel, click **Add New Project** and import this GitHub repository.
2. Keep framework preset as **Other**.
3. Leave **Build Command** empty and set **Output Directory** to `.` (project root), if prompted.
4. Deploy.

For migration from Netlify:

1. Point your custom domain to Vercel in your DNS provider (remove old Netlify DNS records first).
2. Remove the site from Netlify once DNS is serving the Vercel deployment.

After this, pushes to `main` (including the scheduled catalog sync workflow commits) will auto-deploy on Vercel.

## Car Catalog Sync

The app auto-loads a split generated catalog:

- `data/catalog/catalog_manifest.json`
- `data/catalog/markets/<MARKET>.json` (per-market slices)
- fallback: `data/car-presets.generated.json` (single-file snapshot)
- canary channel:
  - `data/catalog-next/catalog_manifest.json`
  - `data/catalog-next/markets/<MARKET>.json`
  - fallback: `data/car-presets.generated.next.json`

At runtime it merges these with built-in presets and lazily loads relevant market slices based on resolved country.
Market detection and model auto-inference happen entirely client-side in the browser after location lookup.

Canary preview:

- add `?catalog=next` to URL to load canary catalog channel for smoke checks before promotion.

This lets you refresh market availability and pricing automatically instead of maintaining a static dropdown.

Generate/update catalog:

```bash
python3 scripts/sync_car_presets.py \
  --from-year 2025 \
  --to-year 2026 \
  --max-seed-age-days 60 \
  --bootstrap-market US \
  --bootstrap-market IN \
  --bootstrap-market DE \
  --bootstrap-market SG \
  --bootstrap-market CN \
  --bootstrap-market CA \
  --bootstrap-market AU \
  --min-market-preset US=300 \
  --min-market-preset IN=20 \
  --min-market-preset AU=20 \
  --min-market-preset DE=20 \
  --min-market-preset SG=12 \
  --min-market-preset CN=12
python3 scripts/validate_car_catalog.py \
  --catalog data/car-presets.generated.json \
  --manifest data/catalog/catalog_manifest.json \
  --require-manifest \
  --min-market-preset US=300 \
  --min-market-preset IN=20 \
  --min-market-preset AU=20 \
  --min-market-preset DE=20 \
  --min-market-preset SG=12 \
  --min-market-preset CN=12
```

If live API access is unavailable, the script still succeeds by falling back to the last known-good catalog and re-emits fresh split market files + manifest from that snapshot.
If a newly generated catalog looks degraded versus the previous snapshot, sync refuses publishing the degraded candidate.

Input sources:

- US market EV list/specs from `fueleconomy.gov` API
- US MSRP enrichment from `afdc.energy.gov`
- India EV listing/spec+price extraction from `cardekho.com/electric-cars`
- Australia EV listing/spec extraction from `greenvehicleguide.gov.au`
- Region-native maintained seed sources:
  - `data/sources/eu-native.seed.json`
  - `data/sources/asean-native.seed.json`
  - `data/sources/jpkr-native.seed.json`
  - `data/sources/row-native.seed.json` (Canada/Africa/ANZ)
- Manual regional overrides from `data/car-presets.manual.json` (including market-specific models and prices)
- Deterministic regional expansion into:
  - `US`, `CA`
  - `DE` (EU proxy), `TR`
  - `ZA`, `MA`, `EG`
  - `IN`, `LK`
  - `SG`, `TH`, `MY`, `ID`, `VN`, `PH`
  - `CN`, `JP`, `KR`
  - `AU`, `NZ`

Output:

- `data/car-presets.generated.json`
- `data/catalog/catalog_manifest.json`
- `data/catalog/markets/*.json`
- `data/car-presets.generated.next.json`
- `data/catalog-next/catalog_manifest.json`
- `data/catalog-next/markets/*.json`
- `data/sources/*.seed.json`

Guardrails included:

- schema + integrity validation (`scripts/validate_car_catalog.py`)
- split-file + checksum validation against manifest
- anti-regression checks against previous catalog snapshot
- seed freshness guardrail (`--max-seed-age-days`) to force periodic region-native source refresh
- per-market minimum count checks (`--min-market-preset`) for emerging-market resilience
- regional expansion across global market buckets with deterministic make/battery guardrails
- minimum preset count, market coverage, and price coverage checks in CI
- fallback-to-last-good behavior when live sources fail or become suspicious

## Notes

- Public APIs can rate-limit or vary in data freshness/coverage.
- Compute Reach is optimized to render reach circles first, then fill charger pins as providers return.
- `Max chargers fetched (API cap)` limits retrieval volume (higher values may be slower but improve coverage).
- In `Official channels` mode, the app avoids overpass-only community queries and prioritizes curated feeds.
- Range circles are estimates; actual drivable reach depends on terrain, weather, speed, and traffic.
- Route checks use OSRM road distance, which is more realistic than straight-line marker distance.

## Documentation

- User guide: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
- Technical backend notes: [`docs/TECHNICAL_BACKEND.md`](docs/TECHNICAL_BACKEND.md)
- Code-to-behavior map: [`docs/CODE_MAP.md`](docs/CODE_MAP.md)
- Market cluster policy + references: [`docs/MARKET_CLUSTER_POLICY.md`](docs/MARKET_CLUSTER_POLICY.md)

## Unit Tests

Run backend/catalog sync tests:

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```

## Ads (Single Map Footer Slot)

A single non-intrusive ad slot is placed below the map.

Files:

- `ads-config.js` (toggle + IDs)
- `ads.js` (runtime injection)
- `ads.txt` (publisher declaration template)

To enable ads:

1. Update `ads-config.js`:
   - set `enabled` to `true`
   - set `client` to your `ca-pub-...`
   - set `mapFooterSlot` to your ad slot ID
2. Replace placeholder publisher ID in `ads.txt`.

## Automated Catalog Refresh

Two GitHub Actions workflows implement canary -> promote:

- Canary sync: `.github/workflows/sync-car-presets.yml`
- Stable promotion: `.github/workflows/promote-car-presets.yml`

Canary workflow:

- runs every 12 hours and on manual trigger,
- regenerates `catalog-next` outputs,
- runs unit tests + validator,
- commits canary only when changed.

Promotion workflow:

- runs every 12 hours (offset from canary) and on manual trigger,
- validates canary again,
- promotes canary files to stable paths via `scripts/promote_catalog.py`,
- validates promoted stable catalog,
- commits stable only when changed.
