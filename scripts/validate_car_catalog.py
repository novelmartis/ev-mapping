#!/usr/bin/env python3
"""Validate generated EV catalog integrity and safety thresholds."""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate generated EV car catalog JSON.")
    parser.add_argument(
        "--catalog",
        default="data/car-presets.generated.json",
        help="Path to generated catalog JSON.",
    )
    parser.add_argument(
        "--previous",
        default="",
        help="Path to previous catalog JSON for anti-regression checks.",
    )
    parser.add_argument("--min-count", type=int, default=50, help="Minimum total preset count.")
    parser.add_argument(
        "--max-drop-ratio",
        type=float,
        default=0.45,
        help="Maximum allowed fractional count drop vs previous catalog.",
    )
    parser.add_argument(
        "--min-price-coverage",
        type=float,
        default=0.03,
        help="Minimum share of presets with priceUsd.",
    )
    parser.add_argument(
        "--min-market-count",
        type=int,
        default=2,
        help="Minimum number of market buckets (including GLOBAL when markets[] is empty).",
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


def load_payload(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise SystemExit(f"Catalog file does not exist: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Failed to parse JSON from {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"Catalog root must be an object: {path}")
    return payload


def normalize_market_array(markets: Any) -> list[str]:
    if not isinstance(markets, list):
        return []
    seen: list[str] = []
    for value in markets:
        code = str(value or "").strip().upper()
        if code and code not in seen:
            seen.append(code)
    return seen


def parse_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return parsed


def parse_market_minimums(values: list[str] | None) -> dict[str, int]:
    out: dict[str, int] = {}
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


def catalog_stats(presets: list[dict[str, Any]]) -> dict[str, Any]:
    markets: dict[str, int] = {}
    priced = 0
    for item in presets:
        if isinstance(item.get("priceUsd"), int):
            priced += 1
        bucket = normalize_market_array(item.get("markets")) or ["GLOBAL"]
        for code in bucket:
            markets[code] = markets.get(code, 0) + 1
    total = len(presets)
    return {
        "count": total,
        "priced": priced,
        "priceCoverage": (priced / total) if total else 0.0,
        "marketBuckets": markets,
    }


def validate_payload(payload: dict[str, Any], label: str) -> tuple[list[str], list[str], list[dict[str, Any]]]:
    errors: list[str] = []
    warnings: list[str] = []

    presets = payload.get("presets")
    if not isinstance(presets, list):
        errors.append(f"{label}: presets must be a list")
        return errors, warnings, []

    expected_count = payload.get("count")
    if isinstance(expected_count, int) and expected_count != len(presets):
        errors.append(f"{label}: count mismatch (count={expected_count}, len={len(presets)})")

    seen_ids: set[str] = set()
    for item in presets:
        if not isinstance(item, dict):
            errors.append(f"{label}: preset entry is not an object")
            continue

        car_id = str(item.get("id", "")).strip()
        if not car_id:
            errors.append(f"{label}: preset missing id")
            continue
        if car_id in seen_ids:
            errors.append(f"{label}: duplicate id {car_id}")
        seen_ids.add(car_id)

        battery = parse_float(item.get("batteryKwh"))
        efficiency = parse_float(item.get("efficiency"))
        reserve = parse_float(item.get("reserve"))
        if battery is None or battery <= 0:
            errors.append(f"{label}: invalid batteryKwh for {car_id}")
        if efficiency is None or efficiency <= 0:
            errors.append(f"{label}: invalid efficiency for {car_id}")
        if reserve is None or reserve < 0 or reserve > 50:
            errors.append(f"{label}: invalid reserve for {car_id}")

        markets = normalize_market_array(item.get("markets"))
        if not isinstance(item.get("markets"), list):
            warnings.append(f"{label}: {car_id} markets is not a list; treated as GLOBAL")
        for code in markets:
            if len(code) != 2 or not code.isalpha():
                warnings.append(f"{label}: {car_id} has unusual market code {code}")

        price = item.get("priceUsd")
        if price is not None:
            if not isinstance(price, int) or price <= 0:
                errors.append(f"{label}: invalid priceUsd for {car_id}")

    return errors, warnings, presets


def main() -> int:
    args = parse_args()
    catalog_path = Path(args.catalog)
    previous_path = Path(args.previous) if args.previous else None

    payload = load_payload(catalog_path)
    errors, warnings, presets = validate_payload(payload, "current")

    current_stats = catalog_stats(presets)
    if current_stats["count"] < max(1, args.min_count):
        errors.append(
            f"current: count too low ({current_stats['count']} < {max(1, args.min_count)})"
        )
    if current_stats["priceCoverage"] < max(0.0, args.min_price_coverage):
        errors.append(
            "current: price coverage too low "
            f"({current_stats['priceCoverage']:.2%} < {max(0.0, args.min_price_coverage):.2%})"
        )
    if len(current_stats["marketBuckets"]) < max(1, args.min_market_count):
        errors.append(
            "current: market bucket coverage too low "
            f"({len(current_stats['marketBuckets'])} < {max(1, args.min_market_count)})"
        )
    min_market_presets = parse_market_minimums(args.min_market_preset)
    for market_code, market_min in min_market_presets.items():
        current_count = current_stats["marketBuckets"].get(market_code, 0)
        if current_count < max(0, int(market_min)):
            errors.append(
                f"current: {market_code} market count too low "
                f"({current_count} < {max(0, int(market_min))})"
            )

    if previous_path and previous_path.exists():
        previous_payload = load_payload(previous_path)
        prev_errors, prev_warnings, previous_presets = validate_payload(previous_payload, "previous")
        warnings.extend(prev_warnings)
        if prev_errors:
            warnings.append("previous: invalid previous catalog skipped for drop-ratio checks")
        else:
            prev_stats = catalog_stats(previous_presets)
            min_allowed = int(prev_stats["count"] * (1 - max(0.0, args.max_drop_ratio)))
            if current_stats["count"] < min_allowed:
                errors.append(
                    "current: dropped too much vs previous "
                    f"({current_stats['count']} < {min_allowed}, previous={prev_stats['count']})"
                )

    print(
        "Validation summary: "
        f"count={current_stats['count']}, "
        f"priced={current_stats['priced']}, "
        f"priceCoverage={current_stats['priceCoverage']:.2%}, "
        f"marketBuckets={len(current_stats['marketBuckets'])}"
    )

    for warning in warnings:
        print(f"WARNING: {warning}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("Catalog validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
