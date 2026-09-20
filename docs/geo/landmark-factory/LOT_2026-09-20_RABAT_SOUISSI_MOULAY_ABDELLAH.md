# Landmark Factory — Rabat / Souissi — Complexe Moulay Abdellah — 2026-09-20

## Result

Candidate retained: **Complexe Sportif Prince Moulay Abdellah**.

AkarFinder score: **99/100**.

- Public visibility: 20/20
- Orientation value: 20/20
- Local anchoring: 20/20
- Visual singularity: 20/20
- Source reliability: 19/20

## Anti-duplicate / district selection

The current canonical runtime registry on `main` contains one Souissi landmark: `landmark_rabat_souissi_mega_mall`. No Moulay Abdellah landmark is present on `main`.

Souissi is therefore still among the low-density canonical districts and gains meaningful orientation value from this addition.

## Evidence

Primary source:
- SONARGES: https://www.sonarges.ma/infrastructures/complexe-moulay-abdellah/
  - explicitly says `Rabat — quartier Souissi`
  - identifies the complex as a major national sports facility
  - records the complex address and its role for major football events.

Independent sources:
- Mapcarta / OpenStreetMap-backed point: https://mapcarta.com/W1368373354
  - `33.95979, -6.88906`
  - OSM way `1368373354`.
- Reuters, AFCON stadium selection: https://www.reuters.com/sports/soccer/nine-stadiums-chosen-next-africa-cup-nations-finals-morocco-2025-01-27/
  - confirms the stadium's national/international event importance.

## Canonical payload

- id: `landmark_rabat_souissi_complexe_moulay_abdellah`
- city: `rabat`
- district: `souissi`
- parent: `district_rabat_souissi`
- slug: `complexe-moulay-abdellah`
- category: `sports`
- coordinates: `33.95979, -6.88906`
- precision: `verified_landmark_point`
- importance score: `99`
- tier: `flagship`
- minZoom: `13.2`
- retainPriority: `true`

## Visual target

Dedicated semi-figurative mini-illustration: low horizontal stadium bowl, distinctive champagne/gold triangular facade rhythm, dark entrance void and restrained navy ground shadow. No football pictogram, no generic stadium icon, no photorealism.

Asset prepared at `public/landmarks/rabat-souissi-complexe-moulay-abdellah.svg`.

## Collision / reveal contract

GPS is immutable. The new landmark is flagship priority 99 and should reveal before Mega Mall (95) at lower district zoom. Existing deterministic collision logic must suppress the lower-priority callout whenever projected spacing is insufficient; no artificial coordinate displacement is allowed.

## Rejected / not separately promoted

- Palais des Sports — same sports complex; useful facility but too spatially/semantically coupled to the flagship stadium for this lot.
- Piscine Olympique Prince Moulay Abdellah — same reason; would create micro-cluster noise rather than a distinct territorial anchor.

## Guardrails

0 Supabase. 0 business data. 0 ranking. 0 merge. 0 deploy.

Runtime registry insertion is intentionally not claimed in this commit: the connector response for the large registry is truncated and a blind whole-file replacement would be unsafe. The exact payload above is ready for a byte-complete insertion once the file can be safely materialized/read in full.
