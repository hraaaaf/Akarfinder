# Casablanca modern product adjacency — CFC / CIL / Ferme Bretonne / Beauséjour

Status: authoring evidence matrix. No product boundary is certified by this document.

## Doctrine

- AUC remains the source of urban-planning / historical truth.
- Yakeey + public contemporary mapping are product-taxonomy / market-orientation evidence.
- OSM is the geometry materialization substrate.
- A product label, POI, point or search result is never promoted into a polygon.
- A search page returning listings from neighboring zones is adjacency/search evidence, not proof that the zones overlap.

## Product taxonomy evidence

Yakeey's Casablanca price-reference index currently lists these as separate entities:
- Casablanca Finance City
- CIL
- Ferme Bretonne
- Beauséjour

Public Yakeey search pages scoped to Casablanca Finance City also return some listings explicitly labeled CIL, Ferme Bretonne and Beauséjour. The correct interpretation is that these are close / commercially related search areas, not that Yakeey exposes one shared polygon.

Sources observed 2026-09-21:
- https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/casablanca
- https://yakeey.com/fr-ma/achat/appartement/casablanca/casablanca-finance-city
- https://yakeey.com/fr-ma/location/appartement/casablanca/casablanca-finance-city
- https://yakeey.com/fr-ma/achat/appartement/casablanca/ferme-bretonne

## Contemporary-map / OSM orientation evidence

Public OSM-derived mapping exposes labeled place anchors rather than defensible neighborhood polygons:
- Casablanca Finance City: OSM node `12223124337`, `place=neighbourhood`, approximately `33.56316, -7.66042`.
- Ferme Bretonne: OSM node `6037675578`, approximately `33.56399, -7.64642`.
- Beauséjour: OSM node `12206926143`, `place=quarter`, approximately `33.56841, -7.64929`.
- CIL is publicly mapped as a named Casablanca neighborhood; exact OSM feature discovery is delegated to the offline PBF gate added with this matrix.

Secondary public orientation:
- Waze exposes named destinations for CFC, CIL and Beauséjour.
- OSM-derived mapping describes Ferme Bretonne as near Beauséjour and CFC as near CIL.
- These observations corroborate distinct neighboring product labels but still do not define edges.

## Matrix

| Product zone | Yakeey distinct taxonomy | Public map anchor | Polygon available | Current verdict |
| --- | --- | --- | --- | --- |
| Casablanca Finance City | yes | yes | no defensible public polygon | HOLD |
| CIL | yes | named public neighborhood; exact PBF anchor pending | no | HOLD |
| Ferme Bretonne | yes | yes | no | HOLD |
| Beauséjour | yes | yes | no | HOLD |

## What is allowed next

1. Archive exact OSM place anchors for all four labels from the same Morocco PBF used by Landmark Factory.
2. Compare relative positions and named roads between the anchors.
3. Search public product evidence for edge-defining streets only.
4. Require independent corroboration for every candidate edge before materialization.
5. If an edge is supported, materialize the OSM road geometry itself; do not hand-draw a connector.
6. Keep all candidate product polygons SHADOW until topology + membership tests pass.

## What is explicitly forbidden

- Using the Casa-Anfa AUC sector as the CFC product boundary.
- Using Voronoi / nearest-label partitions as neighborhood truth.
- Turning OSM place nodes into radius/buffer polygons.
- Inferring a shared CFC/CIL/Ferme Bretonne/Beauséjour polygon from Yakeey search results.
- Copying hidden/private Google/Yakeey geometry or bypassing anti-bot/auth controls.
