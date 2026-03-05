# EV Mapping Technical Backend Notes

## Backend model

This project has a static frontend and a lightweight data-sync backend.

- Runtime app: static `index.html` + `app.js` + `styles.css`
- Backend process: periodic catalog generation script
- Backend outputs:
  - `data/car-presets.generated.json` (full fallback snapshot)
  - `data/catalog/catalog_manifest.json` (market manifest)
  - `data/catalog/markets/*.json` (split market slices)
  - `data/car-presets.generated.next.json` (canary fallback snapshot)
  - `data/catalog-next/catalog_manifest.json` (canary manifest)
  - `data/catalog-next/markets/*.json` (canary split slices)

There is no always-on API server required for core app functionality.

For a direct function/constant-to-behavior index, see:

- `docs/CODE_MAP.md`
- `docs/MARKET_CLUSTER_POLICY.md` (cluster rationale + external references)

## Data flow

1. User loads static app.
2. App loads catalog manifest, then lazily loads market slices relevant to detected country.
3. If split catalog is unavailable, app falls back to full generated JSON.
4. App merges loaded generated presets with built-in presets.
5. User computes reach; app calls public APIs client-side.
6. Optional backend job refreshes generated catalog periodically.

## Backend script

Script path:

- `scripts/sync_car_presets.py`

Responsibilities:

- Fetch US EV market data from `fueleconomy.gov`.
- Enrich US MSRP from `afdc.energy.gov`.
- Fetch India EV listing/spec+price data from `cardekho.com/electric-cars`.
- Fetch Australia EV listing/spec data from `greenvehicleguide.gov.au`.
- Ingest region-native seed sources:
  - `data/sources/eu-native.seed.json`
  - `data/sources/asean-native.seed.json`
  - `data/sources/jpkr-native.seed.json`
  - `data/sources/row-native.seed.json`
- Merge with manual regional presets from `data/car-presets.manual.json`.
- Expand deterministic regional market buckets for:
  - `US`, `CA`
  - `DE` (EU proxy), `TR`
  - `ZA`, `MA`, `EG`
  - `IN`, `LK`
  - `SG`, `TH`, `MY`, `ID`, `VN`, `PH`
  - `CN`, `JP`, `KR`
  - `AU`, `NZ`
- Normalize local-currency manual prices into `priceUsd`.
- Enforce seed freshness guard (`--max-seed-age-days`) so region-native source snapshots do not go stale silently.
- Validate generated output against anti-regression thresholds.
- Fall back to previous known-good catalog if fresh output is suspicious/degraded.
- Write normalized output to `data/car-presets.generated.json`.
- Emit split market files and a checksum manifest for frontend lazy-loading.

Validation script:

- `scripts/validate_car_catalog.py`
- `scripts/promote_catalog.py` (promotes validated canary outputs to stable)

## Fallback strategy

### Catalog sync fallback

- If one source fails (for example US, India, or Australia), remaining sources continue.
- If generated output fails guardrails, script preserves previous known-good catalog.
- During fallback mode, script still regenerates split market files/manifest from the known-good snapshot.
- If no valid catalog exists at all, script exits non-zero.

### Frontend/runtime fallbacks

- Overpass uses multiple endpoints + retries.
- Auto provider mode issues a fast parallel OpenChargeMap + Overpass fetch and deduplicates.
- Official profile falls back to curated source behavior.
- App now uses request timeouts (`fetchWithTimeout`) to avoid hanging.
- Reach circles render immediately while charger providers resolve, reducing perceived wait time.
- If charger fetch fails but prior nearby data exists, cached chargers are used.
- If no cached data exists, reach circles still render without pins with warning text.

## Unit tests

Test file:

- `tests/test_sync_car_presets.py`
- `tests/test_validate_car_catalog.py`

Covered:

- EV preset extraction logic
- Non-EV filtering
- Merge behavior (manual override precedence)
- Main flow fallback to manual when live sync fails
- Hard failure when no data sources exist

Run:

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```

## Deployment pattern

Recommended production setup:

1. Host static app on Vercel (or equivalent static host).
2. Run canary catalog sync every 12 hours via GitHub Actions/cron.
3. Validate canary integrity and anti-regression thresholds.
4. Promote canary to stable after passing checks.
5. Commit updated stable outputs (`data/car-presets.generated.json` + `data/catalog/*`) only when promotion checks pass.

This keeps runtime simple and resilient.

## Operational guardrails

- Keep `car-presets.manual.json` as a guaranteed minimum catalog.
- Keep `data/sources/*.seed.json` refreshed within configured freshness window (`--max-seed-age-days`).
- Keep `data/car-presets.generated.json` in git as last-known-good fallback.
- Keep `data/catalog/catalog_manifest.json` and `data/catalog/markets/*.json` in git for deterministic frontend loading.
- Monitor sync job logs for upstream API failures and fallback mode flags.
- Keep API caps conservative by default to avoid client-side latency spikes.
- Expect occasional public API rate limits and keep UX warnings explicit.

## Environment requirements

Minimal local/dev environment:

- Python 3.11+ (tested with Python 3.13)
- No Node.js build step required for core app

Optional CI environment:

- Python for tests + catalog sync
- Scheduler/cron support for periodic sync
