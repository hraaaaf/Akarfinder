"""Bounded robots-aware public detail-HTML canary from offline source URLs.

No auth, bypass, proxy rotation, database, product publication, or raw export.
Each run writes a new private directory and an aggregate manifest.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict, deque
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit, unquote
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

UA = "AkarFinder-Q1F-Research/0.1 (bounded parser QA)"
MAX_BYTES = 3_000_000
MIN_DELAY_SECONDS = 3.0
DETAIL_PATHS = {
    "domio.ma": re.compile(r"^/fr/[^/]+/(?:vendre|louer)/[^/]+/\d+/[^/]+/?$", re.I),
    "agenz.ma": re.compile(r"^/fr/annonces/immo-[^/]+/(?:vente|location)-[^/]+/[^/]+/\d+/?$", re.I),
    "avito.ma": re.compile(r"^/fr/[^/]+/[^/]+/[^/]+_\d+\.htm$", re.I),
    "mubawab.ma": re.compile(r"^/fr/a/\d+/[^/]+/?$", re.I),
    "sarouty.ma": re.compile(r"^/plp/(?:acheter|louer)/[^/]+-\d+\.html$", re.I),
    "mouldar.com": re.compile(r"^/(?:fr|en)/[^/]+/[^/]+/[^/]+/[^/]+/[0-9a-f]{8}/?$", re.I),
    "barnes-marrakech.com": re.compile(r"^/fr/(?:vente|location)/[^/]+/\d+/?$", re.I),
    "marrakechrealty.com": re.compile(r"^/(?:vente|location)/[^/]+/?$", re.I),
}
def fingerprint(url: str) -> tuple[str, str] | None:
    try:
        p = urlsplit(url)
        host = (p.hostname or "").lower().removeprefix("www.")
        if p.scheme != "https" or p.username or p.password or p.port not in (None, 443):
            return None
        if host not in DETAIL_PATHS:
            return None
        decoded = unquote(p.path)
        if not DETAIL_PATHS[host].fullmatch(decoded):
            return None
        return (host, decoded.casefold().rstrip("/"))
    except (ValueError, TypeError):
        return None

def existing_fingerprints(root: Path) -> set[tuple[str, str]]:
    found = set()
    if not root.exists():
        return found
    for sidecar in root.rglob("*.html.meta.json"):
        try:
            data = json.loads(sidecar.read_text(encoding="utf-8"))
            key = fingerprint(data.get("source_url", ""))
            if key:
                found.add(key)
        except (OSError, ValueError, TypeError):
            continue
    return found

def candidates_from_structured(path: Path, already: set[tuple[str, str]]) -> dict[str, deque[str]]:
    candidate = defaultdict(list)
    with gzip.open(path, "rt", encoding="utf-8") as stream:
        for line in stream:
            r = json.loads(line)
            source = r.get("source") or {}
            url = source.get("source_url") or ""
            key = fingerprint(url)
            if key and key not in already:
                already.add(key)
                candidate[key[0]].append(url)
    return {name: deque(urls) for name, urls in candidate.items()}

def robots(host: str) -> RobotFileParser:
    req = Request("https://" + host + "/robots.txt", headers={"User-Agent": UA})
    with urlopen(req, timeout=18) as response:
        if response.status != 200:
            raise ValueError("ROBOTS_HTTP_NON_200")
        contents = response.read(300_001)
    if len(contents) > 300_000:
        raise ValueError("ROBOTS_TOO_LARGE")
    rules = RobotFileParser()
    rules.parse(contents.decode("utf-8", "replace").splitlines())
    return rules

def check_detail_markup(text: str, host: str) -> None:
    """A 200 response is not proof of an actual detail page (soft-404 / SPA)."""
    if len(text.encode("utf-8")) < 1500 or not re.search(
        r"<(?:html|!doctype\s+html)\b", text[:3000], re.I
    ):
        raise ValueError("NOT_LISTING_HTML")
    head = text[:250000]
    title_match = re.search(r"<title[^>]*>(.*?)</title>", head, re.I | re.S)
    og_match = re.search(
        r"""<meta\b(?=[^>]*(?:name|property)\s*=\s*['"]og:title['"])[^>]*\bcontent\s*=\s*['"]([^'"]*)""",
        head, re.I
    )
    titles = [m.group(1).strip().lower() for m in (title_match, og_match) if m]
    if any(re.search(r"^(?:page introuvable\b|page not found\b|404\b|not found\b)",
                     value) for value in titles):
        raise ValueError("SOFT_404_HTML")
    if host == "mouldar.com" and "RealEstateListing" not in text:
        if not titles or all(value in ("mouldar", "mouldar.ma", "mouldar immobilier") for value in titles):
            raise ValueError("GENERIC_APP_SHELL")
    if not (re.search(r"<meta\b[^>]*(?:og:title|description)", head, re.I)
            or re.search(r"<h1\b", text, re.I)
            or "RealEstateListing" in text):
        raise ValueError("NO_LISTING_MARKER")


def fetch_detail(url: str, host: str) -> tuple[bytes, str]:
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(req, timeout=24) as response:
        final_url = response.url
        if response.status != 200:
            raise ValueError("HTTP_NON_200")
        if fingerprint(final_url) is None or fingerprint(final_url)[0] != host:
            raise ValueError("REDIRECT_OUTSIDE_DETAIL")
        if "text/html" not in response.headers.get("content-type", "").lower():
            raise ValueError("NON_HTML")
        contents = response.read(MAX_BYTES + 1)
    if len(contents) > MAX_BYTES:
        raise ValueError("HTML_TOO_LARGE")
    text = contents.decode("utf-8")
    check_detail_markup(text, host)
    return contents, final_url

def capture(source: Path, previous: Path, destination: Path, *, max_new: int,
            max_per_domain: int, delay_seconds: float = MIN_DELAY_SECONDS,
            allowed_domains: tuple[str, ...] | None = None) -> dict:
    if not (1 <= max_new <= 100 and 1 <= max_per_domain <= 30):
        raise ValueError("INVALID_BATCH_BOUNDS")
    if delay_seconds < MIN_DELAY_SECONDS:
        raise ValueError("RATE_LIMIT_UNSAFE")
    if allowed_domains is not None and (
        not allowed_domains or any(domain not in DETAIL_PATHS for domain in allowed_domains)
    ):
        raise ValueError("INVALID_DOMAIN_ALLOWLIST")
    if destination.exists():
        raise FileExistsError("NEVER_OVERWRITE_PRIVATE_CANARY")
    previously_seen = existing_fingerprints(previous)
    candidates = candidates_from_structured(source, set(previously_seen))
    if allowed_domains is not None:
        candidates = {domain: urls for domain, urls in candidates.items()
                      if domain in allowed_domains}
    destination.mkdir(parents=True)
    counts = Counter()
    counts["known_original_details"] = len(previously_seen)
    counts["eligible_historical_urls"] = sum(len(x) for x in candidates.values())
    per_domain = Counter()
    errors = defaultdict(Counter)
    rules = {}
    blocked = set()
    for host in candidates:
        try:
            rules[host] = robots(host)
        except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
            errors[host]["ROBOTS_" + type(exc).__name__] += 1
            blocked.add(host)
    hosts = deque(sorted(candidates))
    while hosts and counts["captured"] < max_new:
        host = hosts.popleft()
        if host in blocked or per_domain[host] >= max_per_domain:
            continue
        if not candidates[host]:
            continue
        url = candidates[host].popleft()
        if candidates[host]:
            hosts.append(host)
        if not rules[host].can_fetch(UA, url):
            errors[host]["ROBOTS_DENIED"] += 1
            continue
        time.sleep(max(delay_seconds, float(rules[host].crawl_delay(UA) or 0)))
        counts["network_detail_attempts"] += 1
        try:
            payload, resolved_url = fetch_detail(url, host)
            if not rules[host].can_fetch(UA, resolved_url):
                errors[host]["REDIRECT_ROBOTS_DENIED"] += 1
                continue
            key = fingerprint(resolved_url)
            if key in previously_seen:
                errors[host]["DUPLICATE_RESOLVED_DETAIL"] += 1
                continue
            previously_seen.add(key)
            folder = destination / "pages" / host
            folder.mkdir(parents=True, exist_ok=True)
            num = per_domain[host] + 1
            page = folder / f"capture_{num:04d}.html"
            if page.exists():
                raise FileExistsError("OUTPUT_FILE_EXISTS")
            page.write_bytes(payload)
            sidecar = {
                "source_url": resolved_url,
                "original_url": url,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "http_status": 200,
                "html_sha256": hashlib.sha256(payload).hexdigest(),
            }
            (folder / (page.name + ".meta.json")).write_text(
                json.dumps(sidecar, ensure_ascii=False, sort_keys=True, indent=2),
                encoding="utf-8")
            per_domain[host] += 1
            counts["captured"] += 1
        except HTTPError as exc:
            errors[host]["HTTP_" + str(exc.code)] += 1
            if exc.code in (401, 403, 429):
                blocked.add(host)
        except (URLError, TimeoutError, UnicodeError, OSError, ValueError) as exc:
            errors[host][type(exc).__name__ if not isinstance(exc, ValueError)
                         else str(exc)] += 1
    result = {
        "captured": counts["captured"],
        "known_original_details": counts["known_original_details"],
        "eligible_historical_urls": counts["eligible_historical_urls"],
        "network_detail_attempts": counts["network_detail_attempts"],
        "per_domain": dict(per_domain),
        "allowed_domains": list(allowed_domains) if allowed_domains is not None else None,
        "errors": {host: dict(errs) for host, errs in errors.items()},
        "blocked_domains": sorted(blocked),
        "safety": {"db_writes": 0, "no_auth_or_bypass": True, "no_publication": True,
                   "min_delay_seconds": delay_seconds},
    }
    (destination / "capture_report.json").write_text(
        json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2),
        encoding="utf-8")
    return result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--structured", type=Path, required=True)
    ap.add_argument("--existing-inbox", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--max-new", type=int, default=20)
    ap.add_argument("--max-per-domain", type=int, default=8)
    ap.add_argument("--delay-seconds", type=float, default=MIN_DELAY_SECONDS)
    ap.add_argument("--domains", help="Comma-separated allowlist from known detail hosts")
    args = ap.parse_args()
    allowlist = tuple(sorted(set(x.strip() for x in args.domains.split(",") if x.strip()))) if args.domains else None
    print(json.dumps(capture(args.structured, args.existing_inbox, args.out,
                             max_new=args.max_new, max_per_domain=args.max_per_domain,
                             delay_seconds=args.delay_seconds,
                             allowed_domains=allowlist), sort_keys=True))
if __name__ == "__main__":
    main()
