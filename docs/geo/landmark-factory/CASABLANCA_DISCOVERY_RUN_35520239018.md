# Casablanca offline discovery — Run 35520239018

Source artifact: `landmark-factory-casablanca-offline` / artifact `10608285253`.
Artifact digest: `sha256:296b174ec7613a580fe7c87c403e0d5c3e6bc112b090d44292027149b2dff38b`.

## Result
The first real offline pass completed successfully and produced **306 named high-signal OSM node POIs** inside the broad Casablanca authoring bbox.

Top raw categories:
- tourism=hotel: 117
- amenity=place_of_worship: 45
- tourism=attraction: 43
- amenity=marketplace: 23
- amenity=hospital: 14
- shop=mall: 12
- amenity=university: 11

This is a discovery pool, not a landmark registry. Hotels and noisy retail/market records demonstrate why the editorial gates remain necessary.

## High-signal examples observed in the artifact
Examples are evidence that the extractor is finding recognizable real-world objects; they are **not promoted by this report**:
- Twin Center — OSM node 1819658595 — 33.5865844, -7.6322923.
- Place des Nations Unies — OSM node 2684602664 — 33.5949962, -7.6186635.
- Bab Marrakech / باب مراكش — artifact contains multiple nearby OSM objects/names requiring dedupe before promotion.
- Église orthodoxe russe de la Dormition — OSM node 3055305533 — 33.5820157, -7.6226346.
- Anfaplace Mall — OSM node 3761974996 — 33.598333, -7.6642509.
- Jardin de la Ligue Arabe / حديقة الجامعة العربية — attraction record around 33.5892018, -7.6236247.
- Coupole Zevaco — attraction record around 33.5964546, -7.6176281.

## Quality finding
The first extractor emitted nodes only. That undercounts important landmarks represented in OSM as ways/areas. HEAD after this report adds a geometry-backed **way pass** using actual way nodes and a deterministic bbox-centre coordinate. Relations remain fail-closed until a proper multipolygon assembler exists.

## Next gate
1. Re-run the workflow with way support.
2. Compare node-only vs node+way counts and dedupe.
3. Acquire/reconcile real district polygons.
4. Point-in-polygon assign candidates to canonical Casablanca districts.
5. Only then perform independent source verification and the final AkarFinder five-dimension score.

No Supabase/listing/business/ranking mutation. No automatic registry promotion. No merge/deploy.
