#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from shapely.geometry import shape
from shapely.validation import explain_validity

EXPECTED_COUNT = 16
EXPECTED_CITY = "casablanca"
PLAUSIBLE_BOUNDS = (-7.90, 33.35, -7.35, 33.85)


def fail(message: str) -> None:
    raise SystemExit(message)


def main() -> None:
    if len(sys.argv) != 3:
        fail("Usage: validate-casablanca-geometries.py <input.geojson> <report.json>")

    input_path = Path(sys.argv[1])
    report_path = Path(sys.argv[2])
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    features = payload.get("features")
    if payload.get("type") != "FeatureCollection" or not isinstance(features, list):
        fail("Input must be a GeoJSON FeatureCollection.")
    if len(features) != EXPECTED_COUNT:
        fail(f"Expected {EXPECTED_COUNT} features, found {len(features)}.")

    ids: set[int] = set()
    slugs: set[str] = set()
    rows: list[dict[str, object]] = []
    total_area = 0.0

    for feature in features:
        properties = feature.get("properties") or {}
        relation_id = properties.get("sourceEntityId")
        slug = properties.get("neighborhoodCanonicalId")
        if not isinstance(relation_id, int) or relation_id <= 0:
            fail("Every feature must have a positive integer sourceEntityId.")
        if relation_id in ids:
            fail(f"Duplicate relation ID: {relation_id}.")
        ids.add(relation_id)
        if not isinstance(slug, str) or not slug:
            fail(f"Relation {relation_id} has no canonical slug.")
        if slug in slugs:
            fail(f"Duplicate canonical slug: {slug}.")
        slugs.add(slug)
        if properties.get("cityCanonicalId") != EXPECTED_CITY:
            fail(f"Relation {relation_id} is not mapped to Casablanca.")
        if properties.get("licenseId") != "ODbL-1.0":
            fail(f"Relation {relation_id} has an unexpected licence.")
        if properties.get("publicationStatus") != "shadow" or properties.get("reviewed") is not False:
            fail(f"Relation {relation_id} must remain unreviewed Shadow data.")

        geometry = shape(feature.get("geometry"))
        if geometry.geom_type not in {"Polygon", "MultiPolygon"}:
            fail(f"Relation {relation_id} has unsupported geometry type {geometry.geom_type}.")
        if geometry.is_empty or geometry.area <= 0:
            fail(f"Relation {relation_id} has an empty or zero-area geometry.")
        if not geometry.is_valid:
            fail(f"Relation {relation_id} is topologically invalid: {explain_validity(geometry)}")

        min_x, min_y, max_x, max_y = geometry.bounds
        p_min_x, p_min_y, p_max_x, p_max_y = PLAUSIBLE_BOUNDS
        if min_x < p_min_x or min_y < p_min_y or max_x > p_max_x or max_y > p_max_y:
            fail(f"Relation {relation_id} falls outside plausible Casablanca bounds: {geometry.bounds}.")

        total_area += geometry.area
        rows.append(
            {
                "relationId": relation_id,
                "canonicalId": slug,
                "geometryType": geometry.geom_type,
                "valid": True,
                "bounds": [min_x, min_y, max_x, max_y],
                "coordinateArea": geometry.area,
            }
        )

    report = {
        "version": "v1",
        "status": "passed",
        "auditedAt": datetime.now(timezone.utc).isoformat(),
        "featureCount": len(features),
        "uniqueRelationCount": len(ids),
        "uniqueCanonicalCount": len(slugs),
        "allTopologiesValid": True,
        "publicationStatus": "shadow",
        "totalCoordinateArea": total_area,
        "features": sorted(rows, key=lambda row: str(row["canonicalId"])),
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Validated {len(features)} Casablanca geometries; report written to {report_path}.")


if __name__ == "__main__":
    main()
