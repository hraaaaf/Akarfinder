#!/usr/bin/env python3
import csv
import io
import json
import os
import sys
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

VERSION = "mubawab-historical-dataset-v3"
DATASET_REPO = "hakkache/RealEstateBuddy"
DATASET_COMMIT = "a890a7da899d84d879c702bec09b9d628671f758"
DATASET_PATH = "data/Clean_Data_Step2.csv"
DATASET_URL = f"https://raw.githubusercontent.com/{DATASET_REPO}/{DATASET_COMMIT}/{DATASET_PATH}"
ALLOWED_FIELDS = [
    "Property_ID", "url", "Prix", "Devise", "Surface", "Piece", "Chambre",
    "Salle_de_Bain", "type_de_bien", "neighborhood", "city",
]
EXCLUDED_PII = [
    "phone_number1", "phone_number2", "phone_number3", "phone_count",
    "location", "title", "property_info",
]

MODE = os.environ.get("MODE", "dry-run")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
OUT = Path("artifacts/mubawab-dataset-v3")


def fail(msg):
    raise RuntimeError(msg)


def request_json(url, method="GET", body=None, prefer=None):
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else None


def clean_text(value):
    value = (value or "").strip()
    return value or None


def clean_number(value):
    value = (value or "").strip().replace(" ", "")
    if not value:
        return None
    try:
        num = float(value.replace(",", "."))
    except ValueError:
        return None
    if not (num == num) or num < 0:
        return None
    return num


def clean_int(value):
    num = clean_number(value)
    if num is None:
        return None
    return int(num)


def canonical_currency(value):
    value = (value or "").strip().upper()
    if value in {"DH", "DHS", "MAD"}:
        return "MAD"
    if value in {"EUR", "€"}:
        return "EUR"
    return value or None


def read_dataset():
    raw = urllib.request.urlopen(DATASET_URL, timeout=90).read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    by_id = {}
    duplicates = 0
    for row in reader:
        pid = (row.get("Property_ID") or "").strip()
        if not pid.isdigit():
            continue
        clean = {
            "Property_ID": pid,
            "url": clean_text(row.get("url")),
            "price": clean_number(row.get("Prix")),
            "currency": canonical_currency(row.get("Devise")),
            "surface_m2": clean_number(row.get("Surface")),
            "rooms": clean_int(row.get("Piece")),
            "bedrooms": clean_int(row.get("Chambre")),
            "bathrooms": clean_int(row.get("Salle_de_Bain")),
            "property_type": clean_text(row.get("type_de_bien")),
            "neighborhood": clean_text(row.get("neighborhood")),
            "city": clean_text(row.get("city")),
        }
        if pid in by_id:
            duplicates += 1
            # Keep the more complete duplicate deterministically.
            old = by_id[pid]
            old_count = sum(v is not None for k, v in old.items() if k != "Property_ID")
            new_count = sum(v is not None for k, v in clean.items() if k != "Property_ID")
            if new_count > old_count:
                by_id[pid] = clean
        else:
            by_id[pid] = clean
    return by_id, duplicates


def fetch_historical():
    rows = []
    limit = 1000
    offset = 0
    while True:
        qs = urllib.parse.urlencode({
            "select": "*",
            "evidence_status": "eq.historical_unverified",
            "order": "source_listing_id.asc",
            "limit": str(limit),
            "offset": str(offset),
        })
        batch = request_json(f"{SUPABASE_URL}/rest/v1/mubawab_listing_corpus_v1?{qs}")
        rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return rows


def document_score(d):
    score = 0
    if d.get("city"): score += 20
    if d.get("neighborhood"): score += 10
    if d.get("property_type"): score += 15
    if d.get("price") is not None and d.get("currency"): score += 20
    if d.get("surface_m2") is not None: score += 20
    if d.get("rooms") is not None: score += 5
    if d.get("bedrooms") is not None: score += 5
    if d.get("bathrooms") is not None: score += 5
    return min(score, 100)


def quality_class(score):
    if score >= 85: return "DQ_A"
    if score >= 70: return "DQ_B"
    if score >= 50: return "DQ_C"
    if score >= 30: return "DQ_D"
    return "DQ_E"


def build_sidecar(d, observed_at):
    score = document_score(d)
    structured = {
        "city": d.get("city"),
        "neighborhood": d.get("neighborhood"),
        "property_type": d.get("property_type"),
        "price_original": d.get("price"),
        "currency": d.get("currency"),
        "surface_m2": d.get("surface_m2"),
        "rooms": d.get("rooms"),
        "bedrooms": d.get("bedrooms"),
        "bathrooms": d.get("bathrooms"),
    }
    structured = {k: v for k, v in structured.items() if v is not None}
    economic_ready = (
        d.get("price") is not None and d.get("surface_m2") is not None
        and d.get("currency") == "MAD"
        and 10 <= d.get("surface_m2") <= 10000
        and d.get("price") > 0
    )
    return {
        "version": VERSION,
        "source_kind": "public_github_dataset_secondary_evidence",
        "dataset_repo": DATASET_REPO,
        "dataset_commit": DATASET_COMMIT,
        "dataset_path": DATASET_PATH,
        "property_id": d["Property_ID"],
        "observed_at": observed_at,
        "pii_persisted": False,
        "excluded_fields": EXCLUDED_PII,
        "document_quality_score": score,
        "document_quality_class": quality_class(score),
        "economic_snapshot_candidate": economic_ready,
        "structured": structured,
    }


def upsert_rows(rows):
    batch_size = 200
    url = f"{SUPABASE_URL}/rest/v1/mubawab_listing_corpus_v1?on_conflict=source_listing_id"
    for i in range(0, len(rows), batch_size):
        request_json(
            url,
            method="POST",
            body=rows[i:i+batch_size],
            prefer="resolution=merge-duplicates,return=minimal",
        )


def main():
    if MODE not in {"dry-run", "apply"}:
        fail(f"invalid MODE={MODE}")
    if not SUPABASE_URL or not SERVICE_KEY:
        fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

    OUT.mkdir(parents=True, exist_ok=True)
    dataset, duplicate_rows = read_dataset()
    historical = fetch_historical()
    if len(historical) != 18975:
        fail(f"historical corpus drift: expected 18975, got {len(historical)}")

    observed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    matched = []
    unmatched = 0
    before_updated = {}
    score_counts = Counter()
    class_counts = Counter()
    economic_candidates = 0

    for row in historical:
        pid = str(row["source_listing_id"])
        d = dataset.get(pid)
        if not d:
            unmatched += 1
            continue
        sidecar = build_sidecar(d, observed_at)
        score_counts[sidecar["document_quality_score"]] += 1
        class_counts[sidecar["document_quality_class"]] += 1
        if sidecar["economic_snapshot_candidate"]:
            economic_candidates += 1
        before_updated[pid] = row.get("updated_at")
        metadata = dict(row.get("metadata") or {})
        metadata["public_dataset_evidence_v3"] = sidecar
        row["metadata"] = metadata
        matched.append(row)

    report = {
        "version": VERSION,
        "mode": MODE,
        "generated_at": observed_at,
        "dataset": {
            "repo": DATASET_REPO,
            "commit": DATASET_COMMIT,
            "path": DATASET_PATH,
            "unique_property_ids": len(dataset),
            "duplicate_rows_resolved": duplicate_rows,
            "pii_persisted": False,
        },
        "historical_total": len(historical),
        "matched_historical": len(matched),
        "unmatched_historical": unmatched,
        "economic_snapshot_candidates": economic_candidates,
        "quality_classes": dict(sorted(class_counts.items())),
        "quality_score_distribution": {str(k): v for k, v in sorted(score_counts.items())},
        "freshness_mutations": 0,
        "evidence_status_mutations": 0,
        "public_status_mutations": 0,
    }

    if MODE == "apply":
        upsert_rows(matched)
        after = fetch_historical()
        after_by_id = {str(r["source_listing_id"]): r for r in after}
        applied = 0
        updated_at_drift = 0
        freshness_drift = 0
        evidence_drift = 0
        current_touched = 0
        for row in matched:
            pid = str(row["source_listing_id"])
            got = after_by_id.get(pid)
            if got and got.get("metadata", {}).get("public_dataset_evidence_v3", {}).get("version") == VERSION:
                applied += 1
            if got and str(got.get("updated_at")) != str(before_updated.get(pid)):
                updated_at_drift += 1
            if got and got.get("freshness_status") != "uncertain":
                freshness_drift += 1
            if got and got.get("evidence_status") != "historical_unverified":
                evidence_drift += 1

        qs = urllib.parse.urlencode({
            "select": "source_listing_id",
            "evidence_status": "eq.current_verified",
            "metadata->public_dataset_evidence_v3->>version": f"eq.{VERSION}",
            "limit": "1",
        })
        current_rows = request_json(f"{SUPABASE_URL}/rest/v1/mubawab_listing_corpus_v1?{qs}")
        current_touched = len(current_rows)
        report.update({
            "applied": applied,
            "updated_at_drift": updated_at_drift,
            "freshness_drift": freshness_drift,
            "evidence_drift": evidence_drift,
            "current_rows_touched": current_touched,
        })
        if applied != len(matched): fail(f"apply mismatch {applied}/{len(matched)}")
        if updated_at_drift: fail(f"updated_at drift {updated_at_drift}")
        if freshness_drift or evidence_drift: fail("historical status drift")
        if current_touched: fail(f"current rows touched {current_touched}")

    (OUT / f"report-{MODE}.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    # PII-free match manifest: IDs + quality only, no source text.
    with (OUT / f"matches-{MODE}.jsonl").open("w", encoding="utf-8") as f:
        for row in matched:
            side = row["metadata"]["public_dataset_evidence_v3"]
            f.write(json.dumps({
                "source_listing_id": row["source_listing_id"],
                "document_quality_score": side["document_quality_score"],
                "document_quality_class": side["document_quality_class"],
                "economic_snapshot_candidate": side["economic_snapshot_candidate"],
            }, separators=(",", ":")) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
