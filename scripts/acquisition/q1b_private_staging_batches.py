#!/usr/bin/env python3
"""Build private, idempotent SQL batches from EXISTING Q1B archive.

Input never leaves the user's machine except through the explicit privileged
Supabase SQL import channel. No public schema, photographs, seller fields,
website crawls, network calls or credential handling happen here.
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime
from decimal import Decimal
import gzip
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit

EXPECTED_SHA256 = "76635208549dbce618cf0de9de5e3109f0ac39deefb08f83a330a882fed5f1ee"
EXPECTED_ROWS = 9990
ALLOWED_CURRENCY = {"MAD", "EUR", "USD"}
COLUMNS = (
    "source_domain", "source_listing_id", "canonical_url", "title", "city",
    "district", "property_type", "transaction_type", "price_amount",
    "price_currency", "surface_m2", "observed_at", "observed_at_raw", "first_seen_at",
    "last_seen_at", "evidence_store", "payload_hash",
)

def timestamp(raw: str) -> str:
    dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ValueError("naive timestamp")
    return dt.isoformat()

def positive_decimal(raw: str) -> str:
    d = Decimal(str(raw))
    if not d.is_finite() or d <= 0:
        raise ValueError("nonpositive/invalid decimal")
    return str(d)

def map_observation(row: dict) -> dict:
    domain = str(row["source_domain"]).lower().strip()
    source_id = str(row["source_listing_id"]).strip()
    url = str(row["canonical_url"]).strip()
    parts = urlsplit(url)
    if not domain or not source_id or parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        raise ValueError("invalid identity / non-HTTPS url")
    if row.get("rights_status", "").lower() != "unknown_not_proven":
        raise ValueError("unexpected rights label; abort whole import")
    if row.get("quality_status", "").lower() != "historical_detailed":
        raise ValueError("unexpected quality label; abort whole import")
    curr = str(row["currency"]).upper()
    if curr not in ALLOWED_CURRENCY or row.get("transaction_type") not in ("sale", "rent"):
        raise ValueError("unexpected currency or transaction type")
    title, city = str(row["title"]).strip(), str(row["city"]).strip()
    if not title or not city:
        raise ValueError("missing title or city")
    return {
        "source_domain": domain,
        "source_listing_id": source_id,
        "canonical_url": url,
        "title": title,
        "city": city,
        "district": str(row.get("district") or "").strip() or None,
        "property_type": str(row["property_type"]).strip(),
        "transaction_type": str(row["transaction_type"]).strip(),
        "price_amount": positive_decimal(row["price"]),
        "price_currency": curr,
        "surface_m2": positive_decimal(row["surface_m2"]),
        "observed_at": timestamp(row["observation_timestamp"]),
        "observed_at_raw": str(row["observation_timestamp"]),
        "first_seen_at": timestamp(row["first_seen_at"]) if row.get("first_seen_at") else None,
        "last_seen_at": timestamp(row["last_seen_at"]) if row.get("last_seen_at") else None,
        "evidence_store": str(row.get("evidence_stores") or "unknown"),
        "payload_hash": str(row.get("raw_payload_hash") or "") or None,
    }

def query_for_chunk(batch: list[dict]) -> str:
    payload = json.dumps(batch, ensure_ascii=True, separators=(",", ":")).replace("'", "''")
    decls = ", ".join(
        column + (" numeric" if column in ("price_amount", "surface_m2") else
                  " timestamptz" if column in ("observed_at", "first_seen_at", "last_seen_at") else
                  " text")
        for column in COLUMNS
    )
    fields = ", ".join(COLUMNS)
    return (
        "WITH src AS (SELECT * FROM jsonb_to_recordset('" + payload + "'::jsonb) AS x(" + decls + ")), "
        "ins AS (INSERT INTO akarfinder_internal.historical_listing_observations (" + fields + ") "
        "SELECT " + fields + " FROM src "
        "ON CONFLICT DO NOTHING RETURNING id) "
        "SELECT COUNT(*)::int AS inserted FROM ins;"
    )

def prepare(input_path: Path, output_dir: Path, chunk_size: int) -> dict:
    if not 1 <= chunk_size <= 300:
        raise ValueError("batch size must be 1..300")
    with input_path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError("original Q1B archive SHA256 changed: refusing processing")
    observations = []
    keys, urls = set(), set()
    counts = Counter()
    with gzip.open(input_path, "rt", encoding="utf-8") as archive:
        for line in archive:
            if not line.strip():
                continue
            raw = json.loads(line)
            row = map_observation(raw)
            key = (row["source_domain"], row["source_listing_id"], row["observed_at_raw"])
            if key in keys or row["canonical_url"] in urls:
                raise ValueError("duplicate source identity / URL")
            keys.add(key)
            urls.add(row["canonical_url"])
            observations.append(row)
            counts[row["price_currency"]] += 1
    if len(observations) != EXPECTED_ROWS:
        raise ValueError("not the expected 9990 historical observations")
    output_dir.mkdir(parents=True, exist_ok=True)
    names = []
    for i in range(0, len(observations), chunk_size):
        name = f"batch-{len(names):04d}.sql"
        (output_dir / name).write_text(query_for_chunk(observations[i:i + chunk_size]), encoding="ascii")
        names.append(name)
    manifest = {
        "kind": "Q1B_PRIVATE_STAGING_SQL_BATCHES",
        "input_sha256": digest,
        "rows": len(observations),
        "chunks": len(names),
        "batch_size": chunk_size,
        "currency": dict(sorted(counts.items())),
        "rights": "unknown_not_proven",
        "publication": "private_historical_only",
        "target": "akarfinder_internal.historical_listing_observations",
        "no_photos": True, "no_seller_contacts": True,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return manifest

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--chunk-size", type=int, default=200)
    args = parser.parse_args()
    print(json.dumps(prepare(args.input, args.output, args.chunk_size), sort_keys=True))

if __name__ == "__main__":
    main()
