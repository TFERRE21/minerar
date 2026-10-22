#!/usr/bin/env python3
"""Print a report from the latest Crypto Scout snapshot."""
import json
import os
from pathlib import Path

DATA_DIR = Path(os.getenv("CRYPTOSCOUT_DATA_DIR", "./data")).resolve()
snapshot = DATA_DIR / "market_latest.json"
if not snapshot.exists():
    raise SystemExit(f"Snapshot not found: {snapshot}. Run the monitor first.")

records = json.loads(snapshot.read_text(encoding="utf-8"))
valid = []
missing = 0
for coin in records:
    cap = coin.get("market_cap_usd")
    volume = coin.get("volume_24h_usd")
    if not isinstance(cap, (int, float)) or cap <= 0 or not isinstance(volume, (int, float)):
        missing += 1
        continue
    valid.append(coin)

valid.sort(key=lambda item: item["volume_24h_usd"], reverse=True)
print(f"Records: {len(records)}")
print(f"Insufficient market data: {missing}")
print(f"Valid market-cap records: {len(valid)}")
print("\nSmaller-capitalization assets with volume threshold:")
for coin in valid:
    if coin["market_cap_usd"] < float(os.getenv("CRYPTOSCOUT_MAX_MARKET_CAP_USD", "50000000")) and coin["volume_24h_usd"] >= float(os.getenv("CRYPTOSCOUT_MIN_VOLUME_USD", "10000")):
        print(
            f"{coin.get('name')} ({coin.get('symbol')}) | "
            f"price USD {coin.get('price_usd')} | "
            f"market cap USD {coin['market_cap_usd']:,.0f} | "
            f"volume 24h USD {coin['volume_24h_usd']:,.0f}"
        )
