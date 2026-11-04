#!/usr/bin/env python3
"""Safely inventory an offline PostgreSQL plain-SQL gzip export.

No SQL is executed, no database/network is used, and row values are never emitted.
Only an allowlist of listing-related tables is parsed for aggregate counts.
"""
from __future__ import annotations
import argparse, collections, datetime as dt, gzip, hashlib, json, re
from pathlib import Path

ALLOW = {
    "public.discovery_candidates", "public.listing_sources",
    "public.mubawab_listing_corpus_v1", "public.property_cluster_members",
    "public.property_clusters", "public.property_listings",
    "public.source_offer_observations", "public.source_offer_seeds",
}
COPY_RE = re.compile(rb"^COPY ([^ ]+) \(([^)]*)\) FROM stdin;")

def parse_date(value):
    try:
        value = value.replace("Z", "+00:00")
        result = dt.datetime.fromisoformat(value)
        return result if result.tzinfo else result.replace(tzinfo=dt.timezone.utc)
    except (ValueError, TypeError):
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("backup", type=Path)
    ap.add_argument("--output", type=Path, required=True)
    args = ap.parse_args()
    backup = args.backup.resolve(strict=True)
    as_of = dt.datetime.now(dt.timezone.utc)
    cutoff = as_of - dt.timedelta(hours=48)
    rows = collections.Counter()
    ids = collections.defaultdict(set)
    urls = collections.defaultdict(set)
    source_rows = collections.Counter()
    freshness = collections.Counter()
    active = collections.Counter()
    rights = collections.Counter()
    status = collections.Counter()
    complete = collections.Counter()
    photos = collections.Counter()
    descriptions = collections.Counter()
    dates = collections.defaultdict(lambda: [None, None])
    recent_rows = 0
    row_timestamp_recent = False
    current_table = None
    columns = {}
    uncompressed_bytes = 0

    def observe_date(key, raw_value):
        nonlocal row_timestamp_recent
        value = raw_value.decode("utf-8", "replace")
        d = parse_date(value)
        if d:
            if dates[key][0] is None or d < dates[key][0]: dates[key][0] = d
            if dates[key][1] is None or d > dates[key][1]: dates[key][1] = d
            if d >= cutoff: row_timestamp_recent = True

    with gzip.open(backup, "rb") as stream:
        for line in stream:
            uncompressed_bytes += len(line)
            if current_table is not None:
                if line.rstrip(b"\r\n") == b"\\.":
                    current_table = None
                    continue
                if current_table not in ALLOW:
                    continue
                rows[current_table] += 1
                row_timestamp_recent = False
                cells = line.rstrip(b"\r\n").split(b"\t")
                ix = columns[current_table]
                def val(name):
                    pos = ix.get(name)
                    if pos is None or pos >= len(cells) or cells[pos] == b"\\N": return None
                    return cells[pos].decode("utf-8", "replace")
                if current_table == "public.source_offer_seeds":
                    key, url, source = val("id"), val("canonical_url"), val("source_domain")
                    if key: ids[current_table].add(key)
                    if url: urls[current_table].add(url)
                    if source: source_rows["seed:" + source] += 1
                    freshness["seed:" + str(val("freshness_status") or "NULL")] += 1
                    for field in ("first_observed_at", "last_observed_at", "fresh_last_seen_at"):
                        if val(field): observe_date(field, cells[ix[field]])
                elif current_table == "public.listing_sources":
                    source = val("source_name") or "UNKNOWN"
                    key = val("source_offer_key")
                    url = val("listing_url") or val("source_url")
                    if key: ids[current_table].add(key)
                    if url: urls[current_table].add(url)
                    source_rows["listing_source:" + source] += 1
                    active[val("is_active") or "NULL"] += 1
                    rights[val("compliance_status") or "NULL"] += 1
                elif current_table == "public.source_offer_observations":
                    status[val("source_status") or "NULL"] += 1
                    if val("observed_at"): observe_date("observation_observed_at", cells[ix["observed_at"]])
                elif current_table == "public.discovery_candidates":
                    source_rows["discovery:" + str(val("provider") or "UNKNOWN")] += 1
                    timestamp = val("last_seen_at") or val("discovered_at")
                    if timestamp: observe_date("discovery_last_seen_or_discovered", timestamp.encode())
                elif current_table == "public.mubawab_listing_corpus_v1":
                    key, url, source = val("source_listing_id"), val("canonical_url"), val("source_domain")
                    if key: ids[current_table].add(key)
                    if url: urls[current_table].add(url)
                    if source: source_rows["mubawab_corpus:" + source] += 1
                    freshness["mubawab_corpus:" + str(val("freshness_status") or "NULL")] += 1
                    if val("evidence_observed_at"): observe_date("mubawab_evidence_observed_at", cells[ix["evidence_observed_at"]])
                elif current_table == "public.property_listings":
                    required = [val(c) for c in ("title", "price_mad", "city", "district", "surface_m2")]
                    complete["complete" if all(v not in (None, "") for v in required) else "incomplete"] += 1
                    photos["present" if (val("images_count") or "0") not in ("0", "") else "absent_or_unknown"] += 1
                    descriptions["present" if val("description_snippet") not in (None, "") else "absent"] += 1
                if row_timestamp_recent: recent_rows += 1
                continue
            match = COPY_RE.match(line)
            if match:
                current_table = match.group(1).decode("utf-8", "replace")
                if current_table in ALLOW:
                    columns[current_table] = {v.strip().decode("utf-8", "replace"): i for i, v in enumerate(match.group(2).split(b","))}

    digest = hashlib.sha256()
    with backup.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""): digest.update(chunk)
    selected_rows = {name: rows[name] for name in sorted(ALLOW)}
    result = {
        "as_of_utc": as_of.isoformat(), "window_hours": 48, "cutoff_utc": cutoff.isoformat(),
        "source_file": {"name": backup.name, "compressed_bytes": backup.stat().st_size,
                        "sha256": digest.hexdigest(), "format": "gzip containing plain PostgreSQL SQL",
                        "uncompressed_bytes": uncompressed_bytes},
        "rows_by_table": selected_rows,
        "unique_non_null_ids_by_table": {k: len(ids[k]) for k in sorted(ids)},
        "unique_non_null_urls_by_table": {k: len(urls[k]) for k in sorted(urls)},
        "provider_rows": dict(source_rows), "seed_freshness_claims": dict(freshness),
        "listing_source_active_claims": dict(active), "reuse_compliance_claims": dict(rights),
        "observation_status_claims": dict(status), "strict_completeness_property_listings": dict(complete),
        "photo_presence_property_listings": dict(photos), "description_presence_property_listings": dict(descriptions),
        "timestamp_bounds_utc": {k: [a.isoformat() if a else None, b.isoformat() if b else None] for k, (a,b) in dates.items()},
        "timed_rows_with_timestamp_within_48h": recent_rows,
        "current_availability_verified": None, "commercial_reuse_rights_verified": None,
        "fresh_unique_eligible": None, "physical_unique_groups_proven": None,
        "stored_cluster_rows": rows["public.property_clusters"],
        "stored_cluster_membership_rows": rows["public.property_cluster_members"],
        "limitations": ["Archived SQL export only; no live database verification.",
          "A timestamp, active flag, or freshness label in the snapshot does not prove current availability.",
          "Identifier and URL namespaces remain separate and their counts are not summed.",
          "URLs, titles, descriptions, contacts, and raw row values are never emitted.",
          "Commercial rights and physical-property deduplication are unverified."]
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "rows_by_table": selected_rows,
                      "sha256": digest.hexdigest(), "timed_rows_within_48h": recent_rows}, ensure_ascii=False))

if __name__ == "__main__": main()

