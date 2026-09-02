#!/usr/bin/env python3
"""Conservative deterministic cross-source dedupe for canonical listing records.

No DB writes. Keeps all source URLs/provenance and refuses merges on strong contradictions.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import isclose
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode


def canonicalize_url(url: str | None) -> str | None:
    if not url:
        return None
    p = urlsplit(url.strip())
    host = p.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = p.path.rstrip("/") or "/"
    query = urlencode(sorted((k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if not k.lower().startswith("utm_")))
    return urlunsplit((p.scheme.lower() or "https", host, path, query, ""))


def _v(record: dict, key: str):
    value = record.get(key)
    if isinstance(value, dict) and "value" in value:
        return value.get("value")
    return value


def _norm_text(value):
    return " ".join(str(value or "").strip().lower().split()) or None


def _relative_diff(a, b):
    if a in (None, 0) or b in (None, 0):
        return None
    return abs(float(a) - float(b)) / max(abs(float(a)), abs(float(b)))


def pair_decision(a: dict, b: dict) -> dict:
    reasons = []
    rejects = []

    a_url = canonicalize_url(a.get("source_url"))
    b_url = canonicalize_url(b.get("source_url"))
    if a_url and b_url and a_url == b_url:
        return {"merge": True, "score": 100, "reasons": ["exact_canonical_url"], "rejects": []}

    a_source = _norm_text(a.get("source_id"))
    b_source = _norm_text(b.get("source_id"))
    a_external = _norm_text(a.get("external_offer_id"))
    b_external = _norm_text(b.get("external_offer_id"))
    if a_source and a_source == b_source and a_external and a_external == b_external:
        return {"merge": True, "score": 100, "reasons": ["exact_source_offer_id"], "rejects": []}

    for key, label in [
        ("location.city", "city"),
        ("classification.property_type", "property_type"),
        ("offer.transaction_type", "transaction"),
    ]:
        av, bv = _norm_text(_v(a, key)), _norm_text(_v(b, key))
        if av and bv and av != bv:
            rejects.append(f"contradict_{label}")

    if rejects:
        return {"merge": False, "score": 0, "reasons": [], "rejects": rejects}

    surface_diff = _relative_diff(_v(a, "surfaces.surface_total_m2"), _v(b, "surfaces.surface_total_m2"))
    if surface_diff is not None and surface_diff > 0.25:
        rejects.append("contradict_surface_gt25pct")
    price_diff = _relative_diff(_v(a, "offer.price_amount"), _v(b, "offer.price_amount"))
    if price_diff is not None and price_diff > 0.35:
        rejects.append("contradict_price_gt35pct")
    if rejects:
        return {"merge": False, "score": 0, "reasons": [], "rejects": rejects}

    score = 0
    for key, label, weight in [
        ("location.city", "same_city", 20),
        ("location.neighborhood", "same_neighborhood", 15),
        ("classification.property_type", "same_property_type", 15),
        ("offer.transaction_type", "same_transaction", 10),
        ("layout.bedrooms_count", "same_bedrooms", 10),
        ("layout.bathrooms_count", "same_bathrooms", 5),
    ]:
        av, bv = _norm_text(_v(a, key)), _norm_text(_v(b, key))
        if av and bv and av == bv:
            score += weight
            reasons.append(label)

    if surface_diff is not None and surface_diff <= 0.08:
        score += 15
        reasons.append("surface_within_8pct")
    if price_diff is not None and price_diff <= 0.10:
        score += 10
        reasons.append("price_within_10pct")

    # Require cross-source similarity to be strong enough. Same-source non-exact pairs remain separate.
    different_source = bool(a_source and b_source and a_source != b_source)
    merge = different_source and score >= 70
    if not different_source:
        rejects.append("same_source_without_exact_id")
    elif score < 70:
        rejects.append("insufficient_supported_similarity")
    return {"merge": merge, "score": score, "reasons": reasons, "rejects": rejects}


def cluster_records(records: list[dict]) -> dict:
    parent = list(range(len(records)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    decisions = []
    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            d = pair_decision(records[i], records[j])
            decisions.append({"a": i, "b": j, **d})
            if d["merge"]:
                union(i, j)

    groups = {}
    for i, record in enumerate(records):
        groups.setdefault(find(i), []).append(i)

    clusters = []
    for members in groups.values():
        urls = []
        sources = []
        for idx in members:
            if records[idx].get("source_url"):
                urls.append(records[idx]["source_url"])
            if records[idx].get("source_id"):
                sources.append(records[idx]["source_id"])
        clusters.append({"members": members, "source_urls": sorted(set(urls)), "source_ids": sorted(set(sources))})

    clusters.sort(key=lambda c: c["members"][0])
    return {
        "record_count": len(records),
        "cluster_count": len(clusters),
        "singleton_count": sum(1 for c in clusters if len(c["members"]) == 1),
        "merged_cluster_count": sum(1 for c in clusters if len(c["members"]) > 1),
        "clusters": clusters,
        "pair_decisions": decisions,
        "zeroDbWrites": True,
    }
