#!/usr/bin/env python3
"""Lightweight city/market smoke checks for generated EV catalog."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

STRICT_LOCAL_MARKET_MIN_PRESETS = 8
STRICT_LOCAL_MARKET_MIN_PRESETS_BY_MARKET = {
    "ID": 9,
}
MAX_PROXY_MARKET_CODES = 3

MARKET_CLUSTER_BY_COUNTRY = {
    "US": "NA",
    "CA": "NA",
    "MX": "LATAM",
    "BR": "LATAM",
    "AR": "LATAM",
    "CL": "LATAM",
    "CO": "LATAM",
    "PE": "LATAM",
    "GB": "EU",
    "IE": "EU",
    "DE": "EU",
    "FR": "EU",
    "ES": "EU",
    "IT": "EU",
    "NL": "EU",
    "BE": "EU",
    "PT": "EU",
    "NO": "EU",
    "SE": "EU",
    "FI": "EU",
    "DK": "EU",
    "CH": "EU",
    "AT": "EU",
    "PL": "EU",
    "CZ": "EU",
    "HU": "EU",
    "RO": "EU",
    "TR": "EU",
    "IN": "SA",
    "PK": "SA",
    "BD": "SA",
    "LK": "SA",
    "NP": "SA",
    "SG": "SEA",
    "BN": "SEA",
    "TH": "SEA",
    "MY": "SEA",
    "ID": "SEA",
    "PH": "SEA",
    "VN": "SEA",
    "CN": "EA",
    "JP": "EA",
    "KR": "EA",
    "TW": "EA",
    "HK": "EA",
    "AE": "MEA",
    "SA": "MEA",
    "QA": "MEA",
    "KW": "MEA",
    "OM": "MEA",
    "BH": "MEA",
    "IL": "MEA",
    "EG": "MEA",
    "MA": "MEA",
    "KE": "MEA",
    "NG": "MEA",
    "ZA": "MEA",
    "AU": "OC",
    "NZ": "OC",
}

MARKET_PROXY_BY_CLUSTER = {
    "GLOBAL": ["US", "DE", "IN"],
    "NA": ["US", "CA", "DE"],
    "LATAM": ["US", "DE", "CA"],
    "EU": ["DE", "TR"],
    "SA": ["IN", "LK", "SG", "TH"],
    "SEA": ["SG", "TH", "MY", "ID", "VN", "PH", "CN"],
    "EA": ["CN", "JP", "KR", "SG"],
    "MEA": ["ZA", "MA", "EG", "TR", "DE"],
    "OC": ["AU", "NZ", "JP"],
}

MARKET_LOCAL_SOURCE_TOKENS = {
    "US": ("fueleconomy.gov", "manual"),
    "CA": ("fueleconomy.gov", "row-native-seed", "manual"),
    "DE": ("eu-native-seed", "manual"),
    "TR": ("eu-native-seed", "manual"),
    "ZA": ("row-native-seed", "manual"),
    "MA": ("row-native-seed", "manual"),
    "EG": ("row-native-seed", "manual"),
    "IN": ("cardekho.com", "in-native-seed", "manual"),
    "LK": ("cardekho.com", "in-native-seed", "row-native-seed", "manual"),
    "SG": ("asean-native-seed", "manual"),
    "TH": ("asean-native-seed", "manual"),
    "MY": ("asean-native-seed", "manual"),
    "ID": ("asean-native-seed", "manual"),
    "VN": ("asean-native-seed", "manual"),
    "PH": ("asean-native-seed", "manual"),
    "CN": ("jpkr-native-seed", "manual"),
    "JP": ("jpkr-native-seed", "manual"),
    "KR": ("jpkr-native-seed", "manual"),
    "AU": ("greenvehicleguide.gov.au", "row-native-seed", "manual"),
    "NZ": ("greenvehicleguide.gov.au", "row-native-seed", "manual"),
}

DEFAULT_CITY_SPECS = [
    ("Sydney", "AU", 8, 120),
    ("London", "GB", 8, 80),
    ("San Francisco", "US", 250, 1200),
    ("Colombo", "LK", 10, 120),
    ("Singapore", "SG", 8, 120),
    ("Beijing", "CN", 8, 120),
    ("Tokyo", "JP", 8, 120),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run lightweight market/city smoke checks.")
    parser.add_argument(
        "--catalog",
        default="data/car-presets.generated.json",
        help="Path to catalog JSON.",
    )
    parser.add_argument(
        "--city",
        action="append",
        default=[],
        help=(
            "City rule in CITY:COUNTRY:MIN:MAX form. "
            "May be provided multiple times. Example: Sydney:AU:8:120"
        ),
    )
    return parser.parse_args()


def normalize_market_array(markets: Any) -> list[str]:
    if not isinstance(markets, list):
        return []
    seen: list[str] = []
    for value in markets:
        code = str(value or "").strip().upper()
        if code and code not in seen:
            seen.append(code)
    return seen


def load_catalog(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    presets = payload.get("presets", [])
    if not isinstance(presets, list):
        raise SystemExit(f"Invalid catalog format: presets must be list ({path})")
    return [item for item in presets if isinstance(item, dict)]


def is_preset_source_allowed_for_market(preset: dict[str, Any], market_code: str) -> bool:
    code = str(market_code or "").upper()
    allowed_tokens = MARKET_LOCAL_SOURCE_TOKENS.get(code)
    markets = normalize_market_array(preset.get("markets"))
    if code not in markets:
        return False
    if not allowed_tokens:
        return True

    market_prices = preset.get("marketPrices")
    if isinstance(market_prices, dict) and isinstance(market_prices.get(code), dict):
        return True

    source = str(preset.get("source", "")).strip().lower()
    if not source:
        return True
    return any(token in source for token in allowed_tokens)


def market_counts_by_code(presets: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for preset in presets:
        for code in normalize_market_array(preset.get("markets")):
            counts[code] = counts.get(code, 0) + 1
    return counts


def proxy_market_codes_for_country(country_code: str, counts: dict[str, int]) -> list[str]:
    cluster = MARKET_CLUSTER_BY_COUNTRY.get(country_code, "GLOBAL")
    preferred = MARKET_PROXY_BY_CLUSTER.get(cluster, MARKET_PROXY_BY_CLUSTER["GLOBAL"])
    available: list[str] = []
    for code in preferred:
        if counts.get(code, 0) > 0:
            available.append(code)
            if len(available) >= MAX_PROXY_MARKET_CODES:
                break
    return available


def collect_proxy_matched_presets(
    presets: list[dict[str, Any]], proxy_codes: list[str]
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for preset in presets:
        matched = any(is_preset_source_allowed_for_market(preset, code) for code in proxy_codes)
        if not matched:
            continue
        car_id = str(preset.get("id", "")).strip()
        if not car_id or car_id in seen:
            continue
        seen.add(car_id)
        out.append(preset)
    return out


def visible_presets_for_country(presets: list[dict[str, Any]], country_code: str) -> list[dict[str, Any]]:
    code = str(country_code or "").upper()
    strict_policy = code in MARKET_LOCAL_SOURCE_TOKENS
    strict_local_min = int(STRICT_LOCAL_MARKET_MIN_PRESETS_BY_MARKET.get(code, STRICT_LOCAL_MARKET_MIN_PRESETS))
    local = [preset for preset in presets if is_preset_source_allowed_for_market(preset, code)]
    if local and (not strict_policy or len(local) >= strict_local_min):
        return local

    proxies = proxy_market_codes_for_country(code, market_counts_by_code(presets))
    proxy = collect_proxy_matched_presets(presets, proxies) if proxies else []

    if local and proxy:
        merged = {str(item.get("id")): item for item in proxy}
        for item in local:
            merged[str(item.get("id"))] = item
        return sorted(merged.values(), key=lambda x: str(x.get("label", "")))
    if proxy:
        return proxy
    return local


def parse_city_specs(raw_specs: list[str]) -> list[tuple[str, str, int, int]]:
    if not raw_specs:
        return list(DEFAULT_CITY_SPECS)

    out: list[tuple[str, str, int, int]] = []
    for raw in raw_specs:
        city, sep1, rest = str(raw or "").partition(":")
        cc, sep2, rest2 = rest.partition(":")
        min_text, sep3, max_text = rest2.partition(":")
        if not sep1 or not sep2 or not sep3:
            continue
        city_clean = city.strip()
        cc_clean = cc.strip().upper()
        try:
            min_count = int(min_text.strip())
            max_count = int(max_text.strip())
        except ValueError:
            continue
        if not city_clean or len(cc_clean) != 2:
            continue
        out.append((city_clean, cc_clean, min_count, max_count))
    return out or list(DEFAULT_CITY_SPECS)


def main() -> int:
    args = parse_args()
    presets = load_catalog(Path(args.catalog))
    city_specs = parse_city_specs(args.city)

    failures: list[str] = []
    for city, country_code, min_count, max_count in city_specs:
        visible = visible_presets_for_country(presets, country_code)
        count = len(visible)
        source_mix = Counter(str(item.get("source", "")) for item in visible)
        print(
            f"{city} ({country_code}): count={count}, "
            f"sources={dict(source_mix.most_common(3))}"
        )
        if count < max(0, min_count):
            failures.append(f"{city} ({country_code}) below minimum: {count} < {min_count}")
        if max_count > 0 and count > max_count:
            failures.append(f"{city} ({country_code}) above maximum: {count} > {max_count}")

    if failures:
        for failure in failures:
            print("ERROR:", failure)
        return 1
    print("Market smoke checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
