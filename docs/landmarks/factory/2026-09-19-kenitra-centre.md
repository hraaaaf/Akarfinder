# Landmark Factory — Kénitra / Centre — 2026-09-19

## Existing density / duplicate guard
Canonical district: `district_kenitra_centre_ville` (`centre-ville`). Existing seed already contains Gare de Kénitra; it is excluded from this batch.

## Candidate 1 — Stade Municipal de Kénitra — RETAIN
Coordinates: `34.252685, -6.571552`.

AkarFinder notoriety score: **91.0/100**
- public visibility: 92/100
- orientation value: 93/100
- local anchoring: 98/100
- visual singularity: 78/100
- source reliability: 94/100

Evidence:
- Primary/local club: https://kac.football/stade-municipal/ — KAC identifies the Stade Municipal de Kénitra as its ground and documents opening/history.
- Primary federation: https://frmf.ma/fr/articles/%D9%85%D8%A8%D8%A7%D8%B1%D8%A7%D8%AA%D8%A7%D9%86-%D9%88%D8%AF%D9%8A%D8%AA%D8%A7%D9%86-%D9%84%D9%84%D9%85%D9%86%D8%AA%D8%AE%D8%A8-%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A-%D9%84%D9%85%D9%88%D8%A7%D9%84-3 — FRMF confirms national-team fixtures at the municipal stadium in Kénitra (22 Mar 2025 notice).
- Independent coordinate corroboration: https://fr.wikipedia.org/wiki/Stade_municipal_de_K%C3%A9nitra gives 34.252685 / -6.5715516; German article independently reports 34.252692 / -6.571468.
- Independent location context: https://estadiosdb.com/estadios/mar/stade_municipal_de_kenitra describes it near the historic centre.

Proposed payload:
- id: `landmark_kenitra_centre_ville_stade_municipal`
- citySlug: `kenitra`
- districtSlug: `centre-ville`
- landmarkSlug: `stade-municipal`
- canonicalName: `Stade Municipal de Kénitra`
- category: `sports`
- importance: 91 / major
- minZoom: 13.8; retainPriority: true
- coordinates precision: `verified_landmark_point`

Artwork brief: semi-figurative simplified stadium frontage/covered stand, low horizontal silhouette, visible floodlight mast as recognition cue, Kénitra green used sparingly as an environmental accent; no football pictogram, no generic stadium icon, no photorealism, no club crest.

## Candidate 2 — Place du 11 Janvier — HOLD
The place is real and important as the north forecourt of the station. EGA's project documentation calls it a true square linked to the station, and Le Matin independently records a municipal/ONCF event there. However it is effectively part of the already represented Gare de Kénitra micro-cluster and a sufficiently independent point coordinate was not corroborated. Adding it now would create visual redundancy rather than useful orientation.

Sources:
- https://erikgiudice.com/en/work/gare-lgv-de-kenitra/
- https://lematin.ma/journal/2006/Kenitra_Une-dynamique-ecologique/2107.html

## Candidate 3 — Université Ibn Tofail — REJECT for this district
Strong real-world landmark and primary evidence exists, but official university material places the campus south of the railway; the station design documentation distinguishes the northern historic/centre side from the southern university side. It should not be forced into canonical `centre-ville` merely to increase density.

Sources:
- https://www.uit.ac.ma/
- https://iro.uit.ac.ma/contact/
- https://erikgiudice.com/en/work/gare-lgv-de-kenitra/

## Runtime / safety contract
This factory batch is evidence-only. No Supabase, business data, ranking, merge, deploy, or runtime registry mutation. When integration is authorized, the retained stadium must use immutable verified GPS projection and the existing progressive zoom/collision engine. The existing Gare de Kénitra has higher orientation priority; no card may be moved away from its projected pin to resolve collision.

## Verdict
One safe improvement found. Retain Stade Municipal only. HOLD Place du 11 Janvier. Reject Université Ibn Tofail from this district.