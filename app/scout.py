#!/usr/bin/env python3
"""Low-resource crypto market monitor. Monitoring only; no mining."""
from __future__ import annotations

import csv
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

API_URL = "https://api.coingecko.com/api/v3/coins/markets"
INTERVAL_SECONDS = max(300, int(os.getenv("CRYPTOSCOUT_INTERVAL_SECONDS", "900")))
DATA_DIR = Path(os.getenv("CRYPTOSCOUT_DATA_DIR", "./data")).resolve()
PAGE_SIZE = min(250, max(10, int(os.getenv("CRYPTOSCOUT_PAGE_SIZE", "100"))))
MAX_MARKET_CAP_USD = float(os.getenv("CRYPTOSCOUT_MAX_MARKET_CAP_USD", "50000000"))
MIN_VOLUME_USD = float(os.getenv("CRYPTOSCOUT_MIN_VOLUME_USD", "10000"))
USER_AGENT = "CryptoScout/0.1 (+https://github.com/TFERRE21/minerar)"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def fetch_market_data() -> list[dict[str, Any]]:
    params = urllib.parse.urlencode(
        {
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": PAGE_SIZE,
            "page": 1,
            "sparkline": "false",
        }
    )
    request = urllib.request.Request(
        f"{API_URL}?{params}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)

    if not isinstance(payload, list):
        raise ValueError("Unexpected API response: expected a JSON list")
    return payload


def normalize(coin: dict[str, Any], timestamp: str) -> dict[str, Any]:
    # Keep unavailable values as None; do not silently turn them into zero.
    return {
        "timestamp_utc": timestamp,
        "id": coin.get("id"),
        "name": coin.get("name"),
        "symbol": coin.get("symbol"),
        "price_usd": coin.get("current_price"),
        "market_cap_usd": coin.get("market_cap"),
        "volume_24h_usd": coin.get("total_volume"),
        "change_24h_pct": coin.get("price_change_percentage_24h"),
        "market_cap_rank": coin.get("market_cap_rank"),
    }


def save_records(records: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    target = DATA_DIR / "market_latest.json"
    temp = DATA_DIR / "market_latest.json.tmp"
    temp.write_text(json.dumps(records, indent=2), encoding="utf-8")
    temp.replace(target)

    if not records:
        return

    csv_path = DATA_DIR / "market_history.csv"
    exists = csv_path.exists() and csv_path.stat().st_size > 0
    with csv_path.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(records[0].keys()))
        if not exists:
            writer.writeheader()
        writer.writerows(records)


def build_candidates(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates = []
    for item in records:
        cap = item.get("market_cap_usd")
        volume = item.get("volume_24h_usd")
        if not isinstance(cap, (int, float)) or cap <= 0:
            continue
        if not isinstance(volume, (int, float)) or volume < MIN_VOLUME_USD:
            continue
        if cap >= MAX_MARKET_CAP_USD:
            continue
        candidates.append(item)
    return sorted(candidates, key=lambda item: item["volume_24h_usd"], reverse=True)


def scan_once() -> None:
    coins = fetch_market_data()
    timestamp = utc_now()
    records = [normalize(coin, timestamp) for coin in coins]
    save_records(records)
    candidates = build_candidates(records)
    print(
        f"{timestamp} scan_ok coins={len(records)} "
        f"candidates={len(candidates)} data_dir={DATA_DIR}",
        flush=True,
    )
    for coin in candidates[:10]:
        print(
            f"candidate name={coin['name']} symbol={coin['symbol']} "
            f"market_cap_usd={coin['market_cap_usd']} "
            f"volume_24h_usd={coin['volume_24h_usd']}",
            flush=True,
        )


def main() -> None:
    print(
        f"{utc_now()} Crypto Scout started; monitoring only; "
        f"interval={INTERVAL_SECONDS}s",
        flush=True,
    )
    while True:
        try:
            scan_once()
        except (urllib.error.URLError, TimeoutError, ValueError, OSError, json.JSONDecodeError) as exc:
            print(f"{utc_now()} scan_error={type(exc).__name__}: {exc}", flush=True)
        except Exception as exc:  # defensive loop: log unexpected faults and recover
            print(f"{utc_now()} unexpected_error={type(exc).__name__}: {exc}", flush=True)
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
