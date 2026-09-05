#!/usr/bin/env python3
"""Discover Avito listing IDs from Common Crawl's public URL index.

Safety contract:
- Never sends any HTTP request to avito.ma.
- Queries only index.commoncrawl.org and collinfo.json.
- Produces explicit truncation/rate-limit evidence instead of claiming exhaustiveness.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

CC_ROOT = "https://index.commoncrawl.org"
COLLINFO = f"{CC_ROOT}/collinfo.json"
AVITO_ID_RE = re.compile(r"_(\d{6,12})\.htm(?:[?#]|$)", re.IGNORECASE)
DEFAULT_PATTERNS = (
    "www.avito.ma/fr/*",
    "avito.ma/fr/*",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def http_get_json(url: str, user_agent: str, timeout: int, retries: int = 4) -> Any:
    delay = 3.0
    last_exc: Exception | None = None
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read().decode("utf-8", errors="replace")
                return json.loads(body)
        except urllib.error.HTTPError as exc:
            last_exc = exc
            if exc.code not in (429, 500, 502, 503, 504) or attempt == retries - 1:
                raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_exc = exc
            if attempt == retries - 1:
                raise
        time.sleep(delay)
        delay *= 2
    if last_exc:
        raise last_exc
    raise RuntimeError("unreachable")


def http_get_text(url: str, user_agent: str, timeout: int, retries: int = 4) -> str:
    delay = 3.0
    last_exc: Exception | None = None
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            last_exc = exc
            if exc.code not in (429, 500, 502, 503, 504) or attempt == retries - 1:
                raise
        except (urllib.error.URLError, TimeoutError) as exc:
            last_exc = exc
            if attempt == retries - 1:
                raise
        time.sleep(delay)
        delay *= 2
    if last_exc:
        raise last_exc
    raise RuntimeError("unreachable")


def load_baseline(path: Path) -> tuple[set[str], dict[str, dict[str, Any]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    records = data.get("records")
    if not isinstance(records, list):
        raise ValueError(f"baseline {path} has no records[]")
    by_id: dict[str, dict[str, Any]] = {}
    for rec in records:
        source_id = str(rec.get("source_id", "")).strip()
        url = str(rec.get("avito_url", ""))
        match = AVITO_ID_RE.search(url)
        inferred = match.group(1) if match else ""
        listing_id = source_id or inferred
        if listing_id:
            by_id[listing_id] = rec
    if not by_id:
        raise ValueError("baseline contains zero Avito IDs")
    return set(by_id), by_id


def select_collections(collinfo: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    usable = [x for x in collinfo if str(x.get("id", "")).startswith("CC-MAIN-")]
    usable.sort(key=lambda x: str(x.get("id", "")), reverse=True)
    return usable[:count]


def build_index_url(index_id: str, pattern: str, **params: Any) -> str:
    query = {"url": pattern, "output": "json", **params}
    return f"{CC_ROOT}/{urllib.parse.quote(index_id, safe='')}-index?{urllib.parse.urlencode(query)}"


def parse_page_count(raw: Any) -> int:
    if isinstance(raw, int):
        return raw
    if isinstance(raw, dict):
        for key in ("pages", "numPages", "pageCount"):
            if key in raw:
                return int(raw[key])
    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        for key in ("pages", "numPages", "pageCount"):
            if key in raw[0]:
                return int(raw[0][key])
    text = raw if isinstance(raw, str) else json.dumps(raw)
    text = text.strip()
    if text.isdigit():
        return int(text)
    m = re.search(r'"pages"\s*:\s*(\d+)', text)
    if m:
        return int(m.group(1))
    raise ValueError(f"cannot parse showNumPages response: {text[:300]}")


def parse_json_lines(raw: str) -> Iterable[dict[str, Any]]:
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            yield obj


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_lines(path: Path, values: Iterable[str]) -> None:
    path.write_text("".join(f"{x}\n" for x in values), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--collections", type=int, default=8)
    ap.add_argument("--max-pages-per-query", type=int, default=12)
    ap.add_argument("--sleep-seconds", type=float, default=1.5)
    ap.add_argument("--timeout", type=int, default=45)
    ap.add_argument("--pattern", action="append", dest="patterns")
    ap.add_argument("--user-agent", default=os.getenv("CC_USER_AGENT", "AkarFinder-Avito-Radar/1.0 (+https://github.com/hraaaaf/Akarfinder)"))
    args = ap.parse_args()

    if args.collections < 1 or args.max_pages_per_query < 1:
        ap.error("collections and max-pages-per-query must be >= 1")

    args.output.mkdir(parents=True, exist_ok=True)
    baseline_ids, baseline_records = load_baseline(args.baseline)
    patterns = tuple(args.patterns or DEFAULT_PATTERNS)

    collinfo = http_get_json(COLLINFO, args.user_agent, args.timeout)
    if not isinstance(collinfo, list):
        raise RuntimeError("Common Crawl collinfo.json did not return a list")
    collections = select_collections(collinfo, args.collections)

    evidence_by_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
    seen_evidence: set[tuple[str, str, str]] = set()
    query_stats: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    request_count = 1

    for coll in collections:
        index_id = str(coll["id"])
        for pattern in patterns:
            stat: dict[str, Any] = {
                "collection": index_id,
                "pattern": pattern,
                "pages_reported": None,
                "pages_requested": 0,
                "pages_ok": 0,
                "records_seen": 0,
                "ids_seen": 0,
                "truncated": False,
            }
            try:
                count_url = build_index_url(index_id, pattern, showNumPages="true")
                raw_count = http_get_json(count_url, args.user_agent, args.timeout)
                request_count += 1
                pages = parse_page_count(raw_count)
                stat["pages_reported"] = pages
                limit = min(pages, args.max_pages_per_query)
                stat["truncated"] = pages > limit
                time.sleep(args.sleep_seconds)

                ids_this_query: set[str] = set()
                for page in range(limit):
                    url = build_index_url(index_id, pattern, page=page, fl="url,timestamp,status,mime")
                    stat["pages_requested"] += 1
                    try:
                        raw = http_get_text(url, args.user_agent, args.timeout)
                        request_count += 1
                        stat["pages_ok"] += 1
                    except Exception as exc:
                        errors.append({
                            "collection": index_id,
                            "pattern": pattern,
                            "page": page,
                            "error": f"{type(exc).__name__}: {exc}",
                        })
                        time.sleep(args.sleep_seconds)
                        continue

                    for rec in parse_json_lines(raw):
                        stat["records_seen"] += 1
                        indexed_url = str(rec.get("url", ""))
                        match = AVITO_ID_RE.search(indexed_url)
                        if not match:
                            continue
                        listing_id = match.group(1)
                        ids_this_query.add(listing_id)
                        key = (listing_id, index_id, indexed_url)
                        if key in seen_evidence:
                            continue
                        seen_evidence.add(key)
                        evidence_by_id[listing_id].append({
                            "source": "commoncrawl_cdxj",
                            "collection": index_id,
                            "timestamp": rec.get("timestamp"),
                            "status": rec.get("status"),
                            "mime": rec.get("mime"),
                            "indexed_url": indexed_url,
                        })
                    time.sleep(args.sleep_seconds)
                stat["ids_seen"] = len(ids_this_query)
            except Exception as exc:
                stat["error"] = f"{type(exc).__name__}: {exc}"
                errors.append({
                    "collection": index_id,
                    "pattern": pattern,
                    "stage": "showNumPages",
                    "error": stat["error"],
                })
            query_stats.append(stat)
            time.sleep(args.sleep_seconds)

    discovered_ids = set(evidence_by_id)
    overlap = discovered_ids & baseline_ids
    net_new = discovered_ids - baseline_ids
    union = baseline_ids | discovered_ids

    records_path = args.output / "commoncrawl_records.jsonl"
    with records_path.open("w", encoding="utf-8") as f:
        for listing_id in sorted(discovered_ids, key=int):
            item = {
                "source_id": listing_id,
                "in_kaynly_baseline": listing_id in baseline_ids,
                "baseline_record": baseline_records.get(listing_id),
                "evidence": evidence_by_id[listing_id],
            }
            f.write(json.dumps(item, ensure_ascii=False, sort_keys=True) + "\n")

    write_lines(args.output / "baseline_ids.txt", sorted(baseline_ids, key=int))
    write_lines(args.output / "commoncrawl_ids.txt", sorted(discovered_ids, key=int))
    write_lines(args.output / "overlap_ids.txt", sorted(overlap, key=int))
    write_lines(args.output / "net_new_ids.txt", sorted(net_new, key=int))
    write_lines(args.output / "union_ids.txt", sorted(union, key=int))

    by_collection: Counter[str] = Counter()
    for evidences in evidence_by_id.values():
        for coll_id in {str(e["collection"]) for e in evidences}:
            by_collection[coll_id] += 1

    any_truncation = any(bool(x.get("truncated")) for x in query_stats)
    summary = {
        "generated_at": utc_now(),
        "status": "completed_with_limits" if any_truncation or errors else "completed",
        "source": "Common Crawl CDXJ URL Index",
        "discovery_surface": "index.commoncrawl.org",
        "safety": {
            "direct_avito_requests": 0,
            "avito_content_fetched": False,
            "only_commoncrawl_index_queried": True,
        },
        "baseline": {
            "source": "Kaynly -> Avito proof",
            "unique_avito_ids": len(baseline_ids),
            "path": str(args.baseline),
        },
        "collections": [str(x["id"]) for x in collections],
        "patterns": list(patterns),
        "limits": {
            "collections_requested": args.collections,
            "max_pages_per_query": args.max_pages_per_query,
            "sleep_seconds": args.sleep_seconds,
            "truncated": any_truncation,
            "exhaustive_claim": False,
        },
        "requests_to_commoncrawl": request_count,
        "discovered_unique_avito_ids": len(discovered_ids),
        "overlap_with_kaynly": len(overlap),
        "net_new_vs_kaynly": len(net_new),
        "union_unique_avito_ids": len(union),
        "gain_vs_kaynly_pct": round((len(net_new) / len(baseline_ids)) * 100, 4),
        "by_collection_unique_ids": dict(sorted(by_collection.items(), reverse=True)),
        "query_stats": query_stats,
        "errors": errors,
    }
    summary_path = args.output / "summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    proof_files = sorted(p for p in args.output.iterdir() if p.is_file() and p.name != "SHA256SUMS")
    sums = args.output / "SHA256SUMS"
    sums.write_text("".join(f"{sha256(p)}  {p.name}\n" for p in proof_files), encoding="utf-8")

    print(json.dumps({
        "baseline": len(baseline_ids),
        "commoncrawl": len(discovered_ids),
        "overlap": len(overlap),
        "net_new": len(net_new),
        "union": len(union),
        "truncated": any_truncation,
        "errors": len(errors),
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
