#!/usr/bin/env python3
"""FeenWay ZIP -> private V7 quarantine. No HTTP, DB writes, source promotion or publication.

FeenWay is an aggregator: image CDN domains are hints only, not original URLs/IDs.
Even supplied upstream URL/ID observations only pass a format check; independent
source evidence and the existing V7 gated adapter are still required.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
import zipfile

ZIP_NAMES = frozenset({
    "feenway_annonces_trie_et_complet.json", "feenway_rapport_final.json",
    "README_AKARFINDER_IMPORT.txt",
})
ROW_KEYS = frozenset({"nom_annonce", "url", "ville", "quartier", "superficie", "prix", "liens_photos"})
FEENWAY = re.compile(r"https://www\.feenway\.com/listings/([1-9][0-9]{0,11})\Z")
AMOUNT = re.compile(r"([\d \u00a0\u202f]+)\s*MAD\Z")
AREA = re.compile(r"([\d \u00a0\u202f]+)\s*m²\Z")
PHOTO_HOST_HINTS = {
    "content.avito.ma": "avito.ma",
    "www.mubawab-media.com": "mubawab.ma",
    "medias.yakeey.com": "yakeey.com",
    "agenz.ma": "agenz.ma",
    "sarouty-prod.s3.eu-west-3.amazonaws.com": "sarouty.ma",
    "www.masaken.ma": "masaken.ma",
}
MAX_ZIP_BYTES = 100_000_000
MAX_JSON_BYTES = 80_000_000
MAX_RECORDS = 120_000


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _decimal(value: str, pattern: re.Pattern) -> int | None:
    match = pattern.fullmatch(value)
    return int(re.sub(r"\D", "", match.group(1))) if match else None


def _safe_url(raw: object) -> str | None:
    if not isinstance(raw, str) or len(raw) > 2048 or any(ch in raw for ch in "\\\r\n\t"):
        return None
    try:
        parsed = urlsplit(raw)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username
                or parsed.password or parsed.port is not None or parsed.fragment):
            return None
        return raw
    except ValueError:
        return None


def _read_archive(path: Path) -> tuple[list[dict], dict, str]:
    if not path.is_file() or path.is_symlink() or path.stat().st_size > MAX_ZIP_BYTES:
        raise ValueError("INVALID_ARCHIVE")
    with zipfile.ZipFile(path) as z:
        if set(z.namelist()) != ZIP_NAMES or len(z.infolist()) != 3:
            raise ValueError("UNEXPECTED_ZIP_CONTENT")
        if any(i.is_dir() or i.file_size > MAX_JSON_BYTES for i in z.infolist()):
            raise ValueError("ZIP_SIZE_LIMIT")
        if z.testzip() is not None:
            raise ValueError("ZIP_CRC_ERROR")
        raw = z.read("feenway_annonces_trie_et_complet.json")
        if len(raw) > MAX_JSON_BYTES:
            raise ValueError("JSON_SIZE_LIMIT")
        rows = json.loads(raw)
        report = json.loads(z.read("feenway_rapport_final.json"))
    if not isinstance(rows, list) or not 0 < len(rows) <= MAX_RECORDS:
        raise ValueError("RECORDS_INVALID")
    if not isinstance(report, dict):
        raise ValueError("COLLECTOR_REPORT_INVALID")
    return rows, report, sha256(path.read_bytes())


def _read_observations(path: Path | None) -> dict[str, dict]:
    if path is None:
        return {}
    if not path.is_file() or path.is_symlink() or path.stat().st_size > 25_000_000:
        raise ValueError("OBSERVATIONS_FILE_INVALID")
    result = {}
    with path.open(encoding="utf-8") as src:
        for line in src:
            if not line.strip():
                continue
            if len(line) > 10_000:
                raise ValueError("OBSERVATION_TOO_LONG")
            obs = json.loads(line)
            if not isinstance(obs, dict):
                raise ValueError("OBSERVATION_NOT_OBJECT")
            url = obs.get("feenway_url")
            if not isinstance(url, str) or FEENWAY.fullmatch(url) is None:
                raise ValueError("OBSERVATION_FEENWAY_ID_INVALID")
            if url in result:
                raise ValueError("DUPLICATE_OBSERVATION")
            result[url] = obs
    return result


def _upstream_observation(obs: dict | None) -> dict | None:
    if obs is None:
        return None
    url = _safe_url(obs.get("upstream_url"))
    upstream_id = obs.get("upstream_offer_id")
    if not url or not isinstance(upstream_id, str) or not 1 <= len(upstream_id) <= 80:
        return None
    from v7_multisource.sources import canonical_identity
    try:
        portal, offer_id, canonical = canonical_identity(url)
    except ValueError:
        return None
    if offer_id != upstream_id:
        return None
    return {"portal": portal, "source_url": canonical, "source_offer_id": offer_id,
            "evidence_status": "SELF_ASSERTED_FORMAT_ONLY_NOT_VERIFIED"}


def run(archive: Path, output: Path, observations: Path | None = None) -> dict:
    if output.exists() or output.is_symlink() or output.parent.is_symlink():
        raise ValueError("PRIVATE_OUTPUT_MUST_BE_NEW")
    rows, collector, archive_hash = _read_archive(archive)
    obs = _read_observations(observations)
    ids, used_observations = set(), set()
    hinted, status, flags = Counter(), Counter(), Counter()
    shared_first_photo = defaultdict(list)
    output.mkdir(parents=True, mode=0o700)
    with gzip.open(output / "candidates_QUARANTINE.jsonl.gz", "wt", encoding="utf-8") as dest:
        for row in rows:
            if not isinstance(row, dict) or set(row) != ROW_KEYS:
                raise ValueError("SOURCE_SCHEMA_MISMATCH")
            if any(not isinstance(row[k], str) or len(row[k]) > 6000
                   for k in ROW_KEYS - {"liens_photos"}):
                raise ValueError("SOURCE_VALUE_INVALID")
            if not isinstance(row["liens_photos"], list) or len(row["liens_photos"]) > 100:
                raise ValueError("SOURCE_PHOTOS_INVALID")
            m = FEENWAY.fullmatch(row["url"])
            if not m or m.group(1) in ids:
                raise ValueError("DUPLICATE_OR_INVALID_FEENWAY_ID")
            ids.add(m.group(1))
            local_flags = []
            if row["ville"].isdigit() or row["ville"].strip().upper() == "N/A":
                local_flags.append("CITY_UNRELIABLE")
            if row["quartier"].strip().upper() in ("N/A", ""):
                local_flags.append("DISTRICT_UNKNOWN")
            images = row["liens_photos"]
            parsed_images = [_safe_url(x) for x in images]
            if any(url is None for url in parsed_images):
                local_flags.append("PHOTO_URL_INVALID")
            hosts = {urlsplit(url).hostname for url in parsed_images if url}
            candidate_portals = sorted({PHOTO_HOST_HINTS[h] for h in hosts if h in PHOTO_HOST_HINTS})
            if len(candidate_portals) != 1:
                local_flags.append("UPSTREAM_PHOTO_HINT_AMBIGUOUS_OR_ABSENT")
            else:
                hinted[candidate_portals[0]] += 1
            if parsed_images and parsed_images[0]:
                shared_first_photo[parsed_images[0].split("?")[0]].append(m.group(1))
            price = _decimal(row["prix"], AMOUNT)
            surface = _decimal(row["superficie"], AREA)
            if price is None:
                local_flags.append("PRICE_UNPARSEABLE")
            if surface is None:
                local_flags.append("SURFACE_UNPARSEABLE")
            title = row["nom_annonce"].lower()
            if "/nuit" in title:
                unit = "night_claim"
            elif "/mois" in title:
                unit = "month_claim"
            elif "/m²" in title or "/m2" in title:
                unit = "per_m2_claim"
            else:
                unit = "unknown_or_total"
            if unit != "unknown_or_total":
                local_flags.append("PRICE_PERIOD_FROM_TITLE_UNVERIFIED")
            transaction = "sale" if " à vendre" in title else ("rent" if " à louer" in title else None)
            if transaction is None:
                local_flags.append("TRANSACTION_UNKNOWN")
            observation = obs.get(row["url"])
            if observation:
                used_observations.add(row["url"])
            match = _upstream_observation(observation)
            state = ("Q_UPSTREAM_MAPPING_FORMAT_ONLY" if match
                     else "Q_UPSTREAM_ORIGINAL_IDENTITY_MISSING")
            status[state] += 1
            flags.update(set(local_flags))
            dest.write(json.dumps({
                "feenway_url": row["url"], "feenway_offer_id": m.group(1),
                "title": row["nom_annonce"], "city_raw": row["ville"],
                "district_raw": row["quartier"], "price_mad_candidate": price,
                "surface_m2_candidate": surface, "price_basis_claim": unit,
                "transaction_candidate": transaction, "photo_source_hints": candidate_portals,
                "photos": images, "upstream_candidate": match,
                "quality_flags": local_flags, "admission_status": state,
                "published_at_verified": None, "availability_verified": False,
            }, ensure_ascii=False, separators=(",", ":")) + "\n")
    if set(obs) != used_observations:
        raise ValueError("OBSERVATION_REFERENCES_UNKNOWN_FEENWAY_URL")
    duplicates = sum(len(v) - 1 for v in shared_first_photo.values() if len(v) > 1)
    result = {
        "schema_version": "feenway_v7_provenance_gate_1", "mode": "OFFLINE_PRIVATE_ONLY",
        "archive_sha256": archive_hash, "source_rows": len(rows),
        "source_report_claimed_rows": collector.get("annonces_recuperees_uniques"),
        "unique_feenway_ids": len(ids), "photo_portal_hints_not_proof": dict(hinted),
        "first_photo_collision_extras_not_confirmed_duplicates": duplicates,
        "quality_flag_counts": dict(sorted(flags.items())),
        "upstream_observations_supplied": len(obs), "quarantine_status": dict(status),
        "public_admission_eligible": 0, "db_writes": 0, "network_requests": 0,
        "public_admission_authorized": False,
        "next_gate": "INDEPENDENT_FEENWAY_LINK_AND_ORIGINAL_SOURCE_SNAPSHOT_EVIDENCE_V7",
    }
    (output / "report.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="FeenWay V7: offline hints, no admission")
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--upstream-observations", type=Path)
    args = parser.parse_args()
    print(json.dumps(run(args.archive, args.output, args.upstream_observations),
                     ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
