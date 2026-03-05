#!/usr/bin/env python3
"""Generate EV car presets from market data with production-grade guardrails.

Primary live source: fueleconomy.gov WS REST API (US market).
Price enrichment: afdc.energy.gov EV downloadable table.
Regional extensions: manual presets in data/car-presets.manual.json.

Design goals:
- Never publish a catastrophically degraded catalog when upstream APIs are flaky.
- Keep a predictable, validated JSON schema for frontend/runtime stability.
- Allow region-specific manual prices in local currency with automatic USD conversion.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

BASE_URL = "https://www.fueleconomy.gov/ws/rest/vehicle"
AFDC_DOWNLOAD_URL = "https://afdc.energy.gov/vehicles/search/download"
FRANKFURTER_URL = "https://api.frankfurter.app/latest"
CARDEKHO_IN_ELECTRIC_URL = "https://www.cardekho.com/electric-cars"
USER_AGENT = "ev-mapping-catalog-sync/2.0"
KWH_PER_GALLON_EQUIV = 33.705
MILES_PER_100KM = 62.137119
KWH100KM_PER_MPGE = KWH_PER_GALLON_EQUIV * MILES_PER_100KM
DEFAULT_MIN_PRESET_COUNT = 50
DEFAULT_MAX_COUNT_DROP_RATIO = 0.45
DEFAULT_MIN_PRICE_COVERAGE = 0.03
DEFAULT_FX_TIMEOUT_MS = 3000
DEFAULT_MIN_MARKET_PRESETS = {"US": 300, "IN": 20}

# Conservative static fallback rates, used only when online FX lookup fails.
FALLBACK_USD_RATE_BY_CURRENCY = {
    "USD": 1.0,
    "EUR": 1.08,
    "GBP": 1.27,
    "INR": 0.012,
    "JPY": 0.0067,
    "CNY": 0.14,
    "AUD": 0.66,
    "CAD": 0.74,
}


def parse_args() -> argparse.Namespace:
    today = dt.date.today()
    parser = argparse.ArgumentParser(description="Sync EV car presets catalog.")
    parser.add_argument("--from-year", type=int, default=today.year - 1)
    parser.add_argument("--to-year", type=int, default=today.year + 1)
    parser.add_argument(
        "--manual-file",
        default="data/car-presets.manual.json",
        help="Manual JSON presets file (default: data/car-presets.manual.json)",
    )
    parser.add_argument(
        "--out",
        default="data/car-presets.generated.json",
        help="Output JSON path (default: data/car-presets.generated.json)",
    )
    parser.add_argument(
        "--previous-catalog",
        default="data/car-presets.generated.json",
        help=(
            "Path to previous known-good generated catalog. "
            "Used as fallback when live sync output looks degraded."
        ),
    )
    parser.add_argument(
        "--sleep-ms",
        type=int,
        default=80,
        help="Delay between vehicle detail requests to avoid hammering public APIs.",
    )
    parser.add_argument(
        "--min-preset-count",
        type=int,
        default=DEFAULT_MIN_PRESET_COUNT,
        help="Hard minimum preset count for generated output.",
    )
    parser.add_argument(
        "--max-count-drop-ratio",
        type=float,
        default=DEFAULT_MAX_COUNT_DROP_RATIO,
        help="Maximum allowed fractional drop vs previous catalog count.",
    )
    parser.add_argument(
        "--min-price-coverage",
        type=float,
        default=DEFAULT_MIN_PRICE_COVERAGE,
        help="Minimum required share of presets with priceUsd (0..1).",
    )
    parser.add_argument(
        "--fx-timeout-ms",
        type=int,
        default=DEFAULT_FX_TIMEOUT_MS,
        help="Timeout for FX conversion lookups for manual regional price entries.",
    )
    parser.add_argument(
        "--min-market-preset",
        action="append",
        default=[],
        help=(
            "Per-market minimum count guardrail in CODE=COUNT format. "
            "Can be passed multiple times."
        ),
    )
    return parser.parse_args()


def request_xml(path: str, params: dict[str, Any] | None = None) -> ET.Element:
    url = BASE_URL + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/xml"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = resp.read()
    return ET.fromstring(payload)


def request_json(url: str, timeout_s: float = 10.0) -> Any:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        payload = resp.read().decode("utf-8")
    return json.loads(payload)


def node_text(node: ET.Element, tag: str) -> str:
    target = node.find(tag)
    return (target.text or "").strip() if target is not None else ""


def parse_menu_values(root: ET.Element) -> list[str]:
    out: list[str] = []
    for menu_item in root.findall(".//menuItem"):
        value = node_text(menu_item, "value")
        if value:
            out.append(value)
    return out


def parse_float(value: str) -> float | None:
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def parse_usd(value: str) -> float | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9.]", "", str(value).strip())
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_money_amount(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        if math.isfinite(float(value)):
            return float(value)
        return None
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9.]", "", str(value).strip())
    if not cleaned:
        return None
    try:
        amount = float(cleaned)
    except ValueError:
        return None
    return amount if math.isfinite(amount) else None


def parse_inr_amount(value: str) -> float | None:
    text = str(value or "").replace(",", "")
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return None

    # Handles formats like:
    # - "Rs 15.99 - 20.01 Lakh*"
    # - "Rs 2.05 - 2.58 Cr*"
    # - "Rs 69.90 Lakh*"
    match = re.search(
        r"Rs\.?\s*([0-9]+(?:\.[0-9]+)?)(?:\s*-\s*([0-9]+(?:\.[0-9]+)?))?\s*(Lakh|Lakhs|Cr|Crore|Crores)\b",
        text,
        flags=re.IGNORECASE,
    )
    if match:
        low = parse_float(match.group(1) or "")
        high = parse_float(match.group(2) or "")
        unit = (match.group(3) or "").lower()
        base = low if low is not None else high
        if base is None:
            return None
        multiplier = 1.0
        if unit.startswith("lakh"):
            multiplier = 100_000.0
        elif unit.startswith("cr") or unit.startswith("crore"):
            multiplier = 10_000_000.0
        return base * multiplier

    # Fallback for plain rupee amount.
    plain = parse_money_amount(text)
    if plain is not None and plain > 1_000:
        return plain
    return None


def slugify(text: str) -> str:
    clean = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return re.sub(r"-{2,}", "-", clean)


def round1(value: float) -> float:
    return round(value, 1)


def normalize_market_array(markets: Any) -> list[str]:
    if not isinstance(markets, list):
        return []
    out: list[str] = []
    for value in markets:
        code = str(value or "").strip().upper()
        if code and code not in out:
            out.append(code)
    return out


def parse_market_minimums(values: list[str] | None) -> dict[str, int]:
    out = dict(DEFAULT_MIN_MARKET_PRESETS)
    for raw in values or []:
        text = str(raw or "").strip()
        if not text:
            continue
        code, sep, count_text = text.partition("=")
        code = code.strip().upper()
        count = parse_float(count_text.strip()) if sep else None
        if not sep or not re.fullmatch(r"[A-Z]{2}", code) or count is None:
            continue
        count_int = int(count)
        if count_int < 0:
            continue
        out[code] = count_int
    return out


def canonical_car_id(raw_id: str, markets: list[str]) -> str:
    car_id = str(raw_id or "").strip()
    if not car_id:
        return ""
    if car_id.endswith("-in") and "IN" in markets and "US" not in markets:
        return car_id[:-3]
    return car_id


def normalize_vehicle_key(make: str, model: str) -> str:
    text = f"{make} {model}".strip().lower()
    text = re.sub(r"\s+", " ", text)
    return re.sub(r"[^a-z0-9 ]+", "", text).strip()


def strip_model_footnotes(model: str) -> str:
    return re.sub(r"\s*\d+\s*$", "", model).strip()


def parse_range_km(text: str) -> float | None:
    values: list[float] = []
    for match in re.finditer(
        r"([0-9]+(?:\.[0-9]+)?)(?:\s*-\s*([0-9]+(?:\.[0-9]+)?))?\s*km\b",
        str(text or ""),
        flags=re.IGNORECASE,
    ):
        low = parse_float(match.group(1) or "")
        high = parse_float(match.group(2) or "")
        if low is not None:
            values.append(low)
        if high is not None:
            values.append(high)
    if not values:
        return None
    return max(values)


def parse_battery_kwh(text: str) -> float | None:
    values: list[float] = []
    for match in re.finditer(
        r"([0-9]+(?:\.[0-9]+)?)(?:\s*-\s*([0-9]+(?:\.[0-9]+)?))?\s*kwh\b",
        str(text or ""),
        flags=re.IGNORECASE,
    ):
        low = parse_float(match.group(1) or "")
        high = parse_float(match.group(2) or "")
        if low is not None:
            values.append(low)
        if high is not None:
            values.append(high)
    if not values:
        return None
    return max(values)


def looks_like_vehicle_label(line: str) -> bool:
    text = str(line or "").strip()
    if len(text) < 3 or len(text) > 80:
        return False
    if text.lower().startswith("electric car"):
        return False
    if text.lower().startswith("model ex-showroom"):
        return False
    if "Rs" in text or "km" in text.lower() or "kWh" in text:
        return False
    return bool(re.search(r"[A-Za-z]", text))


class AfdcEvTableParser(HTMLParser):
    """Extract EV make/model/MSRP rows from AFDC downloadable table."""

    def __init__(self) -> None:
        super().__init__()
        self.in_tbody = False
        self.in_row = False
        self.in_cell = False
        self._cell_buf: list[str] = []
        self._row: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tbody":
            self.in_tbody = True
        elif tag == "tr" and self.in_tbody:
            self.in_row = True
            self._row = []
        elif tag == "td" and self.in_row:
            self.in_cell = True
            self._cell_buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "td" and self.in_cell:
            text = html.unescape("".join(self._cell_buf)).strip()
            text = re.sub(r"\s+", " ", text)
            self._row.append(text)
            self._cell_buf = []
            self.in_cell = False
        elif tag == "tr" and self.in_row:
            if self._row:
                self.rows.append(self._row)
            self._row = []
            self.in_row = False
        elif tag == "tbody":
            self.in_tbody = False

    def handle_data(self, data: str) -> None:
        if self.in_cell:
            self._cell_buf.append(data)


class FxResolver:
    """Resolve local-currency manual prices into USD with caching + static fallback."""

    def __init__(self, timeout_ms: int = DEFAULT_FX_TIMEOUT_MS) -> None:
        self.timeout_ms = max(500, int(timeout_ms))
        self._usd_rate_by_currency: dict[str, float] = {}

    def to_usd(self, amount: float, currency: str) -> float | None:
        if not math.isfinite(amount) or amount <= 0:
            return None
        code = str(currency or "USD").strip().upper() or "USD"
        rate = self._usd_rate(code)
        if rate is None or not math.isfinite(rate) or rate <= 0:
            return None
        return amount * rate

    def _usd_rate(self, currency: str) -> float | None:
        if currency in self._usd_rate_by_currency:
            return self._usd_rate_by_currency[currency]

        if currency == "USD":
            self._usd_rate_by_currency[currency] = 1.0
            return 1.0

        timeout_s = max(0.5, self.timeout_ms / 1000.0)
        try:
            params = urllib.parse.urlencode({"from": currency, "to": "USD"})
            payload = request_json(f"{FRANKFURTER_URL}?{params}", timeout_s=timeout_s)
            rate = parse_float(str(payload.get("rates", {}).get("USD", "")))
            if rate and rate > 0:
                self._usd_rate_by_currency[currency] = rate
                return rate
        except Exception:
            pass

        fallback = FALLBACK_USD_RATE_BY_CURRENCY.get(currency)
        if fallback and fallback > 0:
            self._usd_rate_by_currency[currency] = fallback
            return fallback
        return None


def fetch_afdc_ev_prices() -> dict[str, int]:
    """Trusted source: AFDC (US DOE) EV downloadable table with Base MSRP."""
    req = urllib.request.Request(
        AFDC_DOWNLOAD_URL,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        page = resp.read().decode("utf-8", errors="ignore")

    parser = AfdcEvTableParser()
    parser.feed(page)

    prices: dict[str, int] = {}
    for row in parser.rows:
        # Expected shape: Photo, FuelType, Make, Model, ..., Base MSRP
        if len(row) < 6:
            continue
        fuel_type = row[1].strip().upper()
        if fuel_type != "EV":
            continue
        make = row[2].strip()
        model = strip_model_footnotes(row[3].strip())
        msrp_value = parse_usd(row[-1])
        if not make or not model or msrp_value is None:
            continue
        key = normalize_vehicle_key(make, model)
        prices[key] = int(round(msrp_value))
    return prices


def vehicle_to_preset(
    vehicle: ET.Element, afdc_prices_by_make_model: dict[str, int] | None = None
) -> dict[str, Any] | None:
    fuel_type = node_text(vehicle, "fuelType1").lower()
    if fuel_type != "electricity":
        return None

    year = node_text(vehicle, "year")
    make = node_text(vehicle, "make")
    model = node_text(vehicle, "model")
    model_label = f"{year} {make} {model}".strip()
    if not year or not make or not model:
        return None

    mpge = parse_float(node_text(vehicle, "combE"))
    if not mpge:
        return None
    efficiency = KWH100KM_PER_MPGE / mpge

    range_miles = parse_float(node_text(vehicle, "rangeA"))
    battery_kwh = None
    if range_miles and range_miles > 0:
        range_km = range_miles * 1.60934
        battery_kwh = (range_km * efficiency) / 100

    if not battery_kwh:
        battery_kwh = 65.0

    battery_kwh = min(220.0, max(20.0, battery_kwh))
    efficiency = min(35.0, max(10.0, efficiency))

    price_usd = None
    if afdc_prices_by_make_model:
        price_key = normalize_vehicle_key(make, model)
        price_usd = afdc_prices_by_make_model.get(price_key)

    preset: dict[str, Any] = {
        "id": slugify(model_label),
        "label": model_label,
        "batteryKwh": round1(battery_kwh),
        "efficiency": round1(efficiency),
        "reserve": 10,
        "markets": ["US"],
        "source": "fueleconomy.gov",
    }
    if price_usd is not None:
        preset["priceUsd"] = price_usd
        preset["priceSource"] = "afdc.energy.gov"
    return preset


def load_manual_presets(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError(f"Manual presets must be a JSON list: {path}")
    return data


def load_previous_payload(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    if not isinstance(payload.get("presets"), list):
        return None
    return payload


def normalize_price_usd(item: dict[str, Any], fx: FxResolver) -> int | None:
    explicit_usd = parse_money_amount(item.get("priceUsd", item.get("price_usd")))
    if explicit_usd is not None and explicit_usd > 0:
        return int(round(explicit_usd))

    raw_price = parse_money_amount(item.get("price"))
    if raw_price is None or raw_price <= 0:
        return None

    currency = str(item.get("priceCurrency", "USD")).strip().upper() or "USD"
    usd_value = fx.to_usd(raw_price, currency)
    if usd_value is None:
        return None
    return int(round(usd_value))


def merge_presets(*groups: list[dict[str, Any]], fx: FxResolver | None = None) -> list[dict[str, Any]]:
    fx = fx or FxResolver()
    merged: dict[str, dict[str, Any]] = {}
    for group in groups:
        for item in group:
            raw_id = str(item.get("id", "")).strip()
            markets = normalize_market_array(item.get("markets"))
            car_id = canonical_car_id(raw_id, markets)
            if not car_id:
                continue
            battery = parse_float(str(item.get("batteryKwh", "")))
            efficiency = parse_float(str(item.get("efficiency", "")))
            reserve = parse_float(str(item.get("reserve", "10")))
            if battery is None or efficiency is None:
                continue

            normalized: dict[str, Any] = {
                "id": car_id,
                "label": str(item.get("label", car_id)).strip() or car_id,
                "batteryKwh": round1(battery),
                "efficiency": round1(efficiency),
                "reserve": int(reserve) if reserve is not None else 10,
                "markets": markets,
            }

            price_usd = normalize_price_usd(item, fx)
            if price_usd is not None:
                normalized["priceUsd"] = price_usd

            if "priceSource" in item:
                normalized["priceSource"] = str(item["priceSource"]).strip()
            market_prices = item.get("marketPrices")
            if isinstance(market_prices, dict):
                normalized_market_prices: dict[str, dict[str, Any]] = {}
                for market_code_raw, entry in market_prices.items():
                    market_code = str(market_code_raw or "").strip().upper()
                    if not re.fullmatch(r"[A-Z]{2}", market_code):
                        continue
                    if not isinstance(entry, dict):
                        continue
                    amount = parse_money_amount(entry.get("amount"))
                    currency = str(entry.get("currency", "")).strip().upper()
                    if amount is None or amount <= 0:
                        continue
                    if not re.fullmatch(r"[A-Z]{3}", currency):
                        continue
                    normalized_market_prices[market_code] = {
                        "amount": int(round(amount)),
                        "currency": currency,
                        "source": str(entry.get("source", "")).strip(),
                        "updatedAt": str(entry.get("updatedAt", "")).strip(),
                    }
                if normalized_market_prices:
                    normalized["marketPrices"] = normalized_market_prices
            if "source" in item:
                normalized["source"] = str(item["source"]).strip()

            merged[car_id] = normalized

    return sorted(merged.values(), key=lambda x: (x.get("label", ""), x.get("id", "")))


def collect_us_ev_presets(from_year: int, to_year: int, sleep_ms: int) -> list[dict[str, Any]]:
    afdc_prices_by_make_model: dict[str, int] = {}
    try:
        afdc_prices_by_make_model = fetch_afdc_ev_prices()
        print(f"Loaded {len(afdc_prices_by_make_model)} EV MSRP entries from AFDC.")
    except Exception as exc:  # pragma: no cover - network/runtime failures
        print(f"Warning: AFDC price sync failed ({exc}). Continuing without MSRP.", file=sys.stderr)

    best_by_id: dict[str, dict[str, Any]] = {}
    for year in range(from_year, to_year + 1):
        makes_root = request_xml("/menu/make", {"year": year})
        makes = parse_menu_values(makes_root)
        for make in makes:
            models_root = request_xml("/menu/model", {"year": year, "make": make})
            models = parse_menu_values(models_root)
            for model in models:
                options_root = request_xml(
                    "/menu/options", {"year": year, "make": make, "model": model}
                )
                vehicle_ids = parse_menu_values(options_root)
                for vehicle_id in vehicle_ids:
                    vehicle = request_xml(f"/{vehicle_id}")
                    preset = vehicle_to_preset(vehicle, afdc_prices_by_make_model)
                    if not preset:
                        continue
                    existing = best_by_id.get(preset["id"])
                    if not existing or preset["batteryKwh"] > existing["batteryKwh"]:
                        best_by_id[preset["id"]] = preset
                    if sleep_ms > 0:
                        time.sleep(sleep_ms / 1000.0)
    return sorted(best_by_id.values(), key=lambda x: x["label"])


def html_to_lines(raw_html: str) -> list[str]:
    # Keep parser minimal and resilient: strip scripts/styles then extract text blocks.
    without_scripts = re.sub(r"<script\b[^>]*>.*?</script>", " ", raw_html, flags=re.IGNORECASE | re.DOTALL)
    without_styles = re.sub(r"<style\b[^>]*>.*?</style>", " ", without_scripts, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", "\n", without_styles)
    text = html.unescape(text)
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    return [line for line in lines if line]


def strip_html_tags(raw_html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw_html)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def collect_india_ev_presets(fx: FxResolver) -> list[dict[str, Any]]:
    req = urllib.request.Request(
        CARDEKHO_IN_ELECTRIC_URL,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        page = resp.read().decode("utf-8", errors="ignore")

    by_id: dict[str, dict[str, Any]] = {}

    card_pattern = re.compile(
        r'<a[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>(?P<name>[^<]+)</a>.*?'
        r'<div class="price">(?P<price_html>.*?)</div>.*?'
        r'<div class="dotlist[^"]*">(?P<spec_html>.*?)</div>',
        flags=re.IGNORECASE | re.DOTALL,
    )

    def try_add_entry(model: str, price_text: str, spec_text: str) -> None:
        if not model:
            return
        battery_kwh = parse_battery_kwh(spec_text)
        range_km = parse_range_km(spec_text)
        price_inr = parse_inr_amount(price_text)
        if battery_kwh is None or range_km is None or range_km <= 0:
            return

        efficiency = (battery_kwh / range_km) * 100
        efficiency = min(35.0, max(10.0, efficiency))
        battery_kwh_normalized = min(220.0, max(20.0, battery_kwh))
        model_id = slugify(model)

        preset: dict[str, Any] = {
            "id": model_id,
            "label": model.strip(),
            "batteryKwh": round1(battery_kwh_normalized),
            "efficiency": round1(efficiency),
            "reserve": 10,
            "markets": ["IN"],
            "source": "cardekho.com",
        }

        if price_inr is not None and price_inr > 0:
            usd = fx.to_usd(price_inr, "INR")
            if usd is not None:
                preset["priceUsd"] = int(round(usd))
            preset["priceSource"] = "cardekho.com"
            preset["marketPrices"] = {
                "IN": {
                    "amount": int(round(price_inr)),
                    "currency": "INR",
                    "source": "cardekho.com",
                    "updatedAt": dt.date.today().isoformat(),
                }
            }

        existing = by_id.get(model_id)
        if existing:
            existing_battery = parse_float(str(existing.get("batteryKwh", ""))) or 0.0
            if battery_kwh_normalized < existing_battery:
                return
        by_id[model_id] = preset

    for match in card_pattern.finditer(page):
        model = html.unescape(match.group("name") or "").strip()
        price_text = strip_html_tags(match.group("price_html") or "")
        spec_text = strip_html_tags(match.group("spec_html") or "")
        try_add_entry(model, price_text, spec_text)

    # Fallback parser path for layout shifts.
    lines = html_to_lines(page)
    for idx, line in enumerate(lines):
        if not looks_like_vehicle_label(line):
            continue
        if idx + 2 >= len(lines):
            continue
        price_line = lines[idx + 1]
        spec_line = lines[idx + 2]
        if "Rs" not in price_line:
            continue
        if "km" not in spec_line.lower() or "kwh" not in spec_line.lower():
            continue
        try_add_entry(line.strip(), price_line, spec_line)

    return sorted(by_id.values(), key=lambda x: x["label"])


class CatalogValidation:
    def __init__(self, ok: bool, errors: list[str], warnings: list[str]) -> None:
        self.ok = ok
        self.errors = errors
        self.warnings = warnings


def catalog_stats(presets: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(presets)
    priced = 0
    markets: dict[str, int] = {}

    for preset in presets:
        if isinstance(preset.get("priceUsd"), int):
            priced += 1
        listed_markets = normalize_market_array(preset.get("markets"))
        bucket = listed_markets if listed_markets else ["GLOBAL"]
        for code in bucket:
            markets[code] = markets.get(code, 0) + 1

    return {
        "total": total,
        "priced": priced,
        "priceCoverage": round((priced / total), 4) if total else 0.0,
        "markets": dict(sorted(markets.items())),
        "marketCount": len(markets),
    }


def validate_candidate_catalog(
    presets: list[dict[str, Any]],
    previous_presets: list[dict[str, Any]],
    min_preset_count: int,
    max_count_drop_ratio: float,
    min_price_coverage: float,
    min_market_presets: dict[str, int] | None = None,
) -> CatalogValidation:
    errors: list[str] = []
    warnings: list[str] = []

    if not presets:
        errors.append("Generated catalog is empty.")
        return CatalogValidation(ok=False, errors=errors, warnings=warnings)

    seen_ids: set[str] = set()
    for item in presets:
        car_id = str(item.get("id", "")).strip()
        if not car_id:
            errors.append("Catalog contains preset with empty id.")
            continue
        if car_id in seen_ids:
            errors.append(f"Duplicate preset id detected: {car_id}")
        seen_ids.add(car_id)

        battery = parse_float(str(item.get("batteryKwh", "")))
        efficiency = parse_float(str(item.get("efficiency", "")))
        reserve = parse_float(str(item.get("reserve", "")))
        if battery is None or battery <= 0:
            errors.append(f"Invalid batteryKwh for {car_id}: {item.get('batteryKwh')}")
        if efficiency is None or efficiency <= 0:
            errors.append(f"Invalid efficiency for {car_id}: {item.get('efficiency')}")
        if reserve is None or reserve < 0 or reserve > 50:
            errors.append(f"Invalid reserve for {car_id}: {item.get('reserve')}")

    current_count = len(presets)
    if current_count < max(1, int(min_preset_count)):
        errors.append(
            f"Catalog count too low: {current_count} < minimum {max(1, int(min_preset_count))}."
        )

    current_stats = catalog_stats(presets)
    for market_code, market_min in (min_market_presets or {}).items():
        if current_stats["markets"].get(market_code, 0) < max(0, int(market_min)):
            errors.append(
                f"Catalog {market_code} market count too low: "
                f"{current_stats['markets'].get(market_code, 0)} < {max(0, int(market_min))}."
            )
    if current_stats["priceCoverage"] < max(0.0, float(min_price_coverage)):
        warnings.append(
            "Low price coverage: "
            f"{current_stats['priceCoverage']:.2%} < configured floor {float(min_price_coverage):.2%}."
        )

    if previous_presets:
        previous_count = len(previous_presets)
        min_allowed = int(previous_count * (1 - max(0.0, float(max_count_drop_ratio))))
        if current_count < min_allowed:
            errors.append(
                "Catalog count dropped too much vs previous snapshot: "
                f"{current_count} < {min_allowed} (previous={previous_count})."
            )

        prev_markets = set(catalog_stats(previous_presets)["markets"].keys())
        curr_markets = set(current_stats["markets"].keys())
        missing_markets = sorted(m for m in prev_markets if m not in curr_markets)
        if missing_markets:
            warnings.append(
                "Some previously covered market buckets disappeared: " + ", ".join(missing_markets)
            )

    return CatalogValidation(ok=not errors, errors=errors, warnings=warnings)


def build_payload(
    presets: list[dict[str, Any]],
    source_label: str,
    source_tags: list[str],
    fallback_mode: bool = False,
    fallback_reason: str = "",
) -> dict[str, Any]:
    stats = catalog_stats(presets)
    payload: dict[str, Any] = {
        "generatedAt": dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "market": "US + regional manual",
        "source": source_label,
        "sources": source_tags,
        "count": len(presets),
        "stats": stats,
        "presets": presets,
    }
    if fallback_mode:
        payload["fallbackMode"] = True
        payload["fallbackReason"] = fallback_reason
    return payload


def write_payload(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def main() -> int:
    args = parse_args()

    # Keep backward compatibility with tests that patch older arg namespace shapes.
    from_year = int(getattr(args, "from_year", dt.date.today().year - 1))
    to_year = int(getattr(args, "to_year", dt.date.today().year + 1))
    manual_file = str(getattr(args, "manual_file", "data/car-presets.manual.json"))
    out_file = str(getattr(args, "out", "data/car-presets.generated.json"))
    previous_file = str(getattr(args, "previous_catalog", out_file))
    sleep_ms = int(getattr(args, "sleep_ms", 80))
    min_preset_count = int(getattr(args, "min_preset_count", 1))
    max_count_drop_ratio = float(getattr(args, "max_count_drop_ratio", DEFAULT_MAX_COUNT_DROP_RATIO))
    min_price_coverage = float(getattr(args, "min_price_coverage", DEFAULT_MIN_PRICE_COVERAGE))
    fx_timeout_ms = int(getattr(args, "fx_timeout_ms", DEFAULT_FX_TIMEOUT_MS))
    min_market_presets = parse_market_minimums(getattr(args, "min_market_preset", []))

    if from_year > to_year:
        print("--from-year must be <= --to-year", file=sys.stderr)
        return 1

    root = Path.cwd()
    manual_path = root / manual_file
    out_path = root / out_file
    previous_path = root / previous_file

    previous_payload = load_previous_payload(previous_path)
    previous_presets = previous_payload.get("presets", []) if previous_payload else []

    print(f"Collecting EV catalog for years {from_year}..{to_year} ...")
    live_us_error = ""
    us_presets: list[dict[str, Any]] = []
    india_error = ""
    india_presets: list[dict[str, Any]] = []
    fx = FxResolver(timeout_ms=fx_timeout_ms)
    try:
        us_presets = collect_us_ev_presets(from_year, to_year, sleep_ms)
    except Exception as exc:  # pragma: no cover - network/runtime failures
        live_us_error = str(exc)
        print(
            f"Warning: live market sync failed ({exc}). Falling back to manual/previous data.",
            file=sys.stderr,
        )
    try:
        india_presets = collect_india_ev_presets(fx)
        if india_presets:
            print(f"Loaded {len(india_presets)} India EV presets from cardekho.com.")
    except Exception as exc:  # pragma: no cover - network/runtime failures
        india_error = str(exc)
        print(
            f"Warning: India sync failed ({exc}). Continuing with remaining sources.",
            file=sys.stderr,
        )

    try:
        manual_presets = load_manual_presets(manual_path)
    except Exception as exc:
        print(f"Failed to read manual presets: {exc}", file=sys.stderr)
        manual_presets = []

    combined = merge_presets(us_presets, india_presets, manual_presets, fx=fx)

    validation = validate_candidate_catalog(
        combined,
        previous_presets=previous_presets,
        min_preset_count=min_preset_count,
        max_count_drop_ratio=max_count_drop_ratio,
        min_price_coverage=min_price_coverage,
        min_market_presets=min_market_presets,
    )

    for warning in validation.warnings:
        print(f"Warning: {warning}", file=sys.stderr)

    if validation.ok:
        payload = build_payload(
            combined,
            source_label="fueleconomy.gov + AFDC + Cardekho + manual presets",
            source_tags=["fueleconomy.gov", "afdc.energy.gov", "cardekho.com", "manual-presets"],
        )
        write_payload(out_path, payload)
        print(
            "Done. "
            f"Wrote {len(combined)} presets to {out_path}. "
            f"Price coverage: {payload['stats']['priceCoverage']:.2%}."
        )
        return 0

    for error in validation.errors:
        print(f"Error: {error}", file=sys.stderr)

    if previous_payload and previous_presets:
        print(
            "Validation failed; retaining previous known-good catalog snapshot.",
            file=sys.stderr,
        )
        fallback_reason = (
            "; ".join(validation.errors)
            + (f"; live US sync error: {live_us_error}" if live_us_error else "")
            + (f"; India sync error: {india_error}" if india_error else "")
        )
        fallback_payload = dict(previous_payload)
        fallback_payload["fallbackMode"] = True
        fallback_payload["fallbackReason"] = fallback_reason[:400]

        # Keep file unchanged when out and previous paths are identical to avoid churn commits.
        if out_path.resolve() != previous_path.resolve():
            write_payload(out_path, fallback_payload)
        return 0

    print("No previous catalog available for fallback; failing sync.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
