import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


def load_validate_module():
    repo_root = Path(__file__).resolve().parents[1]
    module_path = repo_root / "scripts" / "validate_car_catalog.py"
    spec = importlib.util.spec_from_file_location("validate_car_catalog", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


validate = load_validate_module()


class ValidateCatalogTests(unittest.TestCase):
    def test_validate_payload_accepts_basic_catalog(self):
        payload = {
            "count": 2,
            "presets": [
                {
                    "id": "ev-a",
                    "label": "EV A",
                    "batteryKwh": 50,
                    "efficiency": 15,
                    "reserve": 10,
                    "markets": ["US"],
                    "priceUsd": 35000,
                },
                {
                    "id": "ev-b",
                    "label": "EV B",
                    "batteryKwh": 40,
                    "efficiency": 14,
                    "reserve": 10,
                    "markets": ["IN"],
                    "priceUsd": 22000,
                },
            ],
        }
        errors, warnings, presets = validate.validate_payload(payload, "current")
        self.assertEqual(errors, [])
        self.assertEqual(len(warnings), 0)
        stats = validate.catalog_stats(presets)
        self.assertEqual(stats["count"], 2)
        self.assertGreaterEqual(stats["priceCoverage"], 1.0)

    def test_validate_payload_rejects_duplicates(self):
        payload = {
            "count": 2,
            "presets": [
                {
                    "id": "ev-a",
                    "label": "EV A",
                    "batteryKwh": 50,
                    "efficiency": 15,
                    "reserve": 10,
                    "markets": ["US"],
                },
                {
                    "id": "ev-a",
                    "label": "EV A dup",
                    "batteryKwh": 52,
                    "efficiency": 16,
                    "reserve": 10,
                    "markets": ["US"],
                },
            ],
        }
        errors, _, _ = validate.validate_payload(payload, "current")
        self.assertTrue(any("duplicate id" in e for e in errors))

    def test_load_payload_errors_for_missing_file(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            missing = Path(tmp_dir) / "missing.json"
            with self.assertRaises(SystemExit):
                validate.load_payload(missing)

    def test_catalog_stats_treats_empty_markets_as_global(self):
        stats = validate.catalog_stats(
            [
                {
                    "id": "ev-a",
                    "batteryKwh": 50,
                    "efficiency": 15,
                    "reserve": 10,
                    "markets": [],
                }
            ]
        )
        self.assertEqual(stats["marketBuckets"].get("GLOBAL"), 1)

    def test_parse_market_minimums(self):
        parsed = validate.parse_market_minimums(["IN=20", "US=300", "bad", "EU=abc"])
        self.assertEqual(parsed, {"IN": 20, "US": 300})

    def test_market_source_policy_errors_flags_cross_market_inflation(self):
        presets = [
            {
                "id": "us-imported-to-india",
                "label": "Imported EV",
                "batteryKwh": 75,
                "efficiency": 18,
                "reserve": 10,
                "markets": ["IN"],
                "source": "fueleconomy.gov",
            }
        ]
        errors = validate.market_source_policy_errors(presets)
        self.assertEqual(len(errors), 1)
        self.assertIn("disallowed source", errors[0])

    def test_market_source_policy_errors_accepts_local_source(self):
        presets = [
            {
                "id": "india-local-ev",
                "label": "India EV",
                "batteryKwh": 60,
                "efficiency": 16,
                "reserve": 10,
                "markets": ["IN"],
                "source": "cardekho.com",
            }
        ]
        self.assertEqual(validate.market_source_policy_errors(presets), [])

    def test_variant_consistency_errors_flags_cardekho_vs_manual_conflict(self):
        presets = [
            {
                "id": "mahindra-be-6",
                "label": "Mahindra BE 6",
                "batteryKwh": 79,
                "efficiency": 11.6,
                "reserve": 10,
                "markets": ["IN"],
                "source": "cardekho.com",
            },
            {
                "id": "mahindra-be6-79",
                "label": "Mahindra BE 6 (79 kWh)",
                "batteryKwh": 79,
                "efficiency": 16.4,
                "reserve": 10,
                "markets": ["IN"],
                "source": "manual",
            },
        ]
        errors = validate.variant_consistency_errors(presets)
        self.assertEqual(len(errors), 1)
        self.assertIn("conflicting near-duplicate variants", errors[0])

    def test_variant_consistency_errors_flags_high_signal_vs_low_signal_conflict(self):
        presets = [
            {
                "id": "sample-ev-scraped",
                "label": "Sample EV",
                "batteryKwh": 75,
                "efficiency": 12.1,
                "reserve": 10,
                "markets": ["US"],
                "source": "example-scraper.com",
            },
            {
                "id": "sample-ev-fe",
                "label": "Sample EV",
                "batteryKwh": 75,
                "efficiency": 16.8,
                "reserve": 10,
                "markets": ["US"],
                "source": "fueleconomy.gov",
            },
        ]
        errors = validate.variant_consistency_errors(presets)
        self.assertEqual(len(errors), 1)
        self.assertIn("conflicting near-duplicate variants", errors[0])

    def test_variant_consistency_errors_ignores_non_cardekho_variant_pair(self):
        presets = [
            {
                "id": "2025-example-ev-lr",
                "label": "2025 Example EV Long Range",
                "batteryKwh": 75,
                "efficiency": 16.2,
                "reserve": 10,
                "markets": ["US"],
                "source": "fueleconomy.gov",
            },
            {
                "id": "2026-example-ev-lr",
                "label": "2026 Example EV Long Range",
                "batteryKwh": 75,
                "efficiency": 16.3,
                "reserve": 10,
                "markets": ["US"],
                "source": "fueleconomy.gov",
            },
        ]
        self.assertEqual(validate.variant_consistency_errors(presets), [])

    def test_variant_consistency_errors_ignores_disjoint_market_duplicates(self):
        presets = [
            {
                "id": "volvo-ex30-in",
                "label": "Volvo EX30",
                "batteryKwh": 69,
                "efficiency": 14.4,
                "reserve": 10,
                "markets": ["IN"],
                "source": "cardekho.com",
            },
            {
                "id": "volvo-ex30-asean",
                "label": "Volvo EX30",
                "batteryKwh": 69,
                "efficiency": 16.3,
                "reserve": 10,
                "markets": ["SG", "TH", "MY"],
                "source": "asean-native-seed",
            },
        ]
        self.assertEqual(validate.variant_consistency_errors(presets), [])

    def test_validate_manifest_payload_accepts_matching_market_files(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            market_dir = root / "data" / "catalog" / "markets"
            market_dir.mkdir(parents=True, exist_ok=True)

            us_payload = {
                "market": "US",
                "count": 1,
                "presets": [
                    {
                        "id": "ev-a",
                        "label": "EV A",
                        "batteryKwh": 50,
                        "efficiency": 15,
                        "reserve": 10,
                        "markets": ["US"],
                    }
                ],
            }
            in_payload = {
                "market": "IN",
                "count": 1,
                "presets": [
                    {
                        "id": "ev-b",
                        "label": "EV B",
                        "batteryKwh": 40,
                        "efficiency": 14,
                        "reserve": 10,
                        "markets": ["IN"],
                    }
                ],
            }
            (market_dir / "US.json").write_text(json.dumps(us_payload), encoding="utf-8")
            (market_dir / "IN.json").write_text(json.dumps(in_payload), encoding="utf-8")

            current_stats = {
                "count": 2,
                "priced": 0,
                "priceCoverage": 0.0,
                "marketBuckets": {"US": 1, "IN": 1},
            }
            manifest = {
                "uniquePresetCount": 2,
                "markets": {
                    "US": {
                        "count": 1,
                        "file": "./data/catalog/markets/US.json",
                        "sha256": validate.json_sha256(us_payload),
                    },
                    "IN": {
                        "count": 1,
                        "file": "./data/catalog/markets/IN.json",
                        "sha256": validate.json_sha256(in_payload),
                    },
                },
                "bootstrapMarkets": ["US"],
            }
            with patch.object(validate.Path, "cwd", return_value=root):
                errors, warnings = validate.validate_manifest_payload(manifest, current_stats)
            self.assertEqual(errors, [])
            self.assertEqual(warnings, [])


if __name__ == "__main__":
    unittest.main()
