# Vivre Ici — Fès Ville Nouvelle — LOT 02 — 2026-09-20

## Result
**RETAIN — Gare de Fès-Ville → Ville Nouvelle.**

The verified runtime registry already contains Place Florence for `fes/ville-nouvelle`; no Gare de Fès landmark was present in the inspected registry slice, so this is not a duplicate of the existing landmark.

## Evidence
- Primary: ONCF 2023 annual/ESG material identifies the **new Gare de Fès-Ville**, inaugurated in 2009.
- Independent territorial corroboration: current Fès travel/local guides explicitly place Gare de Fès in **Ville Nouvelle**, including at the north of Ville Nouvelle.
- Independent map point: Mapcarta/OSM-backed point `34.04811, -5.00621`; published station coordinates independently cluster at `34.04746, -5.00564`.

Retained point: **34.04811, -5.00621** (`verified_landmark_point`).

Sources:
1. https://www.oncf.ma/content/download/99185/2307876/file/Rapport%20ESG%202023.pdf
2. https://mapcarta.com/fr/17406342
3. https://fr.wikipedia.org/wiki/Gare_de_F%C3%A8s-Ville

## AkarFinder notoriety score — 98/100
- Public visibility: **20/20**
- Orientation value: **20/20**
- Local anchoring: **20/20**
- Visual singularity: **19/20**
- Source reliability: **19/20**

## Illustration target
Semi-figurative simplified rendering of the modern Fès-Ville station: long low white station frontage, central monumental entrance rhythm, restrained geometric/zellige cues and forecourt. No ONCF logo, text, generic train pictogram or photorealism.

## Map behavior
Recommended `minZoom=13.3`, `retainPriority=true`. Use the existing progressive zoom/collision engine; do not bypass collision resolution.

## Rejected / held candidates
- **Borj Fez** — HOLD for this district: high notoriety but authoritative reporting describes it as *between* Ville Nouvelle and the old Medina. That wording is insufficient to prove a clean canonical parent.
- No third candidate is promoted merely to fill quota.

## Runtime insertion gate
The candidate is certified, but this branch intentionally does **not** replace `lib/geo/territory-landmark-registry.ts`: the connector returns the large registry in truncated slices and its write API requires complete-file replacement. Reconstructing the file from partial output would create a regression risk. Runtime insertion must use a byte-complete safe edit path.

## Guardrails
0 Supabase; 0 business-data mutation; 0 ranking; 0 merge; 0 deploy.
