# EV Mapping Technical Backend Notes

## Backend model

This project has a static frontend and a lightweight data-sync backend.

- Runtime app: static `index.html` + `app.js` + `styles.css`
- Backend process: periodic catalog generation script
- Backend output: `data/car-presets.generated.json`

There is no always-on API server required for core app functionality.

## Data flow

1. User loads static app.
2. App loads generated catalog JSON (if present), merges with built-in presets.
3. User computes reach; app calls public APIs client-side.
4. Optional backend job refreshes generated catalog periodically.

## Backend script

Script path:

- `/Users/sushrutthorat/Documents/ev-mapping/scripts/sync_car_presets.py`

Responsibilities:

- Fetch US EV market data from `fueleconomy.gov`.
- Merge with manual presets from `data/car-presets.manual.json`.
- Write normalized output to `data/car-presets.generated.json`.

## Fallback strategy

### Catalog sync fallback

- If live market sync fails, script falls back to manual presets.
- If both live + manual are empty, script exits non-zero.

### Frontend/runtime fallbacks

- Overpass uses multiple endpoints + retries.
- Auto provider mode merges OpenChargeMap + Overpass and deduplicates.
- Official profile falls back to curated source behavior.
- App now uses request timeouts (`fetchWithTimeout`) to avoid hanging.
- If charger fetch fails but prior nearby data exists, cached chargers are used.
- If no cached data exists, reach circles still render without pins with warning text.

## Unit tests

Test file:

- `/Users/sushrutthorat/Documents/ev-mapping/tests/test_sync_car_presets.py`

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

1. Host static app on Netlify/Vercel/S3+CloudFront/GitHub Pages.
2. Run catalog sync daily via GitHub Actions/cron.
3. Commit or publish updated `data/car-presets.generated.json`.

This keeps runtime simple and resilient.

## Operational guardrails

- Keep `car-presets.manual.json` as a guaranteed minimum catalog.
- Monitor sync job logs for upstream API failures.
- Keep API caps conservative by default to avoid client-side latency spikes.
- Expect occasional public API rate limits and keep UX warnings explicit.

## Environment requirements

Minimal local/dev environment:

- Python 3.11+ (tested with Python 3.13)
- No Node.js build step required for core app

Optional CI environment:

- Python for tests + catalog sync
- Scheduler/cron support for periodic sync
