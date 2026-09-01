#!/usr/bin/env python3
"""Bounded public Moroccan real-estate domain discovery via Common Crawl URL Index.

Uses the public Parquet URL Index for broad analytical filtering, then validates
ranked domains against ordinary public robots/sitemaps/pages. No DB writes.
"""

from __future__ import annotations

import gzip
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

COLLECTIONS_URL = "https://index.commoncrawl.org/collinfo.json"
DATA_ROOT = "https://data.commoncrawl.org/"
USER_AGENT = "AkarFinder-public-index/4.1 (+https://akarfinder.ma)"
TIMEOUT_SECONDS = 20
TOP_DOMAINS = 12
SEEDS_PER_DOMAIN = 8
MAX_SITEMAPS_PER_DOMAIN = 3

KNOWN_HOSTS = {
    "avito.ma", "www.avito.ma",
    "mubawab.ma", "www.mubawab.ma",
    "sarouty.ma", "www.sarouty.ma",
    "agenz.ma", "www.agenz.ma",
    "marocannonces.com", "www.marocannonces.com",
}

HOST_STRONG_RE = re.compile(r"(?:immo|immobilier|property|realestate)", re.I)
PROPERTY_TOKEN_RE = re.compile(
    r"(?:^|[^a-z0-9])"
    r"(?:immo|immobilier(?:e|es|s)?|appart(?:ement|ements)?|studio(?:s)?|"
    r"villa(?:s)?|terrain(?:s)?|maison(?:s)?|riad(?:s)?|residence(?:s)?|"
    r"property|properties|realestate)"
    r"(?:$|[^a-z0-9])",
    re.I,
)


@dataclass(frozen=True)
class FetchResult:
    status: int
    final_url: str
    content_type: str
    body: bytes
    classification: str


def _request(url: str, accept: str = "*/*") -> FetchResult:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": accept, "Accept-Language": "fr-MA,fr;q=0.9,en;q=0.5"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read()
            status = int(getattr(response, "status", 200))
            content_type = response.headers.get("content-type", "")
            final_url = response.geturl()
            classification = "ok" if 200 <= status < 300 else f"http_{status}"
            return FetchResult(status, final_url, content_type, body, classification)
    except urllib.error.HTTPError as exc:
        body = exc.read() if hasattr(exc, "read") else b""
        return FetchResult(exc.code, url, exc.headers.get("content-type", "") if exc.headers else "", body, f"http_{exc.code}")
    except TimeoutError:
        return FetchResult(0, url, "", b"", "timeout")
    except Exception as exc:  # network/DNS classification only, never guessed as success
        return FetchResult(0, url, "", str(exc).encode("utf-8", errors="replace"), "network_error")


def latest_crawl(collections: object) -> str | None:
    if not isinstance(collections, list):
        return None
    for item in collections:
        if not isinstance(item, dict):
            continue
        crawl_id = str(item.get("id", ""))
        if re.fullmatch(r"CC-MAIN-\d{4}-\d{2}", crawl_id):
            return crawl_id
    return None


def strict_property_url(url: str) -> bool:
    try:
        parsed = urllib.parse.urlsplit(url)
    except Exception:
        return False
    host = (parsed.hostname or "").lower()
    if HOST_STRONG_RE.search(host):
        return True
    path_query = urllib.parse.unquote(f"{parsed.path} {parsed.query}").lower()
    return bool(PROPERTY_TOKEN_RE.search(path_query))


def rank_rows(rows: Iterable[dict]) -> list[dict]:
    ranked: list[dict] = []
    for row in rows:
        host = str(row.get("host") or "").lower().rstrip(".")
        if not host.endswith(".ma") or host in KNOWN_HOSTS:
            continue
        raw_urls = row.get("seed_urls") or []
        urls = sorted({str(url) for url in raw_urls if url and strict_property_url(str(url))})[:SEEDS_PER_DOMAIN]
        if not urls:
            continue
        url_count = int(row.get("url_count") or len(urls))
        host_bonus = 10 if HOST_STRONG_RE.search(host) else 0
        ranked.append({
            "host": host,
            "url_count": url_count,
            "seed_urls": urls,
            "score": min(url_count, 100) + host_bonus,
        })
    ranked.sort(key=lambda item: (-item["score"], -item["url_count"], item["host"]))
    return ranked


def _manifest_urls(crawl: str) -> list[str]:
    manifest_url = f"{DATA_ROOT}crawl-data/{crawl}/cc-index-table.paths.gz"
    result = _request(manifest_url, "application/gzip,application/octet-stream")
    if result.classification != "ok":
        raise RuntimeError(f"manifest:{result.classification}")
    try:
        text = gzip.decompress(result.body).decode("utf-8")
    except Exception as exc:
        raise RuntimeError("manifest:schema_drift") from exc
    paths = [line.strip() for line in text.splitlines() if line.strip() and "/subset=warc/" in line]
    if not paths:
        raise RuntimeError("manifest:no_warc_parquet_paths")
    return [DATA_ROOT + item.lstrip("/") for item in paths]


def query_url_index(crawl: str) -> tuple[list[dict], dict]:
    """Query the official columnar URL Index using DuckDB HTTP range reads."""
    try:
        import duckdb  # type: ignore
    except ImportError as exc:
        raise RuntimeError("duckdb_not_installed") from exc

    files = _manifest_urls(crawl)
    con = duckdb.connect(database=":memory:")
    con.execute("INSTALL httpfs")
    con.execute("LOAD httpfs")
    con.execute("SET threads=2")
    con.execute("SET enable_object_cache=true")
    con.execute("SET http_retries=2")
    con.execute("SET http_retry_wait_ms=500")

    file_list = "[" + ",".join("'" + item.replace("'", "''") + "'" for item in files) + "]"
    known = ",".join("'" + item.replace("'", "''") + "'" for item in sorted(KNOWN_HOSTS))
    property_regex = r"(^|[/_.-])(immo|immobilier|immobiliere|appart|appartement|studio|villa|terrain|maison|riad|residence)([/_.-]|$)"
    host_regex = r"(immo|immobilier|property|realestate)"

    sql = f"""
        SELECT
            lower(url_host_name) AS host,
            count(*) AS url_count,
            list_slice(list(DISTINCT url ORDER BY url), 1, {SEEDS_PER_DOMAIN}) AS seed_urls
        FROM read_parquet({file_list}, hive_partitioning=true)
        WHERE url_host_tld = 'ma'
          AND fetch_status = 200
          AND lower(coalesce(content_mime_type, '')) LIKE 'text/html%'
          AND lower(url_host_name) NOT IN ({known})
          AND (
            regexp_matches(lower(url_host_name), '{host_regex}')
            OR regexp_matches(lower(coalesce(url_path, '')), '{property_regex}')
          )
        GROUP BY 1
        HAVING count(*) >= 2
        ORDER BY url_count DESC, host ASC
        LIMIT 200
    """
    rows = con.execute(sql).fetchdf().to_dict("records")
    evidence = {
        "manifestUrl": f"{DATA_ROOT}crawl-data/{crawl}/cc-index-table.paths.gz",
        "parquetFileCount": len(files),
        "rawDomainCount": len(rows),
        "queryEngine": "duckdb-httpfs",
        "queryMode": "columnar-url-index",
    }
    return rows, evidence


def _parse_robots_sitemaps(text: str, host: str) -> list[str]:
    found: set[str] = set()
    for line in text.splitlines():
        match = re.match(r"^\s*sitemap\s*:\s*(\S+)", line, re.I)
        if not match:
            continue
        value = match.group(1).strip()
        try:
            parsed = urllib.parse.urlsplit(value)
        except Exception:
            continue
        if parsed.scheme == "https" and (parsed.hostname or "").lower() == host:
            found.add(value)
    return sorted(found)


def _xml_locs(body: bytes) -> list[str]:
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return []
    values: list[str] = []
    for element in root.iter():
        if element.tag.lower().endswith("loc") and element.text:
            values.append(element.text.strip())
    return values


def validate_domain(domain: dict) -> tuple[dict, list[dict]]:
    host = domain["host"]
    requests: list[dict] = []
    sitemap_candidates: set[str] = set()
    probe_candidates: set[str] = set()
    queue: list[str] = []
    seen: set[str] = set()

    robots_url = f"https://{host}/robots.txt"
    robots = _request(robots_url, "text/plain,*/*;q=0.5")
    requests.append({"url": robots_url, "role": "robots", "status": robots.status, "classification": robots.classification})
    if robots.classification == "http_429":
        return {"host": host, "validated": False, "stoppedEarly": "http_429", "sitemapCandidateCount": 0, "probeOkCount": 0, "candidateUrls": []}, requests
    if robots.classification == "ok":
        queue.extend(_parse_robots_sitemaps(robots.body.decode("utf-8", errors="replace"), host))
    queue.extend([f"https://{host}/sitemap.xml", f"https://{host}/sitemap_index.xml"])

    while queue and len(seen) < MAX_SITEMAPS_PER_DOMAIN:
        sitemap_url = queue.pop(0)
        if sitemap_url in seen:
            continue
        seen.add(sitemap_url)
        response = _request(sitemap_url, "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.5")
        requests.append({"url": sitemap_url, "role": "sitemap", "status": response.status, "classification": response.classification})
        if response.classification == "http_429":
            return {"host": host, "validated": False, "stoppedEarly": "http_429", "sitemapCandidateCount": len(sitemap_candidates), "probeOkCount": len(probe_candidates), "candidateUrls": []}, requests
        if response.classification != "ok":
            continue
        for value in _xml_locs(response.body):
            try:
                parsed = urllib.parse.urlsplit(value)
            except Exception:
                continue
            if parsed.scheme != "https" or (parsed.hostname or "").lower() != host:
                continue
            if parsed.path.lower().endswith(".xml") and len(seen) + len(queue) < MAX_SITEMAPS_PER_DOMAIN:
                queue.append(value)
            elif strict_property_url(value):
                sitemap_candidates.add(value)

    for seed_url in domain["seed_urls"][:2]:
        if not strict_property_url(seed_url):
            continue
        response = _request(seed_url, "text/html,*/*;q=0.5")
        requests.append({"url": seed_url, "role": "seed-probe", "status": response.status, "classification": response.classification})
        if response.classification == "http_429":
            return {"host": host, "validated": False, "stoppedEarly": "http_429", "sitemapCandidateCount": len(sitemap_candidates), "probeOkCount": len(probe_candidates), "candidateUrls": []}, requests
        if response.classification == "ok" and "text/html" in response.content_type.lower():
            probe_candidates.add(response.final_url or seed_url)

    validated = (
        len(sitemap_candidates) >= 3
        or len(probe_candidates) >= 2
        or (len(sitemap_candidates) >= 1 and len(probe_candidates) >= 1)
    )
    candidates = sorted(sitemap_candidates | probe_candidates) if validated else []
    return {
        "host": host,
        "validated": validated,
        "stoppedEarly": None,
        "sitemapCandidateCount": len(sitemap_candidates),
        "probeOkCount": len(probe_candidates),
        "candidateUrls": candidates,
    }, requests


def run() -> int:
    report_dir = Path("artifacts/morocco-web-l3-commoncrawl")
    report_dir.mkdir(parents=True, exist_ok=True)
    report: dict = {
        "strategy": "columnar-url-index-domain-first",
        "zeroDbWrites": True,
        "stoppedEarly": None,
        "success": False,
    }

    collections_result = _request(COLLECTIONS_URL, "application/json")
    report["collectionsRequest"] = {"status": collections_result.status, "classification": collections_result.classification}
    if collections_result.classification != "ok":
        report["stoppedEarly"] = collections_result.classification
        return _finish(report_dir, report, 2)

    try:
        collections = json.loads(collections_result.body)
    except json.JSONDecodeError:
        report["stoppedEarly"] = "schema_drift:collections"
        return _finish(report_dir, report, 2)
    crawl = latest_crawl(collections)
    report["crawl"] = crawl
    if not crawl:
        report["stoppedEarly"] = "schema_drift:no_crawl"
        return _finish(report_dir, report, 2)

    try:
        rows, query_evidence = query_url_index(crawl)
    except Exception as exc:
        report["stoppedEarly"] = f"url_index:{type(exc).__name__}:{exc}"
        return _finish(report_dir, report, 2)

    ranked = rank_rows(rows)[:TOP_DOMAINS]
    report["queryEvidence"] = query_evidence
    report["rankedDomainCount"] = len(ranked)
    report["topDomains"] = [{"host": item["host"], "score": item["score"], "urlCount": item["url_count"]} for item in ranked]

    validated: list[dict] = []
    candidate_urls: set[str] = set()
    validation_requests: list[dict] = []
    for domain in ranked:
        evidence, requests = validate_domain(domain)
        validation_requests.extend(requests)
        if evidence["validated"]:
            validated.append(evidence)
            candidate_urls.update(evidence["candidateUrls"])
        if evidence["stoppedEarly"] == "http_429":
            report["stoppedEarly"] = f"http_429:{domain['host']}"
            break

    report["validatedDomainCount"] = len(validated)
    report["validatedDomains"] = [item["host"] for item in validated]
    report["validationEvidence"] = validated
    report["validationRequestCount"] = len(validation_requests)
    report["candidateUrlCount"] = len(candidate_urls)
    report["sample"] = sorted(candidate_urls)[:100]
    report["success"] = bool(
        report["zeroDbWrites"]
        and not str(report.get("stoppedEarly") or "").startswith("http_429")
        and report["rankedDomainCount"] >= 3
        and report["validatedDomainCount"] >= 3
        and report["candidateUrlCount"] >= 20
    )
    return _finish(report_dir, report, 0 if report["success"] else 2)


def _finish(report_dir: Path, report: dict, exit_code: int) -> int:
    (report_dir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = [
        "# L3 Common Crawl URL Index domain discovery",
        "",
        f"- Success: **{'YES' if report.get('success') else 'NO'}**",
        f"- Strategy: **{report.get('strategy', 'unknown')}**",
        f"- Crawl: **{report.get('crawl', 'none')}**",
        f"- Ranked net-new domains: **{report.get('rankedDomainCount', 0)}**",
        f"- Live-validated domains: **{report.get('validatedDomainCount', 0)}**",
        f"- Candidate URLs: **{report.get('candidateUrlCount', 0)}**",
        f"- Zero DB writes: **{report.get('zeroDbWrites', False)}**",
        f"- Early stop: **{report.get('stoppedEarly') or 'none'}**",
    ]
    for item in report.get("topDomains", []):
        lines.append(f"- {item['host']} — score {item['score']} — {item['urlCount']} indexed URLs")
    (report_dir / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return exit_code


if __name__ == "__main__":
    sys.exit(run())
