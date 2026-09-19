# Landmark Factory — Mohammedia / Centre — 2026-09-19

## Scope
Canonical district: `district_mohammedia_centre` (`mohammedia/centre`). Existing seed already contains `Gare de Mohammedia`; duplicate check found no Parc des Villes Jumelées or Église Saint-Jacques entry. This lot is evidence-only until the active seed/visual chain is stabilized; no business data, Supabase, ranking, merge or deployment mutation.

## AkarFinder notoriety rubric
Weighted /100: public visibility 25, orientation value 25, local anchoring 20, visual singularity 15, source reliability 15.

## RETAIN — Parc des Villes Jumelées (Parc de Mohammedia)
- Score: **92/100** = visibility 24/25 + orientation 24/25 + local anchoring 20/20 + visual singularity 10/15 + sources 14/15.
- Proposed entity: `landmark_mohammedia_centre_parc_villes_jumelees`; slug `parc-villes-jumelees`; category `park`; tier `major`; retainPriority `true`.
- Verified point: **33.70575, -7.39766** (OSM way 571799684 / Mapcarta).
- Primary/public evidence: DGCT/Ministry inventory lists Mohammedia — `Villes Jumelées (ancien)` and condition `Bon`.
- Regional tourism evidence: Visit Casablanca calls Jardin du Parc an emblematic, heavily frequented Mohammedia place.
- Independent geospatial evidence: Mapcarta/OSM way 571799684 gives 33.70575, -7.39766.
- Sources:
  - https://collectivites-territoriales.gov.ma/sites/default/files/pnct/2021-06/Lettre%20des%20Collectivit%C3%A9s%20Locales%20N%C2%B0%209%20Fran%C3%A7ais.pdf
  - https://visitcasablanca.ma/pois/jardin-du-parc/
  - https://mapcarta.com/W571799684
- Artwork brief: semi-figurative simplified garden composition using the park's long tree canopy / promenade geometry; recognizable green mass and central path, AkarFinder restrained navy/green/cream palette; no generic tree pictogram, no photorealism.
- Reveal proposal: major, ~zoom 10.7 city overview; GPS pin immutable; collision priority below Gare de Mohammedia only if screen-space conflict.

## RETAIN — Église Saint-Jacques de Mohammedia
- Score: **88/100** = visibility 20/25 + orientation 21/25 + local anchoring 19/20 + visual singularity 15/15 + sources 13/15.
- Proposed entity: `landmark_mohammedia_centre_eglise_saint_jacques`; slug `eglise-saint-jacques`; category `worship`; tier `major`; retainPriority `false`.
- Verified point: **33.70642, -7.39785** (plus-code/map corroboration; ~75 m north of park).
- Primary evidence: Archidiocèse de Rabat identifies the active Saint-Jacques parish at Bd Zerktouni, Mohammedia and describes its distinctive form as two joined hands.
- Regional tourism evidence: Visit Casablanca independently identifies Saint-Jacques in the heart of Mohammedia at Boulevard Foch and emphasizes its sober colonial architecture.
- Coordinate corroboration: local geocoded listing `PJ42+JQQ` / Boulevard Foch and independent nearby geospatial references converge around 33.7064, -7.3979.
- Sources:
  - https://dioceserabat.org/eglise-saint-jacques/
  - https://dioceserabat.org/lassomption-a-mohammedia/
  - https://visitcasablanca.ma/en/pois/leglise-saint-jacques/
  - https://www.goafricaonline.com/ma/824854-eglise-saint-jacques
- Artwork brief: simplified silhouette of the distinctive paired upward roof volumes / joined-hands profile, warm cream facade with restrained navy contour and muted green context; no cross-only generic icon; non-photorealistic.
- Reveal proposal: major/local-strong boundary, ~zoom 11.3; because it is only ~75 m from the park, never displace its GPS pin. At lower zoom show the higher-priority park; reveal Saint-Jacques only when projected pin spacing passes the existing collision threshold.

## REJECT / HOLD — Plage du Centre Mohammedia
- Evidence of real use and public importance is strong (Fondation Mohammed VI pour la Protection de l'Environnement 2023; recent press), but a sufficiently precise, independently corroborated point for the canonical landmark anchor was not obtained in this run.
- **Decision: HOLD, do not register.** No approximate beach centroid is allowed.
- Sources reviewed:
  - https://files.plagespropres.org/uploads/fbb34429945edbcc5b3d052d274a03f3.pdf
  - https://fr.le360.ma/societe/restes-de-repas-sable-souille-dechets-eparpilles-lenvers-du-decor-de-la-plage-du-centre-de_JK34AB32TVCHJIZOVUWSEBGVJU/

## Collision / progressive reveal contract
The park and Saint-Jacques form a micro-cluster. GPS coordinates remain immutable. At overview zoom, retain only Parc des Villes Jumelées. Saint-Jacques may appear only once projected spacing clears the visual-system minimum; no artificial relocation to make both fit. Existing card tether limit remains <=22 px.

## Safety / mutation proof
- No Supabase mutation.
- No ranking mutation.
- No business-data mutation.
- No merge.
- No deployment.
- Runtime registry insertion and artwork implementation intentionally deferred until the active seed + visual PR chain is stable, preventing branch contamination.
