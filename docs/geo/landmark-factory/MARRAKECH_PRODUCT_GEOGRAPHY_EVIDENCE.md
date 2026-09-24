# Marrakech — Product Geography Evidence

Status: **DISCOVERY / FAIL-CLOSED**

Canonical AkarFinder entities:
- Guéliz
- Hivernage
- Route de l'Ourika

## National rollout state

Marrakech is `MIXED_CANONICAL_EVIDENCE`:
- Guéliz: exact same-city discovery match
- Hivernage: exact same-city discovery match
- Route de l'Ourika: no OSM `place` candidate match

The Route de l'Ourika gap must not be interpreted as a missing neighborhood point by default.

## Public product evidence — observed 2026-09-22

Yakeey exposes:
- Hivernage as a dedicated Marrakech price-reference locality;
- Gueliz as a dedicated Marrakech listing locality;
- **Route De L'Ourika (Agdal)** as a dedicated Marrakech price-reference locality.

Google Maps publicly exposes Route de l'Ourika as a named road/corridor in Marrakech.

This supports the hypothesis that Route de l'Ourika is a **corridor-shaped real-estate product zone**, not necessarily a conventional neighborhood polygon.

## Semantic guardrail

A road centerline is not a product polygon. Landmark Factory must never:
- buffer the road by an arbitrary distance;
- create a Voronoi zone around road points;
- infer a polygon from listings alone;
- force the corridor into a neighborhood semantic type merely because the canonical registry currently stores it as a district.

The probe therefore distinguishes:
- neighborhood-like product anchors for Guéliz/Hivernage;
- linear OSM way evidence for Route de l'Ourika.

## Next gate

If exact Guéliz/Hivernage boundary relations exist, inspect/materialize only as SHADOW reference geometry.  
If Route de l'Ourika resolves only to named ways, preserve `LINEAR_CORRIDOR_EVIDENCE` and keep product geometry on HOLD until independent lateral boundaries can be defended.
