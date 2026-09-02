#!/usr/bin/env python3
"""Deterministic zero-write URL triage for Morocco Web L8.

Classifies discovery_candidates into URL-level buckets before any network fetch or DB mutation:
- listing_detail_candidate
- discovery_page
- obvious_noise
- uncertain

This is deliberately conservative. It reuses known listing-detail patterns and refuses to
promote ambiguous category/search URLs or known non-Moroccan sources to listing candidates.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

DETAIL_PATTERNS = [
    re.compile(r"/fr/(?:a|pa)/\d+(?:/|$)", re.I),
    re.compile(r"/annonce/\d+(?:/|$)", re.I),
    re.compile(r"/biens?/\d+(?:/|$)", re.I),
    re.compile(r"/(?:property|bien)/[^/?#]+/?$", re.I),
    re.compile(r"/plp/(?:louer|acheter|vente|location)/[^/?#]*-\d+\.html$", re.I),
    re.compile(r"/immobilier-neuf-maroc/.+immobilier-neuf-\d+/?$", re.I),
    re.compile(r"/[^/]+/[^/]+/[^/]+_\d+\.htm$", re.I),
]

DISCOVERY_PATTERNS = [
    re.compile(r"/(?:search|recherche|acheter|louer|location|vente)(?:/|$)", re.I),
    re.compile(r"/(?:category|categorie|area|all-properties)(?:/|$)", re.I),
    re.compile(r"/(?:cd|ct|sd|st)/", re.I),
    re.compile(r"/(?:prix-immobilier-maroc|immo)(?:/|$)", re.I),
    re.compile(r"sitemap.*\.xml$", re.I),
]

NOISE_HOSTS = {
    "youtube.com", "www.youtube.com", "tiktok.com", "www.tiktok.com",
    "reddit.com", "www.reddit.com", "support.google.com",
    # Observed non-Moroccan .com real-estate sources in the production corpus.
    "ouedkniss.com", "www.ouedkniss.com", "bakimmo-dz.com", "www.bakimmo-dz.com",
}
NON_MOROCCAN_COUNTRY_TLDS = (".dz", ".tn")


def triage_url(url: str) -> str:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    path = parsed.path or "/"
    if parsed.scheme not in {"http", "https"} or not host:
        return "obvious_noise"
    if host in NOISE_HOSTS or host.endswith(NON_MOROCCAN_COUNTRY_TLDS):
        return "obvious_noise"
    if any(p.search(path) for p in DETAIL_PATTERNS):
        return "listing_detail_candidate"
    if any(p.search(path) for p in DISCOVERY_PATTERNS):
        return "discovery_page"
    return "uncertain"


def classify_rows(rows: list[dict]) -> dict:
    counts = {"listing_detail_candidate": 0, "discovery_page": 0, "obvious_noise": 0, "uncertain": 0}
    classified = []
    for row in rows:
        url = str(row.get("canonical_url") or row.get("source_url") or "")
        bucket = triage_url(url)
        counts[bucket] += 1
        classified.append({"source_domain": row.get("source_domain"), "url": url, "bucket": bucket})
    return {"counts": counts, "classified": classified, "zeroDbWrites": True}
