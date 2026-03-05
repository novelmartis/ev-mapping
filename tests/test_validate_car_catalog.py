import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


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


if __name__ == "__main__":
    unittest.main()
