import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform, unary_union
from shapely.validation import explain_validity

ZONES_PATH = Path("data/geo/rabat-market-zones-v1.geojson")
SOURCES_PATH = Path("data/geo/rabat-market-zone-source-containers-v1.geojson")
OUT_PATH = Path("data/audits/runtime/carte-c1b-market-zones-topology.json")

project = Transformer.from_crs("EPSG:4326", "EPSG:32629", always_xy=True).transform

zones_doc = json.loads(ZONES_PATH.read_text(encoding="utf-8"))
sources_doc = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))

zones = {
    feature["properties"]["zoneId"]: transform(project, shape(feature["geometry"]))
    for feature in zones_doc["features"]
}
sources = {
    int(feature["properties"]["relationId"]): transform(project, shape(feature["geometry"]))
    for feature in sources_doc["features"]
}

expected_zone_ids = {
    "market_zone_rabat_agdal",
    "market_zone_rabat_hay_riad",
    "market_zone_rabat_souissi",
    "market_zone_rabat_centre",
}
expected_source_ids = {2799211, 2799203, 4743369}

assert set(zones) == expected_zone_ids, f"Unexpected zone ids: {sorted(zones)}"
assert set(sources) == expected_source_ids, f"Unexpected source relation ids: {sorted(sources)}"

validity = {}
for zone_id, geometry in zones.items():
    validity[zone_id] = {
        "valid": geometry.is_valid,
        "reason": explain_validity(geometry),
        "empty": geometry.is_empty,
        "area_m2": geometry.area,
    }
    assert geometry.is_valid, f"{zone_id} invalid: {explain_validity(geometry)}"
    assert not geometry.is_empty, f"{zone_id} is empty"
    assert geometry.area > 0, f"{zone_id} has zero area"

pairwise_overlap_m2 = {}
zone_items = sorted(zones.items())
for index, (left_id, left) in enumerate(zone_items):
    for right_id, right in zone_items[index + 1 :]:
        overlap = left.intersection(right).area
        key = f"{left_id}__{right_id}"
        pairwise_overlap_m2[key] = overlap
        assert overlap < 1.0, f"Surface overlap {key}: {overlap:.6f} m²"

agdal_riad_source = sources[2799211]
agdal_hay_union = unary_union([
    zones["market_zone_rabat_agdal"],
    zones["market_zone_rabat_hay_riad"],
])
agdal_hay_symdiff_m2 = agdal_hay_union.symmetric_difference(agdal_riad_source).area
agdal_hay_relative_symdiff = agdal_hay_symdiff_m2 / agdal_riad_source.area
assert agdal_hay_relative_symdiff < 1e-4, (
    f"Agdal + Hay Riad do not reproduce Agdal-Riyad source container: "
    f"{agdal_hay_symdiff_m2:.3f} m² / {agdal_riad_source.area:.3f} m²"
)

souissi_symdiff_m2 = zones["market_zone_rabat_souissi"].symmetric_difference(sources[2799203]).area
centre_symdiff_m2 = zones["market_zone_rabat_centre"].symmetric_difference(sources[4743369]).area
assert souissi_symdiff_m2 < 1.0, f"Souissi differs from its source container by {souissi_symdiff_m2:.6f} m²"
assert centre_symdiff_m2 < 1.0, f"Centre differs from Hassan source container by {centre_symdiff_m2:.6f} m²"

report = {
    "mode": "deterministic_shadow_topology_audit",
    "projection": "EPSG:32629",
    "zone_count": len(zones),
    "source_relation_ids": sorted(sources),
    "validity": validity,
    "pairwise_overlap_m2": pairwise_overlap_m2,
    "source_conformance": {
        "agdal_hay_union_vs_agdal_riad": {
            "symmetric_difference_m2": agdal_hay_symdiff_m2,
            "relative_symmetric_difference": agdal_hay_relative_symdiff,
        },
        "souissi_vs_relation_2799203_symmetric_difference_m2": souissi_symdiff_m2,
        "centre_vs_hassan_relation_4743369_symmetric_difference_m2": centre_symdiff_m2,
    },
    "verdict": "C1B_RABAT_MARKET_ZONES_TOPOLOGY_PASS",
}

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2, ensure_ascii=False))
