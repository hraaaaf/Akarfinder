"""Read-only, offline V7 source evidence preflight. No source HTTP, no DB.

Run against locally provisioned private ZIPs. Never put original HTML in Git,
GitHub Actions artifacts, logs, or the JSON summary. This preflight proves
byte integrity, *not* source truth, freshness or staging eligibility.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from zipfile import ZipFile, BadZipFile

MAX_ZIP = 3_000_000
MAX_HTML = 2_000_000
MAX_JSON = 20_000
_ALLOWED_HOSTS = {"agenz.ma", "www.agenz.ma", "sarouty.ma", "www.sarouty.ma", "mubawab.ma", "www.mubawab.ma"}
_ID = re.compile(r"[0-9]{4,12}\Z")
_HEX = re.compile(r"[a-f0-9]{64}\Z")

class EvidenceRejected(ValueError):
    pass


def _entries(z: ZipFile, expected: set[str]):
    info = z.infolist()
    if len(info) != len(expected) or set(z.namelist()) != expected:
        raise EvidenceRejected("ZIP_ENTRIES_UNEXPECTED")
    if any(v.is_dir() or v.file_size > MAX_HTML or v.flag_bits & 1 for v in info):
        raise EvidenceRejected("ZIP_ENTRY_INVALID")
    if z.testzip() is not None:
        raise EvidenceRejected("ZIP_CRC_INVALID")


def _json_bytes(b: bytes):
    if len(b) > MAX_JSON:
        raise EvidenceRejected("MANIFEST_TOO_LARGE")
    def no_dups(pairs):
        out = {}
        for k,v in pairs:
            if k in out:
                raise EvidenceRejected("MANIFEST_DUPLICATE_KEY")
            out[k] = v
        return out
    try:
        return json.loads(b.decode("utf-8", "strict"), object_pairs_hook=no_dups)
    except (UnicodeError, ValueError) as exc:
        raise EvidenceRejected("MANIFEST_INVALID") from exc


def _validated_pair(html: bytes, manifest_bytes: bytes, domain_expected: str) -> dict:
    m = _json_bytes(manifest_bytes)
    if not isinstance(m, dict) or m.get("schema_version") != "akarfinder-v7-raw-html-evidence-v1":
        raise EvidenceRejected("MANIFEST_SCHEMA_INVALID")
    url = m.get("source_url")
    if not isinstance(url, str):
        raise EvidenceRejected("URL_INVALID")
    u = urlsplit(url)
    host = (u.hostname or "").lower()
    if (u.scheme != "https" or u.port not in (None,443) or u.username or u.password
        or host not in _ALLOWED_HOSTS or host.removeprefix("www.") != domain_expected):
        raise EvidenceRejected("SOURCE_DOMAIN_INVALID")
    offer = u.path.rstrip("/").split("/")[-1]
    if domain_expected == "sarouty.ma":
        match = re.search(r"-(\d{4,12})$", offer)
        offer = match.group(1) if match else ""
    if not _ID.fullmatch(offer):
        raise EvidenceRejected("SOURCE_ID_INVALID")
    if (not isinstance(m.get("html_sha256"), str) or not _HEX.fullmatch(m["html_sha256"])
        or len(html) > MAX_HTML or not html.lstrip().lower().startswith((b"<!doctype html",b"<html"))
        or hashlib.sha256(html).hexdigest() != m["html_sha256"]
        or type(m.get("bytes")) is not int or len(html) != m["bytes"]
        or m.get("http_status") != 200):
        raise EvidenceRejected("HTML_SHA_OR_HTTP_INVALID")
    if not isinstance(m.get("captured_at_utc"),str) or not re.fullmatch(r"20\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ",m["captured_at_utc"]):
        raise EvidenceRejected("CAPTURE_TIME_INVALID")
    return {"source":domain_expected,"id":offer,"html_sha256":m["html_sha256"],"bytes":len(html),"captured_at_utc":m["captured_at_utc"],"integrity":"verified","geo_independently_verified":False,"current_sale_independently_verified":False,"eligible_for_private_staging":False}


def audit_j3(path: Path) -> dict:
    path=Path(path)
    if not path.is_file() or path.stat().st_size > MAX_ZIP:
        raise EvidenceRejected("BUNDLE_BYTES_INVALID")
    with ZipFile(path) as z:
        members=sorted(x for x in z.namelist() if x.startswith("original_artifacts/") and x.endswith(".zip"))
        _entries(z,set(members)|{"archive_index.json"})
        if len(members) != 5:
            raise EvidenceRejected("AGENZ_FIVE_SNAPSHOTS_REQUIRED")
        rows=[]
        for name in members:
            blob=z.read(name)
            with ZipFile(io.BytesIO(blob)) as nested:
                _entries(nested,{"source.html","source.manifest.json"})
                row=_validated_pair(nested.read("source.html"),nested.read("source.manifest.json"),"agenz.ma")
            if row["id"] not in name:
                raise EvidenceRejected("AGENZ_ARCHIVE_ID_MISMATCH")
            rows.append(row)
        if len({r["id"] for r in rows}) != 5:
            raise EvidenceRejected("AGENZ_DUPLICATE_ID")
        _json_bytes(z.read("archive_index.json"))
    return {"bundle_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"records":rows,"qualified_for_staging":0,"source_http_requests":0,"db_writes":0}


def audit_j4(path:Path) -> dict:
    path=Path(path)
    if not path.is_file() or path.stat().st_size > MAX_ZIP:
        raise EvidenceRejected("BUNDLE_BYTES_INVALID")
    with ZipFile(path) as z:
        _entries(z,{"source.html","source.manifest.json"})
        row=_validated_pair(z.read("source.html"),z.read("source.manifest.json"),"sarouty.ma")
    if row["id"]!="894012":
        raise EvidenceRejected("SAROUTY_ORIGINAL_ID_REQUIRED")
    row.update({"source_internal_geocoordinates_consistent":False,"source_geocoordinates_admissible":False})
    return {"bundle_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"records":[row],"qualified_for_staging":0,"source_http_requests":0,"db_writes":0}


def audit_j5(path:Path) -> dict:
    path=Path(path)
    if not path.is_file() or path.stat().st_size > MAX_ZIP:
        raise EvidenceRejected("BUNDLE_BYTES_INVALID")
    with ZipFile(path) as z:
        _entries(z,{"original.warc.gz","source.html","archive.index.json","archive.manifest.json"})
        html=z.read("source.html")
        manifest=_json_bytes(z.read("archive.manifest.json"))
        if not isinstance(manifest,dict):
            raise EvidenceRejected("WARC_MANIFEST_INVALID")
        if (hashlib.sha256(html).hexdigest()!="b59bef5a2a206e1182bbbcb72f799a24d3d19905d7ba02d6e307ec3361f78743"
            or hashlib.sha256(z.read("original.warc.gz")).hexdigest()!="19b3db36d3f17423c0aa59c0e306e68f3faac434b40aaf4a44f74e29a24afa4a"
            or len(html)!=341668):
            raise EvidenceRejected("HISTORICAL_WARC_PIN_MISMATCH")
        _json_bytes(z.read("archive.index.json"))
    return {"bundle_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"records":[{"source":"mubawab.ma","id":"8205911","html_sha256":hashlib.sha256(html).hexdigest(),"bytes":len(html),"integrity":"historical_archive_sha_verified","original_capture_current":False,"transaction_type":"rent","canonical_verified":False,"eligible_for_private_staging":False}],"qualified_for_staging":0,"source_http_requests":0,"db_writes":0}


def audit_all(j3:Path,j4:Path,j5:Path)->dict:
    a,b,c=audit_j3(j3),audit_j4(j4),audit_j5(j5)
    rows=a["records"]+b["records"]+c["records"]
    return {"schema_version":"akar-v7-private-archive-audit-v1","source_counts":{"agenz":5,"sarouty":1,"mubawab_historical":1},"verified_archived_records":len(rows),"qualified_for_staging":0,"sources":{"j3":a,"j4":b,"j5":c},"source_http_requests":0,"db_writes":0}

if __name__=="__main__":
    import argparse
    p=argparse.ArgumentParser()
    for x in ("j3","j4","j5"):
        p.add_argument("--"+x,type=Path,required=True)
    args=p.parse_args()
    print(json.dumps(audit_all(args.j3,args.j4,args.j5),sort_keys=True,ensure_ascii=False,indent=2))