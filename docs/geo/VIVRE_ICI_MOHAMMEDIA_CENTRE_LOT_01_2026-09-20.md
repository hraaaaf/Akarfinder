# Vivre Ici — Mohammedia Centre LOT 01

Date: 2026-09-20

## Existing-registry check

`Parc des Villes Jumelées` is already present in `VERIFIED_LANDMARKS` as `landmark_mohammedia_centre_parc_villes_jumelees` (92/100), so it is **not duplicated**.

## Candidate 1 — Église Saint-Jacques — RETAIN — 92/100

Canonical parent: `district_mohammedia_centre`.

Evidence:
- Visit Casablanca describes Saint-Jacques as standing **in the heart of Mohammedia** and gives Boulevard Foch.
- Archidiocèse de Rabat (primary ecclesiastical source) confirms Église Saint Jacques de Mohammedia and its Boulevard Zerktouni address.
- OSM-backed Mapcarta identifies the church footprint at **33.70653, -7.39797**, immediately beside Parc des Villes Jumelées, the already-certified centre landmark.

AkarFinder score:
- public visibility: 18/20
- orientation value: 18/20
- local anchoring: 19/20
- visual singularity: 19/20
- source reliability: 18/20
- **total: 92/100**

Proposed runtime identity:
- id: `landmark_mohammedia_centre_eglise_saint_jacques`
- slug: `eglise-saint-jacques`
- category: `heritage`
- coordinates: `33.70653, -7.39797`
- precision: `verified_landmark_point`
- visibility: `minZoom=13.7`, `retainPriority=true`

Mini-illustration target: simplified semi-figurative church massing with the recognizable sober colonial façade, pitched roof and vertical bell/front element; no cross-as-generic-icon treatment, no text, no photorealism. Preserve existing AkarFinder stroke/palette language and small-marker readability.

## Candidate 2 — Parc des Villes Jumelées — DUPLICATE / NO-OP

Strong candidate, but already certified in runtime registry. No duplicate created.

## Candidate 3 — Préfecture de Mohammedia — REJECT — 76/100

- public visibility 14/20
- orientation 16/20
- local anchoring 18/20
- visual singularity 11/20
- source reliability 17/20

The point is reliable and central, but the building is visually generic and weaker than the existing park and Saint-Jacques for Vivre Ici. Reject rather than inflate landmark density.

## Runtime-registry status

The candidate is verified, but **not inserted in `territory-landmark-registry.ts` in this lot**. The GitHub connector requires complete-file replacement; the file is large and the safe read is chunked/truncated. Reconstructing it from partial responses would create an unacceptable regression risk. The evidence record is committed; runtime insertion must use a byte-complete safe patch path.

## Guardrails

0 Supabase; 0 business-data mutation; 0 ranking; 0 merge; 0 deploy.
