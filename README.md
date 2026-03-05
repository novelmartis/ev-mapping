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

After this, pushes to `main` (including the daily catalog sync workflow commits) will auto-deploy on Vercel.

## Car Catalog Sync

The app auto-loads `data/car-presets.generated.json` (if present) and merges it with built-in presets.
Market detection and model auto-inference happen entirely client-side in the browser after location lookup.

This lets you periodically refresh market availability instead of maintaining a static dropdown.

Generate/update catalog:

```bash
python3 scripts/sync_car_presets.py --from-year 2025 --to-year 2026
```

If live API access is unavailable, the script still succeeds using manual presets only.

Input sources:

- US market EV list from `fueleconomy.gov` API
- Manual overrides from `data/car-presets.manual.json` (for region-specific entries like Mahindra)

Output:

- `data/car-presets.generated.json`

## Notes

- Public APIs can rate-limit or vary in data freshness/coverage.
- `Max chargers fetched (API cap)` limits retrieval volume (higher values may be slower but improve coverage).
- In `Official channels` mode, the app avoids overpass-only community queries and prioritizes curated feeds.
- Range circles are estimates; actual drivable reach depends on terrain, weather, speed, and traffic.
- Route checks use OSRM road distance, which is more realistic than straight-line marker distance.

## Documentation

- User guide: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
- Technical backend notes: [`docs/TECHNICAL_BACKEND.md`](docs/TECHNICAL_BACKEND.md)

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

## Automated Daily Catalog Refresh

A GitHub Actions workflow is included at:

- `.github/workflows/sync-car-presets.yml`

It runs daily and on manual trigger, regenerates `data/car-presets.generated.json`, and commits only when:

- the file changed, and
- generated `count` is at least 50 (guard against fallback-only output).
