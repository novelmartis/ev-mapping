import importlib.util
import unittest
from pathlib import Path


def load_smoke_module():
    repo_root = Path(__file__).resolve().parents[1]
    module_path = repo_root / "scripts" / "check_market_smoke.py"
    spec = importlib.util.spec_from_file_location("check_market_smoke", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


smoke = load_smoke_module()


class CheckMarketSmokeTests(unittest.TestCase):
    def test_is_preset_source_allowed_for_market_blocks_wrong_source(self):
        preset = {
            "id": "x",
            "label": "X",
            "markets": ["DE"],
            "source": "fueleconomy.gov",
        }
        self.assertFalse(smoke.is_preset_source_allowed_for_market(preset, "DE"))

    def test_visible_presets_for_country_uses_proxy_when_local_is_too_small(self):
        presets = [
            {
                "id": "cn-1",
                "label": "CN 1",
                "markets": ["CN"],
                "source": "manual",
            },
            {
                "id": "jp-1",
                "label": "JP 1",
                "markets": ["JP"],
                "source": "jpkr-native-seed",
            },
            {
                "id": "jp-2",
                "label": "JP 2",
                "markets": ["JP"],
                "source": "jpkr-native-seed",
            },
            {
                "id": "jp-3",
                "label": "JP 3",
                "markets": ["JP"],
                "source": "jpkr-native-seed",
            },
            {
                "id": "jp-4",
                "label": "JP 4",
                "markets": ["JP"],
                "source": "jpkr-native-seed",
            },
            {
                "id": "jp-5",
                "label": "JP 5",
                "markets": ["JP"],
                "source": "jpkr-native-seed",
            },
            {
                "id": "jp-6",
                "label": "JP 6",
                "markets": ["JP"],
                "source": "jpkr-native-seed",
            },
            {
                "id": "jp-7",
                "label": "JP 7",
                "markets": ["JP"],
                "source": "jpkr-native-seed",
            },
            {
                "id": "jp-8",
                "label": "JP 8",
                "markets": ["JP"],
                "source": "jpkr-native-seed",
            },
        ]
        visible = smoke.visible_presets_for_country(presets, "CN")
        self.assertGreaterEqual(len(visible), 8)
        self.assertTrue(any(item["id"].startswith("jp-") for item in visible))


if __name__ == "__main__":
    unittest.main()
