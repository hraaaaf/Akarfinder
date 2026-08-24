# Neighborhood Context L2 — evidence note

Date : 2026-08-24

The current repository contains a generic `NeighborhoodGeometryRecord` contract and Casablanca arrondissement geometries in **shadow** status. These records are explicitly not reviewed/published neighborhood-grade evidence. Lot 2 must therefore treat them as non-certifying context and must not infer `inside_certified_boundary` from them.

For the six Lot 2 pilots, the certified L1 query origin is a neighborhood reference point. POIs within the pilot radius may only be classified `near_certified_reference` unless a separately published+reviewed geometry or explicit authority link is supplied.

This note is supporting evidence. The canonical authority remains `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CANONICAL.md`.