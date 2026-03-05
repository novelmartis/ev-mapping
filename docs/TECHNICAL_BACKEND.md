# EV Mapping Technical Backend Notes

## Backend model

This project has a static frontend and a lightweight data-sync backend.

- Runtime app: static `index.html` + `app.js` + `styles.css`
- Backend process: periodic catalog generation script
- Backend output: `data/car-presets.generated.json`

There is no always-on API server required for core app functionality.

For a direct function/constant-to-behavior index, see:

- `docs/CODE_MAP.md`

## Data flow

1. User loads static app.
2. App loads generated catalog JSON (if present), merges with built-in presets.
3. User computes reach; app calls public APIs client-side.
4. Optional backend job refreshes generated catalog periodically.

## Backend script

Script path:

- `scripts/sync_car_presets.py`

Responsibilities:

- Fetch US EV market data from `fueleconomy.gov`.
- Enrich US MSRP from `afdc.energy.gov`.
- Fetch India EV listing/spec+price data from `cardekho.com/electric-cars`.
- Merge with manual regional presets from `data/car-presets.manual.json`.
- Normalize local-currency manual prices into `priceUsd`.
- Validate generated output against anti-regression thresholds.
- Fall back to previous known-good catalog if fresh output is suspicious/degraded.
- Write normalized output to `data/car-presets.generated.json`.

Validation script:

- `scripts/validate_car_catalog.py`

## Fallback strategy

### Catalog sync fallback

- If one source fails (for example US or India), remaining sources continue.
- If generated output fails guardrails, script preserves previous known-good catalog.
- If no valid catalog exists at all, script exits non-zero.

### Frontend/runtime fallbacks

- Overpass uses multiple endpoints + retries.
- Auto provider mode merges OpenChargeMap + Overpass and deduplicates.
- Official profile falls back to curated source behavior.
- App now uses request timeouts (`fetchWithTimeout`) to avoid hanging.
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
2. Run catalog sync every 12 hours via GitHub Actions/cron.
3. Validate catalog integrity and anti-regression thresholds before publish.
4. Commit updated `data/car-presets.generated.json` only when checks pass.

This keeps runtime simple and resilient.

## Operational guardrails

- Keep `car-presets.manual.json` as a guaranteed minimum catalog.
- Keep `data/car-presets.generated.json` in git as last-known-good fallback.
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
