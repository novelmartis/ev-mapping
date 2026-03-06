const OCM_ENDPOINT = "https://api.openchargemap.io/v3/poi/";
const REQUEST_TIMEOUT_MS = 12000;

function parseNumber(value, { min, max, fallback = null }) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (typeof min === "number" && num < min) return fallback;
  if (typeof max === "number" && num > max) return fallback;
  return num;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = String(process.env.OPENCHARGEMAP_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "OPENCHARGEMAP_API_KEY is not configured" });
  }

  const latitude = parseNumber(req.query.latitude, { min: -90, max: 90 });
  const longitude = parseNumber(req.query.longitude, { min: -180, max: 180 });
  const distance = parseNumber(req.query.distance, { min: 1, max: 150, fallback: 50 });
  const maxresults = Math.round(parseNumber(req.query.maxresults, { min: 1, max: 500, fallback: 120 }));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: "Invalid latitude/longitude" });
  }

  const params = new URLSearchParams({
    output: "json",
    latitude: String(latitude),
    longitude: String(longitude),
    distance: String(distance),
    distanceunit: "KM",
    maxresults: String(maxresults),
    compact: "true",
    verbose: "false",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${OCM_ENDPOINT}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
        "User-Agent": "ev-mapping-vercel-proxy/1.0",
      },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return res.status(502).json({
        error: "OpenChargeMap upstream request failed",
        upstreamStatus: upstream.status,
      });
    }

    const payload = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json(Array.isArray(payload) ? payload : []);
  } catch (error) {
    const message = error?.name === "AbortError" ? "OpenChargeMap upstream timed out" : "OpenChargeMap proxy failed";
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeoutId);
  }
};
