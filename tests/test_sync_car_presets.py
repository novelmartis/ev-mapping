import argparse
import importlib.util
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch


def load_sync_module():
    repo_root = Path(__file__).resolve().parents[1]
    module_path = repo_root / "scripts" / "sync_car_presets.py"
    spec = importlib.util.spec_from_file_location("sync_car_presets", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


sync = load_sync_module()


class SyncCarPresetsTests(unittest.TestCase):
    def test_normalize_market_array_filters_and_deduplicates(self):
        self.assertEqual(sync.normalize_market_array(["us", "US", "in", "", None]), ["US", "IN"])

    def test_vehicle_to_preset_ignores_non_ev(self):
        xml = """
        <vehicle>
          <year>2025</year>
          <make>Toyota</make>
          <model>Corolla</model>
          <fuelType1>Gasoline</fuelType1>
          <combE>30</combE>
          <rangeA>0</rangeA>
        </vehicle>
        """
        vehicle = ET.fromstring(xml)
        self.assertIsNone(sync.vehicle_to_preset(vehicle))

    def test_vehicle_to_preset_builds_ev_entry(self):
        xml = """
        <vehicle>
          <year>2025</year>
          <make>Tesla</make>
          <model>Model 3 RWD</model>
          <fuelType1>Electricity</fuelType1>
          <combE>132</combE>
          <rangeA>272</rangeA>
        </vehicle>
        """
        vehicle = ET.fromstring(xml)
        preset = sync.vehicle_to_preset(vehicle)
        self.assertIsNotNone(preset)
        self.assertEqual(preset["id"], "2025-tesla-model-3-rwd")
        self.assertEqual(preset["markets"], ["US"])
        self.assertGreater(preset["batteryKwh"], 20)
        self.assertLess(preset["efficiency"], 35)

    def test_vehicle_to_preset_includes_price_when_available(self):
        xml = """
        <vehicle>
          <year>2025</year>
          <make>Audi</make>
          <model>Q4 45 e-tron</model>
          <fuelType1>Electricity</fuelType1>
          <combE>115</combE>
          <rangeA>288</rangeA>
        </vehicle>
        """
        vehicle = ET.fromstring(xml)
        preset = sync.vehicle_to_preset(
            vehicle, {"audi q4 45 etron": 58200}
        )
        self.assertIsNotNone(preset)
        self.assertEqual(preset["priceUsd"], 58200)
        self.assertEqual(preset["priceSource"], "afdc.energy.gov")

    def test_parse_usd(self):
        self.assertEqual(sync.parse_usd("$58,200"), 58200.0)
        self.assertEqual(sync.parse_usd("  $1,234.50 "), 1234.5)
        self.assertIsNone(sync.parse_usd("N/A"))

    def test_parse_inr_amount_lakh_and_crore(self):
        self.assertEqual(sync.parse_inr_amount("Rs 15.99 - 20.01 Lakh*"), 1599000.0)
        self.assertEqual(sync.parse_inr_amount("Rs 2.05 - 2.58 Cr*"), 20500000.0)
        self.assertIsNone(sync.parse_inr_amount("Price on request"))

    def test_collect_india_ev_presets_parses_cardekho_like_html(self):
        html = """
        <html><body>
        <div>Mahindra BE 6</div>
        <div>Rs 18.90 - 26.90 Lakh*</div>
        <div>557 - 683 km . 59 - 79 kWh</div>
        <div>Tata Nexon EV</div>
        <div>Rs 12.49 - 17.19 Lakh*</div>
        <div>489 km . 30 - 45 kWh</div>
        </body></html>
        """
        with patch.object(sync.urllib.request, "urlopen") as mock_urlopen:
            mock_urlopen.return_value.__enter__.return_value.read.return_value = html.encode("utf-8")
            presets = sync.collect_india_ev_presets(sync.FxResolver(timeout_ms=100))

        self.assertGreaterEqual(len(presets), 2)
        ids = {item["id"] for item in presets}
        self.assertIn("mahindra-be-6", ids)
        mahindra = next(item for item in presets if item["id"] == "mahindra-be-6")
        self.assertEqual(mahindra["markets"], ["IN"])
        self.assertIn("priceUsd", mahindra)
        self.assertIn("marketPrices", mahindra)

    def test_parse_au_gvg_vehicle_rows_parses_pure_electric_rows(self):
        html = """
        <table>
          <tr class="vehicle-item">
            <td class="details always-show" data-sort="Tesla Model Y RWD"></td>
            <td class="details" data-sort="2025"></td>
            <td class="details" data-sort="Pure Electric"></td>
            <td class="energy-consumption" data-sort="145"></td>
            <td class="electric-range" data-sort="455"></td>
          </tr>
          <tr class="vehicle-item">
            <td class="details always-show" data-sort="Toyota Hybrid X"></td>
            <td class="details" data-sort="2025"></td>
            <td class="details" data-sort="Hybrid"></td>
            <td class="energy-consumption" data-sort="70"></td>
            <td class="electric-range" data-sort="10"></td>
          </tr>
        </table>
        """
        rows = sync.parse_au_gvg_vehicle_rows(html)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], "tesla-model-y-rwd")
        self.assertEqual(rows[0]["markets"], ["AU"])
        self.assertEqual(rows[0]["source"], "greenvehicleguide.gov.au")
        self.assertGreater(rows[0]["batteryKwh"], 20)
        self.assertLess(rows[0]["efficiency"], 35)

    def test_merge_presets_last_source_wins(self):
        api_presets = [
            {
                "id": "example-ev",
                "label": "Example EV",
                "batteryKwh": 52,
                "efficiency": 17.5,
                "reserve": 10,
                "markets": ["US"],
                "priceUsd": 41000,
            }
        ]
        manual_presets = [
            {
                "id": "example-ev",
                "label": "Example EV (Manual Override)",
                "batteryKwh": 60,
                "efficiency": 16.1,
                "reserve": 8,
                "markets": ["IN"],
                "priceUsd": 39000,
                "priceSource": "manual",
            }
        ]
        merged = sync.merge_presets(api_presets, manual_presets)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["label"], "Example EV (Manual Override)")
        self.assertEqual(merged[0]["batteryKwh"], 60.0)
        self.assertEqual(merged[0]["reserve"], 8)
        self.assertEqual(merged[0]["markets"], ["IN"])
        self.assertEqual(merged[0]["priceUsd"], 39000)
        self.assertEqual(merged[0]["priceSource"], "manual")

    def test_merge_presets_canonicalizes_india_suffix_ids(self):
        presets = [
            {
                "id": "bmw-i4-in",
                "label": "BMW i4",
                "batteryKwh": 83.9,
                "efficiency": 18.8,
                "reserve": 10,
                "markets": ["IN"],
            },
            {
                "id": "bmw-i4",
                "label": "BMW i4",
                "batteryKwh": 83.9,
                "efficiency": 18.8,
                "reserve": 10,
                "markets": ["IN"],
                "marketPrices": {
                    "IN": {
                        "amount": 7245000,
                        "currency": "INR",
                        "source": "cardekho.com",
                        "updatedAt": "2026-03-05",
                    }
                },
            },
        ]
        merged = sync.merge_presets(presets)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["id"], "bmw-i4")
        self.assertEqual(merged[0]["markets"], ["IN"])
        self.assertIn("marketPrices", merged[0])

    def test_parse_market_minimums_uses_defaults_and_overrides(self):
        minimums = sync.parse_market_minimums(["IN=25", "US=320", "bad", "JP=abc"])
        self.assertEqual(minimums["IN"], 25)
        self.assertEqual(minimums["US"], 320)
        self.assertEqual(minimums.get("JP"), sync.DEFAULT_MIN_MARKET_PRESETS.get("JP"))

    def test_parse_bootstrap_markets_defaults_and_overrides(self):
        self.assertEqual(sync.parse_bootstrap_markets(["in", "US", "bad"]), ["IN", "US"])
        defaults = sync.parse_bootstrap_markets([])
        self.assertTrue(isinstance(defaults, list))
        self.assertTrue(len(defaults) > 0)

    def test_market_source_policy_errors_flags_disallowed_source(self):
        presets = [
            {
                "id": "imported-ev",
                "label": "Imported EV",
                "batteryKwh": 70,
                "efficiency": 17,
                "reserve": 10,
                "markets": ["IN"],
                "source": "fueleconomy.gov",
            }
        ]
        errors = sync.market_source_policy_errors(presets)
        self.assertEqual(len(errors), 1)
        self.assertIn("disallowed source", errors[0])

    def test_extract_make_from_label_handles_year_and_hyphenated_make(self):
        self.assertEqual(sync.extract_make_from_label("2025 Mercedes-Benz EQE 350+"), "mercedes-benz")
        self.assertEqual(sync.extract_make_from_label("BMW i4 eDrive40"), "bmw")

    def test_load_region_native_seed_presets_sets_source_and_markets(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            seed_path = Path(tmp_dir) / "seed.json"
            seed_path.write_text(
                json.dumps(
                    [
                        {
                            "id": "sample-ev",
                            "label": "Sample EV",
                            "batteryKwh": 50,
                            "efficiency": 16,
                            "reserve": 10,
                            "markets": ["de", "tr"],
                        }
                    ]
                ),
                encoding="utf-8",
            )
            presets = sync.load_region_native_seed_presets(seed_path, "eu-native-seed")
            self.assertEqual(len(presets), 1)
            self.assertEqual(presets[0]["source"], "eu-native-seed")
            self.assertEqual(presets[0]["markets"], ["DE", "TR"])

    def test_seed_age_days_returns_none_for_missing(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            missing = Path(tmp_dir) / "missing.json"
            self.assertIsNone(sync.seed_age_days(missing))

    def test_augment_regional_market_coverage_keeps_india_non_native_guardrail(self):
        presets = [
            {
                "id": "2025-bmw-i4",
                "label": "2025 BMW i4 eDrive40",
                "batteryKwh": 83.9,
                "efficiency": 18.8,
                "reserve": 10,
                "markets": ["US"],
            },
            {
                "id": "2025-ford-f150-lightning",
                "label": "2025 Ford F-150 Lightning",
                "batteryKwh": 131,
                "efficiency": 27,
                "reserve": 12,
                "markets": ["US"],
            },
        ]
        augmented = sync.augment_regional_market_coverage(presets)
        by_id = {item["id"]: item for item in augmented}
        self.assertIn("CA", by_id["2025-bmw-i4"]["markets"])
        self.assertIn("DE", by_id["2025-bmw-i4"]["markets"])
        self.assertIn("SG", by_id["2025-bmw-i4"]["markets"])
        self.assertIn("CN", by_id["2025-bmw-i4"]["markets"])
        self.assertNotIn("IN", by_id["2025-bmw-i4"]["markets"])
        self.assertNotIn("IN", by_id["2025-ford-f150-lightning"]["markets"])
        self.assertNotIn("DE", by_id["2025-ford-f150-lightning"]["markets"])
        self.assertNotIn("SG", by_id["2025-ford-f150-lightning"]["markets"])
        self.assertNotIn("CN", by_id["2025-ford-f150-lightning"]["markets"])

    def test_split_presets_by_market_uses_global_bucket(self):
        split = sync.split_presets_by_market(
            [
                {
                    "id": "ev-a",
                    "label": "EV A",
                    "batteryKwh": 50,
                    "efficiency": 15,
                    "reserve": 10,
                    "markets": ["US", "CA"],
                },
                {
                    "id": "ev-b",
                    "label": "EV B",
                    "batteryKwh": 45,
                    "efficiency": 14,
                    "reserve": 10,
                    "markets": [],
                },
            ]
        )
        self.assertIn("US", split)
        self.assertIn("CA", split)
        self.assertIn("GLOBAL", split)
        self.assertEqual(len(split["GLOBAL"]), 1)

    def test_write_market_split_outputs_writes_manifest_and_files(self):
        payload = {
            "generatedAt": "2026-03-05T00:00:00Z",
            "source": "test-source",
            "sources": ["test"],
            "count": 2,
            "stats": {},
            "presets": [
                {
                    "id": "ev-a",
                    "label": "EV A",
                    "batteryKwh": 50,
                    "efficiency": 15,
                    "reserve": 10,
                    "markets": ["US", "CA"],
                },
                {
                    "id": "ev-b",
                    "label": "EV B",
                    "batteryKwh": 45,
                    "efficiency": 14,
                    "reserve": 10,
                    "markets": [],
                },
            ],
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            split_dir = root / "data" / "catalog" / "markets"
            manifest_path = root / "data" / "catalog" / "catalog_manifest.json"
            with patch.object(sync.Path, "cwd", return_value=root):
                manifest = sync.write_market_split_outputs(
                    combined_payload=payload,
                    split_dir=split_dir,
                    manifest_path=manifest_path,
                    bootstrap_markets=["US", "IN"],
                )
            self.assertTrue(manifest_path.exists())
            self.assertIn("US", manifest["markets"])
            self.assertIn("GLOBAL", manifest["markets"])
            self.assertEqual(manifest["bootstrapMarkets"][0], "US")
            us_file = root / manifest["markets"]["US"]["file"].replace("./", "")
            self.assertTrue(us_file.exists())

    def test_main_falls_back_to_manual_when_live_sync_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            data_dir = root / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            manual_path = data_dir / "car-presets.manual.json"
            manual_payload = [
                {
                    "id": "mahindra-be6-79",
                    "label": "Mahindra BE 6 (79 kWh)",
                    "batteryKwh": 79,
                    "efficiency": 16.4,
                    "reserve": 10,
                    "markets": ["IN"],
                    "source": "manual",
                }
            ]
            manual_path.write_text(json.dumps(manual_payload), encoding="utf-8")

            args = argparse.Namespace(
                from_year=2025,
                to_year=2026,
                manual_file="data/car-presets.manual.json",
                out="data/car-presets.generated.json",
                manifest_out="data/catalog/catalog_manifest.json",
                split_dir="data/catalog/markets",
                sleep_ms=0,
                min_market_preset=[f"{code}=0" for code in sync.DEFAULT_MIN_MARKET_PRESETS],
            )
            with patch.object(sync, "parse_args", return_value=args), patch.object(
                sync, "collect_us_ev_presets", side_effect=Exception("network down")
            ), patch.object(
                sync, "collect_india_ev_presets", return_value=[]
            ), patch.object(
                sync, "collect_australia_ev_presets", return_value=[]
            ), patch.object(sync.Path, "cwd", return_value=root):
                rc = sync.main()

            self.assertEqual(rc, 0)
            generated_path = data_dir / "car-presets.generated.json"
            self.assertTrue(generated_path.exists())
            payload = json.loads(generated_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["count"], 1)
            self.assertEqual(payload["presets"][0]["id"], "mahindra-be6-79")
            manifest_path = root / "data" / "catalog" / "catalog_manifest.json"
            self.assertTrue(manifest_path.exists())

    def test_main_fails_when_no_data_sources_available(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            data_dir = root / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            manual_path = data_dir / "car-presets.manual.json"
            manual_path.write_text("[]", encoding="utf-8")

            args = argparse.Namespace(
                from_year=2025,
                to_year=2026,
                manual_file="data/car-presets.manual.json",
                out="data/car-presets.generated.json",
                manifest_out="data/catalog/catalog_manifest.json",
                split_dir="data/catalog/markets",
                sleep_ms=0,
                min_market_preset=[f"{code}=0" for code in sync.DEFAULT_MIN_MARKET_PRESETS],
            )
            with patch.object(sync, "parse_args", return_value=args), patch.object(
                sync, "collect_us_ev_presets", return_value=[]
            ), patch.object(
                sync, "collect_india_ev_presets", return_value=[]
            ), patch.object(
                sync, "collect_australia_ev_presets", return_value=[]
            ), patch.object(sync.Path, "cwd", return_value=root):
                rc = sync.main()

            self.assertEqual(rc, 1)


if __name__ == "__main__":
    unittest.main()
