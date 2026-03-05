const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const RECENT_LOCATIONS_KEY = "ev-mapping-recent-locs";
const RECENT_LOCATIONS_MAX = 6;
const DEFAULT_MAX_RESULTS = 120;
const NETWORK_TIMEOUT_MS = 10000;
const MAX_CHARGER_SEARCH_KM = 140;
const CHARGER_MAX_DISTANCE_KM = 150;
const OFFICIAL_RANGE_BUFFER = 0.9;
const FAST_OVERPASS_ENDPOINT_LIMIT = 1;
const FAST_OVERPASS_ATTEMPTS = 1;
const AUTO_FAST_OVERPASS_TIMEOUT_MS = 4500;
const AUTO_RETRY_TIMEOUT_MS = 12000;
const AUTO_RETRY_OVERPASS_ATTEMPTS = 2;
const AUTO_RETRY_MIN_RADIUS_KM = 45;
const OCM_TIMEOUT_MS = 6000;
const GEOCODE_CACHE_LIMIT = 10;
const LOCATION_SUGGEST_MIN_CHARS = 2;
const LOCATION_SUGGEST_LIMIT = 6;
const LOCATION_SUGGEST_DEBOUNCE_MS = 220;
const LOCATION_SUGGEST_TIMEOUT_MS = 5000;
const CHARGER_QUERY_CACHE_LIMIT = 12;
const FX_TIMEOUT_MS = 2500;
const COUNTRY_CURRENCY_TIMEOUT_MS = 1500;
const FX_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CATALOG_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const CATALOG_CACHE_KEY = "ev-mapping-catalog-cache-v2";
const CATALOG_MANIFEST_CACHE_KEY = "ev-mapping-catalog-manifest-cache-v1";
const CATALOG_MARKET_CACHE_KEY = "ev-mapping-catalog-market-cache-v1";
const FX_CACHE_KEY = "ev-mapping-fx-cache-v1";
const CURRENCY_CACHE_KEY = "ev-mapping-market-currency-cache-v1";
const MAX_CACHED_MARKET_SLICES = 8;
const MAX_PROXY_MARKET_CODES = 3;
const STRICT_LOCAL_MARKET_MIN_PRESETS = 8;
const MOBILE_LAYOUT_QUERY = "(max-width: 980px)";
const MARKER_RENDER_BATCH_SIZE = 10;
const REGION_DISPLAY_NAMES =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(undefined, { type: "region" })
    : null;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];
const CATALOG_CHANNELS = {
  stable: {
    key: "stable",
    label: "stable",
    fallbackPath: "./data/car-presets.generated.json",
    manifestPath: "./data/catalog/catalog_manifest.json",
  },
  next: {
    key: "next",
    label: "canary",
    fallbackPath: "./data/car-presets.generated.next.json",
    manifestPath: "./data/catalog-next/catalog_manifest.json",
  },
};
const CATALOG_CHANNEL_QUERY_PARAM = "catalog";
const ACTIVE_CATALOG_CHANNEL = (() => {
  try {
    const value = new URLSearchParams(window.location.search).get(CATALOG_CHANNEL_QUERY_PARAM);
    return String(value || "").trim().toLowerCase() === "next" ? "next" : "stable";
  } catch {
    return "stable";
  }
})();
const MARKET_LABELS = {
  IN: "India",
  LK: "Sri Lanka",
  US: "United States",
  CA: "Canada",
  SG: "Singapore",
  TH: "Thailand",
  MY: "Malaysia",
  ID: "Indonesia",
  VN: "Vietnam",
  PH: "Philippines",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  DE: "Europe",
  TR: "Turkey",
  ZA: "South Africa",
  MA: "Morocco",
  EG: "Egypt",
  AU: "Australia",
  NZ: "New Zealand",
};
const MARKET_CURRENCY_BY_CODE = {
  IN: "INR",
  LK: "LKR",
  US: "USD",
  CA: "CAD",
  SG: "SGD",
  TH: "THB",
  MY: "MYR",
  ID: "IDR",
  VN: "VND",
  PH: "PHP",
  CN: "CNY",
  JP: "JPY",
  KR: "KRW",
  DE: "EUR",
  TR: "TRY",
  ZA: "ZAR",
  MA: "MAD",
  EG: "EGP",
  AU: "AUD",
  NZ: "NZD",
};
const MARKET_CLUSTER_LABELS = {
  GLOBAL: "Global",
  NA: "USMCA North America",
  LATAM: "Latin America",
  EU: "EU+EFTA+UK Corridor",
  SA: "South Asia",
  SEA: "ASEAN Southeast Asia",
  EA: "East Asia (China/JP/KR)",
  MEA: "Africa/Middle East",
  OC: "Australia-New Zealand",
};
const MARKET_CLUSTER_BY_COUNTRY = {
  US: "NA",
  CA: "NA",
  MX: "LATAM",
  BR: "LATAM",
  AR: "LATAM",
  CL: "LATAM",
  CO: "LATAM",
  PE: "LATAM",
  GB: "EU",
  IE: "EU",
  DE: "EU",
  FR: "EU",
  ES: "EU",
  IT: "EU",
  NL: "EU",
  BE: "EU",
  PT: "EU",
  NO: "EU",
  SE: "EU",
  FI: "EU",
  DK: "EU",
  CH: "EU",
  AT: "EU",
  PL: "EU",
  CZ: "EU",
  HU: "EU",
  RO: "EU",
  IN: "SA",
  PK: "SA",
  BD: "SA",
  LK: "SA",
  NP: "SA",
  SG: "SEA",
  BN: "SEA",
  TH: "SEA",
  MY: "SEA",
  ID: "SEA",
  PH: "SEA",
  VN: "SEA",
  CN: "EA",
  JP: "EA",
  KR: "EA",
  TW: "EA",
  HK: "EA",
  AE: "MEA",
  SA: "MEA",
  QA: "MEA",
  KW: "MEA",
  OM: "MEA",
  BH: "MEA",
  IL: "MEA",
  EG: "MEA",
  MA: "MEA",
  KE: "MEA",
  NG: "MEA",
  ZA: "MEA",
  AU: "OC",
  NZ: "OC",
  TR: "EU",
};
const MARKET_PROXY_BY_CLUSTER = {
  GLOBAL: ["US", "DE", "IN"],
  NA: ["US", "CA", "DE"],
  LATAM: ["US", "DE", "CA"],
  EU: ["DE", "TR"],
  SA: ["IN", "LK", "SG", "TH"],
  SEA: ["SG", "TH", "MY", "ID", "VN", "PH", "CN"],
  EA: ["CN", "JP", "KR", "SG"],
  MEA: ["ZA", "MA", "EG", "TR", "DE"],
  OC: ["AU", "NZ", "JP"],
};
const MARKET_LOCAL_SOURCE_TOKENS = {
  US: ["fueleconomy.gov", "manual"],
  CA: ["fueleconomy.gov", "row-native-seed", "manual"],
  DE: ["eu-native-seed", "manual"],
  TR: ["eu-native-seed", "manual"],
  ZA: ["row-native-seed", "manual"],
  MA: ["row-native-seed", "manual"],
  EG: ["row-native-seed", "manual"],
  IN: ["cardekho.com", "in-native-seed", "manual"],
  LK: ["cardekho.com", "in-native-seed", "row-native-seed", "manual"],
  SG: ["asean-native-seed", "manual"],
  TH: ["asean-native-seed", "manual"],
  MY: ["asean-native-seed", "manual"],
  ID: ["asean-native-seed", "manual"],
  VN: ["asean-native-seed", "manual"],
  PH: ["asean-native-seed", "manual"],
  CN: ["jpkr-native-seed", "manual"],
  JP: ["jpkr-native-seed", "manual"],
  KR: ["jpkr-native-seed", "manual"],
  AU: ["greenvehicleguide.gov.au", "row-native-seed", "manual"],
  NZ: ["greenvehicleguide.gov.au", "row-native-seed", "manual"],
};
const BASE_CAR_PRESETS = [
  { id: "tesla-model-3-rwd", label: "Tesla Model 3 RWD", batteryKwh: 60, efficiency: 13.5, reserve: 10 },
  { id: "tesla-model-y-rwd", label: "Tesla Model Y RWD", batteryKwh: 60, efficiency: 15.0, reserve: 10 },
  { id: "tesla-model-s", label: "Tesla Model S", batteryKwh: 100, efficiency: 18.0, reserve: 10 },
  { id: "tesla-model-x", label: "Tesla Model X", batteryKwh: 100, efficiency: 21.0, reserve: 10 },
  { id: "hyundai-ioniq-5", label: "Hyundai Ioniq 5 (Long Range)", batteryKwh: 77.4, efficiency: 17.5, reserve: 10 },
  { id: "hyundai-kona-electric", label: "Hyundai Kona Electric", batteryKwh: 64.8, efficiency: 15.2, reserve: 10 },
  { id: "kia-ev6-lr", label: "Kia EV6 (Long Range)", batteryKwh: 77.4, efficiency: 17.3, reserve: 10 },
  { id: "kia-niro-ev", label: "Kia Niro EV", batteryKwh: 64.8, efficiency: 15.8, reserve: 10 },
  { id: "volkswagen-id4", label: "Volkswagen ID.4", batteryKwh: 77, efficiency: 18.2, reserve: 10 },
  {
    id: "ford-mustang-mach-e",
    label: "Ford Mustang Mach-E",
    batteryKwh: 88,
    efficiency: 19.4,
    reserve: 10,
    markets: ["US"],
  },
  {
    id: "ford-f150-lightning",
    label: "Ford F-150 Lightning",
    batteryKwh: 131,
    efficiency: 27.0,
    reserve: 12,
    markets: ["US"],
  },
  { id: "nissan-leaf", label: "Nissan Leaf (62 kWh)", batteryKwh: 62, efficiency: 17.0, reserve: 10 },
  {
    id: "chevrolet-bolt-euv",
    label: "Chevrolet Bolt EUV",
    batteryKwh: 65,
    efficiency: 16.1,
    reserve: 10,
    markets: ["US"],
  },
  { id: "bmw-i4-edrive40", label: "BMW i4 eDrive40", batteryKwh: 83.9, efficiency: 18.8, reserve: 10 },
  { id: "bmw-ix-xdrive50", label: "BMW iX xDrive50", batteryKwh: 111.5, efficiency: 21.8, reserve: 10 },
  { id: "polestar-2-lr", label: "Polestar 2 (Long Range)", batteryKwh: 82, efficiency: 18.7, reserve: 10 },
  { id: "audi-q4-etron", label: "Audi Q4 e-tron", batteryKwh: 82, efficiency: 19.2, reserve: 10 },
  { id: "mercedes-eqe-350", label: "Mercedes EQE 350+", batteryKwh: 90.6, efficiency: 18.8, reserve: 10 },
  { id: "porsche-taycan-4s", label: "Porsche Taycan 4S", batteryKwh: 93.4, efficiency: 22.0, reserve: 10 },
  {
    id: "mg-zs-ev",
    label: "MG ZS EV",
    batteryKwh: 50.3,
    efficiency: 16.7,
    reserve: 10,
    markets: ["IN"],
    priceUsd: 21700,
  },
  {
    id: "mahindra-be6-59",
    label: "Mahindra BE 6 (59 kWh)",
    batteryKwh: 59,
    efficiency: 15.8,
    reserve: 10,
    markets: ["IN"],
    priceUsd: 22800,
  },
  {
    id: "mahindra-be6-79",
    label: "Mahindra BE 6 (79 kWh)",
    batteryKwh: 79,
    efficiency: 16.4,
    reserve: 10,
    markets: ["IN"],
    priceUsd: 32400,
  },
  {
    id: "byd-atto-3",
    label: "BYD Atto 3",
    batteryKwh: 60.5,
    efficiency: 16.8,
    reserve: 10,
    markets: ["IN"],
    priceUsd: 30100,
  },
  {
    id: "tata-nexon-ev",
    label: "Tata Nexon EV",
    batteryKwh: 40.5,
    efficiency: 15.9,
    reserve: 10,
    markets: ["IN"],
    priceUsd: 15000,
  },
  {
    id: "tata-punch-ev-lr",
    label: "Tata Punch EV (Long Range)",
    batteryKwh: 35,
    efficiency: 14.8,
    reserve: 10,
    markets: ["IN"],
    priceUsd: 15600,
  },
];
let carPresets = [...BASE_CAR_PRESETS];

const state = {
  map: null,
  locationMarker: null,
  oneWayCircle: null,
  roundTripCircle: null,
  chargerLayer: null,
  routeLayer: null,
  mapResizeObserver: null,
  mapResizeTimer: null,
  chargerRenderToken: 0,
  chargerRenderHandle: 0,
  origin: null,
  oneWayRangeKm: 0,
  lastChargers: [],
  lastCarModelLabel: "Custom",
  lastVerificationProfile: "independent",
  lastPlanSummaryHtml: "",
  lastSubmitMode: "reach",
  marketCode: "GLOBAL",
  marketLabel: "Global",
  marketCluster: "GLOBAL",
  marketClusterLabel: "Global",
  marketCatalogMode: "All models",
  visiblePresets: [],
  catalogSource: "Built-in",
  catalogCount: BASE_CAR_PRESETS.length,
  catalogChannel: ACTIVE_CATALOG_CHANNEL,
  catalogManifest: null,
  catalogSliceByMarket: new Map(),
  catalogSliceLoadByMarket: new Map(),
  presetById: new Map(),
  userSelectedCarModel: false,
  geocodeCache: new Map(),
  locationSuggestions: [],
  activeLocationSuggestionIndex: -1,
  locationSuggestTimer: 0,
  locationSuggestionRequestToken: 0,
  suppressLocationInputEvent: false,
  chargerQueryCache: new Map(),
  fxByCurrency: new Map(),
  currencyByMarket: new Map(Object.entries(MARKET_CURRENCY_BY_CODE)),
  activeCurrency: "USD",
  lastResolvedQueryKey: "",
};

const ui = {
  form: document.getElementById("planner-form"),
  appResetBtn: document.getElementById("app-reset-btn"),
  carModelSelect: document.getElementById("car-model"),
  compareCarsSelect: document.getElementById("compare-cars"),
  carHint: document.getElementById("car-hint"),
  marketHint: document.getElementById("market-hint"),
  marketDetailHint: document.getElementById("market-detail-hint"),
  useLocationBtn: document.getElementById("use-location"),
  locationInput: document.getElementById("location"),
  locationSuggestions: document.getElementById("location-suggestions"),
  locationSelectionHint: document.getElementById("location-selection-hint"),
  batteryInput: document.getElementById("battery-kwh"),
  socInput: document.getElementById("soc"),
  efficiencyInput: document.getElementById("efficiency"),
  reserveInput: document.getElementById("reserve"),
  providerSelect: document.getElementById("provider"),
  verificationProfileSelect: document.getElementById("verification-profile"),
  maxResultsInput: document.getElementById("max-results"),
  planBtn: document.getElementById("plan-btn"),
  compareBtn: document.getElementById("compare-btn"),
  compareResults: document.getElementById("compare-results"),
  summary: document.getElementById("summary"),
  mapElement: document.getElementById("map"),
  mapPanel: document.querySelector(".map-panel"),
};

// ── URL state ──────────────────────────────────────────────────────────────
function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const car = params.get("car");
  const loc = params.get("loc");
  const soc = params.get("soc");
  const batt = params.get("batt");
  const eff = params.get("eff");
  const res = params.get("res");
  const src = params.get("src");
  const vp = params.get("vp");

  if (car) {
    const exists = [...ui.carModelSelect.options].some((o) => o.value === car);
    if (exists) {
      ui.carModelSelect.value = car;
      onCarModelChange(false);
    }
  }
  if (loc) ui.locationInput.value = decodeURIComponent(loc);
  if (soc) ui.socInput.value = soc;
  if (ui.carModelSelect.value === "custom") {
    if (batt) ui.batteryInput.value = batt;
    if (eff) ui.efficiencyInput.value = eff;
  }
  if (res) ui.reserveInput.value = res;
  if (src && ["auto", "openchargemap", "overpass"].includes(src)) ui.providerSelect.value = src;
  if (vp && ["independent", "official"].includes(vp)) {
    ui.verificationProfileSelect.value = vp;
    onVerificationProfileChange();
  }
  if (loc) {
    setLocationSelectionHint("Location loaded from URL. Press Compute Reach to resolve market.");
  }
}

function pushUrlState() {
  const params = new URLSearchParams();
  if (state.catalogChannel === "next") {
    params.set(CATALOG_CHANNEL_QUERY_PARAM, "next");
  }
  const car = ui.carModelSelect.value;
  if (car && car !== "custom") params.set("car", car);
  const loc = ui.locationInput.value.trim();
  if (loc) params.set("loc", loc);
  const soc = Number(ui.socInput.value);
  if (soc !== 100) params.set("soc", String(soc));
  if (car === "custom") {
    const batt = ui.batteryInput.value;
    if (batt) params.set("batt", batt);
    const eff = ui.efficiencyInput.value;
    if (eff) params.set("eff", eff);
  }
  const res = Number(ui.reserveInput.value);
  if (res !== 10) params.set("res", String(res));
  const src = ui.providerSelect.value;
  if (src !== "auto") params.set("src", src);
  const vp = ui.verificationProfileSelect.value;
  if (vp !== "independent") params.set("vp", vp);

  const url = new URL(window.location.href);
  url.search = params.toString();
  window.history.replaceState({}, "", url);
}

// ── Recent locations (localStorage) ────────────────────────────────────────
function loadRecentLocations() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_LOCATIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentLocation(query) {
  if (!query) return;
  try {
    const recent = loadRecentLocations().filter((l) => l !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(recent.slice(0, RECENT_LOCATIONS_MAX)));
    updateLocationDatalist();
  } catch {
    // Ignore storage errors
  }
}

function updateLocationDatalist() {
  const datalist = document.getElementById("location-history");
  if (!datalist) return;
  const recent = loadRecentLocations();
  datalist.innerHTML = recent.map((l) => `<option value="${escapeHtml(l)}">`).join("");
}

function setLocationSelectionHint(text) {
  if (!ui.locationSelectionHint) return;
  ui.locationSelectionHint.textContent = text;
}

function clearLocationSuggestionTimer() {
  if (!state.locationSuggestTimer) return;
  clearTimeout(state.locationSuggestTimer);
  state.locationSuggestTimer = 0;
}

function hideLocationSuggestions() {
  state.activeLocationSuggestionIndex = -1;
  if (ui.locationSuggestions) {
    ui.locationSuggestions.hidden = true;
    ui.locationSuggestions.innerHTML = "";
  }
  ui.locationInput.setAttribute("aria-expanded", "false");
}

function setActiveLocationSuggestion(index) {
  const buttons = ui.locationSuggestions
    ? [...ui.locationSuggestions.querySelectorAll(".location-suggestion-btn")]
    : [];
  if (!buttons.length) {
    state.activeLocationSuggestionIndex = -1;
    return;
  }
  const bounded = Math.max(0, Math.min(index, buttons.length - 1));
  state.activeLocationSuggestionIndex = bounded;
  buttons.forEach((button, idx) => {
    button.classList.toggle("is-active", idx === bounded);
    button.setAttribute("aria-selected", idx === bounded ? "true" : "false");
  });
}

function recentLocationSuggestions(query) {
  const queryKey = normalizeLocationQuery(query);
  return loadRecentLocations()
    .filter((entry) => !queryKey || normalizeLocationQuery(entry).includes(queryKey))
    .slice(0, LOCATION_SUGGEST_LIMIT)
    .map((entry) => ({
      value: entry,
      title: entry,
      subtitle: "Recent",
      source: "recent",
      lat: null,
      lon: null,
      countryCode: "",
      countryName: "",
    }));
}

function mapNominatimSuggestion(item) {
  const lat = Number(item?.lat);
  const lon = Number(item?.lon);
  const city =
    item?.address?.city ||
    item?.address?.town ||
    item?.address?.village ||
    item?.address?.municipality ||
    item?.address?.hamlet ||
    item?.name ||
    "";
  const stateName = item?.address?.state || item?.address?.county || "";
  const country = item?.address?.country || "";
  const concise = [city, stateName, country].filter(Boolean).join(", ");
  return {
    value: item?.display_name || concise || "",
    title: concise || item?.display_name || "",
    subtitle: item?.display_name || concise || "",
    source: "search",
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    countryCode: item?.address?.country_code?.toUpperCase() || "",
    countryName: country,
  };
}

function mergeLocationSuggestions(recent, live) {
  const merged = [];
  const seen = new Set();
  for (const item of [...recent, ...live]) {
    const key = normalizeLocationQuery(item?.value || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(0, LOCATION_SUGGEST_LIMIT);
}

function renderLocationSuggestions(items) {
  state.locationSuggestions = items;
  state.activeLocationSuggestionIndex = -1;
  if (!ui.locationSuggestions) return;

  ui.locationSuggestions.innerHTML = "";
  if (!items.length) {
    hideLocationSuggestions();
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "location-suggestion-btn";
    button.dataset.index = String(index);
    button.setAttribute("aria-selected", "false");

    const main = document.createElement("span");
    main.className = "location-suggestion-main";
    main.textContent = item.title || item.value || "Unknown place";

    const meta = document.createElement("span");
    meta.className = "location-suggestion-meta";
    meta.textContent = item.subtitle || "";

    button.append(main, meta);
    li.append(button);
    fragment.append(li);
  });

  ui.locationSuggestions.append(fragment);
  ui.locationSuggestions.hidden = false;
  ui.locationInput.setAttribute("aria-expanded", "true");
}

function applyLocationSuggestion(suggestion) {
  if (!suggestion) return;
  state.suppressLocationInputEvent = true;
  ui.locationInput.value = suggestion.value || suggestion.title || "";
  state.suppressLocationInputEvent = false;
  hideLocationSuggestions();

  if (Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lon)) {
    const resolved = {
      lat: suggestion.lat,
      lon: suggestion.lon,
      label: suggestion.value || suggestion.title || ui.locationInput.value.trim(),
      countryCode: suggestion.countryCode || "",
      countryName: suggestion.countryName || "",
    };
    state.origin = resolved;
    const queryKey = normalizeLocationQuery(resolved.label);
    state.lastResolvedQueryKey = queryKey;
    cacheResolvedOrigin(queryKey, resolved);
    inferAndApplyMarket(resolved);
    setLocationSelectionHint("Location locked from suggestion. Press Compute Reach.");
    return;
  }

  state.lastResolvedQueryKey = "";
  setLocationSelectionHint("Suggestion selected. Press Compute Reach to resolve exact location.");
}

function selectLocationSuggestionAt(index) {
  const suggestion = state.locationSuggestions[index];
  if (!suggestion) return;
  applyLocationSuggestion(suggestion);
}

async function fetchLiveLocationSuggestions(query, requestToken) {
  const encoded = encodeURIComponent(query);
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q=${encoded}&limit=${LOCATION_SUGGEST_LIMIT}`,
    {},
    LOCATION_SUGGEST_TIMEOUT_MS
  );
  if (requestToken !== state.locationSuggestionRequestToken) {
    return [];
  }
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data.map(mapNominatimSuggestion).filter((item) => item.value);
}

async function refreshLocationSuggestions(query) {
  const trimmed = String(query || "").trim();
  const recent = recentLocationSuggestions(trimmed);
  if (trimmed.length < LOCATION_SUGGEST_MIN_CHARS) {
    renderLocationSuggestions(recent);
    if (!trimmed.length) {
      setLocationSelectionHint("Type a city and pick a suggestion to lock country/market.");
    }
    return;
  }

  const requestToken = ++state.locationSuggestionRequestToken;
  setLocationSelectionHint("Searching locations...");
  try {
    const live = await fetchLiveLocationSuggestions(trimmed, requestToken);
    if (requestToken !== state.locationSuggestionRequestToken) return;
    const merged = mergeLocationSuggestions(recent, live);
    renderLocationSuggestions(merged);
    if (merged.length === 0) {
      setLocationSelectionHint("No suggestions yet. Keep typing or press Compute Reach.");
    } else {
      setLocationSelectionHint("Pick a location suggestion to set market instantly.");
    }
  } catch {
    if (requestToken !== state.locationSuggestionRequestToken) return;
    renderLocationSuggestions(recent);
    setLocationSelectionHint("Suggestion lookup is slow. You can still press Compute Reach.");
  }
}

function scheduleLocationSuggestions(query, immediate = false) {
  clearLocationSuggestionTimer();
  if (immediate) {
    refreshLocationSuggestions(query);
    return;
  }
  state.locationSuggestTimer = window.setTimeout(() => {
    refreshLocationSuggestions(query);
  }, LOCATION_SUGGEST_DEBOUNCE_MS);
}

function onLocationInputFocus() {
  scheduleLocationSuggestions(ui.locationInput.value, true);
}

function onLocationInputBlur() {
  window.setTimeout(() => {
    hideLocationSuggestions();
  }, 120);
}

function onLocationInputChanged() {
  if (state.suppressLocationInputEvent) return;
  state.lastResolvedQueryKey = "";
  const trimmed = ui.locationInput.value.trim();
  if (!trimmed) {
    setLocationSelectionHint("Type a city and pick a suggestion to lock country/market.");
  } else {
    setLocationSelectionHint("Typing... choose a suggestion or press Compute Reach.");
  }
  scheduleLocationSuggestions(ui.locationInput.value);
}

function onLocationInputKeydown(event) {
  const total = state.locationSuggestions.length;
  if (!total) {
    if (event.key === "Escape") hideLocationSuggestions();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    const next = state.activeLocationSuggestionIndex < 0 ? 0 : state.activeLocationSuggestionIndex + 1;
    setActiveLocationSuggestion(next >= total ? 0 : next);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    const prev = state.activeLocationSuggestionIndex < 0 ? total - 1 : state.activeLocationSuggestionIndex - 1;
    setActiveLocationSuggestion(prev < 0 ? total - 1 : prev);
    return;
  }

  if (event.key === "Enter" && state.activeLocationSuggestionIndex >= 0) {
    event.preventDefault();
    selectLocationSuggestionAt(state.activeLocationSuggestionIndex);
    return;
  }

  if (event.key === "Escape") {
    hideLocationSuggestions();
  }
}

function onLocationSuggestionPointerDown(event) {
  const button = event.target.closest(".location-suggestion-btn");
  if (!button) return;
  event.preventDefault();
  const index = Number(button.dataset.index);
  if (!Number.isFinite(index)) return;
  selectLocationSuggestionAt(index);
}

// ── Share button ────────────────────────────────────────────────────────────
function onShareBtnClick(btn) {
  pushUrlState();
  const url = window.location.href;
  const orig = btn.textContent;
  const succeed = () => {
    btn.textContent = "✓ Copied!";
    setTimeout(() => { btn.textContent = orig; }, 2000);
  };
  const fail = () => {
    btn.textContent = "Copy failed";
    setTimeout(() => { btn.textContent = orig; }, 2000);
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(succeed).catch(fail);
  } else {
    try {
      const tmp = document.createElement("input");
      tmp.value = url;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
      succeed();
    } catch {
      fail();
    }
  }
}

function normalizeLocationQuery(query) {
  return String(query || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function cacheResolvedOrigin(queryKey, origin) {
  if (!queryKey || !origin) return;
  if (state.geocodeCache.has(queryKey)) {
    state.geocodeCache.delete(queryKey);
  }
  state.geocodeCache.set(queryKey, origin);
  while (state.geocodeCache.size > GEOCODE_CACHE_LIMIT) {
    const oldestKey = state.geocodeCache.keys().next().value;
    state.geocodeCache.delete(oldestKey);
  }
}

function chargerCacheKey(origin, searchRadiusKm, input) {
  const lat = Number(origin.lat).toFixed(3);
  const lon = Number(origin.lon).toFixed(3);
  return [
    lat,
    lon,
    Math.round(searchRadiusKm),
    input.provider,
    input.verificationProfile,
    Math.round(input.maxResults),
  ].join("|");
}

function cacheChargersByQuery(key, chargers) {
  if (!key || !Array.isArray(chargers)) return;
  if (state.chargerQueryCache.has(key)) {
    state.chargerQueryCache.delete(key);
  }
  state.chargerQueryCache.set(key, chargers);
  while (state.chargerQueryCache.size > CHARGER_QUERY_CACHE_LIMIT) {
    const oldestKey = state.chargerQueryCache.keys().next().value;
    state.chargerQueryCache.delete(oldestKey);
  }
}

function setPresetIndex() {
  const byId = new Map();
  for (const preset of carPresets) {
    if (!preset?.id) continue;
    byId.set(preset.id, preset);
  }
  state.presetById = byId;
}

function getPresetById(presetId) {
  return state.presetById.get(presetId) || null;
}

function readJsonFromStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeJsonToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota / privacy mode issues.
  }
}

function hydrateFxCachesFromStorage() {
  const fxPayload = readJsonFromStorage(FX_CACHE_KEY);
  if (fxPayload && typeof fxPayload === "object") {
    for (const [currency, record] of Object.entries(fxPayload)) {
      const rate = Number(record?.rate);
      const fetchedAt = Number(record?.fetchedAt);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      if (!Number.isFinite(fetchedAt)) continue;
      if (Date.now() - fetchedAt >= FX_CACHE_TTL_MS) continue;
      state.fxByCurrency.set(currency, { rate, fetchedAt });
    }
  }

  const currencyPayload = readJsonFromStorage(CURRENCY_CACHE_KEY);
  if (currencyPayload && typeof currencyPayload === "object") {
    for (const [marketCode, currency] of Object.entries(currencyPayload)) {
      const normalizedMarket = String(marketCode || "").toUpperCase();
      const normalizedCurrency = String(currency || "").toUpperCase();
      if (!/^[A-Z]{2}$/.test(normalizedMarket)) continue;
      if (!/^[A-Z]{3}$/.test(normalizedCurrency)) continue;
      state.currencyByMarket.set(normalizedMarket, normalizedCurrency);
    }
  }
}

function persistFxCachesToStorage() {
  const fxPayload = {};
  for (const [currency, record] of state.fxByCurrency.entries()) {
    if (!record) continue;
    fxPayload[currency] = {
      rate: record.rate,
      fetchedAt: record.fetchedAt,
    };
  }
  writeJsonToStorage(FX_CACHE_KEY, fxPayload);
  writeJsonToStorage(CURRENCY_CACHE_KEY, Object.fromEntries(state.currencyByMarket.entries()));
}

initialize();

function initialize() {
  hydrateFxCachesFromStorage();
  carPresets = [...BASE_CAR_PRESETS];
  setPresetIndex();
  state.catalogSource = "Built-in defaults";
  state.catalogCount = carPresets.length;

  populateCarPresets();
  updateMarketHint();
  updateLocationDatalist();
  setLocationSelectionHint("Type a city and pick a suggestion to lock country/market.");
  readUrlState();

  state.map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);

  state.chargerLayer = L.layerGroup().addTo(state.map);
  state.routeLayer = L.layerGroup().addTo(state.map);
  if ("ResizeObserver" in window && ui.mapPanel) {
    state.mapResizeObserver = new ResizeObserver(() => scheduleMapInvalidate(80));
    state.mapResizeObserver.observe(ui.mapPanel);
  }

  addLegend();
  wireEvents();
  renderComparisonResults([], "reach");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  refreshCatalogInBackground();
}

async function refreshCatalogInBackground() {
  const manifest = await loadCatalogManifest();
  if (manifest) {
    state.catalogManifest = manifest;
    state.catalogSource = manifest.source || "Generated catalog (split)";
    const bootstrap = Array.isArray(manifest.bootstrapMarkets) ? manifest.bootstrapMarkets : [];
    const preferred =
      bootstrap.length > 0 ? bootstrap : desiredCatalogMarketsForCountry(state.marketCode, manifest);
    const loaded = await ensureCatalogMarketsLoaded(preferred, manifest);
    if (loaded || state.catalogSliceByMarket.size > 0) {
      rebuildCatalogFromSlices();
      return;
    }
  }

  const generatedCatalog = await loadGeneratedCarCatalog();
  if (!generatedCatalog) return;

  carPresets = mergeCarPresets(BASE_CAR_PRESETS, generatedCatalog.presets || []);
  setPresetIndex();
  state.catalogSource = generatedCatalog.source || "Generated catalog";
  state.catalogCount = carPresets.length;
  populateCarPresets();
  updateMarketHint(state.origin?.countryName || "");
}

function wireEvents() {
  ui.form.addEventListener("submit", onPlanSubmit);
  ui.carModelSelect.addEventListener("change", () => onCarModelChange(true));
  ui.compareCarsSelect.addEventListener("change", onCompareCarsChange);
  ui.useLocationBtn.addEventListener("click", useCurrentLocation);
  ui.locationInput.addEventListener("focus", onLocationInputFocus);
  ui.locationInput.addEventListener("blur", onLocationInputBlur);
  ui.locationInput.addEventListener("input", onLocationInputChanged);
  ui.locationInput.addEventListener("keydown", onLocationInputKeydown);
  if (ui.locationSuggestions) {
    ui.locationSuggestions.addEventListener("mousedown", onLocationSuggestionPointerDown);
  }
  ui.verificationProfileSelect.addEventListener("change", onVerificationProfileChange);
  document.querySelectorAll(".controls-panel details").forEach((details) => {
    details.addEventListener("toggle", () => scheduleMapInvalidate(160));
  });
  window.addEventListener("resize", () => scheduleMapInvalidate(120));
  onVerificationProfileChange();
  ui.summary.addEventListener("click", (e) => {
    const btn = e.target.closest(".share-btn");
    if (btn) onShareBtnClick(btn);
  });
  if (ui.appResetBtn) {
    ui.appResetBtn.addEventListener("click", hardRefreshApp);
  }
}

function hardRefreshApp() {
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));
  window.location.replace(url.toString());
}

function scheduleMapInvalidate(delayMs = 120) {
  if (!state.map) return;
  if (state.mapResizeTimer) {
    clearTimeout(state.mapResizeTimer);
  }
  state.mapResizeTimer = setTimeout(() => {
    state.map.invalidateSize({ pan: false, animate: false });
  }, delayMs);
}

function resetChargerLayer() {
  if (!state.map) return;
  if (state.chargerLayer) {
    state.map.removeLayer(state.chargerLayer);
  }
  state.chargerLayer = L.layerGroup().addTo(state.map);
}

function populateCarPresets() {
  const previousSelection = ui.carModelSelect.value || "custom";
  ui.carModelSelect.innerHTML = "";
  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "Custom (manual values)";
  ui.carModelSelect.append(customOption);
  const sorted = [...carPresets].sort((a, b) => a.label.localeCompare(b.label));
  const { visiblePresets, hasMarketSpecific, groupLabel } = visiblePresetsForCurrentMarket(sorted);
  state.visiblePresets = visiblePresets;
  state.marketCatalogMode = state.marketCode === "GLOBAL" ? "All models" : groupLabel;

  if (state.marketCode === "GLOBAL") {
    appendPresetOptions(ui.carModelSelect, visiblePresets);
  } else {
    appendPresetOptgroup(ui.carModelSelect, hasMarketSpecific ? "Available models" : groupLabel, visiblePresets);
  }

  if ([...ui.carModelSelect.options].some((option) => option.value === previousSelection)) {
    ui.carModelSelect.value = previousSelection;
  } else {
    ui.carModelSelect.value = "custom";
  }

  populateCompareCarOptions();
}

function onCarModelChange(userInitiated = false) {
  if (userInitiated) {
    state.userSelectedCarModel = true;
  }

  const presetId = ui.carModelSelect.value;
  if (presetId === "custom") {
    ui.carHint.textContent = "Custom mode enabled. Enter your own battery and efficiency values.";
    syncCompareSelectionExclusions("custom");
    onCompareCarsChange();
    return;
  }

  const preset = getPresetById(presetId);
  if (!preset) {
    ui.carHint.textContent = "Preset not found. You can continue with manual values.";
    syncCompareSelectionExclusions("custom");
    onCompareCarsChange();
    return;
  }

  ui.batteryInput.value = String(preset.batteryKwh);
  ui.efficiencyInput.value = String(preset.efficiency);
  ui.reserveInput.value = String(preset.reserve);
  ui.carHint.textContent =
    `${preset.label} loaded: ${preset.batteryKwh} kWh, ${preset.efficiency} kWh/100 km.`;
  syncCompareSelectionExclusions(presetId);
  onCompareCarsChange();
}

function populateCompareCarOptions() {
  const selectedBefore = [...ui.compareCarsSelect.selectedOptions].map((option) => option.value);
  const currentCarId = ui.carModelSelect.value;
  ui.compareCarsSelect.length = 0;

  const visiblePresets =
    Array.isArray(state.visiblePresets) && state.visiblePresets.length > 0
      ? state.visiblePresets
      : visiblePresetsForCurrentMarket([...carPresets].sort((a, b) => a.label.localeCompare(b.label))).visiblePresets;
  const fragment = document.createDocumentFragment();

  for (const preset of visiblePresets) {
    if (preset.id === currentCarId) continue;
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    option.selected = selectedBefore.includes(preset.id);
    fragment.append(option);
  }
  ui.compareCarsSelect.append(fragment);

  syncCompareSelectionExclusions(currentCarId);
  onCompareCarsChange();
}

function syncCompareSelectionExclusions(currentCarId) {
  const currentId = String(currentCarId || "custom");
  for (const option of ui.compareCarsSelect.options) {
    const shouldHide = currentId !== "custom" && option.value === currentId;
    option.hidden = shouldHide;
    if (shouldHide) {
      option.selected = false;
    }
  }
}

function onCompareCarsChange() {
  const selected = [...ui.compareCarsSelect.options].filter((option) => option.selected);
  if (selected.length <= 3) return;
  selected.slice(3).forEach((option) => {
    option.selected = false;
  });
}

function onVerificationProfileChange() {
  const isOfficial = ui.verificationProfileSelect.value === "official";
  const overpassOnlyOption = ui.providerSelect.querySelector('option[value="overpass"]');
  if (overpassOnlyOption) {
    overpassOnlyOption.disabled = isOfficial;
  }
  if (isOfficial && ui.providerSelect.value === "overpass") {
    ui.providerSelect.value = "auto";
  }
}

function activeCatalogChannelConfig() {
  return CATALOG_CHANNELS[state.catalogChannel] || CATALOG_CHANNELS.stable;
}

function scopedCatalogCacheKey(baseKey) {
  return `${baseKey}:${state.catalogChannel}`;
}

async function loadGeneratedCarCatalog() {
  const cached = readCatalogFromStorage();
  try {
    const response = await fetch(activeCatalogChannelConfig().fallbackPath, {
      cache: "no-store",
    });
    if (!response.ok) {
      return cached;
    }
    const data = await response.json();
    if (!isCatalogPayloadValid(data)) {
      return cached;
    }
    writeCatalogToStorage(data);
    return data;
  } catch {
    return cached;
  }
}

async function loadCatalogManifest() {
  const cached = readCatalogManifestFromStorage();
  try {
    const response = await fetch(activeCatalogChannelConfig().manifestPath, {
      cache: "no-store",
    });
    if (!response.ok) {
      return cached;
    }
    const payload = await response.json();
    if (!isCatalogManifestValid(payload)) {
      return cached;
    }
    writeCatalogManifestToStorage(payload);
    return payload;
  } catch {
    return cached;
  }
}

function isCatalogManifestValid(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (!payload.markets || typeof payload.markets !== "object") return false;
  const entries = Object.entries(payload.markets);
  if (entries.length === 0) return false;
  return entries.every(([code, meta]) => {
    if (!/^[A-Z]{2,6}$/.test(String(code || "").toUpperCase())) return false;
    if (!meta || typeof meta !== "object") return false;
    if (!Number.isFinite(Number(meta.count)) || Number(meta.count) <= 0) return false;
    if (typeof meta.file !== "string" || !meta.file.trim()) return false;
    return true;
  });
}

function writeCatalogManifestToStorage(payload) {
  writeJsonToStorage(scopedCatalogCacheKey(CATALOG_MANIFEST_CACHE_KEY), {
    storedAt: Date.now(),
    payload,
  });
}

function readCatalogManifestFromStorage() {
  const cached = readJsonFromStorage(scopedCatalogCacheKey(CATALOG_MANIFEST_CACHE_KEY));
  if (!cached || typeof cached !== "object") return null;
  const storedAt = Number(cached.storedAt);
  if (!Number.isFinite(storedAt)) return null;
  if (Date.now() - storedAt > CATALOG_CACHE_TTL_MS) return null;
  if (!isCatalogManifestValid(cached.payload)) return null;
  return cached.payload;
}

function readCatalogMarketCache() {
  const cached = readJsonFromStorage(scopedCatalogCacheKey(CATALOG_MARKET_CACHE_KEY));
  if (!cached || typeof cached !== "object") return {};
  const storedAt = Number(cached.storedAt);
  if (!Number.isFinite(storedAt)) return {};
  if (Date.now() - storedAt > CATALOG_CACHE_TTL_MS) return {};
  if (!cached.payload || typeof cached.payload !== "object") return {};
  return cached.payload;
}

function writeCatalogMarketCache(cachePayload) {
  writeJsonToStorage(scopedCatalogCacheKey(CATALOG_MARKET_CACHE_KEY), {
    storedAt: Date.now(),
    payload: cachePayload,
  });
}

function readCatalogMarketSliceFromStorage(marketCode, meta) {
  const cache = readCatalogMarketCache();
  const entry = cache[String(marketCode || "").toUpperCase()];
  if (!entry || typeof entry !== "object") return null;
  if (String(entry.sha256 || "") !== String(meta?.sha256 || "")) return null;
  if (!isCatalogPayloadValid(entry.payload)) return null;
  return entry.payload;
}

function writeCatalogMarketSliceToStorage(marketCode, meta, payload) {
  const key = String(marketCode || "").toUpperCase();
  const cache = readCatalogMarketCache();
  const next = {
    ...cache,
    [key]: {
      sha256: String(meta?.sha256 || ""),
      file: String(meta?.file || ""),
      payload,
    },
  };
  const orderedKeys = Object.keys(next).sort((a, b) => a.localeCompare(b));
  while (orderedKeys.length > MAX_CACHED_MARKET_SLICES) {
    const victim = orderedKeys.shift();
    if (!victim) break;
    delete next[victim];
  }
  writeCatalogMarketCache(next);
}

function manifestMarketCountsByCode(manifest) {
  const counts = new Map();
  if (!manifest || typeof manifest !== "object" || !manifest.markets) {
    return counts;
  }
  for (const [marketCode, meta] of Object.entries(manifest.markets)) {
    const normalized = String(marketCode || "").toUpperCase();
    const count = Number(meta?.count);
    if (!/^[A-Z]{2,6}$/.test(normalized)) continue;
    if (!Number.isFinite(count) || count <= 0) continue;
    counts.set(normalized, Math.round(count));
  }
  return counts;
}

function desiredCatalogMarketsForCountry(countryCode, manifest = state.catalogManifest) {
  if (!manifest || typeof manifest !== "object" || !manifest.markets) return [];
  const availableMarkets = manifest.markets;
  const normalizedCountryCode = String(countryCode || "").toUpperCase();
  const desired = [];

  if (normalizedCountryCode && availableMarkets[normalizedCountryCode]) {
    desired.push(normalizedCountryCode);
  }

  const proxyCounts = manifestMarketCountsByCode(manifest);
  const { codes: proxyCodes } = proxyMarketCodesForCountry(normalizedCountryCode, proxyCounts);
  for (const code of proxyCodes) {
    if (availableMarkets[code]) {
      desired.push(code);
    }
  }

  if (desired.length === 0 && Array.isArray(manifest.bootstrapMarkets)) {
    for (const codeRaw of manifest.bootstrapMarkets) {
      const code = String(codeRaw || "").toUpperCase();
      if (availableMarkets[code]) {
        desired.push(code);
      }
    }
  }

  if (availableMarkets.GLOBAL) {
    desired.push("GLOBAL");
  }

  return [...new Set(desired)];
}

async function loadCatalogMarketSlice(marketCode, manifest = state.catalogManifest) {
  const code = String(marketCode || "").toUpperCase();
  if (!code || !manifest?.markets || !manifest.markets[code]) return false;
  const meta = manifest.markets[code];
  const cached = readCatalogMarketSliceFromStorage(code, meta);
  if (cached) {
    state.catalogSliceByMarket.set(code, cached.presets || []);
    return true;
  }

  try {
    const response = await fetch(meta.file, { cache: "no-store" });
    if (!response.ok) {
      return false;
    }
    const payload = await response.json();
    if (!isCatalogPayloadValid(payload)) {
      return false;
    }
    state.catalogSliceByMarket.set(code, payload.presets || []);
    writeCatalogMarketSliceToStorage(code, meta, payload);
    return true;
  } catch {
    return false;
  }
}

async function ensureCatalogMarketsLoaded(marketCodes, manifest = state.catalogManifest) {
  let changed = false;
  for (const rawCode of marketCodes || []) {
    const code = String(rawCode || "").toUpperCase();
    if (!code) continue;
    if (state.catalogSliceByMarket.has(code)) continue;

    const inFlight = state.catalogSliceLoadByMarket.get(code);
    if (inFlight) {
      const wasLoaded = await inFlight;
      changed = changed || wasLoaded;
      continue;
    }

    const pending = loadCatalogMarketSlice(code, manifest)
      .catch(() => false)
      .finally(() => {
        state.catalogSliceLoadByMarket.delete(code);
      });
    state.catalogSliceLoadByMarket.set(code, pending);
    const wasLoaded = await pending;
    changed = changed || wasLoaded;
  }
  return changed;
}

function rebuildCatalogFromSlices() {
  const generatedPresets = [];
  for (const code of [...state.catalogSliceByMarket.keys()].sort((a, b) => a.localeCompare(b))) {
    const items = state.catalogSliceByMarket.get(code);
    if (Array.isArray(items)) {
      generatedPresets.push(...items);
    }
  }
  carPresets = mergeCarPresets(BASE_CAR_PRESETS, generatedPresets);
  setPresetIndex();
  const loadedMarkets = [...state.catalogSliceByMarket.keys()].sort((a, b) => a.localeCompare(b));
  const source = state.catalogManifest?.source || "Generated catalog (split)";
  state.catalogSource = `${source} [${loadedMarkets.join(", ")}]`;
  state.catalogCount = carPresets.length;
  populateCarPresets();
  updateMarketHint(state.origin?.countryName || "");
}

function isCatalogPayloadValid(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (!Array.isArray(payload.presets)) return false;
  if (payload.presets.length === 0) return false;
  if (payload.presets.length > 20000) return false;
  return payload.presets.every((item) => item && typeof item.id === "string");
}

function writeCatalogToStorage(payload) {
  writeJsonToStorage(scopedCatalogCacheKey(CATALOG_CACHE_KEY), {
    storedAt: Date.now(),
    payload,
  });
}

function readCatalogFromStorage() {
  const cached = readJsonFromStorage(scopedCatalogCacheKey(CATALOG_CACHE_KEY));
  if (!cached || typeof cached !== "object") return null;
  const storedAt = Number(cached.storedAt);
  if (!Number.isFinite(storedAt)) return null;
  if (Date.now() - storedAt > CATALOG_CACHE_TTL_MS) return null;
  if (!isCatalogPayloadValid(cached.payload)) return null;
  return {
    ...cached.payload,
    source: `${cached.payload.source || "Generated catalog"} (cached)`,
  };
}

function mergeCarPresets(basePresets, generatedPresets) {
  const mergedById = new Map();
  const all = [...basePresets, ...generatedPresets];

  for (const item of all) {
    if (!item || typeof item.id !== "string") continue;
    if (!Number.isFinite(Number(item.batteryKwh))) continue;
    if (!Number.isFinite(Number(item.efficiency))) continue;
    const marketPrices = normalizeMarketPrices(item.marketPrices);
    const fallbackUsdFromMarket = Number(marketPrices.USD?.amount);
    const priceUsdValue = Number(item.priceUsd ?? item.price ?? fallbackUsdFromMarket);
    const normalized = {
      id: item.id,
      label: item.label || item.id,
      batteryKwh: round1(Number(item.batteryKwh)),
      efficiency: round1(Number(item.efficiency)),
      reserve: Number.isFinite(Number(item.reserve)) ? Number(item.reserve) : 10,
      markets: normalizeMarketArray(item.markets),
      priceUsd: Number.isFinite(priceUsdValue) ? Math.round(priceUsdValue) : null,
      marketPrices,
    };
    const canonicalId = canonicalPresetId(normalized.id, normalized.markets);
    const existing = mergedById.get(canonicalId);
    if (!existing || shouldReplacePreset(existing, normalized)) {
      mergedById.set(canonicalId, {
        ...normalized,
        id: canonicalId,
      });
    }
  }

  return Array.from(mergedById.values()).sort((a, b) => {
    const labelCompare = a.label.localeCompare(b.label);
    if (labelCompare !== 0) return labelCompare;
    return a.id.localeCompare(b.id);
  });
}

function canonicalPresetId(id, markets) {
  const raw = String(id || "").trim();
  if (!raw) return raw;
  const normalizedMarkets = normalizeMarketArray(markets);
  if (
    raw.endsWith("-in") &&
    normalizedMarkets.includes("IN") &&
    !normalizedMarkets.includes("US")
  ) {
    return raw.slice(0, -3);
  }
  return raw;
}

function shouldReplacePreset(existing, candidate) {
  const existingMarketPricesCount = Object.keys(existing?.marketPrices || {}).length;
  const candidateMarketPricesCount = Object.keys(candidate?.marketPrices || {}).length;
  if (candidateMarketPricesCount !== existingMarketPricesCount) {
    return candidateMarketPricesCount > existingMarketPricesCount;
  }

  const existingHasUsdPrice = Number.isFinite(Number(existing?.priceUsd));
  const candidateHasUsdPrice = Number.isFinite(Number(candidate?.priceUsd));
  if (candidateHasUsdPrice !== existingHasUsdPrice) {
    return candidateHasUsdPrice;
  }

  const existingMarketCount = normalizeMarketArray(existing?.markets).length;
  const candidateMarketCount = normalizeMarketArray(candidate?.markets).length;
  if (candidateMarketCount !== existingMarketCount) {
    return candidateMarketCount > existingMarketCount;
  }

  const existingBattery = Number(existing?.batteryKwh);
  const candidateBattery = Number(candidate?.batteryKwh);
  return Number.isFinite(candidateBattery) && candidateBattery > existingBattery;
}

function appendPresetOptions(parent, presets) {
  const fragment = document.createDocumentFragment();
  for (const preset of presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    fragment.append(option);
  }
  parent.append(fragment);
}

function appendPresetOptgroup(parent, label, presets) {
  if (!presets.length) return;
  const group = document.createElement("optgroup");
  group.label = label;
  appendPresetOptions(group, presets);
  parent.append(group);
}

function visiblePresetsForCurrentMarket(sortedPresets) {
  if (state.marketCode === "GLOBAL") {
    return { visiblePresets: sortedPresets, hasMarketSpecific: false, groupLabel: "All models" };
  }

  const marketMatched = [];
  const marketGlobal = [];
  const marketCounts = marketCountsByCode(sortedPresets);
  const hasStrictSourcePolicy = Array.isArray(MARKET_LOCAL_SOURCE_TOKENS[state.marketCode]);

  for (const preset of sortedPresets) {
    const markets = normalizeMarketArray(preset.markets);
    if (markets.includes(state.marketCode) && isPresetSourceAllowedForMarket(preset, state.marketCode)) {
      marketMatched.push(preset);
    } else if (markets.length === 0) {
      marketGlobal.push(preset);
    }
  }

  if (marketMatched.length > 0) {
    if (!hasStrictSourcePolicy || marketMatched.length >= STRICT_LOCAL_MARKET_MIN_PRESETS) {
      return {
        visiblePresets: marketMatched,
        hasMarketSpecific: true,
        groupLabel: "Available models",
      };
    }
  }

  const { codes: proxyCodes } = proxyMarketCodesForCountry(state.marketCode, marketCounts);
  if (proxyCodes.length > 0) {
    const proxyMatched = collectProxyMatchedPresets(sortedPresets, proxyCodes);
    if (proxyMatched.length > 0) {
      const proxyLabel = proxyCodes.map((code) => marketLabelFromCode(code)).join(" + ");
      if (marketMatched.length > 0) {
        const merged = dedupePresetsById([...marketMatched, ...proxyMatched]);
        return {
          visiblePresets: merged,
          hasMarketSpecific: true,
          groupLabel: `Available + proxy models (${proxyLabel})`,
        };
      }
      return {
        visiblePresets: proxyMatched,
        hasMarketSpecific: false,
        groupLabel: `Proxy models (${proxyLabel})`,
      };
    }
  }

  if (marketMatched.length > 0) {
    return {
      visiblePresets: marketMatched,
      hasMarketSpecific: true,
      groupLabel: "Available models",
    };
  }

  if (hasStrictSourcePolicy) {
    return {
      visiblePresets: [],
      hasMarketSpecific: false,
      groupLabel: "No verified local models",
    };
  }

  if (sortedPresets.length > marketGlobal.length) {
    return {
      visiblePresets: sortedPresets,
      hasMarketSpecific: false,
      groupLabel: "Cross-market models",
    };
  }
  return {
    visiblePresets: marketGlobal,
    hasMarketSpecific: false,
    groupLabel: "Global models",
  };
}

function normalizeMarketArray(markets) {
  if (!Array.isArray(markets)) return [];
  return [...new Set(markets.map((value) => String(value || "").toUpperCase()).filter(Boolean))];
}

function dedupePresetsById(presets) {
  const out = [];
  const seen = new Set();
  for (const preset of presets) {
    const id = String(preset?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(preset);
  }
  return out;
}

function isPresetSourceAllowedForMarket(preset, marketCode) {
  const code = String(marketCode || "").toUpperCase();
  const allowedTokens = MARKET_LOCAL_SOURCE_TOKENS[code];
  if (!Array.isArray(allowedTokens) || allowedTokens.length === 0) return true;

  const markets = normalizeMarketArray(preset?.markets);
  if (!markets.includes(code)) return false;

  const marketPrices = preset?.marketPrices;
  if (marketPrices && typeof marketPrices === "object" && marketPrices[code]) {
    return true;
  }

  const source = String(preset?.source || "").trim().toLowerCase();
  if (!source) return true;
  return allowedTokens.some((token) => source.includes(token));
}

function collectProxyMatchedPresets(sortedPresets, proxyCodes) {
  const out = [];
  const seen = new Set();
  for (const preset of sortedPresets) {
    const matched = proxyCodes.some((proxyCode) => isPresetSourceAllowedForMarket(preset, proxyCode));
    if (!matched) continue;
    const id = String(preset?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(preset);
  }
  return out;
}

function normalizeMarketPrices(marketPrices) {
  if (!marketPrices || typeof marketPrices !== "object") return {};
  const normalized = {};
  for (const [marketCodeRaw, value] of Object.entries(marketPrices)) {
    const marketCode = String(marketCodeRaw || "").toUpperCase();
    const amount = Number(value?.amount);
    const currency = String(value?.currency || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(marketCode)) continue;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!/^[A-Z]{3}$/.test(currency)) continue;
    normalized[marketCode] = {
      amount: Math.round(amount),
      currency,
      source: String(value?.source || "").trim(),
      updatedAt: String(value?.updatedAt || "").trim(),
    };
  }
  return normalized;
}

function marketLabelFromCode(code) {
  if (!code || code === "GLOBAL") return "Global";
  if (MARKET_LABELS[code]) return MARKET_LABELS[code];
  if (REGION_DISPLAY_NAMES) {
    try {
      return REGION_DISPLAY_NAMES.of(code) || code;
    } catch {
      return code;
    }
  }
  return code;
}

function marketClusterForCountry(code) {
  const normalized = String(code || "").toUpperCase();
  return MARKET_CLUSTER_BY_COUNTRY[normalized] || "GLOBAL";
}

function marketCountsByCode(presets) {
  const counts = new Map();
  for (const preset of presets) {
    for (const code of normalizeMarketArray(preset.markets)) {
      counts.set(code, (counts.get(code) || 0) + 1);
    }
  }
  return counts;
}

function proxyMarketCodesForCountry(code, counts) {
  const cluster = marketClusterForCountry(code);
  const preferred = MARKET_PROXY_BY_CLUSTER[cluster] || MARKET_PROXY_BY_CLUSTER.GLOBAL;
  const available = [];
  for (const marketCode of preferred) {
    if ((counts.get(marketCode) || 0) > 0) {
      available.push(marketCode);
      if (available.length >= MAX_PROXY_MARKET_CODES) {
        break;
      }
    }
  }
  return {
    cluster,
    codes: available,
  };
}

function inferAndApplyMarket(origin) {
  const shouldAutoInferModel = !state.userSelectedCarModel && ui.carModelSelect.value === "custom";
  const code = String(origin?.countryCode || "").toUpperCase();
  if (!code) {
    state.marketCode = "GLOBAL";
    state.marketLabel = "Global";
    state.marketCluster = "GLOBAL";
    state.marketClusterLabel = "Global";
    populateCarPresets();
    updateMarketHint();
    ensureCatalogMarketsLoaded(desiredCatalogMarketsForCountry("GLOBAL")).then((loaded) => {
      if (loaded) rebuildCatalogFromSlices();
    });
    if (shouldAutoInferModel) {
      autoInferModelForMarket();
    }
    return;
  }

  state.marketCode = code;
  state.marketLabel = marketLabelFromCode(code);
  state.marketCluster = marketClusterForCountry(code);
  state.marketClusterLabel = MARKET_CLUSTER_LABELS[state.marketCluster] || state.marketCluster;
  populateCarPresets();
  updateMarketHint(origin.countryName || "");
  ensureCatalogMarketsLoaded(desiredCatalogMarketsForCountry(code)).then((loaded) => {
    if (loaded) rebuildCatalogFromSlices();
  });
  ensureMarketCurrencyRate(code).catch(() => {});
  if (shouldAutoInferModel) {
    autoInferModelForMarket();
  }
}

function updateMarketHint(countryName = "") {
  const countryText = countryName ? ` (${countryName})` : "";
  const clusterText = state.marketCode === "GLOBAL" ? "" : ` Cluster: ${state.marketClusterLabel}.`;
  const catalogChannelLabel = activeCatalogChannelConfig().label;
  ui.marketHint.textContent = `Market: ${state.marketLabel}${countryText}.`;
  if (ui.marketDetailHint) {
    ui.marketDetailHint.textContent =
      `Showing: ${state.marketCatalogMode}. Catalog: ${state.catalogCount} presets (${state.catalogSource}, ${catalogChannelLabel}).${clusterText}`;
  }
}

function autoInferModelForMarket() {
  const presetId = findRecommendedPresetIdForMarket();
  if (!presetId) return;

  ui.carModelSelect.value = presetId;
  onCarModelChange(false);
  const preset = getPresetById(presetId);
  if (preset) {
    ui.carHint.textContent =
      `Auto-inferred model for ${state.marketLabel}: ${preset.label}. You can change it anytime.`;
  }
}

function findRecommendedPresetIdForMarket() {
  const sorted = [...carPresets].sort((a, b) => a.label.localeCompare(b.label));
  const hasStrictSourcePolicy = Array.isArray(MARKET_LOCAL_SOURCE_TOKENS[state.marketCode]);
  if (state.marketCode !== "GLOBAL") {
    const exact = sorted.find(
      (item) =>
        normalizeMarketArray(item.markets).includes(state.marketCode) &&
        isPresetSourceAllowedForMarket(item, state.marketCode)
    );
    if (exact) return exact.id;

    const { codes: proxyCodes } = proxyMarketCodesForCountry(state.marketCode, marketCountsByCode(sorted));
    if (proxyCodes.length > 0) {
      const proxyMatched = collectProxyMatchedPresets(sorted, proxyCodes);
      if (proxyMatched.length > 0) {
        return proxyMatched[0].id;
      }
    }

    if (hasStrictSourcePolicy) {
      return null;
    }
  }
  const global = sorted.find((item) => normalizeMarketArray(item.markets).length === 0);
  if (global) return global.id;
  return sorted[0]?.id || null;
}

async function onPlanSubmit(event) {
  event.preventDefault();
  const submitMode = event.submitter?.id === "compare-btn" ? "compare" : "reach";
  const activeBtn = submitMode === "compare" ? ui.compareBtn : ui.planBtn;
  const shouldGlow = submitMode === "reach";
  const originalBtnText = activeBtn.textContent;
  if (shouldGlow) {
    ui.planBtn.classList.add("is-loading");
  }
  activeBtn.disabled = true;
  activeBtn.setAttribute("aria-busy", "true");
  activeBtn.textContent = submitMode === "compare" ? "Comparing…" : "Computing…";

  state.lastSubmitMode = submitMode;
  setSummary(
    submitMode === "compare"
      ? "<p>Running side-by-side comparison and loading charging points...</p>"
      : "<p>Planning reach zones and loading charging points...</p>"
  );

  clearRoute();
  cancelChargerRender();
  resetChargerLayer();

  try {
    const planInput = parsePlanInput();
    if (submitMode === "compare" && planInput.compareCarIds.length === 0) {
      throw new Error("Select at least one car in Compare Cars before pressing Compare Cars.");
    }
    const origin = await resolveOrigin(planInput.locationQuery);
    const baseRangeKm = calculateRangeKm(planInput);
    const fetchRangeKm =
      submitMode === "compare" ? getMaxComparisonRangeKm(planInput, baseRangeKm) : baseRangeKm;

    state.origin = origin;
    state.lastVerificationProfile = planInput.verificationProfile;
    inferAndApplyMarket(origin);
    const fxLoadPromise = ensureMarketCurrencyRate(state.marketCode);
    state.oneWayRangeKm = baseRangeKm;
    state.lastCarModelLabel = planInput.carModelLabel;
    renderOrigin(origin);
    renderRangeCircles(origin, baseRangeKm);
    setSummary("<p>Reach zones ready. Loading nearby chargers...</p>");

    let chargers = [];
    let visibleChargers = [];
    let compareRows = [];
    let warning = "";
    let effectiveRangeKm = baseRangeKm;
    let effectiveVehicleLabel = planInput.carModelLabel;
    try {
      chargers = await getNearbyChargers(origin, fetchRangeKm, planInput);
      compareRows = buildComparisonRows(planInput, baseRangeKm);
      if (submitMode === "compare" && compareRows.length > 1) {
        const bestIndex = pickBestReachRowIndex(compareRows);
        const bestRow = compareRows[bestIndex];
        effectiveRangeKm = bestRow.oneWayKm;
        effectiveVehicleLabel = bestRow.label;
        syncPrimaryVehicleFromComparison(bestRow);
      }
      visibleChargers = filterVisibleChargers(chargers, effectiveRangeKm);
    } catch (error) {
      const cachedFallbackChargers = getCachedChargersFallback(origin, fetchRangeKm);
      warning = error.message;
      if (cachedFallbackChargers.length > 0) {
        chargers = cachedFallbackChargers;
        compareRows = buildComparisonRows(planInput, baseRangeKm);
        if (submitMode === "compare" && compareRows.length > 1) {
          const bestIndex = pickBestReachRowIndex(compareRows);
          const bestRow = compareRows[bestIndex];
          effectiveRangeKm = bestRow.oneWayKm;
          effectiveVehicleLabel = bestRow.label;
          syncPrimaryVehicleFromComparison(bestRow);
        }
        visibleChargers = filterVisibleChargers(chargers, effectiveRangeKm);
        warning += " Showing cached chargers from your last successful fetch.";
      } else {
        compareRows = buildComparisonRows(planInput, baseRangeKm);
        if (submitMode === "compare" && compareRows.length > 1) {
          const bestIndex = pickBestReachRowIndex(compareRows);
          const bestRow = compareRows[bestIndex];
          effectiveRangeKm = bestRow.oneWayKm;
          effectiveVehicleLabel = bestRow.label;
          syncPrimaryVehicleFromComparison(bestRow);
        }
        warning += " Reach zones are shown without charger pins.";
      }
    }

    if (visibleChargers.length === 0 && chargers.length > 0) {
      const nearestFallbackCount = Math.min(12, chargers.length);
      visibleChargers = chargers.slice(0, nearestFallbackCount);
      warning = warning
        ? `${warning} No chargers are inside one-way reach; showing nearest nearby chargers.`
        : "No chargers are inside one-way reach; showing nearest nearby chargers.";
    }

    state.oneWayRangeKm = effectiveRangeKm;
    state.lastCarModelLabel = effectiveVehicleLabel;
    if (Math.abs(effectiveRangeKm - baseRangeKm) > 0.05) {
      renderRangeCircles(origin, effectiveRangeKm);
    }
    state.lastChargers = chargers;
    if (visibleChargers.length > 0) {
      renderChargers(visibleChargers, effectiveRangeKm);
    } else {
      cancelChargerRender();
    }
    await fxLoadPromise.catch(() => {});
    renderComparisonResults(compareRows, submitMode);
    renderSummary(
      origin,
      effectiveRangeKm,
      chargers,
      visibleChargers,
      planInput.provider,
      warning,
      effectiveVehicleLabel,
      planInput.maxResults,
      planInput.verificationProfile,
      compareRows,
      submitMode
    );
    if (submitMode === "reach") {
      focusMapOnMobile();
    }
    pushUrlState();
    saveRecentLocation(planInput.locationQuery);
  } catch (error) {
    setSummary(`<p class="warning">${escapeHtml(error.message)}</p>`);
  } finally {
    activeBtn.disabled = false;
    activeBtn.removeAttribute("aria-busy");
    if (shouldGlow) {
      ui.planBtn.classList.remove("is-loading");
    }
    activeBtn.textContent = originalBtnText;
  }
}

function focusMapOnMobile() {
  if (!window.matchMedia(MOBILE_LAYOUT_QUERY).matches) return;
  if (!ui.mapPanel || !ui.mapElement) return;
  ui.mapPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    ui.mapElement.focus({ preventScroll: true });
  }, 260);
}

function syncPrimaryVehicleFromComparison(bestRow) {
  if (!bestRow || !bestRow.carId) return;

  if (bestRow.carId === "custom") {
    ui.carModelSelect.value = "custom";
    if (Number.isFinite(bestRow.batteryKwh)) {
      ui.batteryInput.value = String(round1(bestRow.batteryKwh));
    }
    if (Number.isFinite(bestRow.efficiency)) {
      ui.efficiencyInput.value = String(round1(bestRow.efficiency));
    }
    if (Number.isFinite(bestRow.reserve)) {
      ui.reserveInput.value = String(Math.round(bestRow.reserve));
    }
    ui.carHint.textContent = `Best comparison match now on map: ${bestRow.label}.`;
    populateCompareCarOptions();
    return;
  }

  const hasPresetOption = [...ui.carModelSelect.options].some((option) => option.value === bestRow.carId);
  if (!hasPresetOption) return;
  ui.carModelSelect.value = bestRow.carId;
  onCarModelChange(false);
}

function parsePlanInput() {
  const selectedCarId = ui.carModelSelect.value;
  const carModelLabel = ui.carModelSelect.options[ui.carModelSelect.selectedIndex]?.text || "Custom";
  const compareCarIds = [...ui.compareCarsSelect.selectedOptions]
    .map((option) => option.value)
    .filter((id) => id && id !== selectedCarId)
    .slice(0, 3);
  const batteryKwh = Number(ui.batteryInput.value);
  const soc = Number(ui.socInput.value);
  const efficiency = Number(ui.efficiencyInput.value);
  const reserve = Number(ui.reserveInput.value);
  const provider = ui.providerSelect.value;
  const verificationProfile = ui.verificationProfileSelect.value;
  const maxResults = Math.max(20, Math.min(500, Number(ui.maxResultsInput.value || DEFAULT_MAX_RESULTS)));
  const locationQuery = ui.locationInput.value.trim();

  if (Number.isNaN(batteryKwh) || batteryKwh <= 0) {
    throw new Error("Battery capacity must be greater than 0.");
  }
  if (Number.isNaN(soc) || soc <= 0 || soc > 100) {
    throw new Error("Current charge must be between 1 and 100.");
  }
  if (Number.isNaN(efficiency) || efficiency <= 0) {
    throw new Error("Consumption must be greater than 0.");
  }
  if (Number.isNaN(reserve) || reserve < 0 || reserve >= soc) {
    throw new Error("Battery reserve must be below the current charge.");
  }
  if (!["independent", "official"].includes(verificationProfile)) {
    throw new Error("Invalid verification profile.");
  }
  return {
    selectedCarId,
    carModelLabel,
    compareCarIds,
    batteryKwh,
    soc,
    efficiency,
    reserve,
    provider,
    maxResults,
    verificationProfile,
    locationQuery,
  };
}

function calculateRangeKm({ batteryKwh, soc, efficiency, reserve, verificationProfile }) {
  return calculateRangeForSpecs({ batteryKwh, soc, efficiency, reserve, verificationProfile });
}

function calculateRangeForSpecs({ batteryKwh, soc, efficiency, reserve, verificationProfile }) {
  const usableEnergyKwh = batteryKwh * ((soc - reserve) / 100);
  const rawRangeKm = (usableEnergyKwh / efficiency) * 100;
  const profileFactor = verificationProfile === "official" ? OFFICIAL_RANGE_BUFFER : 1;
  const oneWayRangeKm = rawRangeKm * profileFactor;
  return Math.max(1, oneWayRangeKm);
}

function getMaxComparisonRangeKm(planInput, baseOneWayRangeKm) {
  let maxKm = baseOneWayRangeKm;
  for (const carId of planInput.compareCarIds) {
    const preset = getPresetById(carId);
    if (!preset) continue;
    const km = calculateRangeForSpecs({
      batteryKwh: preset.batteryKwh,
      soc: planInput.soc,
      efficiency: preset.efficiency,
      reserve: preset.reserve,
      verificationProfile: planInput.verificationProfile,
    });
    if (km > maxKm) {
      maxKm = km;
    }
  }
  return maxKm;
}

function buildComparisonRows(planInput, baseOneWayRangeKm) {
  const selectedPreset =
    planInput.selectedCarId && planInput.selectedCarId !== "custom"
      ? getPresetById(planInput.selectedCarId)
      : null;
  const baseLabel =
    planInput.selectedCarId === "custom" ? "Current setup (custom)" : planInput.carModelLabel;
  const rows = [
    {
      label: baseLabel,
      carId: planInput.selectedCarId || "custom",
      oneWayKm: baseOneWayRangeKm,
      kmPerKwh: efficiencyToKmPerKwh(planInput.efficiency),
      priceUsd: Number.isFinite(selectedPreset?.priceUsd) ? selectedPreset.priceUsd : null,
      marketPrices: selectedPreset?.marketPrices || {},
      batteryKwh: planInput.batteryKwh,
      efficiency: planInput.efficiency,
      reserve: planInput.reserve,
      isBase: true,
    },
  ];

  for (const carId of planInput.compareCarIds) {
    const preset = getPresetById(carId);
    if (!preset) continue;

    const oneWayKm = calculateRangeForSpecs({
      batteryKwh: preset.batteryKwh,
      soc: planInput.soc,
      efficiency: preset.efficiency,
      reserve: preset.reserve,
      verificationProfile: planInput.verificationProfile,
    });
    rows.push({
      label: preset.label,
      carId: preset.id,
      oneWayKm,
      kmPerKwh: efficiencyToKmPerKwh(preset.efficiency),
      priceUsd: Number.isFinite(preset.priceUsd) ? preset.priceUsd : null,
      marketPrices: preset.marketPrices || {},
      batteryKwh: preset.batteryKwh,
      efficiency: preset.efficiency,
      reserve: preset.reserve,
      isBase: false,
    });
  }

  return rows;
}

function efficiencyToKmPerKwh(efficiencyKwhPer100Km) {
  if (!Number.isFinite(Number(efficiencyKwhPer100Km)) || Number(efficiencyKwhPer100Km) <= 0) {
    return 0;
  }
  return 100 / Number(efficiencyKwhPer100Km);
}

async function resolveOrigin(locationQuery) {
  if (state.origin && !locationQuery) {
    return state.origin;
  }
  const queryKey = normalizeLocationQuery(locationQuery);
  if (!queryKey) {
    throw new Error("Provide a start location or use GPS.");
  }

  if (state.origin && state.lastResolvedQueryKey === queryKey) {
    return state.origin;
  }

  const cachedOrigin = state.geocodeCache.get(queryKey);
  if (cachedOrigin) {
    state.lastResolvedQueryKey = queryKey;
    setLocationSelectionHint("Location resolved from cache. Press Compute Reach.");
    return cachedOrigin;
  }

  const encoded = encodeURIComponent(locationQuery);
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q=${encoded}&limit=1`
  );

  if (!response.ok) {
    throw new Error("Location lookup failed. Try a more specific place.");
  }

  const data = await response.json();
  if (!data.length) {
    throw new Error("Location not found. Try a city or full address.");
  }

  const first = data[0];
  const lat = Number(first.lat);
  const lon = Number(first.lon);
  const resolved = {
    lat,
    lon,
    label: first.display_name || locationQuery,
    countryCode: first.address?.country_code?.toUpperCase() || "",
    countryName: first.address?.country || "",
  };
  state.lastResolvedQueryKey = queryKey;
  cacheResolvedOrigin(queryKey, resolved);
  setLocationSelectionHint("Location resolved. Press Compute Reach.");
  return resolved;
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    setSummary('<p class="warning">Geolocation is not supported by your browser.</p>');
    return;
  }

  setSummary("<p>Resolving your GPS location...</p>");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const place = await reverseGeocodePlace(lat, lon);
      state.origin = {
        lat,
        lon,
        label: place.label,
        countryCode: place.countryCode,
        countryName: place.countryName,
      };
      const queryKey = normalizeLocationQuery(place.label);
      state.lastResolvedQueryKey = queryKey;
      cacheResolvedOrigin(queryKey, state.origin);
      inferAndApplyMarket(state.origin);
      ui.locationInput.value = place.label;
      hideLocationSuggestions();
      setLocationSelectionHint("GPS location locked. Press Compute Reach.");
      setSummary(`<p>GPS location set: ${escapeHtml(place.label)}</p>`);
      state.map.setView([lat, lon], 12);
      renderOrigin(state.origin);
    },
    (error) => {
      setSummary(`<p class="warning">Unable to read GPS location (${escapeHtml(error.message)}).</p>`);
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

async function reverseGeocodePlace(lat, lon) {
  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lon}`
    );
    if (!response.ok) {
      return {
        label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        countryCode: "",
        countryName: "",
      };
    }
    const data = await response.json();
    return {
      label: data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      countryCode: data.address?.country_code?.toUpperCase() || "",
      countryName: data.address?.country || "",
    };
  } catch {
    return {
      label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      countryCode: "",
      countryName: "",
    };
  }
}

async function getNearbyChargers(origin, oneWayRangeKm, input) {
  const searchRadiusKm = Math.min(MAX_CHARGER_SEARCH_KM, Math.max(12, Math.round(oneWayRangeKm)));
  const queryKey = chargerCacheKey(origin, searchRadiusKm, input);
  const cachedByQuery = state.chargerQueryCache.get(queryKey);
  if (Array.isArray(cachedByQuery) && cachedByQuery.length > 0) {
    return cachedByQuery;
  }
  if (input.verificationProfile === "official" && input.provider !== "openchargemap") {
    try {
      const ocmOnly = await fetchOpenChargeMap(origin, searchRadiusKm, input.maxResults);
      if (ocmOnly.length > 0) {
        const trimmed = sortAndTrimChargers(origin, dedupeChargers(ocmOnly), input.maxResults);
        cacheChargersByQuery(queryKey, trimmed);
        return trimmed;
      }
    } catch {
      // Continue to official no-data error.
    }
    throw new Error(
      "Official channels returned no nearby stations. Try Independent profile for wider open-data coverage."
    );
  }

  if (input.provider === "openchargemap") {
    const list = await fetchOpenChargeMap(origin, searchRadiusKm, input.maxResults);
    const trimmed = sortAndTrimChargers(origin, dedupeChargers(list), input.maxResults);
    cacheChargersByQuery(queryKey, trimmed);
    return trimmed;
  }
  if (input.provider === "overpass") {
    const list = await fetchOverpass(origin, searchRadiusKm, input.maxResults);
    const trimmed = sortAndTrimChargers(origin, dedupeChargers(list), input.maxResults);
    cacheChargersByQuery(queryKey, trimmed);
    return trimmed;
  }

  const fastResult = await fetchAutoMergedChargers(origin, searchRadiusKm, input.maxResults, {
    ocmTimeoutMs: OCM_TIMEOUT_MS,
    overpassOptions: {
      endpointLimit: FAST_OVERPASS_ENDPOINT_LIMIT,
      maxAttemptsPerEndpoint: FAST_OVERPASS_ATTEMPTS,
      requestTimeoutMs: AUTO_FAST_OVERPASS_TIMEOUT_MS,
    },
  });
  if (fastResult.merged.length > 0) {
    cacheChargersByQuery(queryKey, fastResult.merged);
    return fastResult.merged;
  }

  // If both quick providers fail, retry with slower but more resilient settings.
  if (fastResult.ocmError && fastResult.overpassError) {
    const retryRadiusKm = Math.min(
      CHARGER_MAX_DISTANCE_KM,
      Math.max(searchRadiusKm, AUTO_RETRY_MIN_RADIUS_KM)
    );
    const retryResult = await fetchAutoMergedChargers(origin, retryRadiusKm, input.maxResults, {
      ocmTimeoutMs: AUTO_RETRY_TIMEOUT_MS,
      overpassOptions: {
        endpointLimit: OVERPASS_ENDPOINTS.length,
        maxAttemptsPerEndpoint: AUTO_RETRY_OVERPASS_ATTEMPTS,
        requestTimeoutMs: AUTO_RETRY_TIMEOUT_MS,
      },
    });
    if (retryResult.merged.length > 0) {
      cacheChargersByQuery(queryKey, retryResult.merged);
      return retryResult.merged;
    }
    if (retryResult.ocmError && retryResult.overpassError) {
      throw new Error("Live charger feeds are currently unavailable. Please retry shortly.");
    }
  }

  throw new Error("No charging stations found for this area/range with current data sources.");
}

async function fetchAutoMergedChargers(origin, searchRadiusKm, maxResults, options = {}) {
  const ocmTimeoutMs = Math.max(2000, Number(options.ocmTimeoutMs || OCM_TIMEOUT_MS));
  const overpassOptions = options.overpassOptions || {};
  const [ocmResult, overpassResult] = await Promise.allSettled([
    fetchOpenChargeMap(origin, searchRadiusKm, maxResults, ocmTimeoutMs),
    fetchOverpass(origin, searchRadiusKm, maxResults, overpassOptions),
  ]);
  const ocmList = ocmResult.status === "fulfilled" ? ocmResult.value : [];
  const overpassList = overpassResult.status === "fulfilled" ? overpassResult.value : [];
  const merged = sortAndTrimChargers(origin, dedupeChargers([...ocmList, ...overpassList]), maxResults);
  return {
    merged,
    ocmError: ocmResult.status === "rejected" ? ocmResult.reason : null,
    overpassError: overpassResult.status === "rejected" ? overpassResult.reason : null,
  };
}

function dedupeChargers(chargers) {
  const byKey = new Map();
  for (const charger of chargers) {
    const lat = Number(charger.lat);
    const lon = Number(charger.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = `${lat.toFixed(4)}:${lon.toFixed(4)}`;
    if (!byKey.has(key)) {
      byKey.set(key, charger);
      continue;
    }
    const existing = byKey.get(key);
    const keepNew = (charger.connectors || 0) > (existing.connectors || 0);
    if (keepNew) {
      byKey.set(key, charger);
    }
  }
  return Array.from(byKey.values());
}

function sortAndTrimChargers(origin, chargers, maxResults) {
  return [...chargers]
    .sort((a, b) => {
      const da = haversineDistanceKm(origin.lat, origin.lon, a.lat, a.lon);
      const db = haversineDistanceKm(origin.lat, origin.lon, b.lat, b.lon);
      return da - db;
    })
    .slice(0, maxResults);
}

function getCachedChargersFallback(origin, oneWayRangeKm) {
  if (!origin || !Array.isArray(state.lastChargers) || state.lastChargers.length === 0) {
    return [];
  }
  const searchRadiusKm = Math.min(MAX_CHARGER_SEARCH_KM, Math.max(12, Math.round(oneWayRangeKm)));
  return state.lastChargers.filter((charger) => {
    if (!Number.isFinite(charger?.lat) || !Number.isFinite(charger?.lon)) return false;
    const distanceKm = haversineDistanceKm(origin.lat, origin.lon, charger.lat, charger.lon);
    return distanceKm <= searchRadiusKm;
  });
}

async function fetchOpenChargeMap(origin, radiusKm, maxResults, requestTimeoutMs = OCM_TIMEOUT_MS) {
  const url = new URL("https://api.openchargemap.io/v3/poi/");
  url.searchParams.set("output", "json");
  url.searchParams.set("latitude", String(origin.lat));
  url.searchParams.set("longitude", String(origin.lon));
  url.searchParams.set("distance", String(Math.min(radiusKm, CHARGER_MAX_DISTANCE_KM)));
  url.searchParams.set("distanceunit", "KM");
  url.searchParams.set("maxresults", String(maxResults));
  url.searchParams.set("compact", "true");
  url.searchParams.set("verbose", "false");

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json",
    },
  }, requestTimeoutMs);

  if (!response.ok) {
    throw new Error("OpenChargeMap request failed.");
  }

  const data = await response.json();
  return data
    .map((item) => {
      const lat = item?.AddressInfo?.Latitude;
      const lon = item?.AddressInfo?.Longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        id: `ocm-${item.ID}`,
        lat,
        lon,
        name: item.AddressInfo.Title || "EV Charger",
        address: item.AddressInfo.AddressLine1 || item.AddressInfo.Town || "",
        provider: "OpenChargeMap",
        connectors: item.Connections?.length || 0,
      };
    })
    .filter(Boolean);
}

async function fetchOverpass(origin, radiusKm, maxResults, options = {}) {
  const endpointLimit = Math.max(1, Number(options.endpointLimit || OVERPASS_ENDPOINTS.length));
  const maxAttempts = Math.max(1, Number(options.maxAttemptsPerEndpoint || 2));
  const requestTimeoutMs = Math.max(2000, Number(options.requestTimeoutMs || NETWORK_TIMEOUT_MS));
  const endpoints = OVERPASS_ENDPOINTS.slice(0, endpointLimit);
  const radiusM = Math.round(Math.min(radiusKm, CHARGER_MAX_DISTANCE_KM) * 1000);
  const query = `
[out:json][timeout:25];
(
  node["amenity"="charging_station"](around:${radiusM},${origin.lat},${origin.lon});
  way["amenity"="charging_station"](around:${radiusM},${origin.lat},${origin.lon});
  relation["amenity"="charging_station"](around:${radiusM},${origin.lat},${origin.lon});
  node["amenity"="fuel"]["fuel:electricity"="yes"](around:${radiusM},${origin.lat},${origin.lon});
  way["amenity"="fuel"]["fuel:electricity"="yes"](around:${radiusM},${origin.lat},${origin.lon});
  relation["amenity"="fuel"]["fuel:electricity"="yes"](around:${radiusM},${origin.lat},${origin.lon});
);
out center;
`;

  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=UTF-8",
          },
          body: query,
        }, requestTimeoutMs);

        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) {
            await sleep(300 * attempt);
            continue;
          }
          continue;
        }

        const data = await response.json();
        const list = [];
        for (const element of data.elements || []) {
          const lat = element.lat ?? element.center?.lat;
          const lon = element.lon ?? element.center?.lon;
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
          list.push({
            id: `osm-${element.type}-${element.id}`,
            lat,
            lon,
            name: element.tags?.name || "Charging station",
            address: element.tags?.["addr:street"] || element.tags?.operator || "",
            provider: "Overpass/OSM",
            connectors: 0,
          });
          if (list.length >= maxResults) break;
        }
        return list;
      } catch {
        // Try next attempt or endpoint.
      }
    }
  }

  throw new Error("Overpass is busy right now. Retry in a few seconds.");
}

function renderOrigin(origin) {
  if (state.locationMarker) {
    state.locationMarker.remove();
  }

  state.locationMarker = L.marker([origin.lat, origin.lon], { title: "Start" })
    .addTo(state.map)
    .bindPopup(`<strong>Start:</strong><br>${escapeHtml(origin.label)}`);

  state.map.setView([origin.lat, origin.lon], 11);
}

function renderRangeCircles(origin, oneWayRangeKm) {
  if (state.oneWayCircle) state.oneWayCircle.remove();
  if (state.roundTripCircle) state.roundTripCircle.remove();

  const oneWayM = oneWayRangeKm * 1000;
  const roundTripM = (oneWayRangeKm / 2) * 1000;

  state.oneWayCircle = L.circle([origin.lat, origin.lon], {
    radius: oneWayM,
    color: "#ee9b00",
    weight: 2,
    fillColor: "#ffdd99",
    fillOpacity: 0.15,
  }).addTo(state.map);

  state.roundTripCircle = L.circle([origin.lat, origin.lon], {
    radius: roundTripM,
    color: "#2f9e44",
    weight: 2,
    fillColor: "#b7e4c7",
    fillOpacity: 0.18,
  }).addTo(state.map);

  const bounds = state.oneWayCircle.getBounds().pad(0.15);
  state.map.fitBounds(bounds);
}

function filterVisibleChargers(chargers, oneWayRangeKm) {
  return chargers.filter((charger) => {
    const distanceKm = haversineDistanceKm(state.origin.lat, state.origin.lon, charger.lat, charger.lon);
    return distanceKm <= oneWayRangeKm;
  });
}

function cancelChargerRender() {
  state.chargerRenderToken += 1;
  if (state.chargerRenderHandle) {
    cancelAnimationFrame(state.chargerRenderHandle);
    state.chargerRenderHandle = 0;
  }
}

function addChargerMarker(charger, oneWayRangeKm) {
  const distanceKm = haversineDistanceKm(state.origin.lat, state.origin.lon, charger.lat, charger.lon);
  const status = getReachabilityStatus(distanceKm, oneWayRangeKm);
  const marker = L.marker([charger.lat, charger.lon], { title: charger.name });

  marker.bindPopup(makePopupHtml(charger, distanceKm, status));
  marker.on("click", () => {
    routeToCharger(charger, oneWayRangeKm);
  });
  marker.on("popupclose", () => {
    clearRoute();
    if (state.lastPlanSummaryHtml) {
      setSummary(state.lastPlanSummaryHtml);
    }
  });
  marker.addTo(state.chargerLayer);
}

function renderChargers(chargers, oneWayRangeKm) {
  const renderToken = state.chargerRenderToken + 1;
  cancelChargerRender();
  state.chargerRenderToken = renderToken;
  if (!state.chargerLayer) {
    state.chargerLayer = L.layerGroup().addTo(state.map);
  } else {
    state.chargerLayer.clearLayers();
  }

  let index = 0;
  const step = () => {
    if (renderToken !== state.chargerRenderToken) return;
    const end = Math.min(index + MARKER_RENDER_BATCH_SIZE, chargers.length);
    for (; index < end; index += 1) {
      addChargerMarker(chargers[index], oneWayRangeKm);
    }
    if (index < chargers.length) {
      state.chargerRenderHandle = requestAnimationFrame(step);
    } else {
      state.chargerRenderHandle = 0;
    }
  };
  state.chargerRenderHandle = requestAnimationFrame(step);
}

function makePopupHtml(charger, distanceKm, status) {
  const label = reachabilityLabel(status);
  const connectors =
    charger.connectors > 0 ? `<br><span>Connectors: ${charger.connectors}</span>` : "";

  return `
    <strong>${escapeHtml(charger.name)}</strong>
    <br><span>${escapeHtml(charger.address || "Address unavailable")}</span>
    <br><span>Source: ${escapeHtml(charger.provider)}</span>
    <br><span>Straight-line distance: ${distanceKm.toFixed(1)} km</span>
    ${connectors}
    <br><span>${escapeHtml(label)}</span>
    <br><span class="route-note">Click marker to estimate road distance.</span>
  `;
}

function getReachabilityStatus(distanceKm, oneWayRangeKm) {
  if (distanceKm <= oneWayRangeKm / 2) return "round-trip";
  if (distanceKm <= oneWayRangeKm) return "one-way";
  return "outside";
}

function reachabilityLabel(status) {
  if (status === "round-trip") return "Estimated round-trip capable";
  if (status === "one-way") return "Inside one-way reach zone";
  return "Outside one-way reach zone";
}

async function routeToCharger(charger, oneWayRangeKm) {
  if (!state.origin) return;
  clearRoute();

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${state.origin.lon},${state.origin.lat};${charger.lon},${charger.lat}` +
    `?overview=full&geometries=geojson`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error("Routing API returned an error.");
    }
    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route) {
      throw new Error("No route found.");
    }

    const distanceKm = route.distance / 1000;
    const durationMin = route.duration / 60;
    const isRoundTripReachable = distanceKm * 2 <= oneWayRangeKm;
    const isOneWayReachable = distanceKm <= oneWayRangeKm;

    const line = L.geoJSON(route.geometry, {
      style: {
        color: "#005f73",
        weight: 4,
        opacity: 0.75,
      },
    });
    line.addTo(state.routeLayer);
    state.map.fitBounds(line.getBounds().pad(0.18));

    const routeNote = `
      <p><strong>Route to:</strong> ${escapeHtml(charger.name)}</p>
      <p>Road distance: ${distanceKm.toFixed(1)} km (${durationMin.toFixed(0)} min)</p>
      <p>One-way status: ${isOneWayReachable ? "reachable" : "not reachable"}</p>
      <p>Round-trip status: ${isRoundTripReachable ? "reachable" : "not reachable"}</p>
    `;

    setSummary(summaryWithRoute(routeNote));
  } catch (error) {
    setSummary(summaryWithRoute(`<p class="warning">${escapeHtml(error.message)}</p>`));
  }
}

function renderSummary(
  origin,
  oneWayRangeKm,
  chargers,
  visibleChargers,
  provider,
  warningMessage = "",
  carModelLabel = "Custom",
  maxResults = DEFAULT_MAX_RESULTS,
  verificationProfile = "independent",
  compareRows = [],
  submitMode = "reach"
) {
  const shownInRoundTrip = visibleChargers.filter((c) => {
    const distanceKm = haversineDistanceKm(origin.lat, origin.lon, c.lat, c.lon);
    return distanceKm <= oneWayRangeKm / 2;
  }).length;
  const shownInOneWay = visibleChargers.filter((c) => {
    const distanceKm = haversineDistanceKm(origin.lat, origin.lon, c.lat, c.lon);
    return distanceKm <= oneWayRangeKm;
  }).length;
  const shownLabel =
    shownInOneWay === visibleChargers.length
      ? `${visibleChargers.length} in one-way zone`
      : `${visibleChargers.length} total (${shownInOneWay} in one-way zone)`;

  const compareHint =
    submitMode === "compare" && compareRows.length > 1
      ? `<p><strong>Compare mode:</strong> Map updated to best compared car reach (${escapeHtml(carModelLabel)}).</p>`
      : "";
  const html = `
    <h2>Summary</h2>
    <p><strong>Origin:</strong> ${escapeHtml(origin.label)}</p>
    <p><strong>Vehicle on map:</strong> ${escapeHtml(carModelLabel)}</p>
    <p><strong>One-way reach:</strong> ${oneWayRangeKm.toFixed(1)} km</p>
    <p><strong>Round-trip reach:</strong> ${(oneWayRangeKm / 2).toFixed(1)} km</p>
    <p><strong>Chargers shown:</strong> ${shownLabel} (${shownInRoundTrip} in round-trip zone)</p>
    <p><strong>Fetched:</strong> ${chargers.length} (cap ${maxResults}) via ${escapeHtml(providerLabel(provider, chargers, verificationProfile))}</p>
    ${compareHint}
    ${warningMessage ? `<p class="warning">${escapeHtml(warningMessage)}</p>` : ""}
    ${chargers.length === 0 ? `<p class="route-note">No chargers found for this query.</p>` : ""}
    <button type="button" class="share-btn">Share this setup</button>
  `;
  state.lastPlanSummaryHtml = html;
  setSummary(html);
}

function summaryWithRoute(routeHtml) {
  return `
    <h2>Summary</h2>
    <p><strong>Detected market:</strong> ${escapeHtml(state.marketLabel)}</p>
    <p><strong>Vehicle:</strong> ${escapeHtml(state.lastCarModelLabel)}</p>
    <p><strong>Verification profile:</strong> ${escapeHtml(verificationLabel(state.lastVerificationProfile))}</p>
    <p><strong>Estimated one-way range:</strong> ${state.oneWayRangeKm.toFixed(1)} km</p>
    <p><strong>Estimated round-trip radius:</strong> ${(state.oneWayRangeKm / 2).toFixed(1)} km</p>
    ${routeHtml}
  `;
}

function providerLabel(selectedProvider, chargers, verificationProfile = "independent") {
  if (selectedProvider === "auto" && verificationProfile === "official") {
    return "OpenChargeMap (official profile)";
  }
  if (selectedProvider === "auto") return "Auto (OpenChargeMap + quick Overpass)";
  if (selectedProvider === "openchargemap") return "OpenChargeMap";
  if (selectedProvider === "overpass") return "Overpass/OSM";
  if (selectedProvider !== "auto") return selectedProvider;
  const first = chargers[0];
  return first ? first.provider : "No data";
}

function verificationLabel(value) {
  if (value === "official") return "Official channels (conservative)";
  return "Independent parties (community/open data)";
}

async function resolveMarketCurrencyCode(code) {
  const marketCode = String(code || "").toUpperCase();
  if (!marketCode) return "USD";
  const cached = state.currencyByMarket.get(marketCode);
  if (cached) return cached;
  if (!/^[A-Z]{2}$/.test(marketCode)) return "USD";

  try {
    const response = await fetchWithTimeout(
      `https://restcountries.com/v3.1/alpha/${encodeURIComponent(marketCode)}?fields=currencies`,
      {},
      COUNTRY_CURRENCY_TIMEOUT_MS
    );
    if (!response.ok) {
      throw new Error("Country currency lookup failed");
    }
    const payload = await response.json();
    const record = Array.isArray(payload) ? payload[0] : payload;
    const currencies = record?.currencies;
    const currencyCode = currencies ? Object.keys(currencies)[0] : "";
    const normalized = String(currencyCode || "").toUpperCase();
    if (/^[A-Z]{3}$/.test(normalized)) {
      state.currencyByMarket.set(marketCode, normalized);
      persistFxCachesToStorage();
      return normalized;
    }
  } catch {
    // Fallback to USD below.
  }
  return "USD";
}

async function ensureMarketCurrencyRate(marketCode) {
  const currency = await resolveMarketCurrencyCode(marketCode);
  state.activeCurrency = currency;
  if (currency === "USD") return 1;

  const cached = state.fxByCurrency.get(currency);
  if (cached && Date.now() - cached.fetchedAt < FX_CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const response = await fetchWithTimeout(
      `https://api.frankfurter.app/latest?from=USD&to=${encodeURIComponent(currency)}`,
      {},
      FX_TIMEOUT_MS
    );
    if (!response.ok) {
      throw new Error("FX lookup failed");
    }
    const payload = await response.json();
    const rate = Number(payload?.rates?.[currency]);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Invalid FX rate");
    }
    state.fxByCurrency.set(currency, { rate, fetchedAt: Date.now() });
    persistFxCachesToStorage();
    return rate;
  } catch {
    state.activeCurrency = "USD";
    return 1;
  }
}

function currentFxRateForActiveCurrency() {
  if (state.activeCurrency === "USD") return 1;
  const cached = state.fxByCurrency.get(state.activeCurrency);
  if (!cached || Date.now() - cached.fetchedAt >= FX_CACHE_TTL_MS) {
    return 1;
  }
  return cached.rate;
}

function renderComparisonTable(compareRows) {
  if (!Array.isArray(compareRows) || compareRows.length <= 1) return "";
  const bestIndex = pickBestReachRowIndex(compareRows);
  const rowHtml = compareRows
    .map((row, index) => {
      const isBest = index === bestIndex;
      return `
        <tr class="${isBest ? "compare-best" : ""}">
          <td>
            ${escapeHtml(row.label)}
          </td>
          <td>${row.oneWayKm.toFixed(1)}</td>
          <td>${row.kmPerKwh.toFixed(2)}</td>
          <td>${formatPriceForPreset(row)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <h3 class="compare-title">Car Comparison</h3>
    <p class="route-note">Map and highlight use the highest one-way reach.</p>
    <table class="compare-table">
      <thead>
        <tr>
          <th>Vehicle</th>
          <th>One-way km</th>
          <th>km/kWh</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml}
      </tbody>
    </table>
  `;
}

function renderComparisonResults(compareRows, submitMode) {
  if (submitMode !== "compare") {
    ui.compareResults.innerHTML = '<p class="hint">Press Compare Cars to view side-by-side results.</p>';
    scheduleMapInvalidate(120);
    return;
  }
  if (!Array.isArray(compareRows) || compareRows.length <= 1) {
    ui.compareResults.innerHTML = '<p class="hint">Select at least one car to compare.</p>';
    scheduleMapInvalidate(120);
    return;
  }
  ui.compareResults.innerHTML = renderComparisonTable(compareRows);
  scheduleMapInvalidate(120);
}

function pickBestReachRowIndex(compareRows) {
  let bestIndex = 0;
  let bestRange = -Infinity;

  compareRows.forEach((row, index) => {
    if (row.oneWayKm > bestRange) {
      bestRange = row.oneWayKm;
      bestIndex = index;
      return;
    }
    if (
      Math.abs(row.oneWayKm - bestRange) < 0.0001 &&
      row.kmPerKwh > compareRows[bestIndex].kmPerKwh
    ) {
      bestIndex = index;
    }
  });

  return bestIndex;
}

function formatPriceForMarket(priceUsd) {
  if (!Number.isFinite(priceUsd)) return "N/A";
  const rate = currentFxRateForActiveCurrency();
  const currency = state.activeCurrency || "USD";
  const amount = Number(priceUsd) * rate;
  return formatCurrencyAmount(amount, currency, Number(priceUsd));
}

function formatPriceForPreset(preset) {
  const marketCode = String(state.marketCode || "").toUpperCase();
  const marketPrice = preset?.marketPrices?.[marketCode];
  if (marketPrice && Number.isFinite(Number(marketPrice.amount))) {
    return formatCurrencyAmount(Number(marketPrice.amount), marketPrice.currency, Number(marketPrice.amount));
  }
  return formatPriceForMarket(preset?.priceUsd);
}

function formatCurrencyAmount(amount, currency, fallbackUsdAmount) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Number(fallbackUsdAmount || amount).toLocaleString("en-US")}`;
  }
}

function clearRoute() {
  if (state.routeLayer) {
    state.routeLayer.clearLayers();
  }
}

function setSummary(html) {
  ui.summary.innerHTML = html;
}

function addLegend() {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Reach</strong><br>
      <span class="dot reachable"></span> Round-trip zone (inner)<br>
      <span class="dot caution"></span> One-way reach zone (outer)
    `;
    return div;
  };
  legend.addTo(state.map);
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (n) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
