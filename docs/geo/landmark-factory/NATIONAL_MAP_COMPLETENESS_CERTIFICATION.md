# AkarFinder — National Map Completeness Certification

Status: certification contract for the Morocco national map.

## Certified product completeness

The national map is considered complete only when all of the following are true at the same exact HEAD:

- 12/12 canonical regions are present.
- 19/19 canonical cities are assigned to a region.
- 19/19 canonical cities have a map centroid for regional positioning.
- 63/63 canonical product neighborhoods are present in the canonical registry.
- 63/63 canonical neighborhoods have at least one verified landmark anchor.
- 63/63 canonical neighborhoods have an explicit boundary-readiness status.
- 0 canonical neighborhood is silently unclassified.
- 0 synthetic neighborhood boundary is published.
- 0 unverified administrative/planning boundary is presented as a product-neighborhood boundary.

## Boundary doctrine

A complete map does **not** mean fabricating 63 polygons.

A neighborhood whose product boundary cannot be independently certified remains:
- navigable by canonical identity;
- positionable by verified landmark anchor;
- explicitly classified as boundary-unpublished;
- visually usable without a false polygon claim.

Publication of a product boundary is allowed only when provenance, semantic equivalence and geometry are independently defensible.

Current expected boundary state:
- published product boundaries: 0;
- synthetic boundaries: 0;
- explicitly classified unpublished neighborhoods: 63.

This is fail-closed by design.

## Automated enforcement

R8 must run:

`scripts/scrapers/__tests__/national-map-completeness-certification.test.ts`

The gate fails if:
- a canonical city loses its position;
- a canonical district loses its verified landmark anchor;
- a district loses boundary-readiness classification;
- synthetic or unverified product boundaries are introduced.

## Product interpretation

Country → Region → City → Neighborhood remains complete and navigable even where a neighborhood boundary is not legally/semantically defensible.

The map should prefer a truthful anchor-only neighborhood representation over an invented polygon.
