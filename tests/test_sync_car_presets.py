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

    def test_merge_presets_last_source_wins(self):
        api_presets = [
            {
                "id": "example-ev",
                "label": "Example EV",
                "batteryKwh": 52,
                "efficiency": 17.5,
                "reserve": 10,
                "markets": ["US"],
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
            }
        ]
        merged = sync.merge_presets(api_presets, manual_presets)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["label"], "Example EV (Manual Override)")
        self.assertEqual(merged[0]["batteryKwh"], 60.0)
        self.assertEqual(merged[0]["reserve"], 8)
        self.assertEqual(merged[0]["markets"], ["IN"])

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
                sleep_ms=0,
            )
            with patch.object(sync, "parse_args", return_value=args), patch.object(
                sync, "collect_us_ev_presets", side_effect=Exception("network down")
            ), patch.object(sync.Path, "cwd", return_value=root):
                rc = sync.main()

            self.assertEqual(rc, 0)
            generated_path = data_dir / "car-presets.generated.json"
            self.assertTrue(generated_path.exists())
            payload = json.loads(generated_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["count"], 1)
            self.assertEqual(payload["presets"][0]["id"], "mahindra-be6-79")

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
                sleep_ms=0,
            )
            with patch.object(sync, "parse_args", return_value=args), patch.object(
                sync, "collect_us_ev_presets", return_value=[]
            ), patch.object(sync.Path, "cwd", return_value=root):
                rc = sync.main()

            self.assertEqual(rc, 1)


if __name__ == "__main__":
    unittest.main()
