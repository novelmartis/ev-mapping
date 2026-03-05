import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


def load_promote_module():
    repo_root = Path(__file__).resolve().parents[1]
    module_path = repo_root / "scripts" / "promote_catalog.py"
    spec = importlib.util.spec_from_file_location("promote_catalog", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


promote = load_promote_module()


class PromoteCatalogTests(unittest.TestCase):
    def test_validate_canary_and_promote(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            canary_markets = root / "data" / "catalog-next" / "markets"
            canary_markets.mkdir(parents=True, exist_ok=True)

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
            us_path = canary_markets / "US.json"
            us_path.write_text(json.dumps(us_payload), encoding="utf-8")

            canary_manifest = {
                "uniquePresetCount": 1,
                "markets": {
                    "US": {
                        "count": 1,
                        "file": "./data/catalog-next/markets/US.json",
                        "sha256": promote.json_sha256(us_payload),
                    }
                },
            }
            canary_manifest_path = root / "data" / "catalog-next" / "catalog_manifest.json"
            canary_manifest_path.write_text(json.dumps(canary_manifest), encoding="utf-8")

            canary_catalog = {
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
            canary_catalog_path = root / "data" / "car-presets.generated.next.json"
            canary_catalog_path.write_text(json.dumps(canary_catalog), encoding="utf-8")

            cwd_before = Path.cwd()
            try:
                # validate paths in manifest are resolved from cwd
                import os

                os.chdir(root)
                promote.validate_canary(canary_catalog_path, canary_manifest_path)
                promote.promote(
                    canary_catalog_path=canary_catalog_path,
                    canary_manifest_path=canary_manifest_path,
                    stable_catalog_path=root / "data" / "car-presets.generated.json",
                    stable_manifest_path=root / "data" / "catalog" / "catalog_manifest.json",
                    stable_markets_dir=root / "data" / "catalog" / "markets",
                )
            finally:
                import os

                os.chdir(cwd_before)

            stable_manifest = root / "data" / "catalog" / "catalog_manifest.json"
            stable_market_us = root / "data" / "catalog" / "markets" / "US.json"
            stable_catalog = root / "data" / "car-presets.generated.json"
            self.assertTrue(stable_manifest.exists())
            self.assertTrue(stable_market_us.exists())
            self.assertTrue(stable_catalog.exists())


if __name__ == "__main__":
    unittest.main()
