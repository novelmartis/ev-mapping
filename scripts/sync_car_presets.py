#!/usr/bin/env python3
"""Generate EV car presets from market data.

Primary source: fueleconomy.gov WS REST API (US market).
Manual additions: data/car-presets.manual.json (for models not in the US feed).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

BASE_URL = "https://www.fueleconomy.gov/ws/rest/vehicle"
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


def vehicle_to_preset(vehicle: ET.Element) -> dict[str, Any] | None:
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

    return {
        "id": slugify(model_label),
        "label": model_label,
        "batteryKwh": round1(battery_kwh),
        "efficiency": round1(efficiency),
        "reserve": 10,
        "markets": ["US"],
        "source": "fueleconomy.gov",
    }


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
            if "source" in item:
                normalized["source"] = str(item["source"])
            merged[car_id] = normalized
    return sorted(merged.values(), key=lambda x: x["label"])


def collect_us_ev_presets(from_year: int, to_year: int, sleep_ms: int) -> list[dict[str, Any]]:
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
                    preset = vehicle_to_preset(vehicle)
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
