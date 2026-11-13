#!/usr/bin/env python3
"""FeenWay V7: private offline Mubawab CDN *hints* / collision review.

A CDN image path is not evidence of a live listing or validated origin.
Never synthesize original source URLs or make an admission decision.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
import gzip
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

from v7_multisource.feenway_provenance import _read_archive, FEENWAY

PRIMARY = re.compile(r"\A/ad/([0-9])/([0-9]{3})/([0-9]{3})F/h/[^/]+\Z")
# Keep every path match literal, no implicit URL unquoting or network request.
MB_HOSTS = frozenset(("www.mubawab-media.com", "mubawab-media.com"))


def _primary_id(photo: object) -> str | None:
    if not isinstance(photo, str) or len(photo) > 2048 or "\\" in photo:
        return None
    try:
        p = urlsplit(photo)
        if (p.scheme != "https" or p.netloc not in MB_HOSTS
                or p.username or p.password or p.port is not None or p.fragment):
            return None
    except ValueError:
        return None
    match = PRIMARY.fullmatch(p.path)
    return "".join(match.groups()) if match else None


def review_archive(archive: Path, output: Path) -> dict:
    if output.exists() or output.is_symlink() or output.parent.is_symlink():
        raise ValueError("PRIVATE_OUTPUT_MUST_BE_NEW")
    rows, _collector_report, digest = _read_archive(archive)
    status = Counter()
    collisions: dict[str, list[str]] = defaultdict(list)
    hints: list[dict] = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != {
            "nom_annonce", "url", "ville", "quartier", "superficie", "prix", "liens_photos"
        }:
            raise ValueError("SOURCE_SCHEMA_MISMATCH")
        url = row["url"]
        photos = row["liens_photos"]
        if not isinstance(url, str) or not FEENWAY.fullmatch(url) or url in seen:
            raise ValueError("DUPLICATE_OR_INVALID_FEENWAY_URL")
        seen.add(url)
        if not isinstance(photos, list) or len(photos) > 100:
            raise ValueError("PHOTO_ARRAY_INVALID")
        if not photos:
            status["EMPTY_GALLERY"] += 1
            continue
        first = _primary_id(photos[0])
        if first is None:
            status["NO_STRICT_PRIMARY_MUBAWAB_HINT"] += 1
            continue
        # Ignore /m/ thumbnail URLs; distinguish only multiple /h/ primary paths.
        primary_ids = {_primary_id(p) for p in photos}
        primary_ids.discard(None)
        if primary_ids != {first}:
            status["CONFLICTING_PRIMARY_PHOTOS"] += 1
            continue
        status["SINGLE_CDN_HINT_REQUIRES_SOURCE_CHECK"] += 1
        hint = {
            "feenway_url": url,
            "mubawab_offer_id_from_photo_hint": first,
            "evidence_kind": "UNVERIFIED_CDN_PRIMARY_PHOTO_PATH",
            "upstream_url_verified": False,
            "source_detail_verified": False,
            "not_a_confirmed_duplicate": True,
            "eligible_for_radar10_private_staging": False,
            "eligible_for_public_admission": False,
        }
        hints.append(hint)
        collisions[first].append(url)
    output.mkdir(mode=0o700, parents=True)
    with gzip.open(output / "mubawab_photo_id_hints_QUARANTINE.jsonl.gz", "wt", encoding="utf-8") as out:
        for hint in hints:
            out.write(json.dumps(hint, ensure_ascii=False, sort_keys=True) + "\n")
    repeated_ids = {i: urls for i, urls in collisions.items() if len(urls) > 1}
    with (output / "candidate_id_collisions_REVIEW_ONLY.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["mubawab_photo_id_hint", "feenway_url", "group_size", "note"])
        for i in sorted(repeated_ids):
            for url in sorted(repeated_ids[i]):
                writer.writerow([i, url, len(repeated_ids[i]), "NOT_CONFIRMED_DUPLICATE"])
    result = {
        "schema_version": "feenway_v7_mubawab_photo_id_hint_review_v1",
        "mode": "OFFLINE_PRIVATE_NO_ADMISSION",
        "archive_sha256": digest,
        "total_feenway_rows": len(rows),
        "status_counts": dict(sorted(status.items())),
        "single_primary_mubawab_photo_id_hint_rows": len(hints),
        "candidate_id_collision_groups": len(repeated_ids),
        "candidate_id_collision_extra_rows": sum(len(v) - 1 for v in repeated_ids.values()),
        "verified_upstream_source_ids": 0,
        "confirmed_property_duplicates": 0,
        "deleted_rows": 0,
        "source_network_requests": 0,
        "database_writes": 0,
        "public_admission_authorized": False,
        "note": "Photo path is a CDN hint, never an original listing ID proof or unique property proof.",
    }
    (output / "report.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    a = argparse.ArgumentParser(description="FeenWay / Mubawab photo path hint audit: no DB or HTTP")
    a.add_argument("--archive", type=Path, required=True)
    a.add_argument("--output", type=Path, required=True)
    args = a.parse_args()
    print(json.dumps(review_archive(args.archive, args.output), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
