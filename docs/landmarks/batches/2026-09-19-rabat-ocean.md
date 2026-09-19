# Landmark Factory — Rabat / Océan — 2026-09-19

## Selection rationale

Canonical district `district_rabat_ocean` is validated but currently has no landmark in the seed registry. Existing registry/backlog checked first; no duplicate candidate below is present.

## Scoring contract

AkarFinder notoriety /100 = public visibility 25% + orientation value 25% + local anchoring 20% + visual singularity 15% + source reliability 15%.

## RETAIN — Musée National de la Photographie / Fort Rottembourg

- Proposed ID: `landmark_rabat_ocean_musee_national_photographie`
- Slug: `musee-national-photographie`
- Category: `heritage`
- Verified point: `34.02499, -6.85099`
- Score: **92.8 / 100 — iconic**
  - public visibility: 91
  - orientation value: 93
  - local anchoring: 98
  - visual singularity: 95
  - source reliability: 87
- Sources:
  - Primary: Fondation Nationale des Musées — https://www.fnm.ma/museums/36
  - Official destination: https://www.visitrabat.com/lieux/musee-national-de-la-photographie/
  - Independent geospatial: https://mapcarta.com/W564924293
  - Independent local cultural directory: https://culturama.ma/institutions/musee-national-photographie
- Verification: FNM identifies the museum in Fort Rottembourg at 61 Avenue Mokhtar Jazoulite; independent sources explicitly place it in quartier de l’Océan. OSM-backed geometry fixes the fort point at 34.02499/-6.85099.
- Artwork brief: simplified semi-figurative view of the low ochre fort mass, central Moroccan arches and one characteristic heavy coastal cannon silhouette; flat AkarFinder palette, no camera pictogram, no generic museum icon, no photorealism.
- Reveal: high-priority iconic; reveal early at city zoom, GPS anchor immutable.

## RETAIN — Phare de Rabat / Borj Sirat

- Proposed ID: `landmark_rabat_ocean_phare_rabat`
- Slug: `phare-rabat`
- Category: `heritage`
- Verified point: `34.03140, -6.84440`
- Score: **91.2 / 100 — iconic**
  - public visibility: 93
  - orientation value: 95
  - local anchoring: 92
  - visual singularity: 97
  - source reliability: 76
- Sources:
  - Independent structured geodata: https://www.wikidata.org/wiki/Q3378343
  - Independent media/geodata: https://commons.wikimedia.org/wiki/Category:Rabat_Lighthouse
  - Heritage context: https://fr.wikipedia.org/wiki/Phare_de_Rabat
  - FNM spatial corroboration: https://www.fnm.ma/museums/36 (Fort Rottembourg described as halfway between the lighthouse and former military hospital)
- Verification: Wikidata gives 34°01′52″N, 6°50′38″W; Wikimedia Commons gives 34°01′53.04″N, 6°50′39.84″W. Rounded retained point 34.03140/-6.84440. Sources agree on Rabat lighthouse/Borj Sirat identity and coastal setting.
- Reliability intentionally capped: no sufficiently precise current primary lighthouse page was found during this run.
- Artwork brief: tall white square lighthouse tower rising from the ochre Borj Sirat platform, small lantern room and Atlantic edge; simplified semi-figurative silhouette, no generic lighthouse pictogram, no photorealism.
- Reveal: after Fort Rottembourg if collision occurs; GPS anchor immutable.

## REJECT — Bab El Had for Océan

- Candidate is real, iconic and precisely geolocated (`~34.02194, -6.84039`).
- Official Visit Rabat verifies its identity and role as the southwest gate of the historic Medina.
- Rejected from this batch because it is a boundary/Medina landmark rather than a clean Océan anchor. Adding it under `district_rabat_ocean` would weaken district truth even though it is useful citywide.
- Keep as citywide/backlog candidate, not an Océan payload.

## Collision / zoom contract

Fort Rottembourg and the Rabat lighthouse are about 0.9 km apart, so both may coexist once projected separation passes the visual-system pin-spacing threshold. At lower zoom, Fort Rottembourg wins by source confidence/local anchoring. Cards never move the GPS pin; the lower-priority landmark is withheld until separation is safe.

## Safety / scope

Research + evidence batch only. No business data, Supabase, ranking, deployment, merge, or production mutation. Runtime registry/artwork integration must wait for the current seed/visual chain to stabilize and requires its own certification.