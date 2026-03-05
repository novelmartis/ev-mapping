#!/usr/bin/env python3
"""Generate EV car presets from market data.

Primary source: fueleconomy.gov WS REST API (US market).
Manual additions: data/car-presets.manual.json (for models not in the US feed).
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
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
USER_AGENT = "ev-mapping-catalog-sync/1.0"
KWH_PER_GALLON_EQUIV = 33.705
MILES_PER_100KM = 62.137119
KWH100KM_PER_MPGE = KWH_PER_GALLON_EQUIV * MILES_PER_100KM


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
        "--sleep-ms",
        type=int,
        default=80,
        help="Delay between requests to avoid hammering public APIs.",
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
    value = value.strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def parse_usd(value: str) -> float | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9.]", "", value.strip())
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
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


def normalize_vehicle_key(make: str, model: str) -> str:
    text = f"{make} {model}".strip().lower()
    text = re.sub(r"\s+", " ", text)
    return re.sub(r"[^a-z0-9 ]+", "", text).strip()


def strip_model_footnotes(model: str) -> str:
    return re.sub(r"\s*\d+\s*$", "", model).strip()


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

    preset = {
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


def merge_presets(*groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for group in groups:
        for item in group:
            car_id = str(item.get("id", "")).strip()
            if not car_id:
                continue
            battery = parse_float(str(item.get("batteryKwh", "")))
            efficiency = parse_float(str(item.get("efficiency", "")))
            reserve = parse_float(str(item.get("reserve", "10")))
            if battery is None or efficiency is None:
                continue
            normalized = {
                "id": car_id,
                "label": str(item.get("label", car_id)).strip() or car_id,
                "batteryKwh": round1(battery),
                "efficiency": round1(efficiency),
                "reserve": int(reserve) if reserve is not None else 10,
                "markets": normalize_market_array(item.get("markets")),
            }
            price_usd = parse_usd(str(item.get("priceUsd", item.get("price", ""))))
            if price_usd is not None:
                normalized["priceUsd"] = int(round(price_usd))
            if "priceSource" in item:
                normalized["priceSource"] = str(item["priceSource"]).strip()
            if "source" in item:
                normalized["source"] = str(item["source"])
            merged[car_id] = normalized
    return sorted(merged.values(), key=lambda x: x["label"])


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


def main() -> int:
    args = parse_args()
    if args.from_year > args.to_year:
        print("--from-year must be <= --to-year", file=sys.stderr)
        return 1

    root = Path.cwd()
    manual_path = root / args.manual_file
    out_path = root / args.out

    print(f"Collecting EV catalog for years {args.from_year}..{args.to_year} ...")
    try:
        us_presets = collect_us_ev_presets(args.from_year, args.to_year, args.sleep_ms)
    except Exception as exc:  # pragma: no cover - network/runtime failures
        print(
            f"Warning: live market sync failed ({exc}). Falling back to manual presets only.",
            file=sys.stderr,
        )
        us_presets = []
    manual_presets = load_manual_presets(manual_path)
    combined = merge_presets(us_presets, manual_presets)

    if not combined:
        print("No presets available from API or manual files.", file=sys.stderr)
        return 1

    payload = {
        "generatedAt": dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "market": "US + manual",
        "source": "fueleconomy.gov + manual presets",
        "count": len(combined),
        "presets": combined,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")

    print(f"Done. Wrote {len(combined)} presets to {out_path}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
