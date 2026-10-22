import unittest

from app.scout import build_candidates, normalize


class ScoutTests(unittest.TestCase):
    def test_normalize_preserves_missing_market_data(self):
        record = normalize({"id": "sample", "name": "Sample"}, "2026-01-01T00:00:00+00:00")
        self.assertIsNone(record["market_cap_usd"])
        self.assertIsNone(record["volume_24h_usd"])

    def test_candidates_require_valid_cap_and_volume(self):
        records = [
            {"name": "valid", "market_cap_usd": 1_000_000, "volume_24h_usd": 50_000},
            {"name": "missing-cap", "market_cap_usd": None, "volume_24h_usd": 50_000},
            {"name": "zero-cap", "market_cap_usd": 0, "volume_24h_usd": 50_000},
            {"name": "low-volume", "market_cap_usd": 1_000_000, "volume_24h_usd": 5},
            {"name": "too-large", "market_cap_usd": 100_000_000, "volume_24h_usd": 50_000},
        ]
        result = build_candidates(records)
        self.assertEqual([item["name"] for item in result], ["valid"])


if __name__ == "__main__":
    unittest.main()
