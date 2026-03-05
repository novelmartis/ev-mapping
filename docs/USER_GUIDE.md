# EV Mapping User Guide

## What this app is for

EV Mapping helps you answer one core question quickly:

- How far can I go from here with this EV?

It is optimized for:

- Drivers planning short/medium trips
- Buyers comparing EV capability before purchase
- Enthusiasts benchmarking practical reach across cars

## Quick Start (recommended flow)

1. Open the app.
2. Select your `EV model`.
3. Set your `Start location`:
   - Type at least 2 letters and pick a suggestion from the dropdown, or
   - Click `Use my GPS`.
4. Click `Compute Reach`.

Defaults are tuned for quick checks:

- `Current charge`: 100%
- Range map shows both one-way (outer) and round-trip (inner) reach
- Chargers displayed as simple pins with reachability labels (round-trip, one-way, or outside one-way)

Location tip:

- Selecting a suggestion immediately locks city/country context and speeds up market detection.

## Reading the map

- `Reach` legend:
- Green inner circle: round-trip reachable zone
- Orange outer circle: one-way reachable zone
- Charger pins: known charging stations within one-way reach

Click any pin to view details and estimated road distance.

UI shortcut:

- Clicking `EV Mapping` in the top-left performs a hard refresh of the page.

## Advanced Settings

Use this only when needed:

- Battery capacity (kWh)
- Current charge (%)
- Consumption (kWh/100 km)
- Reserve battery (%)
- Data source (`Auto`, `OpenChargeMap`, `Overpass`)
- Verification profile (`Independent parties` or `Official channels`)
- Max chargers fetched (API cap)

Compact `Summary` appears inside Advanced for a low-noise view.

## Car Comparison (optional)

1. Expand `Car Comparison`.
2. Select up to 3 cars.
3. Click `Compare Cars`.

What happens:

- Comparison table is shown inside the comparison section.
- The map updates to the best compared car by highest one-way reach.
- This keeps the right-side map actionable while comparison stays secondary.

## Data quality expectations

- Charger data comes from open/public APIs and coverage varies by location.
- If providers are slow/down, the app still renders reach circles and shows warnings.
- If a previous successful fetch exists nearby, cached chargers may be shown as fallback.
- If no chargers are inside one-way reach, the app may show nearest nearby chargers for context.

## Market behavior

- If your country has direct market catalog coverage (for example `US`, `IN`, `CA`, `DE`, `SG`, `CN`), the EV dropdown shows that market's models.
- If your country does not have direct catalog coverage yet, the app uses a proxy market strategy and labels it in the market hint text.
- Proxy selection is cluster-based (USMCA, Europe corridor, ASEAN, East Asia, South Asia, Africa/Middle-East, ANZ) for predictable global behavior.

## Tips for better results

- Use a precise start point (full address or landmark).
- Increase `Max chargers fetched` in dense cities.
- Use `Independent parties` for wider station coverage.
- Use `Official channels` for conservative estimates.

## Known limits

- Reach is an estimate, not a guarantee.
- Real-world range varies with speed, terrain, weather, traffic, and driving style.
- Public APIs can rate-limit or temporarily fail.

## Canary catalog (optional)

- For pre-release catalog checks, open the app with `?catalog=next` in the URL.
- This loads the canary market catalog channel before it is promoted to stable.
