#!/usr/bin/env python3
"""Audit and materialize truth-safe Overture building coverage around Maârif.

No default building height is invented. A feature is renderable only when Overture
supplies an explicit height or a floor count. Floor-derived heights use the same
explicitly disclosed 3 m/floor approximation already used by the OSM fallback.
"""

from __future__ import annotations

import json
import math
import subprocess
from collections import Counter
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parents[1]
GEOMETRY_FILE = ROOT / "data/geo/casablanca-arrondissements-osm.json"
OUT_DIR = ROOT / "artifacts/vivre-ici-overture-audit"
RUNTIME_DATA_FILE = ROOT / "public/data/vivre-ici/maarif-overture-3d.compact.json"

# Context envelope, not an administrative boundary. It extends Maârif toward the
# coast and adjacent central areas visible in the TARGET composition.
PAD_WEST = 0.035
PAD_EAST = 0.035
PAD_SOUTH = 0.025
PAD_NORTH = 0.040

ATTRIBUTION = "© OpenStreetMap contributors, Overture Maps Foundation"
THEME_LICENSE = "ODbL-1.0"
FLOOR_HEIGHT_ESTIMATE_M = 3.0


def iter_positions(node):
    if (
        isinstance(node, list)
        and len(node) >= 2
        and isinstance(node[0], (int, float))
        and isinstance(node[1], (int, float))
    ):
        yield float(node[0]), float(node[1])
        return
    if isinstance(node, list):
        for child in node:
            yield from iter_positions(child)


def bbox_for_feature(feature: dict) -> tuple[float, float, float, float]:
    positions = list(iter_positions(feature["geometry"]["coordinates"]))
    if not positions:
        raise RuntimeError("Maârif geometry contains no positions")
    xs = [p[0] for p in positions]
    ys = [p[1] for p in positions]
    return min(xs), min(ys), max(xs), max(ys)


def download(feature_type: str, bbox: tuple[float, float, float, float], output: Path) -> None:
    bbox_arg = ",".join(f"{value:.7f}" for value in bbox)
    subprocess.run(
        [
            "overturemaps",
            "download",
            f"--bbox={bbox_arg}",
            "-f",
            "geojson",
            f"--type={feature_type}",
            "-o",
            str(output),
        ],
        check=True,
    )


def load_features(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("type") == "FeatureCollection":
        return payload.get("features", [])
    raise RuntimeError(f"Unexpected Overture output in {path}")


def finite_positive(value) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) and number > 0 else None


def inferred_height(properties: dict) -> tuple[float | None, str | None]:
    height = finite_positive(properties.get("height"))
    if height is not None:
        return height, "height"
    floors = finite_positive(properties.get("num_floors"))
    if floors is not None:
        return floors * FLOOR_HEIGHT_ESTIMATE_M, "num_floors_estimate"
    return None, None


def source_counts(features: list[dict]) -> Counter:
    counts: Counter = Counter()
    for feature in features:
        for source in feature.get("properties", {}).get("sources") or []:
            dataset = source.get("dataset") or source.get("provider") or "unknown"
            counts[str(dataset)] += 1
    return counts


def summarize(features: list[dict], kind: str) -> dict:
    heights = []
    explicit_height = 0
    floors = 0
    min_height = 0
    min_floor = 0
    has_parts = 0
    renderable = 0

    for feature in features:
        props = feature.get("properties", {})
        height = finite_positive(props.get("height"))
        floor_count = finite_positive(props.get("num_floors"))
        if height is not None:
            explicit_height += 1
            heights.append(height)
        if floor_count is not None:
            floors += 1
        if finite_positive(props.get("min_height")) is not None:
            min_height += 1
        if finite_positive(props.get("min_floor")) is not None:
            min_floor += 1
        if props.get("has_parts") is True:
            has_parts += 1
        if height is not None or floor_count is not None:
            renderable += 1

    return {
        "type": kind,
        "total": len(features),
        "renderableWithoutFabricatedHeight": renderable,
        "explicitHeight": explicit_height,
        "numFloors": floors,
        "minHeight": min_height,
        "minFloor": min_floor,
        "hasParts": has_parts,
        "explicitHeightMedianM": round(median(heights), 2) if heights else None,
        "explicitHeightMaxM": round(max(heights), 2) if heights else None,
        "topSources": source_counts(features).most_common(10),
    }


def compact_feature(feature: dict, kind: str) -> dict | None:
    props = feature.get("properties", {})
    height, precision = inferred_height(props)
    if height is None:
        return None

    min_height = finite_positive(props.get("min_height")) or 0.0
    min_floor = finite_positive(props.get("min_floor"))
    if min_height == 0.0 and min_floor is not None:
        min_height = min_floor * FLOOR_HEIGHT_ESTIMATE_M

    return {
        "type": "Feature",
        "id": feature.get("id") or props.get("id"),
        "geometry": feature.get("geometry"),
        "properties": {
            "kind": kind,
            "height": round(height, 3),
            "heightPrecision": precision,
            "minHeight": round(min_height, 3),
            "buildingId": props.get("building_id"),
            "hasParts": props.get("has_parts"),
            "facadeColor": props.get("facade_color"),
            "facadeMaterial": props.get("facade_material"),
            "roofColor": props.get("roof_color"),
            "roofMaterial": props.get("roof_material"),
            "roofShape": props.get("roof_shape"),
        },
    }


def write_feature_collection(path: Path, features: list[dict]) -> None:
    payload = {
        "type": "FeatureCollection",
        "attribution": ATTRIBUTION,
        "license": THEME_LICENSE,
        "features": features,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def round_coordinates(node):
    if (
        isinstance(node, list)
        and len(node) >= 2
        and isinstance(node[0], (int, float))
        and isinstance(node[1], (int, float))
    ):
        # ~1 m coordinate precision at Casablanca latitude; enough for this 3D spike.
        return [round(float(node[0]), 5), round(float(node[1]), 5)]
    if isinstance(node, list):
        return [round_coordinates(child) for child in node]
    return node


def runtime_record(feature: dict) -> list:
    props = feature["properties"]
    geometry = feature["geometry"]
    return [
        round(float(props["height"]), 2),
        round(float(props.get("minHeight") or 0), 2),
        0 if props["heightPrecision"] == "height" else 1,
        0 if props["kind"] == "building" else 1,
        0 if geometry.get("type") == "Polygon" else 1,
        round_coordinates(geometry.get("coordinates") or []),
    ]


def write_runtime_bundle(renderable: list[dict], release: str | None) -> None:
    RUNTIME_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "v": 1,
        "source": "Overture Maps Foundation",
        "release": release,
        "license": THEME_LICENSE,
        "attribution": ATTRIBUTION,
        "floorEstimateMeters": FLOOR_HEIGHT_ESTIMATE_M,
        "defaultHeightInvented": False,
        "features": [runtime_record(feature) for feature in renderable],
    }
    RUNTIME_DATA_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def read_release(state_path: Path) -> str | None:
    try:
        return json.loads(state_path.read_text(encoding="utf-8")).get("last_release")
    except (OSError, json.JSONDecodeError):
        return None


def main() -> None:
    geometry = json.loads(GEOMETRY_FILE.read_text(encoding="utf-8"))
    maarif = next(
        (
            feature
            for feature in geometry.get("features", [])
            if feature.get("properties", {}).get("neighborhoodCanonicalId") == "maarif"
        ),
        None,
    )
    if not maarif:
        raise RuntimeError("Maârif shadow geometry not found")

    core_bbox = bbox_for_feature(maarif)
    xmin, ymin, xmax, ymax = core_bbox
    context_bbox = (
        xmin - PAD_WEST,
        ymin - PAD_SOUTH,
        xmax + PAD_EAST,
        ymax + PAD_NORTH,
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    buildings_path = OUT_DIR / "overture-buildings.geojson"
    parts_path = OUT_DIR / "overture-building-parts.geojson"

    download("building", context_bbox, buildings_path)
    download("building_part", context_bbox, parts_path)

    buildings = load_features(buildings_path)
    parts = load_features(parts_path)
    release = read_release(Path(f"{buildings_path}.state"))

    renderable = []
    for feature in buildings:
        compact = compact_feature(feature, "building")
        if compact:
            renderable.append(compact)
    for feature in parts:
        compact = compact_feature(feature, "building_part")
        if compact:
            renderable.append(compact)

    renderable_path = OUT_DIR / "overture-renderable-3d.geojson"
    write_feature_collection(renderable_path, renderable)
    write_runtime_bundle(renderable, release)

    summary = {
        "mode": "vivre-ici-overture-3d-coverage-audit",
        "release": release,
        "scope": {
            "authority": "Maârif OSM shadow geometry used only to derive an audit envelope",
            "coreBbox": [round(v, 7) for v in core_bbox],
            "contextBbox": [round(v, 7) for v in context_bbox],
            "contextEnvelopeIsAdministrativeBoundary": False,
        },
        "source": {
            "provider": "Overture Maps Foundation",
            "theme": "buildings",
            "types": ["building", "building_part"],
            "license": THEME_LICENSE,
            "attribution": ATTRIBUTION,
        },
        "building": summarize(buildings, "building"),
        "buildingPart": summarize(parts, "building_part"),
        "renderable3D": {
            "total": len(renderable),
            "building": sum(1 for f in renderable if f["properties"]["kind"] == "building"),
            "buildingPart": sum(1 for f in renderable if f["properties"]["kind"] == "building_part"),
            "explicitHeight": sum(1 for f in renderable if f["properties"]["heightPrecision"] == "height"),
            "floorEstimate": sum(1 for f in renderable if f["properties"]["heightPrecision"] == "num_floors_estimate"),
        },
        "runtimeBundle": {
            "path": str(RUNTIME_DATA_FILE.relative_to(ROOT)),
            "bytes": RUNTIME_DATA_FILE.stat().st_size,
            "coordinatePrecisionDecimals": 5,
        },
        "truthPolicy": {
            "defaultHeightInvented": False,
            "floorEstimateMetersPerFloor": FLOOR_HEIGHT_ESTIMATE_M,
            "floorEstimateDisclosed": True,
        },
    }
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
