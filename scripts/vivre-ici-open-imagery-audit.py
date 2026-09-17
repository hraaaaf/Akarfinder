#!/usr/bin/env python3
"""Audit openly licensed aerial imagery availability around Maârif via OAM STAC."""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEOMETRY_FILE = ROOT / "data/geo/casablanca-arrondissements-osm.json"
OUT_DIR = ROOT / "artifacts/vivre-ici-open-imagery-audit"
STAC_SEARCH = "https://api.imagery.hotosm.org/stac/search"

PAD_WEST = 0.035
PAD_EAST = 0.035
PAD_SOUTH = 0.025
PAD_NORTH = 0.040


def iter_positions(node):
    if isinstance(node, list) and len(node) >= 2 and isinstance(node[0], (int, float)) and isinstance(node[1], (int, float)):
        yield float(node[0]), float(node[1])
        return
    if isinstance(node, list):
        for child in node:
            yield from iter_positions(child)


def bbox_for_feature(feature: dict) -> tuple[float, float, float, float]:
    positions = list(iter_positions(feature["geometry"]["coordinates"]))
    xs = [point[0] for point in positions]
    ys = [point[1] for point in positions]
    return min(xs), min(ys), max(xs), max(ys)


def fetch_page(bbox: tuple[float, float, float, float]) -> dict:
    query = urllib.parse.urlencode({
        "bbox": ",".join(str(value) for value in bbox),
        "limit": 100,
    })
    request = urllib.request.Request(
        f"{STAC_SEARCH}?{query}",
        headers={"Accept": "application/geo+json,application/json", "User-Agent": "AkarFinder-Vivre-Ici-Open-Imagery-Audit/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main() -> None:
    geometry = json.loads(GEOMETRY_FILE.read_text(encoding="utf-8"))
    maarif = next(
        feature for feature in geometry["features"]
        if feature.get("properties", {}).get("neighborhoodCanonicalId") == "maarif"
    )
    xmin, ymin, xmax, ymax = bbox_for_feature(maarif)
    bbox = (xmin - PAD_WEST, ymin - PAD_SOUTH, xmax + PAD_EAST, ymax + PAD_NORTH)

    payload = fetch_page(bbox)
    features = payload.get("features") or []
    provider_counts = Counter()
    candidates = []

    for feature in features:
        props = feature.get("properties") or {}
        providers = props.get("providers") or []
        if isinstance(providers, list):
            for provider in providers:
                if isinstance(provider, dict):
                    provider_counts[str(provider.get("name") or "unknown")] += 1
        gsd = props.get("gsd")
        try:
            gsd_value = float(gsd) if gsd is not None else None
        except (TypeError, ValueError):
            gsd_value = None
        assets = feature.get("assets") or {}
        visual = assets.get("visual") if isinstance(assets, dict) else None
        candidates.append({
            "id": feature.get("id"),
            "collection": feature.get("collection"),
            "datetime": props.get("datetime"),
            "gsd": gsd_value,
            "bbox": feature.get("bbox"),
            "hasVisualAsset": isinstance(visual, dict) and bool(visual.get("href")),
        })

    candidates.sort(key=lambda item: (item["gsd"] is None, item["gsd"] or 999999))
    high_resolution = [item for item in candidates if item["gsd"] is not None and item["gsd"] <= 1.0]

    summary = {
        "mode": "vivre-ici-open-aerial-imagery-audit",
        "source": {
            "provider": "OpenAerialMap / Humanitarian OpenStreetMap Team",
            "catalog": STAC_SEARCH,
            "licensePolicy": "open imagery; verify per-item attribution before production use",
        },
        "scope": {
            "bbox": [round(value, 7) for value in bbox],
            "contextEnvelopeIsAdministrativeBoundary": False,
        },
        "itemsReturned": len(features),
        "highResolutionCandidatesAtOrBelow1m": len(high_resolution),
        "providers": provider_counts.most_common(20),
        "bestCandidates": candidates[:20],
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
