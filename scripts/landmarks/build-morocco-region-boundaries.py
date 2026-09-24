#!/usr/bin/env python3
"""Materialize canonical Morocco region boundaries from OSM admin_level=4.

This script is intentionally fail-closed:
- only the 12 canonical Morocco regions are accepted;
- every canonical region must resolve to exactly one OSM area;
- unmatched/extra admin4 entities remain diagnostics only;
- no synthetic geometry is generated or merged.
"""
import argparse
import json
import re
import unicodedata
from pathlib import Path

CANONICAL = {
    "tanger-tetouan-al-hoceima": ["Tanger-Tétouan-Al Hoceïma", "Tanger-Tetouan-Al Hoceima"],
    "oriental": ["Oriental", "L'Oriental"],
    "fes-meknes": ["Fès-Meknès", "Fes-Meknes"],
    "rabat-sale-kenitra": ["Rabat-Salé-Kénitra", "Rabat-Sale-Kenitra"],
    "beni-mellal-khenifra": ["Béni Mellal-Khénifra", "Beni Mellal-Khenifra"],
    "casablanca-settat": ["Casablanca-Settat"],
    "marrakech-safi": ["Marrakech-Safi"],
    "draa-tafilalet": ["Drâa-Tafilalet", "Draa-Tafilalet"],
    "souss-massa": ["Souss-Massa"],
    "guelmim-oued-noun": ["Guelmim-Oued Noun"],
    "laayoune-sakia-el-hamra": ["Laâyoune-Sakia El Hamra", "Laayoune-Sakia El Hamra"],
    "dakhla-oued-ed-dahab": ["Dakhla-Oued Ed-Dahab", "Eddakhla-Oued Eddahab", "Dakhla-Oued Eddahab"],
}

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower().replace("’", "'")
    value = re.sub(r"\bregion\s+(de|du|d')?\s*", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value

ALIASES = {
    slug: {norm(slug), *(norm(v) for v in names)}
    for slug, names in CANONICAL.items()
}

def match_slug(tags):
    names = [
        tags.get("name"), tags.get("name:fr"), tags.get("official_name"),
        tags.get("short_name"), tags.get("alt_name"),
    ]
    normalized = {norm(v) for v in names if v}
    matches = [slug for slug, aliases in ALIASES.items() if normalized & aliases]
    return matches

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    import osmium
    from shapely.geometry import shape, mapping

    factory = osmium.geom.GeoJSONFactory()
    records = []

    class H(osmium.SimpleHandler):
        def area(self, area):
            tags = dict(area.tags)
            if tags.get("boundary") != "administrative" or tags.get("admin_level") != "4":
                return
            try:
                geom = shape(json.loads(factory.create_multipolygon(area)))
            except Exception:
                return
            if geom.is_empty or not geom.is_valid:
                return
            records.append({
                "osm_id": area.orig_id(),
                "osm_source_type": "way" if area.from_way() else "relation",
                "tags": {
                    "name": tags.get("name"),
                    "name:fr": tags.get("name:fr"),
                    "name:ar": tags.get("name:ar"),
                    "official_name": tags.get("official_name"),
                    "wikidata": tags.get("wikidata"),
                    "admin_level": tags.get("admin_level"),
                },
                "geometry": geom,
            })

    H().apply_file(args.pbf, locations=True)

    matched = {slug: [] for slug in CANONICAL}
    unmatched = []
    ambiguous = []

    for rec in records:
        matches = match_slug(rec["tags"])
        public = {
            "osm_id": rec["osm_id"],
            "osm_source_type": rec["osm_source_type"],
            **rec["tags"],
        }
        if len(matches) == 1:
            matched[matches[0]].append(rec)
        elif len(matches) > 1:
            ambiguous.append({**public, "matches": matches})
        else:
            unmatched.append(public)

    diagnostics = {
        "admin4_reference_count": len(records),
        "canonical_region_count": len(CANONICAL),
        "matched_canonical_region_count": sum(1 for rows in matched.values() if len(rows) == 1),
        "missing_regions": [slug for slug, rows in matched.items() if len(rows) == 0],
        "duplicate_regions": [slug for slug, rows in matched.items() if len(rows) > 1],
        "ambiguous_reference_count": len(ambiguous),
        "unmatched_reference_count": len(unmatched),
        "unmatched_references": unmatched,
        "ambiguous_references": ambiguous,
    }

    if diagnostics["missing_regions"] or diagnostics["duplicate_regions"] or ambiguous:
        print(json.dumps(diagnostics, ensure_ascii=False, indent=2))
        raise SystemExit("Canonical region boundary crosswalk failed closed")

    features = []
    for slug, rows in matched.items():
        rec = rows[0]
        features.append({
            "type": "Feature",
            "properties": {
                "slug": slug,
                "canonical_name": CANONICAL[slug][0],
                "osm_id": rec["osm_id"],
                "osm_source_type": rec["osm_source_type"],
                "wikidata": rec["tags"].get("wikidata"),
                "admin_level": "4",
                "publication_status": "candidate_osm_admin4",
                "geometry_claim": "ADMINISTRATIVE_REGION_ONLY",
            },
            "geometry": mapping(rec["geometry"]),
        })

    payload = {
        "type": "FeatureCollection",
        "features": features,
        "akarfinder": {
            "schema_version": 1,
            "scope": "Morocco",
            "evidence_role": "CANONICAL_REGION_BOUNDARY_CANDIDATES",
            "activation_allowed": False,
            "product_boundary_promotion_allowed": False,
            "source": "OpenStreetMap admin_level=4",
            "license": "ODbL-1.0",
            "diagnostics": diagnostics,
            "guardrails": [
                "These are administrative region boundaries only.",
                "They must never be reused as city or neighborhood product boundaries.",
                "No synthetic geometry, merge, buffer, Voronoi, midpoint or gap closure is generated.",
            ],
        },
    }

    Path(args.out).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":"))+"\n", encoding="utf-8")
    print(json.dumps(diagnostics, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
