#!/usr/bin/env python3
"""Validate generated EV catalog integrity and safety thresholds."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any

MARKET_ALLOWED_SOURCE_TOKENS = {
    "IN": ("cardekho.com", "in-native-seed", "manual"),
    "LK": ("cardekho.com", "in-native-seed", "row-native-seed", "manual"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate generated EV car catalog JSON.")
    parser.add_argument(
        "--catalog",
        default="data/car-presets.generated.json",
        help="Path to generated catalog JSON.",
    )
    parser.add_argument(
        "--manifest",
        default="data/catalog/catalog_manifest.json",
        help="Path to market manifest JSON.",
    )
    parser.add_argument(
        "--require-manifest",
        action="store_true",
        help="Fail validation when manifest or split market files are missing/invalid.",
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


def json_sha256(payload: Any) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def resolve_repo_path(raw_path: str) -> Path:
    text = str(raw_path or "").strip()
    if text.startswith("./"):
        text = text[2:]
    path = Path(text)
    if path.is_absolute():
        return path
    return Path.cwd() / path


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


def model_label_signature(label: str) -> str:
    text = str(label or "").lower()
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"\b\d{4}\b", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def variant_conflict_key(preset: dict[str, Any]) -> str:
    signature = model_label_signature(preset.get("label", ""))
    battery = parse_float(preset.get("batteryKwh"))
    if not signature or battery is None:
        return ""
    return f"{signature}|{round(battery, 1)}"


def preset_source_priority(source_value: Any) -> int:
    source = str(source_value or "").lower()
    if "manual" in source:
        return 5
    if "seed" in source:
        return 4
    if "fueleconomy" in source:
        return 3
    if "afdc" in source:
        return 2
    if "cardekho" in source:
        return 1
    return 1 if source else 0


def preset_market_set(preset: dict[str, Any]) -> set[str]:
    markets = normalize_market_array(preset.get("markets"))
    if not markets:
        return {"GLOBAL"}
    return set(markets)


def presets_have_market_overlap(a: dict[str, Any], b: dict[str, Any]) -> bool:
    a_set = preset_market_set(a)
    b_set = preset_market_set(b)
    if "GLOBAL" in a_set or "GLOBAL" in b_set:
        return True
    return bool(a_set & b_set)


def group_has_market_overlap(group: list[dict[str, Any]]) -> bool:
    for i in range(len(group)):
        for j in range(i + 1, len(group)):
            if presets_have_market_overlap(group[i], group[j]):
                return True
    return False


def should_collapse_conflict_group(group: list[dict[str, Any]]) -> bool:
    if len(group) <= 1:
        return False
    if not group_has_market_overlap(group):
        return False
    priorities = [preset_source_priority(item.get("source")) for item in group]
    highest = max(priorities) if priorities else 0
    lowest = min(priorities) if priorities else 0
    # Collapse only when trust levels differ and at least one high-signal source exists.
    return highest >= 3 and highest > lowest


def variant_consistency_errors(presets: list[dict[str, Any]], max_errors: int = 25) -> list[str]:
    errors: list[str] = []
    grouped: dict[str, list[dict[str, Any]]] = {}
    for preset in presets:
        key = variant_conflict_key(preset)
        if key:
            grouped.setdefault(key, []).append(preset)

    for key, group in grouped.items():
        if len(group) <= 1:
            continue
        if not should_collapse_conflict_group(group):
            continue
        efficiencies = [parse_float(item.get("efficiency")) for item in group]
        valid_eff = [value for value in efficiencies if value is not None]
        if len(valid_eff) <= 1:
            continue
        spread = max(valid_eff) - min(valid_eff)
        if spread < 1.0:
            continue
        ids = ", ".join(str(item.get("id", "")) for item in group)
        errors.append(
            f"conflicting near-duplicate variants ({key}) with efficiency spread {spread:.1f}: {ids}"
        )
        if len(errors) >= max(1, int(max_errors)):
            return errors
    return errors


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


def validate_manifest_payload(
    manifest_payload: dict[str, Any],
    current_stats: dict[str, Any],
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    unique_count = manifest_payload.get("uniquePresetCount")
    if isinstance(unique_count, int) and unique_count != current_stats["count"]:
        errors.append(
            "manifest: uniquePresetCount mismatch "
            f"({unique_count} != {current_stats['count']})"
        )

    markets = manifest_payload.get("markets")
    if not isinstance(markets, dict) or not markets:
        errors.append("manifest: markets must be a non-empty object")
        return errors, warnings

    expected_market_counts = dict(current_stats["marketBuckets"])
    for market_code, expected_count in expected_market_counts.items():
        manifest_meta = markets.get(market_code)
        if not isinstance(manifest_meta, dict):
            errors.append(f"manifest: missing market entry for {market_code}")
            continue
        manifest_count = manifest_meta.get("count")
        if not isinstance(manifest_count, int):
            errors.append(f"manifest: {market_code} count must be an integer")
            continue
        if manifest_count != expected_count:
            errors.append(
                f"manifest: {market_code} count mismatch ({manifest_count} != {expected_count})"
            )

        file_ref = str(manifest_meta.get("file", "")).strip()
        if not file_ref:
            errors.append(f"manifest: {market_code} is missing file path")
            continue
        market_file = resolve_repo_path(file_ref)
        if not market_file.exists():
            errors.append(f"manifest: {market_code} file missing: {market_file}")
            continue

        market_payload = load_payload(market_file)
        market_errors, market_warnings, market_presets = validate_payload(
            market_payload, f"manifest:{market_code}"
        )
        errors.extend(market_errors)
        warnings.extend(market_warnings)

        if market_payload.get("market") != market_code:
            warnings.append(
                f"manifest:{market_code} payload market mismatch ({market_payload.get('market')})"
            )
        if len(market_presets) != manifest_count:
            errors.append(
                f"manifest:{market_code} file count mismatch "
                f"({len(market_presets)} != {manifest_count})"
            )

        for item in market_presets:
            listed_markets = normalize_market_array(item.get("markets"))
            if market_code == "GLOBAL":
                if listed_markets:
                    errors.append(f"manifest:GLOBAL includes non-global preset {item.get('id')}")
            elif market_code not in listed_markets:
                errors.append(
                    f"manifest:{market_code} includes preset outside market: {item.get('id')}"
                )

        expected_sha = str(manifest_meta.get("sha256", "")).strip().lower()
        if expected_sha:
            actual_sha = json_sha256(market_payload)
            if expected_sha != actual_sha:
                errors.append(
                    f"manifest:{market_code} checksum mismatch ({expected_sha} != {actual_sha})"
                )

    bootstrap = manifest_payload.get("bootstrapMarkets")
    if isinstance(bootstrap, list):
        for code in bootstrap:
            normalized = str(code or "").upper()
            if normalized not in markets:
                warnings.append(f"manifest: bootstrap market not available in markets map: {normalized}")

    return errors, warnings


def main() -> int:
    args = parse_args()
    catalog_path = Path(args.catalog)
    manifest_path = Path(args.manifest)
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
    for source_error in market_source_policy_errors(presets):
        errors.append("current: market source policy violation: " + source_error)
    for consistency_error in variant_consistency_errors(presets):
        errors.append("current: variant consistency violation: " + consistency_error)

    if manifest_path.exists():
        manifest_payload = load_payload(manifest_path)
        manifest_errors, manifest_warnings = validate_manifest_payload(manifest_payload, current_stats)
        errors.extend(manifest_errors)
        warnings.extend(manifest_warnings)
    elif args.require_manifest:
        errors.append(f"current: required manifest missing ({manifest_path})")
    else:
        warnings.append(f"current: manifest missing ({manifest_path})")

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
