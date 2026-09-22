# Rabat Océan — Landmark Factory geometry evidence

Status: **TAXONOMY CERTIFIED / GEOMETRY HOLD**

## Existing authority

The Rabat locality registry already certifies `district_rabat_ocean` as product taxonomy, backed by AkarFinder registry/dictionary and AURS first-party evidence.

The national OSM crosswalk finds one exact same-city discovery anchor:
- OSM node `3486287189`
- `place=suburb`
- `name:fr=Océan`
- contained in Rabat admin-level-8 relation `2799215`

The Rabat Landmark bridge nevertheless keeps Océan at `GEOMETRY_HOLD` because C8 has no certified analytical geometry for it.

## Public market evidence — observed 2026-09-22

Yakeey exposes a dedicated Rabat `L'Ocean` price-reference page:
https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/rabat/l%27ocean

Yakeey's city search taxonomy also exposes `L'Ocean` as a Rabat locality.

These confirm market/product naming, not a polygon.

## Probe

The dedicated workflow searches only the Rabat geographic window and the aliases:
- Océan
- Ocean
- L'Ocean
- L'Océan

It records exact place anchors and exact-name boundary relations.

## Guardrails

- Existing taxonomy certification remains authoritative.
- OSM point labels are not product polygons.
- Existing C8 analytical zones for other Rabat localities do not authorize inventing an Océan contour.
- No buffer, Voronoi, midpoint, road-ring inference or manual closure.
- No promotion unless a defensible contour is independently corroborated.
- Otherwise the correct result remains `GEOMETRY_HOLD`.
