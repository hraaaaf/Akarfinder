"""Private staging of verified-source V3 outputs. Never writes public listings."""
from __future__ import annotations
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
from urllib.parse import urlsplit
from uuid import uuid4

PROJECT_REF = "mgqsckxsqdqbzqwkgvwo"
MAX_ROWS = 1000
VALID_STATUS = {"ready_internal", "complete_requires_freshness", "requires_manual_review", "partial"}
SOURCE_ID_RX = re.compile(r"/a/([0-9]{5,})(?:/|$)")
SHA_RX = re.compile(r"^[0-9a-f]{64}$")
LOCK_KEY = (20261112, 10)


class InvalidCandidate(ValueError):
    pass


class BusyError(RuntimeError):
    pass


def _text(value, size=350):
    if value is None:
        return None
    if not isinstance(value, str) or len(value) > size:
        raise InvalidCandidate("TEXT_INVALID")
    return value.strip() or None


def _num(value, *, integer=False):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise InvalidCandidate("NUMBER_INVALID")
    if not (0 < value <= (10**11 if integer else 10**7)):
        raise InvalidCandidate("NUMBER_OUT_OF_RANGE")
    if integer:
        if not float(value).is_integer():
            raise InvalidCandidate("PRICE_NOT_INTEGER")
        return int(value)
    return round(float(value), 3)


def normalize(record):
    if not isinstance(record, dict):
        raise InvalidCandidate("NOT_OBJECT")
    src, q, fields = record.get("source"), record.get("quality"), record.get("fields")
    if not all(isinstance(x, dict) for x in (src, q, fields)):
        raise InvalidCandidate("V3_STRUCTURE_INVALID")
    if (q.get("freshness_independently_verified") is not False or
        q.get("availability_verified") is not False or
        q.get("neon_product_admission_authorized") is not False):
        raise InvalidCandidate("V3_SAFETY_CONTRACT")
    if q.get("status") not in VALID_STATUS:
        raise InvalidCandidate("QUARANTINE_OR_UNSUPPORTED")
    url = src.get("source_url")
    if not isinstance(url, str) or len(url) > 2048:
        raise InvalidCandidate("SOURCE_URL_INVALID")
    parsed = urlsplit(url)
    if (parsed.scheme != "https" or parsed.hostname not in ("mubawab.ma", "www.mubawab.ma") or
        parsed.username or parsed.password or parsed.port is not None or parsed.query or parsed.fragment):
        raise InvalidCandidate("SOURCE_HOST_INVALID")
    offer_id = _text(src.get("source_offer_id"), 64)
    match = SOURCE_ID_RX.search(parsed.path)
    if not match or match.group(1) != offer_id:
        raise InvalidCandidate("SOURCE_ID_MISMATCH")
    raw_hash = record.get("raw_sha256")
    if not isinstance(raw_hash, str) or not SHA_RX.fullmatch(raw_hash):
        raise InvalidCandidate("RAW_SHA_INVALID")
    row = dict(
        source_url=url, source_domain=parsed.hostname, source_offer_id=offer_id,
        title=_text(fields.get("title")), city=_text(fields.get("city"), 120),
        district=_text(fields.get("district"), 120),
        price_mad=_num(fields.get("price_mad"), integer=True),
        surface_m2=_num(fields.get("surface_total_m2")),
        property_type=_text(fields.get("property_type"), 64),
        transaction_type=_text(fields.get("transaction_type"), 64),
        quality_status=q["status"], raw_sha256=raw_hash,
    )
    if row["property_type"] != "apartment" or row["transaction_type"] != "sale":
        raise InvalidCandidate("CATEGORY_NOT_VERIFIED")
    data = {k:v for k,v in row.items() if k != "raw_sha256"}
    row["content_sha256"] = hashlib.sha256(
        json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",",":")).encode()
    ).hexdigest()
    return row


def load_v3(path: Path, *, limit=MAX_ROWS):
    if path.name != "all.jsonl.gz" or not path.is_file() or path.is_symlink():
        raise ValueError("V3_ALL_JSONL_REQUIRED")
    if path.stat().st_size > 32_000_000:
        raise ValueError("COMPRESSED_INPUT_TOO_LARGE")
    seen, rejects, observed = {}, {}, 0
    with gzip.open(path, "rt", encoding="utf-8") as stream:
        for line in stream:
            if not line.strip():
                continue
            observed += 1
            if observed > limit or len(line) > 350_000:
                raise ValueError("INPUT_LIMIT_EXCEEDED")
            try:
                candidate = normalize(json.loads(line))
            except (InvalidCandidate, ValueError, TypeError) as exc:
                reason = str(exc) if isinstance(exc, InvalidCandidate) else "INVALID_JSON"
                rejects[reason] = rejects.get(reason, 0) + 1
                continue
            old = seen.get(candidate["source_url"])
            if old and old != candidate:
                raise ValueError("CONTRADICTORY_DUPLICATE_IN_BATCH")
            seen[candidate["source_url"]] = candidate
    candidates = sorted(seen.values(), key=lambda x: x["source_url"])
    return candidates, {
        "observed": observed, "accepted": len(candidates),
        "duplicates": observed-len(candidates)-sum(rejects.values()),
        "rejected": rejects,
    }


def snapshot_sha(rows):
    return hashlib.sha256(json.dumps(rows, ensure_ascii=False,
        sort_keys=True, separators=(",",":")).encode()).hexdigest()


def apply_batch(conn, candidates, report):
    """One atomic PostgreSQL transaction; caller must use autocommit=True."""
    if not conn.autocommit:
        raise ValueError("AUTOCOMMIT_CONNECTION_REQUIRED")
    if not candidates:
        return {"inserted": 0, "updated": 0, "unchanged": 0, "db_writes": 0}
    counts = dict(inserted=0, updated=0, unchanged=0)
    keys = ("source_url","source_domain","source_offer_id","title","city","district",
            "price_mad","surface_m2","property_type","transaction_type",
            "quality_status","raw_sha256","content_sha256")
    with conn.transaction():
        with conn.cursor() as c:
            c.execute("SET LOCAL lock_timeout = '3s'")
            c.execute("SET LOCAL statement_timeout = '20s'")
            c.execute("SELECT pg_try_advisory_xact_lock(%s,%s)", LOCK_KEY)
            if not c.fetchone()[0]:
                raise BusyError("ALREADY_RUNNING")
            for row in candidates:
                c.execute("SELECT source_offer_id,content_sha256 FROM acquisition.radar_candidates "
                          "WHERE source_url=%s FOR UPDATE", (row["source_url"],))
                previous = c.fetchone()
                if previous is None:
                    c.execute("INSERT INTO acquisition.radar_candidates "
                              "(source_url,source_domain,source_offer_id,title,city,district,"
                              "price_mad,surface_m2,property_type,transaction_type,"
                              "quality_status,raw_sha256,content_sha256) VALUES ("
                              + ",".join(["%s"]*len(keys)) + ")",
                              tuple(row[k] for k in keys))
                    counts["inserted"] += 1
                elif previous[0] != row["source_offer_id"]:
                    raise InvalidCandidate("STORED_SOURCE_ID_CONFLICT")
                elif previous[1] == row["content_sha256"]:
                    c.execute("UPDATE acquisition.radar_candidates SET last_observed_at=now() "
                              "WHERE source_url=%s", (row["source_url"],))
                    counts["unchanged"] += 1
                else:
                    c.execute("UPDATE acquisition.radar_candidates SET "
                              "title=%s,city=%s,district=%s,price_mad=%s,surface_m2=%s,"
                              "property_type=%s,transaction_type=%s,quality_status=%s,"
                              "raw_sha256=%s,content_sha256=%s,last_observed_at=now(),"
                              "changed_at=now() WHERE source_url=%s",
                              tuple(row[k] for k in keys[3:]) + (row["source_url"],))
                    counts["updated"] += 1
            c.execute("INSERT INTO acquisition.radar_runs "
                      "(run_id,snapshot_sha256,observed_count,accepted_count,"
                      "inserted_count,updated_count,unchanged_count,rejected_count) "
                      "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                      (uuid4(), snapshot_sha(candidates), report["observed"],
                       len(candidates), counts["inserted"], counts["updated"],
                       counts["unchanged"], sum(report["rejected"].values())))
    return {**counts, "db_writes": len(candidates)+1}
