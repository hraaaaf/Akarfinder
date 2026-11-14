"""J3 five immutable Agenz originals replay from independently pinned PRIVATE ZIP.

Runs on operator checkout with private J3 archive. Does not fetch, stage,
publish, update a DB, decrypt map attributes, or imply independent geolocation.
Public CI tests this harness with synthetic contracts only.
"""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from v7_parallel.j3_agenz_corpus import assess_corpus
from v7_parallel.j3_source_internal_consistency import audit_verified_snapshot

IDS = ("444291", "445495", "420510", "387448", "500006")
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
ZIP_MAX = 3_000_000
HTML_MAX = 2_000_000


class J3PrivateReplayRejected(ValueError):
    pass


def _check_entries(z: ZipFile, names: set[str]) -> None:
    rows = z.infolist()
    if set(z.namelist()) != names or len(rows) != len(names):
        raise J3PrivateReplayRejected("ARCHIVE_ENTRIES_INVALID")
    if any(i.is_dir() or i.flag_bits & 1 or i.file_size > HTML_MAX
           for i in rows) or z.testzip() is not None:
        raise J3PrivateReplayRejected("ARCHIVE_ENTRY_UNSAFE")


def _contract(results: dict, audits: dict) -> None:
    """Read-only conservative assertions from original J3 replay contract."""
    try:
        if (results["snapshots"] != 5 or results["independent_source_ids"] != 5
            or results["status"] != "corpus_ready_for_human_labels"
            or results["db_writes"] != 0
            or results["representative_accuracy_certified"] is not False
            or {v["source_offer_id"] for v in results["results"]} != set(IDS)
            or len({v["sha256"] for v in results["results"]}) != 5):
            raise J3PrivateReplayRejected("J3_CORPUS_REPLAY_INVALID")
        for field in ("city", "district", "surface_total_m2"):
            if results["disagreements_by_field"].get(field, 0) != 0:
                raise J3PrivateReplayRejected("J3_CANONICAL_L4_V3_DIVERGENCE")
        if (set(audits) != set(IDS)
            or sorted(k for k, v in audits.items()
                      if v["source_bedroom_count_disagreement"]) != ["387448"]
            or any(v["source_map_attribute_kind"] !=
                   "source_encrypted_coordinates_not_independent_proof"
                   or v["independent_physical_location_attestation"]
                   or v["eligible_for_private_staging"]
                   for v in audits.values())):
            raise J3PrivateReplayRejected("J3_INTERNAL_SOURCE_CONTRADICTION")
    except (KeyError, TypeError, AttributeError) as exc:
        raise J3PrivateReplayRejected("J3_CORPUS_CONTRACT_INVALID") from exc


def replay_private_corpus(bundle: Path, *, operator_sha256: str) -> dict:
    if (not isinstance(operator_sha256, str) or not HEX64.fullmatch(operator_sha256)
        or not Path(bundle).is_file() or Path(bundle).is_symlink()
        or Path(bundle).stat().st_size > ZIP_MAX
        or hashlib.sha256(Path(bundle).read_bytes()).hexdigest() != operator_sha256):
        raise J3PrivateReplayRejected("OPERATOR_ZIP_PIN_REQUIRED_OR_MISMATCH")

    with TemporaryDirectory(prefix="akar-v7-j3-private-") as d:
        root = Path(d)
        with ZipFile(bundle) as outer:
            names = {"archive_index.json"} | {
                f"original_artifacts/agenz-{item}.zip" for item in IDS
            }
            _check_entries(outer, names)
            for item in IDS:
                with ZipFile(io.BytesIO(
                    outer.read(f"original_artifacts/agenz-{item}.zip")
                )) as inner:
                    _check_entries(inner, {"source.html", "source.manifest.json"})
                    folder = root / item
                    folder.mkdir()
                    (folder / "source.html").write_bytes(inner.read("source.html"))
                    (folder / "source.manifest.json").write_bytes(
                        inner.read("source.manifest.json")
                    )
        results = assess_corpus([
            {"folder": str(root / item), "expected": {}} for item in IDS
        ])
        audits = {item: audit_verified_snapshot(root / item) for item in IDS}
        _contract(results, audits)
        return {
            "schema_version": "akar-v7-j3-private-replay-v1",
            "bundle_sha256": operator_sha256,
            "snapshots": results["snapshots"],
            "source_ids": sorted(IDS),
            "source_hashes": {
                v["source_offer_id"]: v["sha256"] for v in results["results"]
            },
            "field_disagreements": results["disagreements_by_field"],
            "bedroom_conflict_ids": ["387448"],
            "independent_geolocations_verified": 0,
            "original_html_replayed": True,
            "private_staging_authorized": False,
            "source_http_requests": 0,
            "db_writes": 0,
            "public_admission": False,
        }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--j3", type=Path, required=True)
    parser.add_argument("--operator-pin", required=True)
    options = parser.parse_args()
    print(json.dumps(replay_private_corpus(
        options.j3, operator_sha256=options.operator_pin
    ), ensure_ascii=False, sort_keys=True, indent=2))
