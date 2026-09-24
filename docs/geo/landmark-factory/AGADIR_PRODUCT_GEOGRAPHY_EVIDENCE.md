# Agadir — Product Geography Evidence

Status: **DISCOVERY / FAIL-CLOSED**  
Canonical AkarFinder neighborhoods: **Founty**, **Talborjt**  
Adjacent product-taxonomy label requiring separation: **Haut Founty**

## Why Agadir is the first post-Casablanca lot

The certified national rollout plan marks Agadir as `CANONICAL_MATCHED`:
- 35 OSM discovery candidates routed to Agadir;
- 2 canonical neighborhoods;
- 2 exact discovery matches;
- 0 unresolved canonical neighborhoods.

This makes Agadir the first city after the Casablanca reference implementation. It does **not** mean its product boundaries are already certified.

## Public product-taxonomy evidence — observed 2026-09-22

Yakeey exposes separate Agadir price-reference pages for:
- Founty: https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/agadir/founty
- Talborjt: https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/agadir/talborjt
- Haut Founty: https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/agadir/haut-founty

The Agadir city reference page also lists Founty, Haut Founty and Talborjt as distinct labels:
https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/agadir

Public Google Maps search results recognize Talborjt and expose Founty-labeled addresses/places in Agadir. These are orientation/taxonomy signals only, never boundary polygons.

## Guardrails

- Founty must not be silently merged with Haut Founty.
- A point label, listing location or exact-name OSM relation is not automatically a modern product boundary.
- OSM-derived sources do not count as independent corroboration of OSM.
- No buffers, Voronoi cells, midpoints, inferred road rings or manual gap closures.
- No anti-bot/auth bypass.
- Materialization is SHADOW only and only after a defensible relation/contour is found.
- Unknown/HOLD beats fabricated geometry.

## Probe

The dedicated workflow `Landmark Factory Agadir Product Geography Probe` checks:
1. exact OSM place anchors for Founty, Talborjt and Haut Founty;
2. exact same-name OSM boundary relations for all three labels;
3. a fail-closed verdict with `promotion.allowed=false`.

## Next gate

If exact boundary relations exist, inspect their tags/topology and materialize them only as **SHADOW administrative/reference geometry** first. Product-boundary promotion still requires independent modern real-estate corroboration.
