# EV Mapping Code Map (One-to-One)

This document maps runtime behavior directly to the exact code symbols/files.

## 1) Entry Points

- App shell/UI markup:
  - `index.html`
- Runtime logic:
  - `app.js`
- UI styling:
  - `styles.css`
- Offline/cache behavior:
  - `sw.js`
- Generated catalog data:
  - `data/car-presets.generated.json`
  - `data/catalog/catalog_manifest.json`
  - `data/catalog/markets/*.json`
  - `data/car-presets.generated.next.json`
  - `data/catalog-next/catalog_manifest.json`
  - `data/catalog-next/markets/*.json`
  - `data/sources/*.seed.json`
- Catalog generation pipeline:
  - `scripts/sync_car_presets.py`
  - `scripts/validate_car_catalog.py`
  - `scripts/promote_catalog.py`

## 2) City -> Country -> Market Classification

### 2.1 Country detection from typed city/GPS

- Forward geocode (typed input):
  - `resolveOrigin(locationQuery)` in `app.js`
- Reverse geocode (GPS):
  - `reverseGeocodePlace(lat, lon)` in `app.js`
- Apply detected country to market state:
  - `inferAndApplyMarket(origin)` in `app.js`

### 2.2 Classification constants

- Primary market labels:
  - `MARKET_LABELS` in `app.js`
- Cluster assignment by country:
  - `MARKET_CLUSTER_BY_COUNTRY` in `app.js`
- Cluster human labels:
  - `MARKET_CLUSTER_LABELS` in `app.js`
- Cluster -> proxy market priority:
  - `MARKET_PROXY_BY_CLUSTER` in `app.js`
- Current dedicated runtime market buckets include:
  - `US`, `CA`
  - `DE`, `TR`
  - `ZA`, `MA`, `EG`
  - `IN`, `LK`
  - `SG`, `TH`, `MY`, `ID`, `VN`, `PH`
  - `CN`, `JP`, `KR`
  - `AU`, `NZ`

### 2.3 Classification helper functions

- Country -> cluster:
  - `marketClusterForCountry(code)` in `app.js`
- Market counts from loaded catalog:
  - `marketCountsByCode(presets)` in `app.js`
- Pick proxy market codes by cluster (up to `MAX_PROXY_MARKET_CODES`):
  - `proxyMarketCodesForCountry(code, counts)` in `app.js`

### 2.4 Car list selection behavior

- Main filtering logic:
  - `visiblePresetsForCurrentMarket(sortedPresets)` in `app.js`
- Exact match path:
  - If `markets[]` contains detected country code, show only that market.
- Proxy path:
  - For countries without exact market entries, use cluster proxy market list.
- Final fallback:
  - If no proxy is usable, show cross-market list.
- Recommended auto-selected model:
  - `findRecommendedPresetIdForMarket()` in `app.js`

## 3) Predictive Location Dropdown

### 3.1 UI elements

- Input:
  - `#location` in `index.html`
- Suggestions list:
  - `#location-suggestions` in `index.html`
- Status hint text:
  - `#location-selection-hint` in `index.html`

### 3.2 Runtime state and constants

- Suggestion behavior tuning:
  - `LOCATION_SUGGEST_MIN_CHARS`
  - `LOCATION_SUGGEST_LIMIT`
  - `LOCATION_SUGGEST_DEBOUNCE_MS`
  - `LOCATION_SUGGEST_TIMEOUT_MS`
  - in `app.js`
- Suggestion state:
  - `locationSuggestions`
  - `activeLocationSuggestionIndex`
  - `locationSuggestTimer`
  - `locationSuggestionRequestToken`
  - in `state` object in `app.js`

### 3.3 Suggestion workflow functions

- Debounced trigger:
  - `scheduleLocationSuggestions(query, immediate)` in `app.js`
- Fetch live suggestions:
  - `fetchLiveLocationSuggestions(query, requestToken)` in `app.js`
- Merge recent + live suggestions:
  - `mergeLocationSuggestions(recent, live)` in `app.js`
- Render dropdown:
  - `renderLocationSuggestions(items)` in `app.js`
- Apply selected suggestion:
  - `applyLocationSuggestion(suggestion)` in `app.js`

### 3.4 Keyboard/mouse interactions

- Input handlers:
  - `onLocationInputFocus`
  - `onLocationInputBlur`
  - `onLocationInputChanged`
  - `onLocationInputKeydown`
  - in `app.js`
- Suggestion click handler:
  - `onLocationSuggestionPointerDown` in `app.js`
- Event registration:
  - `wireEvents()` in `app.js`

### 3.5 Styling and stacking

- Autocomplete container and list:
  - `.location-autocomplete`
  - `.location-suggestions`
  - `.location-suggestion-btn`
  - in `styles.css`
- Layering to keep dropdown above Advanced panel:
  - `.quick-card` / `.advanced-panel` / `.location-autocomplete` z-index rules in `styles.css`

## 4) Catalog Loading, Merge, and De-Dupe

### 4.1 Frontend catalog loading

- Network/catalog bootstrap:
  - `refreshCatalogInBackground()` in `app.js`
- Fetch + validate full fallback payload:
  - `loadGeneratedCarCatalog()`
  - `isCatalogPayloadValid(payload)`
  - in `app.js`
- Fetch + validate split manifest + slices:
  - `loadCatalogManifest()`
  - `isCatalogManifestValid(payload)`
  - `desiredCatalogMarketsForCountry(countryCode, manifest)`
  - `ensureCatalogMarketsLoaded(marketCodes, manifest)`
  - `rebuildCatalogFromSlices()`
  - in `app.js`
- Catalog channel switching:
  - `CATALOG_CHANNELS`
  - `ACTIVE_CATALOG_CHANNEL`
  - `activeCatalogChannelConfig()`
  - `scopedCatalogCacheKey(baseKey)`
  - in `app.js`
- Browser cache key/TTL:
  - `CATALOG_CACHE_KEY`
  - `CATALOG_MANIFEST_CACHE_KEY`
  - `CATALOG_MARKET_CACHE_KEY`
  - `CATALOG_CACHE_TTL_MS`
  - in `app.js`

### 4.2 Merge + canonicalization

- Merge built-in + generated presets:
  - `mergeCarPresets(basePresets, generatedPresets)` in `app.js`
- Canonical ID normalization (`*-in` cleanup):
  - `canonicalPresetId(id, markets)` in `app.js`
- Replacement preference when duplicate ID appears:
  - `shouldReplacePreset(existing, candidate)` in `app.js`
- Market and market price normalization:
  - `normalizeMarketArray(markets)`
  - `normalizeMarketPrices(marketPrices)`
  - in `app.js`

## 5) Catalog Generation Pipeline (Precompute)

### 5.1 Main sync script

- Script entry:
  - `main()` in `scripts/sync_car_presets.py`
- US presets collection:
  - `collect_us_ev_presets(...)`
- India presets collection:
  - `collect_india_ev_presets(fx)`
- Australia presets collection:
  - `collect_australia_ev_presets(from_year, to_year)`
  - `parse_au_gvg_vehicle_rows(html_text, include_non_current=False)`
- Region-native seed ingestion:
  - `load_region_native_seed_presets(path, source_name)`
  - seed files: `data/sources/*.seed.json`
- Merge source groups:
  - `merge_presets(*groups, fx=...)`
- Regional market expansion (precompute step):
  - `augment_regional_market_coverage(presets)`
  - `should_expand_to_market(preset, target_market)`
  - `extract_make_from_label(label)`
- Split output + manifest emission:
  - `split_presets_by_market(presets)`
  - `write_market_split_outputs(...)`
  - `build_market_payload(...)`
- Canonicalization in sync pipeline:
  - `canonical_car_id(raw_id, markets)`
- Per-market guardrail parsing:
  - `parse_market_minimums(values)`
  - `parse_bootstrap_markets(values)`
- Seed freshness guardrail:
  - `seed_age_days(path, today=None)`
  - `--max-seed-age-days`
- Validation before publish:
  - `validate_candidate_catalog(...)`

### 5.2 Validation-only script

- Script entry:
  - `main()` in `scripts/validate_car_catalog.py`
- Per-market minimum parser:
  - `parse_market_minimums(values)`
- Payload validation:
  - `validate_payload(payload, label)`
- Split manifest validation:
  - `validate_manifest_payload(manifest_payload, current_stats)`
- Stats + threshold checks:
  - `catalog_stats(presets)`

### 5.3 Workflow automation

- Schedule and publish pipeline:
  - `.github/workflows/sync-car-presets.yml`
- Canary-to-stable promotion pipeline:
  - `.github/workflows/promote-car-presets.yml`
- Current cadence:
  - every 12 hours + manual trigger (canary)
  - every 12 hours offset + manual trigger (promotion)
- Steps:
  - canary regenerate -> unit tests -> validate guardrails -> commit canary if changed
  - promote workflow validates canary -> promotes -> validates stable -> commits stable if changed

## 6) Service Worker and Cache Invalidation

- Cache version keys:
  - `STATIC_CACHE`
  - `RUNTIME_CACHE`
  - in `sw.js`
- Network-first routes:
  - `isNetworkFirstPath(pathname)` in `sw.js`
- Fetch policies:
  - `networkFirst(request)`
  - `staleWhileRevalidate(request)`
  - in `sw.js`

## 7) Runtime Speed Path (Compute Reach)

- Main flow:
  - `onPlanSubmit(event)` in `app.js`
- Perceived-speed optimization:
  - Reach circles render immediately after location resolve (`renderOrigin`, `renderRangeCircles`) before charger fetch completes.
- Charger fetch strategy in auto mode:
  - `getNearbyChargers(origin, oneWayRangeKm, input)` in `app.js`
  - OpenChargeMap + Overpass fast path runs concurrently via `Promise.allSettled(...)`
  - Fast Overpass options:
    - `AUTO_FAST_OVERPASS_TIMEOUT_MS`
    - `FAST_OVERPASS_ENDPOINT_LIMIT`
    - `FAST_OVERPASS_ATTEMPTS`
    - in `app.js`
  - OCM request timeout:
    - `OCM_TIMEOUT_MS` in `app.js`

## 8) What To Edit For Common Changes

- Add a new country classification:
  - update `MARKET_CLUSTER_BY_COUNTRY` in `app.js`
- Change cluster proxy strategy:
  - update `MARKET_PROXY_BY_CLUSTER` in `app.js`
- Change precomputed regional bucket logic:
  - update `REGIONAL_MARKET_EXPANSION_RULES` in `scripts/sync_car_presets.py`
- Change bootstrap market loading order:
  - update `DEFAULT_BOOTSTRAP_MARKETS` in `scripts/sync_car_presets.py`
- Change frontend split-catalog bootstrap/fallback:
  - update `desiredCatalogMarketsForCountry(...)` and `MARKET_PROXY_BY_CLUSTER` in `app.js`
- Change suggestion performance:
  - tune `LOCATION_SUGGEST_*` constants in `app.js`
- Tighten or loosen market count guardrails:
  - adjust `--min-market-preset` in workflow and scripts
- Change dropdown layering:
  - edit z-index rules in `styles.css`

## 9) Test Map

- Sync + parser + canonicalization tests:
  - `tests/test_sync_car_presets.py`
- Validation thresholds/parsing tests:
  - `tests/test_validate_car_catalog.py`

Run:

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```
