#!/usr/bin/env python3
"""Bounded public-only L4 dry-run. Discovers/fetches a tiny cross-source sample.

No credentials, no private APIs, no DB writes, no block evasion.
"""

from __future__ import annotations

import json
import pathlib
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict

import canonical_listing_extractor as extractor

OUT_DIR = pathlib.Path("artifacts/morocco-web-l4-canonical")
USER_AGENT = "AkarFinder-L4-PublicDryRun/1.0"
TIMEOUT = 15
MAX_BYTES = 2_500_000


@dataclass
class FetchEvidence:
    url: str
    status: int | None
    classification: str
    bytes: int


def fetch_text(url: str) -> tuple[str | None, FetchEvidence]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ssl.create_default_context()) as response:
            status = int(getattr(response, "status", 200))
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                return None, FetchEvidence(url, status, "oversize", len(body))
            content_type = str(response.headers.get("content-type", "")).lower()
            if status == 429:
                return None, FetchEvidence(url, status, "http_429", len(body))
            if status >= 400:
                return None, FetchEvidence(url, status, f"http_{status}", len(body))
            if "html" not in content_type:
                return None, FetchEvidence(url, status, "non_html", len(body))
            return body.decode("utf-8", errors="replace"), FetchEvidence(url, status, "ok", len(body))
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        return None, FetchEvidence(url, status, "http_429" if status == 429 else f"http_{status}", 0)
    except urllib.error.URLError as exc:
        return None, FetchEvidence(url, None, f"network:{type(exc.reason).__name__}", 0)
    except TimeoutError:
        return None, FetchEvidence(url, None, "timeout", 0)


def first_match(base_url: str, html: str, pattern: re.Pattern[str]) -> str | None:
    match = pattern.search(html)
    if not match:
        return None
    return urllib.parse.urljoin(base_url, match.group(1))


def discover_portal_sample() -> tuple[list[str], list[FetchEvidence], str | None]:
    requests: list[FetchEvidence] = []
    out: list[str] = []
    stopped = None
    discovery_specs = [
        (
            "https://www.mubawab.ma/fr/cc/immobilier-a-vendre",
            re.compile(r'href=["\']([^"\']*/fr/(?:a|pa)/\d+/[^"\']+)["\']', re.I),
        ),
        (
            "https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements.html",
            re.compile(r'href=["\']([^"\']*/annonce/\d+/[^"\']+\.html)["\']', re.I),
        ),
    ]
    for url, pattern in discovery_specs:
        html, evidence = fetch_text(url)
        requests.append(evidence)
        if evidence.classification == "http_429":
            stopped = "http_429"
            break
        if html:
            sample = first_match(url, html, pattern)
            if sample:
                out.append(sample)
    return out, requests, stopped


def main() -> int:
    static_urls = [
        "https://leaderimmo.ma/biens/10/appartement-a-vendre-a-temara-",
        "https://immobest.ma/bien/a-dar-bouazza-villa-a-vendre-proche-rocade-4-ch/",
        "https://www.immoworld.ma/fr/property/luxury-villa-for-sale-tangier-private-pool",
    ]
    portal_urls, requests, stopped = discover_portal_sample()
    targets = static_urls + portal_urls
    results = []

    if stopped != "http_429":
        for url in targets:
            html, evidence = fetch_text(url)
            requests.append(evidence)
            if evidence.classification == "http_429":
                stopped = "http_429"
                break
            if html is None:
                results.append({"source_url": url, "page_kind": "fetch_failed", "fields": {}, "fetch": asdict(evidence)})
                continue
            extracted = extractor.extract_canonical(url, html)
            extracted["fetch"] = asdict(evidence)
            results.append(extracted)

    listing_results = [item for item in results if item.get("page_kind") == "listing_detail"]
    typed = [item for item in listing_results if "classification.property_type" in item.get("fields", {})]
    transacted = [item for item in listing_results if "offer.transaction_type" in item.get("fields", {})]
    rich = [item for item in listing_results if ("offer.price_amount" in item.get("fields", {}) or "surfaces.surface_total_m2" in item.get("fields", {}))]

    report = {
        "strategy": "bounded-public-cross-source-canonical-extraction",
        "zeroDbWrites": True,
        "stoppedEarly": stopped,
        "targetCount": len(targets),
        "portalDiscoveredCount": len(portal_urls),
        "listingDetailCount": len(listing_results),
        "propertyTypeCount": len(typed),
        "transactionCount": len(transacted),
        "priceOrSurfaceCount": len(rich),
        "requests": [asdict(item) for item in requests],
        "results": results,
    }
    report["success"] = bool(
        stopped is None
        and len(listing_results) >= 3
        and len(typed) >= 3
        and len(transacted) >= 3
        and len(rich) >= 2
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = [
        "# Morocco Web L4 Canonical Extraction Dry Run",
        "",
        f"- success: {report['success']}",
        f"- zeroDbWrites: {report['zeroDbWrites']}",
        f"- stoppedEarly: {report['stoppedEarly']}",
        f"- targets: {report['targetCount']}",
        f"- portal discovered: {report['portalDiscoveredCount']}",
        f"- listing details: {report['listingDetailCount']}",
        f"- property types: {report['propertyTypeCount']}",
        f"- transactions: {report['transactionCount']}",
        f"- price or surface: {report['priceOrSurfaceCount']}",
    ]
    (OUT_DIR / "report.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in report if key not in {"requests", "results"}}, indent=2))
    return 0 if report["success"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
