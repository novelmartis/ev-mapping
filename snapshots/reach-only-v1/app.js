const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const MAX_CHARGER_SEARCH_KM = 140;
const CHARGER_MAX_DISTANCE_KM = 150;
const OFFICIAL_RANGE_BUFFER = 0.9;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];
const MARKET_LABELS = {
  IN: "India",
  US: "United States",
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
  origin: null,
  oneWayRangeKm: 0,
  lastChargers: [],
  lastCarModelLabel: "Custom",
  lastVerificationProfile: "independent",
  lastPlanSummaryHtml: "",
  marketCode: "GLOBAL",
  marketLabel: "Global",
  catalogSource: "Built-in",
  catalogCount: BASE_CAR_PRESETS.length,
  userSelectedCarModel: false,
};

const ui = {
  form: document.getElementById("planner-form"),
  carModelSelect: document.getElementById("car-model"),
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
  summary: document.getElementById("summary"),
};

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

  state.map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);

  state.chargerLayer = L.layerGroup().addTo(state.map);
  state.routeLayer = L.layerGroup().addTo(state.map);

  addLegend();
  wireEvents();
}

function wireEvents() {
  ui.form.addEventListener("submit", onPlanSubmit);
  ui.carModelSelect.addEventListener("change", () => onCarModelChange(true));
  ui.useLocationBtn.addEventListener("click", useCurrentLocation);
  ui.verificationProfileSelect.addEventListener("change", onVerificationProfileChange);
  onVerificationProfileChange();
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
}

function onCarModelChange(userInitiated = false) {
  if (userInitiated) {
    state.userSelectedCarModel = true;
  }

  const presetId = ui.carModelSelect.value;
  if (presetId === "custom") {
    ui.carHint.textContent = "Custom mode enabled. Enter your own battery and efficiency values.";
    return;
  }

  const preset = carPresets.find((item) => item.id === presetId);
  if (!preset) {
    ui.carHint.textContent = "Preset not found. You can continue with manual values.";
    return;
  }

  ui.batteryInput.value = String(preset.batteryKwh);
  ui.efficiencyInput.value = String(preset.efficiency);
  ui.reserveInput.value = String(preset.reserve);
  ui.carHint.textContent =
    `${preset.label} loaded: ${preset.batteryKwh} kWh, ${preset.efficiency} kWh/100 km.`;
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
    const response = await fetch("./data/car-presets.generated.json", { cache: "no-store" });
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
    const normalized = {
      id: item.id,
      label: item.label || item.id,
      batteryKwh: round1(Number(item.batteryKwh)),
      efficiency: round1(Number(item.efficiency)),
      reserve: Number.isFinite(Number(item.reserve)) ? Number(item.reserve) : 10,
      markets: normalizeMarketArray(item.markets),
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
  setSummary("<p>Planning reach zones and loading charging points...</p>");

  clearRoute();
  state.chargerLayer.clearLayers();

  try {
    const planInput = parsePlanInput();
    const origin = await resolveOrigin(planInput.locationQuery);
    const range = calculateRangeKm(planInput);

    state.origin = origin;
    state.oneWayRangeKm = range;
    state.lastCarModelLabel = planInput.carModelLabel;
    state.lastVerificationProfile = planInput.verificationProfile;
    inferAndApplyMarket(origin);

    renderOrigin(origin);
    renderRangeCircles(origin, range);

    let chargers = [];
    let visibleChargers = [];
    let warning = "";
    try {
      chargers = await getNearbyChargers(origin, range, planInput);
      visibleChargers = filterVisibleChargers(chargers, range);
    } catch (error) {
      warning = error.message;
    }

    state.lastChargers = chargers;
    if (visibleChargers.length > 0) {
      renderChargers(visibleChargers, range);
    }
    renderSummary(
      origin,
      range,
      chargers,
      visibleChargers,
      planInput.provider,
      warning,
      planInput.carModelLabel,
      planInput.maxResults,
      planInput.verificationProfile
    );
  } catch (error) {
    setSummary(`<p class="warning">${escapeHtml(error.message)}</p>`);
  }
}

function parsePlanInput() {
  const carModelLabel = ui.carModelSelect.options[ui.carModelSelect.selectedIndex]?.text || "Custom";
  const batteryKwh = Number(ui.batteryInput.value);
  const soc = Number(ui.socInput.value);
  const efficiency = Number(ui.efficiencyInput.value);
  const reserve = Number(ui.reserveInput.value);
  const provider = ui.providerSelect.value;
  const verificationProfile = ui.verificationProfileSelect.value;
  const maxResults = Math.max(20, Math.min(500, Number(ui.maxResultsInput.value || 220)));
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
    carModelLabel,
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
  const usableEnergyKwh = batteryKwh * ((soc - reserve) / 100);
  const rawRangeKm = (usableEnergyKwh / efficiency) * 100;
  const profileFactor = verificationProfile === "official" ? OFFICIAL_RANGE_BUFFER : 1;
  const oneWayRangeKm = rawRangeKm * profileFactor;
  return Math.max(1, oneWayRangeKm);
}

async function resolveOrigin(locationQuery) {
  if (state.origin && !locationQuery) {
    return state.origin;
  }
  if (!locationQuery) {
    throw new Error("Provide a start location or use GPS.");
  }

  const encoded = encodeURIComponent(locationQuery);
  const response = await fetch(
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
  return {
    lat,
    lon,
    label: first.display_name || locationQuery,
    countryCode: first.address?.country_code?.toUpperCase() || "",
    countryName: first.address?.country || "",
  };
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
    const response = await fetch(
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
  if (input.verificationProfile === "official" && input.provider !== "openchargemap") {
    try {
      const ocmOnly = await fetchOpenChargeMap(origin, searchRadiusKm, input.maxResults);
      if (ocmOnly.length > 0) {
        return sortAndTrimChargers(origin, dedupeChargers(ocmOnly), input.maxResults);
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
    return sortAndTrimChargers(origin, dedupeChargers(list), input.maxResults);
  }
  if (input.provider === "overpass") {
    const list = await fetchOverpass(origin, searchRadiusKm, input.maxResults);
    return sortAndTrimChargers(origin, dedupeChargers(list), input.maxResults);
  }

  const [ocmResult, osmResult] = await Promise.allSettled([
    fetchOpenChargeMap(origin, searchRadiusKm, input.maxResults),
    fetchOverpass(origin, searchRadiusKm, input.maxResults),
  ]);

  const all = [];
  if (ocmResult.status === "fulfilled") all.push(...ocmResult.value);
  if (osmResult.status === "fulfilled") all.push(...osmResult.value);

  const merged = sortAndTrimChargers(origin, dedupeChargers(all), input.maxResults);
  if (merged.length > 0) {
    return merged;
  }

  if (ocmResult.status === "rejected" && osmResult.status === "rejected") {
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

  const response = await fetch(url, {
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

async function fetchOverpass(origin, radiusKm, maxResults) {
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

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=UTF-8",
          },
          body: query,
        });

        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) {
            await sleep(500 * attempt);
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
    const response = await fetch(url);
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
  maxResults = 220,
  verificationProfile = "independent"
) {
  const reachableRoundTrip = chargers.filter((c) => {
    const distanceKm = haversineDistanceKm(origin.lat, origin.lon, c.lat, c.lon);
    return distanceKm <= oneWayRangeKm / 2;
  }).length;
  const reachableOneWay = chargers.filter((c) => {
    const distanceKm = haversineDistanceKm(origin.lat, origin.lon, c.lat, c.lon);
    return distanceKm <= oneWayRangeKm;
  }).length;

  const html = `
    <h2>Summary</h2>
    <p><strong>Origin:</strong> ${escapeHtml(origin.label)}</p>
    <p><strong>Detected market:</strong> ${escapeHtml(state.marketLabel)}</p>
    <p><strong>Vehicle:</strong> ${escapeHtml(carModelLabel)}</p>
    <p><strong>Estimated one-way range:</strong> ${oneWayRangeKm.toFixed(1)} km</p>
    <p><strong>Estimated round-trip radius:</strong> ${(oneWayRangeKm / 2).toFixed(1)} km</p>
    <p><strong>Verification profile:</strong> ${escapeHtml(verificationLabel(verificationProfile))}</p>
    <p><strong>Chargers fetched:</strong> ${chargers.length} (cap: ${maxResults})</p>
    <p><strong>Chargers shown on map (inside one-way zone):</strong> ${visibleChargers.length}</p>
    <p><strong>Known chargers in one-way circle:</strong> ${reachableOneWay}</p>
    <p><strong>Known chargers in round-trip circle:</strong> ${reachableRoundTrip}</p>
    <p><strong>Data provider:</strong> ${escapeHtml(providerLabel(provider, chargers, verificationProfile))}</p>
    <p class="route-note">All map pins are shown only within your one-way reach zone.</p>
    ${warningMessage ? `<p class="warning">${escapeHtml(warningMessage)}</p>` : ""}
    ${chargers.length === 0 ? `<p class="route-note">No chargers found for this query.</p>` : ""}
    <p class="route-note">Tip: click a charger marker to compute road distance.</p>
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
  if (selectedProvider === "auto") return "Merged OpenChargeMap + Overpass";
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

function round1(value) {
  return Math.round(value * 10) / 10;
}
