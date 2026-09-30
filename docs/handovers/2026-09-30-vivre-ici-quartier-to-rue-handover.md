# HANDOVER — AkarFinder / Vivre Ici — Quartier → Rue / Proximité

Date: 2026-09-30  
Repository: `hraaaaf/Akarfinder`  
Branch: `feat/akar-map-quartier-target-couche3`  
PR: #1090 — DRAFT  
Validated L3 HEAD: `1af9dd1e5f51c90e528ac68fc1ce7db9434dc0bd`

## CLOSED — L3 QUARTIER MAÂRIF

Human Gate Product Owner: **APPROVED**.

Retained strict score: **8.8/10**.

Exact evidence:
- Casablanca Visual AFTER: run **36751693759** — SUCCESS
- artifact: **11115097297**
- digest: `sha256:7dc666f7e868342d3bf5b2e3e91e2bd178ad648c12218ed8b56b4e07f1078490`
- Multi-city: **36751694080** — SUCCESS
- N3: **36751693493** — SUCCESS
- P1A.6: **36751693563** — SUCCESS
- viewports: 390×844 / 430×932 / 768×900 / 1280×900
- Overture runtime: 4 917 features / 772 exact heights / 4 145 level-estimated
- no Vercel deployment
- no merge

Validated visual language:
- basemap: `voyager-inspired-openfreemap-v1`
- buildings: `standard-inspired-overture-v1`
- polish: `material-relief-v3`
- labels: `akarfinder-owned`
- context relief: subtle, continuous, truth-safe
- administrative boundary remains distinct and disclosed

## NEXT — RUE / PROXIMITÉ

### Goal
At street-level zoom, reveal more local structure without changing the AkarFinder visual language.

### Success
- street hierarchy is immediately readable;
- local building grain is richer but not noisy;
- useful POI/access information appears progressively;
- no invented streets, access, distances, building geometry or property pins;
- desktop and mobile remain one coherent system.

### Visual target
- Voyager-like warm neutral cartography;
- Standard-like soft building material;
- architectural-paper finesse at fine zoom;
- less macro territory emphasis, more local frontage/street structure;
- restrained labels;
- AkarFinder navy/blue accents only where functional.

### Required workflow
1. choose one truth-safe Maârif street/proximity pilot from repo/source data;
2. BEFORE exact-head;
3. lock written target/reference;
4. implement;
5. AFTER same 4 viewports;
6. truth/performance tests;
7. severe visual score;
8. human gate.

### Non-negotiables
- L3 human-approved composition is baseline, not a redesign target;
- no false neighborhood boundary;
- no fake exact listing position;
- no Vercel without explicit approval;
- do not merge #1090 without explicit approval.

## Next exact

Inspect available Maârif street/road source coverage and select the strongest truth-safe pilot for the Rue/Proximité TARGET.
