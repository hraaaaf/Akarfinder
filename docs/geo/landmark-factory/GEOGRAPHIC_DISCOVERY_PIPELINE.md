# Landmark Factory — geographic discovery pipeline

## Goal
Replace manual GPS hunting with a deterministic discovery funnel while keeping editorial verification before registry promotion.

## Contract
1. Start from GEO_NEIGHBORHOODS and VERIFIED_LANDMARKS.
2. Sort canonical districts by current landmark density.
3. Obtain a real polygon for the district from an external geographic source (OSM/Nominatim/curated boundary). Never infer a polygon from a label.
4. Query OSM POIs in the district area with Overpass.
5. Normalize node/way/relation centers, then independently point-in-polygon check every candidate against the locked district geometry.
6. Remove registry duplicates by canonical name/aliases; later stages may add distance/fuzzy duplicate checks.
7. Score and source-check candidates. OSM establishes geography, not editorial importance.
8. Promote only verified candidates to territory-landmark-registry and artwork.
9. Runtime reveal/collision remains the existing landmark presentation contract; this pipeline does not mutate coordinates to avoid collisions.

## Source policy
Nominatim can return GeoJSON polygon geometry and OSM identifiers. Overpass is the bulk POI source. Public endpoints are not a production dependency: acquisition is an offline/authoring step and evidence must be cached/committed before promotion.

## Guardrails
No Supabase. No listing/business data. No search ranking changes. No automatic merge/deploy. No candidate is promoted solely because OSM contains it.

## Current implementation
- scripts/landmarks/landmark-factory-geo.ts
- scripts/landmarks/landmark-factory-geo.test.ts

The core currently provides deterministic point-in-polygon, OSM normalization, Overpass query generation, anti-duplicate keys and canonical density ordering. Boundary acquisition/cache and batch scoring are the next layer.


## Phase 2 implemented — boundary + shortlist primitives
The pipeline now also includes:
- Morocco-scoped Nominatim boundary URL generation with polygon_geojson=1.
- Polygon/MultiPolygon normalization.
- OSM relation/way → Overpass area-id conversion where supported.
- Independent point-in-polygon reassignment after Overpass discovery.
- Haversine + normalized-name near-duplicate collapse.
- Least-enriched district batching.
- Conservative OSM-tag heuristic shortlist.

The heuristic is deliberately **not** the final AkarFinder score. It only reduces the candidate pool. Promotion still requires the normal independent-source review and confidence gate.

### Acquisition policy
Do not hammer public Nominatim/Overpass endpoints. Boundary and POI acquisition is an authoring batch, should identify requests appropriately, respect provider usage policies, and cache evidence locally/repo-side before review. Production runtime must not call these endpoints.
