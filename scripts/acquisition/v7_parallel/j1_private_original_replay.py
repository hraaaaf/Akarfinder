"""J1 original Agenz offline replay, requiring external private ZIP and operator pin.

Never download source HTML, write database records, stage, or publish. This
program is deliberately NOT a CI replacement unless private bytes are really
provisioned to a trusted runner. Prints SHA/field summary only, not original.
"""
from __future__ import annotations

from datetime import datetime
import hashlib
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from v7_parallel.v7_private_archive_preflight import (
    EvidenceRejected, _entries, _json_bytes, _operator_pin, _validated_pair
)

J1_ID = "444291"
J1_HTML_SHA256 = "788355d9050f4b3ee6061c51ebf259c89acff19bb583a03a895ab8889ece6d61"
J1_HTML_SIZE = 237450
J1_MEMBER = "original_artifacts/agenz-444291.zip"
J1_REQUIRED_REASON = "AGENZ_EXPLICIT_NEIGHBORHOOD_CONFLICT_REQUIRES_REVIEW"


def _expected_j1_replay(report: dict, parsed: dict) -> None:
    """Require same original fields/negative-admission checks as J1 CI."""
    try:
        fields = report["field_comparison"]
        assert fields["price_mad"]["v3"] == 980000
        assert fields["price_mad"]["l4"] == 980000
        assert fields["surface_total_m2"]["v3"] == 104
        assert fields["surface_total_m2"]["l4"] == 104
        assert fields["city"]["v3"] == "Sale"
        assert fields["district"]["v3"] == "Al Qods"
        assert fields["property_type"]["v3"] == "apartment"
        assert fields["transaction_type"]["v3"] == "sale"
        assert J1_REQUIRED_REASON in parsed["quality"]["review_reasons"]
        assert parsed["quality"]["neon_product_admission_authorized"] is False
    except (AssertionError, KeyError, TypeError) as exc:
        raise EvidenceRejected("J1_ORIGINAL_L4_V3_REPLAY_INCONSISTENT") from exc


def replay_j1_private_original(j3_bundle: Path, *, operator_j3_sha256: str) -> dict:
    """Exact archived HTML replay. Operator pin must be authenticated elsewhere.

    The original bundle must be provisioned privately, never in a public PR,
    a fixture, a GitHub log, or an unrestricted Actions artifact.
    """
    _operator_pin(j3_bundle, operator_j3_sha256)
    with ZipFile(j3_bundle) as outer:
        expected_names = {
            "original_artifacts/agenz-444291.zip",
            "original_artifacts/agenz-445495.zip",
            "original_artifacts/agenz-420510.zip",
            "original_artifacts/agenz-387448.zip",
            "original_artifacts/agenz-500006.zip",
            "archive_index.json",
        }
        _entries(outer, expected_names)
        _json_bytes(outer.read("archive_index.json"))
        with ZipFile(io.BytesIO(outer.read(J1_MEMBER))) as inner:
            _entries(inner, {"source.html", "source.manifest.json"})
            raw = inner.read("source.html")
            manifest_raw = inner.read("source.manifest.json")

    proof = _validated_pair(raw, manifest_raw, "agenz.ma")
    if (proof["id"] != J1_ID or len(raw) != J1_HTML_SIZE
            or proof["html_sha256"] != J1_HTML_SHA256):
        raise EvidenceRejected("J1_ORIGINAL_BYTE_PIN_MISMATCH")

    # Import REAL repo parsers only after immutable bytes and operator pin pass.
    from akarparser_v3_raw_bulk import parse_raw
    from v7_multisource.snapshot_evidence import _utc, verify_evidence, offline_benchmark

    with TemporaryDirectory(prefix="akar-v7-j1-private-") as d:
        root = Path(d)
        html_path = root / "source.html"
        manifest_path = root / "source.manifest.json"
        html_path.write_bytes(raw)
        manifest_path.write_bytes(manifest_raw)
        evidence = verify_evidence(html_path, manifest_path)
        manifest = evidence["manifest"]
        if (manifest["source_url"] != _json_bytes(manifest_raw)["source_url"]
                or manifest["html_sha256"] != J1_HTML_SHA256):
            raise EvidenceRejected("J1_ORIGINAL_VERIFIER_REJECTED")
        report = offline_benchmark(html_path, manifest_path)
        parsed = parse_raw({
            "source_url": manifest["source_url"],
            "raw_html": evidence["raw_html"],
        }, _utc(manifest["captured_at_utc"]))
        _expected_j1_replay(report, parsed)
        return {
            "schema_version": "akar-v7-j1-original-private-replay-v1",
            "original_html_sha256": J1_HTML_SHA256,
            "original_html_bytes": J1_HTML_SIZE,
            "original_j3_bundle_sha256": hashlib.sha256(Path(j3_bundle).read_bytes()).hexdigest(),
            "id": J1_ID,
            "l4_price_mad": 980000,
            "v3_price_mad": 980000,
            "v3_surface_m2": 104,
            "negative_admission_asserted": True,
            "city": "Sale",
            "district": "Al Qods",
            "original_bytes_replayed": True,
            "private_staging_authorized": False,
            "source_http_requests": 0,
            "db_writes": 0,
            "public_admission": False,
            "independent_geo_certified": False,
        }


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--j3", type=Path, required=True)
    p.add_argument("--operator-pin", required=True,
                   help="SHA256 of J3 ZIP supplied by an independent operator channel")
    args = p.parse_args()
    print(json.dumps(
        replay_j1_private_original(args.j3, operator_j3_sha256=args.operator_pin),
        ensure_ascii=False, sort_keys=True, indent=2,
    ))
