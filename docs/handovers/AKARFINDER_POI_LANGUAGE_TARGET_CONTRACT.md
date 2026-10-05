# AKARFINDER — LOT H / POI LANGUAGE — TARGET CONTRACT

Status: ACTIVE — BEFORE pending
Date: 2026-10-05
Repository: `hraaaaf/Akarfinder`
Branch: `feat/akar-map-quartier-target-couche3`
PR: #1090 — DRAFT
Parent baseline: Quartier + Rue human-approved

## Goal
Create a proprietary, coherent AkarFinder POI language for local map reading.

## Success
- maximum 8 visual families;
- monochrome/duotone AkarFinder icon language;
- clear landmark vs ordinary POI hierarchy;
- collision and zoom rules remain legible;
- no rainbow Google-like map;
- sourced POI truth/provenance unchanged;
- no invented POI, position, category, distance or access;
- 390×844 / 430×932 / 768×900 / 1280×900 validated;
- human gate before closure.

## Family target
1. Education
2. Health
3. Mobility
4. Green & sport
5. Food & shopping
6. Services
7. Culture & worship
8. Landmark / orientation

Existing raw categories may map into these visual families without changing their source category semantics.

## Visual language
- navy / blue / teal AkarFinder base;
- one accent family, not one color per POI category;
- compact duotone glyphs;
- flagship landmarks use a stronger silhouette/ring;
- ordinary POIs remain subordinate;
- labels stay sparse and collision-safe.

## Interaction
- overview: priority landmarks + few representative POIs;
- filtered state: selected family becomes dominant;
- zoom-in: additional POIs may reveal progressively;
- click/tap may open a contextual card only when sourced content exists.

## Truth contract
Never infer or fabricate:
- POI existence;
- exact coordinates;
- walking/driving times;
- opening hours;
- photos;
- neighborhood containment.

## Workflow
BEFORE → TARGET → implementation → AFTER → comparison → tests → strict score → human gate.
