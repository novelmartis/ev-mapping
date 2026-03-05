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
- Catalog generation pipeline:
  - `scripts/sync_car_presets.py`
  - `scripts/validate_car_catalog.py`

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
- Core strict markets:
  - `CORE_MARKET_CODES` in `app.js`

### 2.3 Classification helper functions

- Country -> cluster:
  - `marketClusterForCountry(code)` in `app.js`
- Market counts from loaded catalog:
  - `marketCountsByCode(presets)` in `app.js`
- Pick proxy market code for non-core countries:
  - `proxyMarketCodesForCountry(code, counts)` in `app.js`

### 2.4 Car list selection behavior

- Main filtering logic:
  - `visiblePresetsForCurrentMarket(sortedPresets)` in `app.js`
- Exact match path:
  - If `markets[]` contains detected country code, show only that market.
- Proxy path:
  - For non-core countries without exact market entries, use cluster proxy market list.
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
- Fetch + validate catalog payload:
  - `loadGeneratedCarCatalog()`
  - `isCatalogPayloadValid(payload)`
  - in `app.js`
- Browser cache key/TTL:
  - `CATALOG_CACHE_KEY`
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
- Merge source groups:
  - `merge_presets(*groups, fx=...)`
- Canonicalization in sync pipeline:
  - `canonical_car_id(raw_id, markets)`
- Per-market guardrail parsing:
  - `parse_market_minimums(values)`
- Validation before publish:
  - `validate_candidate_catalog(...)`

### 5.2 Validation-only script

- Script entry:
  - `main()` in `scripts/validate_car_catalog.py`
- Per-market minimum parser:
  - `parse_market_minimums(values)`
- Payload validation:
  - `validate_payload(payload, label)`
- Stats + threshold checks:
  - `catalog_stats(presets)`

### 5.3 Workflow automation

- Schedule and publish pipeline:
  - `.github/workflows/sync-car-presets.yml`
- Current cadence:
  - every 12 hours + manual trigger
- Steps:
  - regenerate -> unit tests -> validate guardrails -> commit if changed

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

## 7) What To Edit For Common Changes

- Add a new country classification:
  - update `MARKET_CLUSTER_BY_COUNTRY` in `app.js`
- Change cluster proxy strategy:
  - update `MARKET_PROXY_BY_CLUSTER` in `app.js`
- Change suggestion performance:
  - tune `LOCATION_SUGGEST_*` constants in `app.js`
- Tighten or loosen market count guardrails:
  - adjust `--min-market-preset` in workflow and scripts
- Change dropdown layering:
  - edit z-index rules in `styles.css`

## 8) Test Map

- Sync + parser + canonicalization tests:
  - `tests/test_sync_car_presets.py`
- Validation thresholds/parsing tests:
  - `tests/test_validate_car_catalog.py`

Run:

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```
