#!/usr/bin/env python3
"""Promote validated canary EV catalog outputs to stable paths."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Promote canary catalog outputs to stable paths.")
    parser.add_argument("--canary-catalog", default="data/car-presets.generated.next.json")
    parser.add_argument("--canary-manifest", default="data/catalog-next/catalog_manifest.json")
    parser.add_argument("--stable-catalog", default="data/car-presets.generated.json")
    parser.add_argument("--stable-manifest", default="data/catalog/catalog_manifest.json")
    parser.add_argument("--stable-markets-dir", default="data/catalog/markets")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def load_payload(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Failed parsing JSON: {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"JSON root must be object: {path}")
    return payload


def json_sha256(payload: Any) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def normalize_market_array(markets: Any) -> list[str]:
    if not isinstance(markets, list):
        return []
    out: list[str] = []
    for value in markets:
        code = str(value or "").strip().upper()
        if code and code not in out:
            out.append(code)
    return out


def validate_canary(canary_catalog_path: Path, canary_manifest_path: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    catalog_payload = load_payload(canary_catalog_path)
    manifest_payload = load_payload(canary_manifest_path)

    presets = catalog_payload.get("presets")
    if not isinstance(presets, list) or not presets:
        raise SystemExit("Canary catalog presets list is missing/empty.")

    markets_meta = manifest_payload.get("markets")
    if not isinstance(markets_meta, dict) or not markets_meta:
        raise SystemExit("Canary manifest markets map is missing/empty.")

    unique_count = manifest_payload.get("uniquePresetCount")
    if isinstance(unique_count, int) and unique_count != len(presets):
        raise SystemExit(
            f"Canary manifest/catalog mismatch: uniquePresetCount={unique_count}, presets={len(presets)}"
        )

    for market_code, market_meta in sorted(markets_meta.items()):
        code = str(market_code or "").upper()
        if not code:
            raise SystemExit("Canary manifest contains empty market code.")
        if not isinstance(market_meta, dict):
            raise SystemExit(f"Canary manifest market meta is invalid for {code}.")

        file_text = str(market_meta.get("file", "")).strip()
        if not file_text:
            raise SystemExit(f"Canary manifest market file missing for {code}.")
        market_file = Path(file_text[2:] if file_text.startswith("./") else file_text)
        if not market_file.is_absolute():
            market_file = Path.cwd() / market_file
        market_payload = load_payload(market_file)

        if str(market_payload.get("market", "")).upper() != code:
            raise SystemExit(f"Canary market payload code mismatch in {market_file}.")

        market_presets = market_payload.get("presets")
        if not isinstance(market_presets, list):
            raise SystemExit(f"Canary market payload presets missing in {market_file}.")

        expected_count = market_meta.get("count")
        if isinstance(expected_count, int) and expected_count != len(market_presets):
            raise SystemExit(
                f"Canary market count mismatch for {code}: expected {expected_count}, got {len(market_presets)}"
            )

        expected_sha = str(market_meta.get("sha256", "")).strip().lower()
        if expected_sha:
            actual_sha = json_sha256(market_payload)
            if expected_sha != actual_sha:
                raise SystemExit(
                    f"Canary market checksum mismatch for {code}: expected {expected_sha}, got {actual_sha}"
                )

        for item in market_presets:
            listed = normalize_market_array(item.get("markets"))
            if code == "GLOBAL":
                if listed:
                    raise SystemExit(f"GLOBAL bucket contains non-global preset: {item.get('id')}")
            elif code not in listed:
                raise SystemExit(f"Market bucket {code} contains mismatched preset: {item.get('id')}")

    return catalog_payload, manifest_payload


def promote(
    canary_catalog_path: Path,
    canary_manifest_path: Path,
    stable_catalog_path: Path,
    stable_manifest_path: Path,
    stable_markets_dir: Path,
) -> None:
    canary_markets_dir = canary_manifest_path.parent / "markets"
    if not canary_markets_dir.exists():
        raise SystemExit(f"Canary markets directory missing: {canary_markets_dir}")

    stable_catalog_path.parent.mkdir(parents=True, exist_ok=True)
    stable_manifest_path.parent.mkdir(parents=True, exist_ok=True)
    stable_markets_dir.parent.mkdir(parents=True, exist_ok=True)

    if stable_markets_dir.exists():
        shutil.rmtree(stable_markets_dir)
    shutil.copytree(canary_markets_dir, stable_markets_dir)

    shutil.copy2(canary_catalog_path, stable_catalog_path)
    shutil.copy2(canary_manifest_path, stable_manifest_path)


def main() -> int:
    args = parse_args()

    canary_catalog_path = Path.cwd() / str(args.canary_catalog)
    canary_manifest_path = Path.cwd() / str(args.canary_manifest)
    stable_catalog_path = Path.cwd() / str(args.stable_catalog)
    stable_manifest_path = Path.cwd() / str(args.stable_manifest)
    stable_markets_dir = Path.cwd() / str(args.stable_markets_dir)

    catalog_payload, manifest_payload = validate_canary(canary_catalog_path, canary_manifest_path)
    print(
        "Validated canary catalog: "
        f"presets={len(catalog_payload.get('presets', []))}, "
        f"markets={len(manifest_payload.get('markets', {}))}."
    )

    if args.dry_run:
        print("Dry run complete. No files promoted.")
        return 0

    promote(
        canary_catalog_path=canary_catalog_path,
        canary_manifest_path=canary_manifest_path,
        stable_catalog_path=stable_catalog_path,
        stable_manifest_path=stable_manifest_path,
        stable_markets_dir=stable_markets_dir,
    )
    print(f"Promoted canary catalog to stable: {stable_manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
