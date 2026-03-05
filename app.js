const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const RECENT_LOCATIONS_KEY = "ev-mapping-recent-locs";
const RECENT_LOCATIONS_MAX = 6;
const DEFAULT_MAX_RESULTS = 120;
const NETWORK_TIMEOUT_MS = 10000;
const MAX_CHARGER_SEARCH_KM = 140;
const CHARGER_MAX_DISTANCE_KM = 150;
const OFFICIAL_RANGE_BUFFER = 0.9;
const FAST_OVERPASS_TIMEOUT_MS = 5000;
const FAST_OVERPASS_ENDPOINT_LIMIT = 1;
const FAST_OVERPASS_ATTEMPTS = 1;
const GEOCODE_CACHE_LIMIT = 10;
const CHARGER_QUERY_CACHE_LIMIT = 12;
const FX_TIMEOUT_MS = 2500;
const COUNTRY_CURRENCY_TIMEOUT_MS = 1500;
const FX_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MOBILE_LAYOUT_QUERY = "(max-width: 980px)";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];
const MARKET_LABELS = {
  IN: "India",
  US: "United States",
};
const MARKET_CURRENCY_BY_CODE = {
  IN: "INR",
  US: "USD",
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
  { id: "mg-zs-ev", label: "MG ZS EV", batteryKwh: 50.3, efficiency: 16.7, reserve: 10 },
  {
    id: "mahindra-be6-59",
    label: "Mahindra BE 6 (59 kWh)",
    batteryKwh: 59,
    efficiency: 15.8,
    reserve: 10,
    markets: ["IN"],
  },
  {
    id: "mahindra-be6-79",
    label: "Mahindra BE 6 (79 kWh)",
    batteryKwh: 79,
    efficiency: 16.4,
    reserve: 10,
    markets: ["IN"],
  },
  { id: "byd-atto-3", label: "BYD Atto 3", batteryKwh: 60.5, efficiency: 16.8, reserve: 10 },
  {
    id: "tata-nexon-ev",
    label: "Tata Nexon EV",
    batteryKwh: 40.5,
    efficiency: 15.9,
    reserve: 10,
    markets: ["IN"],
  },
  {
    id: "tata-punch-ev-lr",
    label: "Tata Punch EV (Long Range)",
    batteryKwh: 35,
    efficiency: 14.8,
    reserve: 10,
    markets: ["IN"],
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
  origin: null,
  oneWayRangeKm: 0,
  lastChargers: [],
  lastCarModelLabel: "Custom",
  lastVerificationProfile: "independent",
  lastPlanSummaryHtml: "",
  lastSubmitMode: "reach",
  marketCode: "GLOBAL",
  marketLabel: "Global",
  catalogSource: "Built-in",
  catalogCount: BASE_CAR_PRESETS.length,
  userSelectedCarModel: false,
  geocodeCache: new Map(),
  chargerQueryCache: new Map(),
  fxByCurrency: new Map(),
  currencyByMarket: new Map(Object.entries(MARKET_CURRENCY_BY_CODE)),
  activeCurrency: "USD",
  lastResolvedQueryKey: "",
};

const ui = {
  form: document.getElementById("planner-form"),
  carModelSelect: document.getElementById("car-model"),
  compareCarsSelect: document.getElementById("compare-cars"),
  carHint: document.getElementById("car-hint"),
  marketHint: document.getElementById("market-hint"),
  useLocationBtn: document.getElementById("use-location"),
  locationInput: document.getElementById("location"),
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
}

function pushUrlState() {
  const params = new URLSearchParams();
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

initialize();

async function initialize() {
  const generatedCatalog = await loadGeneratedCarCatalog();
  if (generatedCatalog) {
    carPresets = mergeCarPresets(BASE_CAR_PRESETS, generatedCatalog.presets || []);
    state.catalogSource = generatedCatalog.source || "Generated catalog";
  } else {
    carPresets = [...BASE_CAR_PRESETS];
    state.catalogSource = "Built-in defaults";
  }
  state.catalogCount = carPresets.length;

  populateCarPresets();
  updateMarketHint();
  updateLocationDatalist();
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
}

function wireEvents() {
  ui.form.addEventListener("submit", onPlanSubmit);
  ui.carModelSelect.addEventListener("change", () => onCarModelChange(true));
  ui.compareCarsSelect.addEventListener("change", onCompareCarsChange);
  ui.useLocationBtn.addEventListener("click", useCurrentLocation);
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

function populateCarPresets() {
  const previousSelection = ui.carModelSelect.value || "custom";
  ui.carModelSelect.length = 1;
  const sorted = [...carPresets].sort((a, b) => a.label.localeCompare(b.label));
  const marketMatched = [];
  const marketGlobal = [];
  const otherMarkets = [];

  for (const preset of sorted) {
    const markets = normalizeMarketArray(preset.markets);
    if (state.marketCode === "GLOBAL") {
      marketGlobal.push(preset);
      continue;
    }
    if (markets.length === 0) {
      marketGlobal.push(preset);
    } else if (markets.includes(state.marketCode)) {
      marketMatched.push(preset);
    } else {
      otherMarkets.push(preset);
    }
  }

  if (state.marketCode === "GLOBAL") {
    appendPresetOptions(ui.carModelSelect, marketGlobal);
  } else {
    appendPresetOptgroup(
      ui.carModelSelect,
      `Recommended in ${state.marketLabel}`,
      [...marketMatched, ...marketGlobal]
    );
    appendPresetOptgroup(ui.carModelSelect, "Other markets", otherMarkets);
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
    populateCompareCarOptions();
    return;
  }

  const preset = carPresets.find((item) => item.id === presetId);
  if (!preset) {
    ui.carHint.textContent = "Preset not found. You can continue with manual values.";
    populateCompareCarOptions();
    return;
  }

  ui.batteryInput.value = String(preset.batteryKwh);
  ui.efficiencyInput.value = String(preset.efficiency);
  ui.reserveInput.value = String(preset.reserve);
  ui.carHint.textContent =
    `${preset.label} loaded: ${preset.batteryKwh} kWh, ${preset.efficiency} kWh/100 km.`;
  populateCompareCarOptions();
}

function populateCompareCarOptions() {
  const selectedBefore = [...ui.compareCarsSelect.selectedOptions].map((option) => option.value);
  const currentCarId = ui.carModelSelect.value;
  ui.compareCarsSelect.length = 0;

  const sorted = [...carPresets].sort((a, b) => a.label.localeCompare(b.label));
  const marketMatched = [];
  const marketGlobal = [];
  const otherMarkets = [];

  for (const preset of sorted) {
    const markets = normalizeMarketArray(preset.markets);
    if (state.marketCode === "GLOBAL") {
      marketGlobal.push(preset);
      continue;
    }
    if (markets.length === 0) {
      marketGlobal.push(preset);
    } else if (markets.includes(state.marketCode)) {
      marketMatched.push(preset);
    } else {
      otherMarkets.push(preset);
    }
  }

  const ordered =
    state.marketCode === "GLOBAL"
      ? marketGlobal
      : [...marketMatched, ...marketGlobal, ...otherMarkets];

  for (const preset of ordered) {
    if (preset.id === currentCarId) continue;
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    option.selected = selectedBefore.includes(preset.id);
    ui.compareCarsSelect.append(option);
  }

  onCompareCarsChange();
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

async function loadGeneratedCarCatalog() {
  try {
    const response = await fetchWithTimeout("./data/car-presets.generated.json", {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data?.presets)) return null;
    return data;
  } catch {
    return null;
  }
}

function mergeCarPresets(basePresets, generatedPresets) {
  const mergedById = new Map();
  const all = [...basePresets, ...generatedPresets];

  for (const item of all) {
    if (!item || typeof item.id !== "string") continue;
    if (!Number.isFinite(Number(item.batteryKwh))) continue;
    if (!Number.isFinite(Number(item.efficiency))) continue;
    const priceUsdValue = Number(item.priceUsd ?? item.price);
    const normalized = {
      id: item.id,
      label: item.label || item.id,
      batteryKwh: round1(Number(item.batteryKwh)),
      efficiency: round1(Number(item.efficiency)),
      reserve: Number.isFinite(Number(item.reserve)) ? Number(item.reserve) : 10,
      markets: normalizeMarketArray(item.markets),
      priceUsd: Number.isFinite(priceUsdValue) ? Math.round(priceUsdValue) : null,
    };
    mergedById.set(normalized.id, normalized);
  }

  return Array.from(mergedById.values());
}

function appendPresetOptions(parent, presets) {
  for (const preset of presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    parent.append(option);
  }
}

function appendPresetOptgroup(parent, label, presets) {
  if (!presets.length) return;
  const group = document.createElement("optgroup");
  group.label = label;
  appendPresetOptions(group, presets);
  parent.append(group);
}

function normalizeMarketArray(markets) {
  if (!Array.isArray(markets)) return [];
  return [...new Set(markets.map((value) => String(value || "").toUpperCase()).filter(Boolean))];
}

function marketLabelFromCode(code) {
  if (!code || code === "GLOBAL") return "Global";
  return MARKET_LABELS[code] || code;
}

function inferAndApplyMarket(origin) {
  const shouldAutoInferModel = !state.userSelectedCarModel && ui.carModelSelect.value === "custom";
  const code = String(origin?.countryCode || "").toUpperCase();
  if (!code) {
    state.marketCode = "GLOBAL";
    state.marketLabel = "Global";
    populateCarPresets();
    updateMarketHint();
    if (shouldAutoInferModel) {
      autoInferModelForMarket();
    }
    return;
  }

  state.marketCode = code;
  state.marketLabel = marketLabelFromCode(code);
  populateCarPresets();
  updateMarketHint(origin.countryName || "");
  if (shouldAutoInferModel) {
    autoInferModelForMarket();
  }
}

function updateMarketHint(countryName = "") {
  const countryText = countryName ? ` (${countryName})` : "";
  ui.marketHint.textContent =
    `Market: ${state.marketLabel}${countryText}. Catalog: ${state.catalogCount} presets (${state.catalogSource}).`;
}

function autoInferModelForMarket() {
  const presetId = findRecommendedPresetIdForMarket();
  if (!presetId) return;

  ui.carModelSelect.value = presetId;
  onCarModelChange(false);
  const preset = carPresets.find((item) => item.id === presetId);
  if (preset) {
    ui.carHint.textContent =
      `Auto-inferred model for ${state.marketLabel}: ${preset.label}. You can change it anytime.`;
  }
}

function findRecommendedPresetIdForMarket() {
  const sorted = [...carPresets].sort((a, b) => a.label.localeCompare(b.label));
  if (state.marketCode !== "GLOBAL") {
    const exact = sorted.find((item) => normalizeMarketArray(item.markets).includes(state.marketCode));
    if (exact) return exact.id;
  }
  const global = sorted.find((item) => normalizeMarketArray(item.markets).length === 0);
  return global ? global.id : null;
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
  state.chargerLayer.clearLayers();

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

    state.oneWayRangeKm = effectiveRangeKm;
    state.lastCarModelLabel = effectiveVehicleLabel;
    renderOrigin(origin);
    renderRangeCircles(origin, effectiveRangeKm);
    state.lastChargers = chargers;
    if (visibleChargers.length > 0) {
      renderChargers(visibleChargers, effectiveRangeKm);
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
    const preset = carPresets.find((item) => item.id === carId);
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
      ? carPresets.find((item) => item.id === planInput.selectedCarId)
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
      batteryKwh: planInput.batteryKwh,
      efficiency: planInput.efficiency,
      reserve: planInput.reserve,
      isBase: true,
    },
  ];

  for (const carId of planInput.compareCarIds) {
    const preset = carPresets.find((item) => item.id === carId);
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

  let ocmList = [];
  let ocmError = null;
  try {
    ocmList = await fetchOpenChargeMap(origin, searchRadiusKm, input.maxResults);
  } catch (error) {
    ocmError = error;
  }

  let overpassList = [];
  let overpassError = null;
  if (ocmList.length < input.maxResults) {
    const overpassOptions =
      ocmList.length > 0
        ? {
            endpointLimit: FAST_OVERPASS_ENDPOINT_LIMIT,
            maxAttemptsPerEndpoint: FAST_OVERPASS_ATTEMPTS,
            requestTimeoutMs: FAST_OVERPASS_TIMEOUT_MS,
          }
        : {};
    try {
      overpassList = await fetchOverpass(origin, searchRadiusKm, input.maxResults, overpassOptions);
    } catch (error) {
      overpassError = error;
    }
  }

  const merged = sortAndTrimChargers(
    origin,
    dedupeChargers([...ocmList, ...overpassList]),
    input.maxResults
  );
  if (merged.length > 0) {
    cacheChargersByQuery(queryKey, merged);
    return merged;
  }

  if (ocmError && overpassError) {
    throw new Error("Open data providers are currently unavailable. Please retry.");
  }

  throw new Error("No charging stations found for this area/range with current data sources.");
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

async function fetchOpenChargeMap(origin, radiusKm, maxResults) {
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
  });

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

function renderChargers(chargers, oneWayRangeKm) {
  state.chargerLayer.clearLayers();

  chargers.forEach((charger) => {
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
  });
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
  return "one-way";
}

function reachabilityLabel(status) {
  if (status === "round-trip") return "Estimated round-trip capable";
  return "Inside one-way reach zone";
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
  const reachableRoundTrip = chargers.filter((c) => {
    const distanceKm = haversineDistanceKm(origin.lat, origin.lon, c.lat, c.lon);
    return distanceKm <= oneWayRangeKm / 2;
  }).length;
  const reachableOneWay = chargers.filter((c) => {
    const distanceKm = haversineDistanceKm(origin.lat, origin.lon, c.lat, c.lon);
    return distanceKm <= oneWayRangeKm;
  }).length;

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
    <p><strong>Chargers shown:</strong> ${visibleChargers.length} in one-way zone (${reachableRoundTrip} in round-trip zone)</p>
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
          <td>${formatPriceForMarket(row.priceUsd)}</td>
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
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Number(priceUsd).toLocaleString("en-US")}`;
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
