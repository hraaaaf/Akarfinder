# AKARFINDER — RUE / PROXIMITÉ — TARGET CONTRACT

Status: ACTIVE — implementation not started  
Date: 2026-09-30  
Repository: `hraaaaf/Akarfinder`  
Branch: `feat/akar-map-quartier-target-couche3`  
PR: #1090 — DRAFT  
Parent baseline: L3 Quartier Maârif human-approved

## 1. Goal

At fine zoom, transform the validated Maârif neighborhood map into a premium **street/proximity reading** without changing the AkarFinder visual language.

The zoom does not switch style. It progressively reveals more AkarFinder detail.

## 2. Pilot

Selected pilot:
**Twin Center crossroads — Boulevard Mohamed Zerktouni × Boulevard Al Massira Al Khadra, Casablanca.**

Anchor already present in the repo:
- landmark id: `landmark_casablanca_maarif_twin_center`
- canonical name: `Twin Center`
- coordinates: `33.58658, -7.63229`
- precision: `verified_landmark_point`
- existing registry sources: Visit Casablanca / Mapcarta / Wikidata

External cross-check:
- Visit Casablanca explicitly places Twin Center at the crossroads of Zerktouni and Al Massira Al Khadra.
- BMCI has a Zerktouni Twin Center branch at 210 boulevard Zerktouni.

Why this pilot:
- flagship verified landmark;
- strong primary-road hierarchy;
- dense secondary street grain around it;
- useful stress test for building material, labels and local POI density;
- already inside the approved Maârif visual system.

## 3. Visual references

Primary baseline:
- current approved L3 Maârif exact-head visual language.

Reference family:
- CARTO Voyager: warm neutral ground, clear road hierarchy, restrained density.
- Mapbox Standard: symbolic realism, soft 3D material, controlled lighting.
- architectural-paper principle: finer local lines/material at high zoom, without becoming an architectural drawing or changing brand.

AkarFinder interpretation:
**Voyager-like street hierarchy + Standard-like soft buildings + architectural-paper finesse.**

## 4. Visual target

At first glance the user should understand:
“I am now reading the immediate street environment around the Twin Center.”

Required:
- Twin Center remains the flagship anchor;
- Zerktouni and Al Massira read as structural axes;
- secondary streets emerge progressively;
- building footprints/volumes become more precise visually, not heavier;
- fewer macro-territory effects;
- local POI labels remain restrained;
- AkarFinder navy/blue accents stay functional, not decorative;
- local street grain is richer than L3 without label clutter.

## 5. Truth contract

May:
- style real road geometry;
- style verified building footprints/heights;
- add non-metric shadows/material;
- progressively reveal sourced road names/POIs;
- use the verified Twin Center point as the pilot anchor.

May not:
- invent a street or access;
- invent a building entrance;
- invent a distance or walk-time;
- invent an exact listing position;
- turn an indicative neighborhood envelope into a street boundary;
- invent building height.

## 6. Interaction target

Fine zoom should support:
- pan/zoom/reset;
- clear orientation back to Maârif;
- street-scale labels;
- local context filters;
- search handoff.

No new heavy panel is introduced by default.

## 7. Acceptance viewports

Mandatory:
- 390×844
- 430×932
- 768×900
- 1280×900

Same workflow:
BEFORE → TARGET → implementation → AFTER → comparison → tests → severe score → human gate.

## 8. Success

- street hierarchy reads immediately;
- Twin Center context is recognizable;
- secondary streets/buildings are richer but not noisy;
- no obvious visual rupture from the approved L3;
- no false geographic precision;
- no overflow/collision regression;
- exact-head artifact available;
- human gate approves.

## 9. BEFORE authority

The next implementation step must first capture the current L3-approved renderer at this pilot/camera as the BEFORE.

Do not implement the Rue visual pass before the BEFORE is preserved.

## 10. Merge / deploy

- PR #1090 stays DRAFT.
- No merge without explicit Product Owner authorization.
- No Vercel deployment without explicit Product Owner authorization.
