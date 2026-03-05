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
import hashlib
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
AU_GVG_SEARCH_URL = "https://www.greenvehicleguide.gov.au/Vehicle/Search"
AU_GVG_NAMES_URL = "https://www.greenvehicleguide.gov.au/Vehicle/GetNamesForSelectList"
EU_NATIVE_SEED_FILE = "data/sources/eu-native.seed.json"
ASEAN_NATIVE_SEED_FILE = "data/sources/asean-native.seed.json"
JPKR_NATIVE_SEED_FILE = "data/sources/jpkr-native.seed.json"
ROW_NATIVE_SEED_FILE = "data/sources/row-native.seed.json"
USER_AGENT = "ev-mapping-catalog-sync/2.0"
KWH_PER_GALLON_EQUIV = 33.705
MILES_PER_100KM = 62.137119
KWH100KM_PER_MPGE = KWH_PER_GALLON_EQUIV * MILES_PER_100KM
DEFAULT_MIN_PRESET_COUNT = 50
DEFAULT_MAX_COUNT_DROP_RATIO = 0.45
DEFAULT_MIN_PRICE_COVERAGE = 0.03
DEFAULT_FX_TIMEOUT_MS = 3000
DEFAULT_MIN_MARKET_PRESETS = {
    "US": 300,
    "CA": 120,
    "DE": 80,
    "TR": 30,
    "ZA": 20,
    "MA": 20,
    "EG": 20,
    "IN": 20,
    "LK": 10,
    "SG": 20,
    "CN": 20,
    "TH": 20,
    "MY": 18,
    "ID": 18,
    "VN": 18,
    "PH": 12,
    "AU": 25,
    "NZ": 20,
    "JP": 24,
    "KR": 20,
}
DEFAULT_BOOTSTRAP_MARKETS = ["US", "IN", "DE", "SG", "CN", "CA"]
REGIONAL_SOURCE_MARKETS = {"US", "IN"}
REGIONAL_LABEL_BLOCKLIST = re.compile(
    r"\b(f-?150|silverado|escalade|hummer|bolt|corvette|camaro|sierra|super duty)\b",
    flags=re.IGNORECASE,
)
REGIONAL_MARKET_EXPANSION_RULES = {
    "IN": {
        "source_markets": {"IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "jaguar",
            "kia",
            "mahindra",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "porsche",
            "tata",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 140.0,
    },
    "CA": {
        "source_markets": {"US"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "cadillac",
            "chevrolet",
            "ford",
            "genesis",
            "gmc",
            "hyundai",
            "jaguar",
            "kia",
            "lucid",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "polestar",
            "porsche",
            "rivian",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 160.0,
    },
    "DE": {
        "source_markets": {"US"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mini",
            "nissan",
            "polestar",
            "porsche",
            "tesla",
            "volkswagen",
            "volvo",
            "mg",
            "jaguar",
        },
        "max_battery_kwh": 130.0,
    },
    "TR": {
        "source_markets": {"US"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "polestar",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "ZA": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "polestar",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "MA": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "polestar",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "EG": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "polestar",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "LK": {
        "source_markets": {"IN", "LK"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mahindra",
            "mercedes-benz",
            "mg",
            "nissan",
            "tata",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 120.0,
    },
    "SG": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 110.0,
    },
    "CN": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "nissan",
            "toyota",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "TH": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "nissan",
            "toyota",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "MY": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "nissan",
            "toyota",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "ID": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "nissan",
            "toyota",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "VN": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "nissan",
            "toyota",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "PH": {
        "source_markets": {"US", "IN"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "nissan",
            "toyota",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "AU": {
        "source_markets": {"US"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "ford",
            "genesis",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "polestar",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 150.0,
    },
    "NZ": {
        "source_markets": {"US"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "ford",
            "genesis",
            "hyundai",
            "kia",
            "mercedes-benz",
            "mg",
            "mini",
            "nissan",
            "polestar",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 150.0,
    },
    "JP": {
        "source_markets": {"US"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "honda",
            "hyundai",
            "kia",
            "lexus",
            "mercedes-benz",
            "mazda",
            "nissan",
            "subaru",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
    "KR": {
        "source_markets": {"US"},
        "make_allowlist": {
            "audi",
            "bmw",
            "byd",
            "genesis",
            "hyundai",
            "kia",
            "mercedes-benz",
            "tesla",
            "volkswagen",
            "volvo",
        },
        "max_battery_kwh": 130.0,
    },
}

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
AU_GVG_PURE_ELECTRIC_FUEL_TYPE = "15"
MARKET_ALLOWED_SOURCE_TOKENS = {
    "IN": ("cardekho.com", "in-native-seed", "manual"),
    "LK": ("cardekho.com", "in-native-seed", "row-native-seed", "manual"),
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
        "--eu-seed-file",
        default=EU_NATIVE_SEED_FILE,
        help="EU native source seed JSON file.",
    )
    parser.add_argument(
        "--asean-seed-file",
        default=ASEAN_NATIVE_SEED_FILE,
        help="ASEAN native source seed JSON file.",
    )
    parser.add_argument(
        "--jpkr-seed-file",
        default=JPKR_NATIVE_SEED_FILE,
        help="Japan/Korea native source seed JSON file.",
    )
    parser.add_argument(
        "--row-seed-file",
        default=ROW_NATIVE_SEED_FILE,
        help="Rest-of-world native source seed JSON file (Africa/ANZ/Canada).",
    )
    parser.add_argument(
        "--out",
        default="data/car-presets.generated.json",
        help="Output JSON path (default: data/car-presets.generated.json)",
    )
    parser.add_argument(
        "--manifest-out",
        default="data/catalog/catalog_manifest.json",
        help="Output path for market manifest JSON.",
    )
    parser.add_argument(
        "--split-dir",
        default="data/catalog/markets",
        help="Directory for per-market split catalog files.",
    )
    parser.add_argument(
        "--bootstrap-market",
        action="append",
        default=[],
        help=(
            "Preferred startup market code for frontend preloading. "
            "Can be passed multiple times."
        ),
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
        "--max-seed-age-days",
        type=int,
        default=60,
        help="Maximum allowed age (in days) for region-native seed files before sync fails.",
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


def request_json_post(url: str, form_data: dict[str, Any], timeout_s: float = 15.0) -> Any:
    encoded = urllib.parse.urlencode(form_data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=encoded,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        payload = resp.read().decode("utf-8")
    return json.loads(payload)


def request_html_post(url: str, form_data: dict[str, Any], timeout_s: float = 20.0) -> str:
    encoded = urllib.parse.urlencode(form_data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=encoded,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        return resp.read().decode("utf-8", errors="ignore")


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


def parse_bootstrap_markets(values: list[str] | None) -> list[str]:
    out: list[str] = []
    for raw in values or []:
        code = str(raw or "").strip().upper()
        if re.fullmatch(r"[A-Z]{2}", code) and code not in out:
            out.append(code)
    if out:
        return out
    return list(DEFAULT_BOOTSTRAP_MARKETS)


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


def extract_make_from_label(label: str) -> str:
    text = re.sub(r"^\s*\d{4}\s+", "", str(label or "").strip().lower())
    if not text:
        return ""
    for multi in ("mercedes-benz", "land rover", "alfa romeo", "aston martin"):
        if text.startswith(multi):
            return multi
    return re.split(r"\s+", text, maxsplit=1)[0]


def should_expand_to_market(preset: dict[str, Any], target_market: str) -> bool:
    markets = set(normalize_market_array(preset.get("markets")))
    if target_market in markets:
        return False

    label = str(preset.get("label", ""))
    if REGIONAL_LABEL_BLOCKLIST.search(label):
        return False

    rules = REGIONAL_MARKET_EXPANSION_RULES.get(target_market, {})
    source_markets = set(rules.get("source_markets", REGIONAL_SOURCE_MARKETS))
    if source_markets and not (markets & source_markets):
        return False

    battery = parse_float(str(preset.get("batteryKwh", ""))) or 0.0
    make = extract_make_from_label(label)
    allowlist = set(rules.get("make_allowlist", set()))
    blocklist = set(rules.get("make_blocklist", set()))
    max_battery_kwh = float(rules.get("max_battery_kwh", 220.0))
    min_battery_kwh = float(rules.get("min_battery_kwh", 20.0))

    if allowlist and make not in allowlist:
        return False
    if blocklist and make in blocklist:
        return False
    if battery <= 0 or battery < min_battery_kwh or battery > max_battery_kwh:
        return False
    return True


def augment_regional_market_coverage(presets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for preset in presets:
        normalized = dict(preset)
        markets = normalize_market_array(normalized.get("markets"))
        for market_code in REGIONAL_MARKET_EXPANSION_RULES.keys():
            if should_expand_to_market({**normalized, "markets": markets}, market_code):
                markets.append(market_code)
        normalized["markets"] = normalize_market_array(markets)
        out.append(normalized)
    return out


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


def load_region_native_seed_presets(path: Path, source_name: str) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        return []
    if not isinstance(data, list):
        return []

    out: list[dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        normalized = dict(item)
        normalized["source"] = str(item.get("source") or source_name).strip() or source_name
        markets = normalize_market_array(item.get("markets"))
        if markets:
            normalized["markets"] = markets
        out.append(normalized)
    return out


def seed_age_days(path: Path, today: dt.date | None = None) -> int | None:
    if not path.exists():
        return None
    today = today or dt.date.today()
    try:
        modified = dt.datetime.fromtimestamp(path.stat().st_mtime, tz=dt.UTC).date()
    except Exception:
        return None
    delta = (today - modified).days
    return max(0, int(delta))


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


def clean_vehicle_label(label: str) -> str:
    text = re.sub(r"\s+", " ", str(label or "").strip())
    text = re.sub(r"\s+\((released [0-9]{4})\)\s*$", "", text, flags=re.IGNORECASE)
    return text.strip()


def parse_au_gvg_vehicle_rows(html_text: str, include_non_current: bool = False) -> list[dict[str, Any]]:
    rows = re.findall(r'<tr class="vehicle-item">.*?</tr>', str(html_text or ""), flags=re.IGNORECASE | re.DOTALL)
    best_by_id: dict[str, dict[str, Any]] = {}

    for row in rows:
        if not include_non_current and "non-current-model" in row:
            continue

        details = re.findall(
            r'<td class="details(?: always-show)?"[^>]*data-sort="([^"]*)"',
            row,
            flags=re.IGNORECASE,
        )
        if len(details) < 3:
            continue

        label = clean_vehicle_label(html.unescape(details[0]))
        fuel = str(details[2] or "").strip().lower()
        if fuel != "pure electric":
            continue

        energy_match = re.search(
            r'<td class="energy-consumption"[^>]*data-sort="([^"]*)"',
            row,
            flags=re.IGNORECASE,
        )
        range_match = re.search(
            r'<td class="electric-range"[^>]*data-sort="([^"]*)"',
            row,
            flags=re.IGNORECASE,
        )
        energy_raw = parse_float(html.unescape(energy_match.group(1) if energy_match else ""))
        range_km = parse_float(html.unescape(range_match.group(1) if range_match else ""))

        if not label or not energy_raw or not range_km or range_km <= 0:
            continue

        # GVG energy field is Wh/km for EVs in the result table (e.g., 117 -> 11.7 kWh/100km).
        efficiency = float(energy_raw)
        if efficiency > 60:
            efficiency = efficiency / 10.0
        efficiency = min(35.0, max(10.0, efficiency))
        battery_kwh = min(220.0, max(20.0, (range_km * efficiency) / 100.0))

        car_id = slugify(label)
        if not car_id:
            continue
        preset = {
            "id": car_id,
            "label": label,
            "batteryKwh": round1(battery_kwh),
            "efficiency": round1(efficiency),
            "reserve": 10,
            "markets": ["AU"],
            "source": "greenvehicleguide.gov.au",
        }
        existing = best_by_id.get(car_id)
        if existing:
            existing_battery = parse_float(str(existing.get("batteryKwh", ""))) or 0.0
            if battery_kwh <= existing_battery:
                continue
        best_by_id[car_id] = preset

    return sorted(best_by_id.values(), key=lambda x: (x["label"], x["id"]))


def fetch_au_gvg_manufacturers(start_year: int, end_year: int, current_only: bool) -> list[str]:
    payload = request_json_post(
        AU_GVG_NAMES_URL,
        {
            "startYear": str(start_year),
            "endYear": str(end_year),
            "manufacturerId": "-1",
            "showCurrentOnly": "true" if current_only else "false",
            "isPublicSearchOption": "true",
        },
        timeout_s=20.0,
    )
    if not isinstance(payload, list):
        return []
    out: list[str] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        value = str(item.get("Value", "")).strip()
        if not value or value == "-1":
            continue
        if value not in out:
            out.append(value)
    return out


def fetch_au_gvg_search_html(
    *,
    start_year: int,
    end_year: int,
    manufacturer_id: str,
) -> str:
    form_data = {
        "VehicleSearchParameterList.Index": "4",
        "SearchType": "0",
        "VehicleSearchParameterList[4].SelectedYearStart": str(start_year),
        "VehicleSearchParameterList[4].SelectedYearEnd": str(end_year),
        "VehicleSearchParameterList[4].SelectedManufacturer": str(manufacturer_id),
        "VehicleSearchParameterList[4].VehicleModel": "-1",
        "VehicleSearchParameterList[4].Variant": "-1",
        "VehicleSearchParameterList[4].FuelType": AU_GVG_PURE_ELECTRIC_FUEL_TYPE,
        "VehicleSearchParameterList[4].Transmission": "-1",
        "VehicleSearchParameterList[4].DrivenWheels": "-1",
        "VehicleSearchParameterList[4].VehicleClass": "-1",
        "VehicleSearchParameterList[4].BodyStyle": "-1",
        "VehicleSearchParameterList[4].SeatingCapacity": "-1",
        "submitType": "Search vehicles",
    }
    return request_html_post(AU_GVG_SEARCH_URL, form_data, timeout_s=30.0)


def collect_australia_ev_presets(from_year: int, to_year: int) -> list[dict[str, Any]]:
    start_year = max(2015, min(from_year, to_year))
    end_year = max(start_year, max(to_year, dt.date.today().year))
    manufacturer_ids = fetch_au_gvg_manufacturers(start_year, end_year, current_only=True)
    best_by_id: dict[str, dict[str, Any]] = {}

    for idx, manufacturer_id in enumerate(manufacturer_ids):
        try:
            page = fetch_au_gvg_search_html(
                start_year=start_year,
                end_year=end_year,
                manufacturer_id=manufacturer_id,
            )
            rows = parse_au_gvg_vehicle_rows(page, include_non_current=False)
            for item in rows:
                existing = best_by_id.get(item["id"])
                if not existing:
                    best_by_id[item["id"]] = item
                    continue
                existing_battery = parse_float(str(existing.get("batteryKwh", ""))) or 0.0
                candidate_battery = parse_float(str(item.get("batteryKwh", ""))) or 0.0
                if candidate_battery > existing_battery:
                    best_by_id[item["id"]] = item
        except Exception:
            continue
        if idx % 10 == 0:
            time.sleep(0.02)

    return sorted(best_by_id.values(), key=lambda x: (x["label"], x["id"]))


def market_source_policy_errors(presets: list[dict[str, Any]], max_errors: int = 25) -> list[str]:
    errors: list[str] = []
    for preset in presets:
        car_id = str(preset.get("id", "")).strip() or "<missing-id>"
        source = str(preset.get("source", "")).strip().lower()
        market_prices = preset.get("marketPrices")
        price_by_market = market_prices if isinstance(market_prices, dict) else {}
        for market_code in normalize_market_array(preset.get("markets")):
            allowed_tokens = MARKET_ALLOWED_SOURCE_TOKENS.get(market_code)
            if not allowed_tokens:
                continue
            if not source:
                continue
            if isinstance(price_by_market.get(market_code), dict):
                continue
            if any(token in source for token in allowed_tokens):
                continue
            errors.append(
                f"{car_id} has market {market_code} with disallowed source '{source}'."
            )
            if len(errors) >= max(1, int(max_errors)):
                return errors
    return errors


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
    source_policy_errors = market_source_policy_errors(presets)
    for source_error in source_policy_errors:
        errors.append("Market source policy violation: " + source_error)
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


def json_sha256(payload: Any) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def split_presets_by_market(presets: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    split: dict[str, list[dict[str, Any]]] = {}
    for preset in presets:
        listed_markets = normalize_market_array(preset.get("markets"))
        market_bucket = listed_markets if listed_markets else ["GLOBAL"]
        for market_code in market_bucket:
            split.setdefault(market_code, []).append(preset)
    for market_code, items in split.items():
        split[market_code] = sorted(items, key=lambda x: (str(x.get("label", "")), str(x.get("id", ""))))
    return dict(sorted(split.items(), key=lambda kv: kv[0]))


def build_market_payload(
    market_code: str,
    presets: list[dict[str, Any]],
    source_label: str,
    source_tags: list[str],
    generated_at: str,
) -> dict[str, Any]:
    return {
        "generatedAt": generated_at,
        "market": market_code,
        "source": source_label,
        "sources": list(source_tags),
        "count": len(presets),
        "stats": catalog_stats(presets),
        "presets": presets,
    }


def write_market_split_outputs(
    *,
    combined_payload: dict[str, Any],
    split_dir: Path,
    manifest_path: Path,
    bootstrap_markets: list[str],
) -> dict[str, Any]:
    generated_at = str(combined_payload.get("generatedAt", ""))
    source_label = str(combined_payload.get("source", "Generated catalog"))
    source_tags = list(combined_payload.get("sources", []))
    presets = list(combined_payload.get("presets", []))
    split = split_presets_by_market(presets)

    split_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    market_meta: dict[str, dict[str, Any]] = {}
    market_checksums: dict[str, str] = {}
    for market_code, market_presets in split.items():
        market_payload = build_market_payload(
            market_code=market_code,
            presets=market_presets,
            source_label=source_label,
            source_tags=source_tags,
            generated_at=generated_at,
        )
        market_file = split_dir / f"{market_code}.json"
        write_payload(market_file, market_payload)
        market_checksum = json_sha256(market_payload)
        market_checksums[market_code] = market_checksum
        market_meta[market_code] = {
            "count": len(market_presets),
            "file": "./" + market_file.relative_to(Path.cwd()).as_posix(),
            "sha256": market_checksum,
            "priceCoverage": market_payload["stats"]["priceCoverage"],
        }

    available_bootstrap = [code for code in bootstrap_markets if code in market_meta]
    if not available_bootstrap:
        available_bootstrap = [code for code in DEFAULT_BOOTSTRAP_MARKETS if code in market_meta]
    if "GLOBAL" in market_meta and "GLOBAL" not in available_bootstrap:
        available_bootstrap.append("GLOBAL")

    qa_summary = {
        "marketCount": len(market_meta),
        "marketsBelowTenPresets": sorted(
            [code for code, meta in market_meta.items() if int(meta.get("count", 0)) < 10]
        ),
    }

    manifest_payload: dict[str, Any] = {
        "catalogVersion": generated_at,
        "generatedAt": generated_at,
        "source": source_label,
        "sources": source_tags,
        "uniquePresetCount": len(presets),
        "stats": combined_payload.get("stats", {}),
        "bootstrapMarkets": available_bootstrap,
        "markets": market_meta,
        "checksums": {
            "combined": json_sha256(combined_payload),
            "markets": market_checksums,
        },
        "qaSummary": qa_summary,
    }
    write_payload(manifest_path, manifest_payload)
    return manifest_payload


def main() -> int:
    args = parse_args()

    # Keep backward compatibility with tests that patch older arg namespace shapes.
    from_year = int(getattr(args, "from_year", dt.date.today().year - 1))
    to_year = int(getattr(args, "to_year", dt.date.today().year + 1))
    manual_file = str(getattr(args, "manual_file", "data/car-presets.manual.json"))
    eu_seed_file = str(getattr(args, "eu_seed_file", EU_NATIVE_SEED_FILE))
    asean_seed_file = str(getattr(args, "asean_seed_file", ASEAN_NATIVE_SEED_FILE))
    jpkr_seed_file = str(getattr(args, "jpkr_seed_file", JPKR_NATIVE_SEED_FILE))
    row_seed_file = str(getattr(args, "row_seed_file", ROW_NATIVE_SEED_FILE))
    out_file = str(getattr(args, "out", "data/car-presets.generated.json"))
    manifest_file = str(getattr(args, "manifest_out", "data/catalog/catalog_manifest.json"))
    split_dir_raw = str(getattr(args, "split_dir", "data/catalog/markets"))
    previous_file = str(getattr(args, "previous_catalog", out_file))
    sleep_ms = int(getattr(args, "sleep_ms", 80))
    min_preset_count = int(getattr(args, "min_preset_count", 1))
    max_count_drop_ratio = float(getattr(args, "max_count_drop_ratio", DEFAULT_MAX_COUNT_DROP_RATIO))
    min_price_coverage = float(getattr(args, "min_price_coverage", DEFAULT_MIN_PRICE_COVERAGE))
    fx_timeout_ms = int(getattr(args, "fx_timeout_ms", DEFAULT_FX_TIMEOUT_MS))
    max_seed_age_days = int(getattr(args, "max_seed_age_days", 60))
    min_market_presets = parse_market_minimums(getattr(args, "min_market_preset", []))
    bootstrap_markets = parse_bootstrap_markets(getattr(args, "bootstrap_market", []))

    if from_year > to_year:
        print("--from-year must be <= --to-year", file=sys.stderr)
        return 1

    root = Path.cwd()
    manual_path = root / manual_file
    eu_seed_path = root / eu_seed_file
    asean_seed_path = root / asean_seed_file
    jpkr_seed_path = root / jpkr_seed_file
    row_seed_path = root / row_seed_file
    out_path = root / out_file
    manifest_path = root / manifest_file
    split_dir = root / split_dir_raw
    previous_path = root / previous_file

    previous_payload = load_previous_payload(previous_path)
    previous_presets = previous_payload.get("presets", []) if previous_payload else []

    print(f"Collecting EV catalog for years {from_year}..{to_year} ...")
    live_us_error = ""
    us_presets: list[dict[str, Any]] = []
    india_error = ""
    india_presets: list[dict[str, Any]] = []
    australia_error = ""
    australia_presets: list[dict[str, Any]] = []
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
        australia_presets = collect_australia_ev_presets(from_year, to_year)
        if australia_presets:
            print(
                "Loaded "
                f"{len(australia_presets)} Australia EV presets from greenvehicleguide.gov.au."
            )
    except Exception as exc:  # pragma: no cover - network/runtime failures
        australia_error = str(exc)
        print(
            f"Warning: Australia sync failed ({exc}). Continuing with remaining sources.",
            file=sys.stderr,
        )

    try:
        manual_presets = load_manual_presets(manual_path)
    except Exception as exc:
        print(f"Failed to read manual presets: {exc}", file=sys.stderr)
        manual_presets = []

    eu_native_presets = load_region_native_seed_presets(eu_seed_path, "eu-native-seed")
    asean_native_presets = load_region_native_seed_presets(asean_seed_path, "asean-native-seed")
    jpkr_native_presets = load_region_native_seed_presets(jpkr_seed_path, "jpkr-native-seed")
    row_native_presets = load_region_native_seed_presets(row_seed_path, "row-native-seed")
    seed_age_errors: list[str] = []
    seed_age_warnings: list[str] = []
    seed_files = [
        ("EU seed", eu_seed_path),
        ("ASEAN seed", asean_seed_path),
        ("JP/KR seed", jpkr_seed_path),
        ("ROW seed", row_seed_path),
    ]
    for seed_label, seed_path in seed_files:
        age_days = seed_age_days(seed_path)
        if age_days is None:
            seed_age_warnings.append(f"{seed_label} missing or unreadable: {seed_path}")
            continue
        if age_days > max(0, max_seed_age_days):
            seed_age_errors.append(
                f"{seed_label} too old ({age_days}d > {max(0, max_seed_age_days)}d): {seed_path}"
            )
        elif age_days > max(0, int(max_seed_age_days * 0.6)):
            seed_age_warnings.append(
                f"{seed_label} getting old ({age_days}d): {seed_path}"
            )
    if eu_native_presets:
        print(f"Loaded {len(eu_native_presets)} EU native presets from seed.")
    if asean_native_presets:
        print(f"Loaded {len(asean_native_presets)} ASEAN native presets from seed.")
    if jpkr_native_presets:
        print(f"Loaded {len(jpkr_native_presets)} JP/KR native presets from seed.")
    if row_native_presets:
        print(f"Loaded {len(row_native_presets)} ROW native presets from seed.")

    combined = merge_presets(
        us_presets,
        india_presets,
        australia_presets,
        eu_native_presets,
        asean_native_presets,
        jpkr_native_presets,
        row_native_presets,
        manual_presets,
        fx=fx,
    )
    combined = augment_regional_market_coverage(combined)

    validation = validate_candidate_catalog(
        combined,
        previous_presets=previous_presets,
        min_preset_count=min_preset_count,
        max_count_drop_ratio=max_count_drop_ratio,
        min_price_coverage=min_price_coverage,
        min_market_presets=min_market_presets,
    )

    validation.warnings.extend(seed_age_warnings)
    if seed_age_errors:
        validation.errors.extend(seed_age_errors)
        validation.ok = False

    for warning in validation.warnings:
        print(f"Warning: {warning}", file=sys.stderr)

    if validation.ok:
        source_parts: list[str] = []
        source_tags: list[str] = []
        if us_presets:
            source_parts.extend(["fueleconomy.gov", "AFDC"])
            source_tags.extend(["fueleconomy.gov", "afdc.energy.gov"])
        if india_presets:
            source_parts.append("Cardekho")
            source_tags.append("cardekho.com")
        if australia_presets:
            source_parts.append("Australia GVG")
            source_tags.append("greenvehicleguide.gov.au")
        if eu_native_presets:
            source_parts.append("EU seed")
            source_tags.append("eu-native-seed")
        if asean_native_presets:
            source_parts.append("ASEAN seed")
            source_tags.append("asean-native-seed")
        if jpkr_native_presets:
            source_parts.append("JP/KR seed")
            source_tags.append("jpkr-native-seed")
        if row_native_presets:
            source_parts.append("ROW seed")
            source_tags.append("row-native-seed")
        if manual_presets:
            source_parts.append("manual presets")
            source_tags.append("manual-presets")
        if not source_parts:
            source_parts = ["generated catalog"]
        if not source_tags:
            source_tags = ["generated-catalog"]
        payload = build_payload(
            combined,
            source_label=" + ".join(source_parts),
            source_tags=source_tags,
        )
        manifest_payload = write_market_split_outputs(
            combined_payload=payload,
            split_dir=split_dir,
            manifest_path=manifest_path,
            bootstrap_markets=bootstrap_markets,
        )
        write_payload(out_path, payload)
        print(
            "Done. "
            f"Wrote {len(combined)} presets to {out_path}. "
            f"Price coverage: {payload['stats']['priceCoverage']:.2%}. "
            f"Split markets: {len(manifest_payload.get('markets', {}))} -> {manifest_path}."
        )
        return 0

    for error in validation.errors:
        print(f"Error: {error}", file=sys.stderr)

    if seed_age_errors:
        print(
            "Seed freshness guardrail failed; update region-native seed files before publishing.",
            file=sys.stderr,
        )
        return 1

    if previous_payload and previous_presets:
        print(
            "Validation failed; retaining previous known-good catalog snapshot.",
            file=sys.stderr,
        )
        fallback_reason = (
            "; ".join(validation.errors)
            + (f"; live US sync error: {live_us_error}" if live_us_error else "")
            + (f"; India sync error: {india_error}" if india_error else "")
            + (f"; Australia sync error: {australia_error}" if australia_error else "")
        )
        fallback_presets = merge_presets(
            previous_presets,
            australia_presets,
            eu_native_presets,
            asean_native_presets,
            jpkr_native_presets,
            row_native_presets,
            manual_presets,
            fx=fx,
        )
        fallback_presets = augment_regional_market_coverage(fallback_presets)
        fallback_source_tags = set(previous_payload.get("sources", []))
        if eu_native_presets:
            fallback_source_tags.add("eu-native-seed")
        if asean_native_presets:
            fallback_source_tags.add("asean-native-seed")
        if jpkr_native_presets:
            fallback_source_tags.add("jpkr-native-seed")
        if row_native_presets:
            fallback_source_tags.add("row-native-seed")
        if australia_presets:
            fallback_source_tags.add("greenvehicleguide.gov.au")
        if manual_presets:
            fallback_source_tags.add("manual-presets")
        fallback_payload = build_payload(
            fallback_presets,
            source_label=str(previous_payload.get("source", "fallback-catalog")),
            source_tags=sorted(fallback_source_tags) if fallback_source_tags else ["fallback-catalog"],
            fallback_mode=True,
            fallback_reason=fallback_reason[:400],
        )

        try:
            write_market_split_outputs(
                combined_payload=fallback_payload,
                split_dir=split_dir,
                manifest_path=manifest_path,
                bootstrap_markets=bootstrap_markets,
            )
        except Exception as exc:
            print(f"Warning: failed to refresh split outputs from fallback catalog ({exc}).", file=sys.stderr)

        write_payload(out_path, fallback_payload)
        return 0

    print("No previous catalog available for fallback; failing sync.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
