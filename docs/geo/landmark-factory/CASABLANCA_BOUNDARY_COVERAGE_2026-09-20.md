# Casablanca boundary coverage — 2026-09-20

## Purpose

Evidence gate for Landmark Factory district assignment. `map_eligible=true` means the canonical neighborhood may appear on the map; it does **not** authorize an invented polygon.

## Maârif — ACCEPT administrative reference, geometry materialization pending

- Canonical ID: `district_casablanca_maarif`
- Official Casablanca source describes the arrondissement boundary:
  - north: Boulevard d'Anfa + Boulevard Zerktouni
  - west: Route Al Jamia + Boulevard Ghandi
  - east: Avenue 2 Mars + Avenue Nador
  - south: Casablanca motorway
- OSM administrative relation: `relation/2801474` (Maârif), independently indexed by the OpenStreetMap Casablanca administrative table.
- Decision: **ACCEPT as the source relation for boundary materialization**, subject to geometry fetch + registry validator before point-in-polygon.
- Important scope note: this is the administrative arrondissement. Product-level neighborhood semantics must not silently claim that every point in the arrondissement is the colloquial Maârif neighborhood.

## Racine — HOLD

No verified polygon accepted in this pass. Do not infer a polygon from a label, address cluster, POI cloud, or neighboring streets.

## Aïn Diab — HOLD

No verified product-neighborhood polygon accepted in this pass. Do not substitute the wider Anfa arrondissement boundary.

## Bourgogne — HOLD

No verified product-neighborhood polygon accepted in this pass. Do not substitute the wider Anfa arrondissement boundary.

## Casablanca Finance City — HOLD

Existing verified landmark coordinates do not establish a district polygon. A project/perimeter geometry needs its own traceable source.

## Bouskoura — HOLD / scope mismatch risk

The canonical product entry is `district_casablanca_bouskoura`, while Bouskoura is also a separate city/commune in the canonical city registry. No automatic polygon assignment until that scope ambiguity is resolved.

## Guardrail

Only ACCEPTed, materialized Polygon/MultiPolygon records may feed `point-in-polygon`. HOLD districts remain map eligible but receive no automatic Landmark Factory district assignment.
