"""J3 Agenz multi-snapshot offline quality bench; real source captures stay private.

A single J1 HTML sample is NOT representative. Every corpus entry supplies
an immutable source.html + source.manifest.json and explicitly labelled
expected fields; integrity verified before any comparison, no HTTP/DB.
"""
from __future__ import annotations
from pathlib import Path
from urllib.parse import urlsplit
from collections import Counter
import json
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.snapshot_evidence import verify_evidence, offline_benchmark

SCHEMA = "akarfinder-v7-parallel-source-v1"
FIELDS = ("title", "price_mad", "surface_total_m2", "city",
          "district", "property_type", "transaction_type")
TARGET_SNAPSHOTS = 5
MAX_SNAPSHOTS = 30


class CorpusError(ValueError):
    pass


def _agenz_id(url: str) -> str:
    p = urlsplit(url)
    if p.scheme != "https" or p.netloc not in ("agenz.ma", "www.agenz.ma"):
        raise CorpusError("WRONG_SOURCE")
    old = re.fullmatch(
        r"/fr/annonces/immo-[a-z0-9-]+/(?:vente|location)-[^/]+/[^/]+/(\d{5,12})/?",
        p.path,
    )
    new = re.fullmatch(
        r"/(?:fr/)?annonces-achat/appartement/[a-z0-9-]+/[a-z0-9-]+/[a-z0-9-]+/appartement-a-vendre-(\d{5,12})/?",
        p.path,
    )
    if p.query or p.fragment or (old is None and new is None):
        raise CorpusError("NOT_PROVEN_DETAIL_ID")
    return (old or new).group(1)


def assess_corpus(samples: list[dict]) -> dict:
    if not isinstance(samples, list) or not 1 <= len(samples) <= MAX_SNAPSHOTS:
        raise CorpusError("INVALID_CORPUS_SIZE")
    ids, sha_set = set(), set()
    reports = []
    for sample in samples:
        if not isinstance(sample, dict) or set(sample) != {"folder", "expected"}:
            raise CorpusError("INVALID_CASE")
        path = Path(sample["folder"])
        evidence = verify_evidence(path / "source.html", path / "source.manifest.json")
        manifest = evidence["manifest"]
        offer_id = _agenz_id(manifest["source_url"])
        if offer_id in ids:
            raise CorpusError("DUPLICATE_SOURCE_OFFER_ID")
        if manifest["html_sha256"] in sha_set:
            raise CorpusError("DUPLICATE_IDENTICAL_SNAPSHOT")
        ids.add(offer_id)
        sha_set.add(manifest["html_sha256"])
        expected = sample["expected"]
        if not isinstance(expected, dict) or not set(expected) <= set(FIELDS):
            raise CorpusError("UNSUPPORTED_EXPECTATIONS")
        report = offline_benchmark(path / "source.html", path / "source.manifest.json")
        labels = {}
        for key in FIELDS:
            value = expected.get(key)
            a = report["field_comparison"][key]
            labels[key] = {
                "expected_supplied": key in expected,
                "v3_matches_supplied_label": None if key not in expected else a["v3"] == value,
                "l4_matches_supplied_label": None if key not in expected else a["l4"] == value,
                "v3_present": a["v3"] is not None,
                "l4_present": a["l4"] is not None,
            }
        reports.append({
            "source_offer_id": offer_id, "sha256": manifest["html_sha256"],
            "captured_at_utc": manifest["captured_at_utc"], "labels": labels,
            "extractor_disagreements": [
                k for k in FIELDS if not report["field_comparison"][k]["agreement"]
            ],
            "human_ground_truth_independently_verified": False,
            "private_staging_authorized": False,
        })
    mismatch = Counter(k for r in reports for k in r["extractor_disagreements"])
    return {
        "schema_version": SCHEMA,
        "source": "agenz.ma",
        "snapshots": len(reports),
        "independent_source_ids": len(ids),
        "status": "pilot_only" if len(reports) < TARGET_SNAPSHOTS else "corpus_ready_for_human_labels",
        "representative_accuracy_certified": False,
        "labels_are_externally_provided_not_independently_verified": True,
        "disagreements_by_field": dict(sorted(mismatch.items())),
        "results": reports,
        "source_network_requests": 0,
        "db_writes": 0,
        "eligible_for_private_detail_staging": False,
    }


def main() -> int:
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("manifest_json", type=Path,
                   help="PRIVATE local JSON list of {folder, expected}")
    args = p.parse_args()
    if args.manifest_json.is_symlink() or args.manifest_json.stat().st_size > 50000:
        raise CorpusError("UNSAFE_INPUT")
    records = json.loads(args.manifest_json.read_text(encoding="utf-8"))
    print(json.dumps(assess_corpus(records), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
