# Landmark Factory — Tanger / Ville Nouvelle — 2026-09-19

Status: VERIFIED CANDIDATE LOT — evidence only. No registry/runtime insertion, merge, deploy, Supabase, business-data or ranking mutation.

## Coverage decision
Canonical district selected: `district_tanger_ville_nouvelle` (`tanger/ville-nouvelle`). Existing verified seed contains one landmark here: `Terrasse des Paresseux`. This is therefore one of the least-rich map-eligible canonical districts and this lot avoids duplicating that existing landmark.

## Scoring contract
AkarFinder Map Priority = 0.50 × public visibility + 0.30 × orientation value + 0.20 × visual singularity. Local anchoring and source confidence are reported separately; source confidence must be >=80 and district anchoring must be explicit enough to avoid false territorial assignment.

## RETAIN — Place de France
- Proposed id: `landmark_tanger_ville_nouvelle_place_de_france`
- Category: civic
- Verified point: `35.78115, -5.81268` (France Diplomatie GPS for 2 Place de France; use as square anchor pending polygon geometry)
- Public visibility: 96/100
- Orientation value: 98/100
- Local anchoring: 98/100
- Visual singularity: 84/100
- Source confidence: 96/100
- Map Priority: **94.2/100 — Iconique**
- Sources:
  - Primary French state source: https://www.diplomatie.gouv.fr/fr/services/annuaire-et-contacts/representations-fran%C3%A7aises/consulat-general-de-france-a-tanger — gives `2, place de France` and GPS `35.781147657163, -5.812679276198`.
  - Institut français du Maroc: https://if-maroc.org/tanger/contact-acces/ — confirms its Tanger site at `2, place de France`.
  - Independent district context: https://www.minube.com/rincon/place-de-france-a2958 — explicitly describes Place de France as a central node of Tanger's Ville Nouvelle with Boulevard Pasteur.
- Illustration brief: simplified urban-square composition using the recognizable terrace/café frontage and elevated bay-facing geometry; no generic map pin, flag or plaza pictogram.
- Reveal: iconic/early, but after/alongside Terrasse des Paresseux according to collision authority; never displace the GPS pin.

## RETAIN — Grand Hôtel Villa de France
- Proposed id: `landmark_tanger_ville_nouvelle_grand_hotel_villa_de_france`
- Category: heritage
- Verified point: `35.78303, -5.81468`
- Public visibility: 91/100
- Orientation value: 89/100
- Local anchoring: 90/100
- Visual singularity: 94/100
- Source confidence: 90/100
- Map Priority: **91.0/100 — Majeur**
- Sources:
  - Mapcarta/GeoNames/Wikidata point: https://mapcarta.com/32912066 — `35.78303, -5.81468`.
  - Independent 2026 northern Morocco guide: https://livretdunord.com/wp-content/uploads/2026/06/MON-LIVRET-DU-NORD-JUIN-2026_compressed.pdf — identifies the Grand Hôtel Villa de France as an emblematic historic Tangier address between the modern city and old medina.
  - Independent address corroboration: https://www.skyscanner.com.br/hoteis/marrocos/tanger-hotels/grand-hotel-villa-de-france/ht-129842488 — Angle Rue d'Angleterre et Hollande, Tanger 90000.
- Illustration brief: simplified Belle-Époque white façade nested in its green hillside/garden massing, with the distinctive long hotel volume; no generic hotel-bed or star pictogram.
- Reveal: major, after Place de France; collision engine may suppress it at low district zoom because the cluster is geographically tight.

## HOLD — El Minzah Hôtel
- Candidate point: `35.78187, -5.81241` from https://mapcarta.com/32115494.
- Primary identity/address source: https://elminzahhotel.ma/contact-us/ — 85 Rue de la Liberté, Tanger.
- Public visibility: 89/100
- Orientation value: 87/100
- Local anchoring: 87/100
- Visual singularity: 90/100
- Source confidence: 91/100
- Map Priority: **88.8/100**.
- HOLD reason: although real, well-known and precisely geolocated, it is only about 80 m from the Place de France anchor. Adding it in the same lot would create a dense micro-cluster with less incremental orientation value than Place de France + Villa de France. Keep in backlog; reconsider only if zoom-level density testing shows a useful high-zoom role.

## Visual / placement contract for follow-up implementation
- Mini-artworks must match the existing AkarFinder semi-figurative simplified style: recognizable silhouette, restrained detail, non-photorealistic, no generic pictogram.
- GPS pins are immutable projected coordinates.
- Cards remain locally tethered; no large anti-collision displacement.
- Progressive reveal: existing Terrasse des Paresseux → Place de France → Grand Hôtel Villa de France; exact reveal zoom to be certified in runtime, not guessed in this evidence lot.
- Tight-cluster collision must suppress the lower-priority landmark rather than falsify position.

## Safety / scope
No business data, Supabase, search/listing ranking, deployment or production state changed. No merge performed. This lot records verified evidence and implementation briefs only. Runtime registry insertion belongs to a dedicated follow-up branch after the current seed/visual PR chain is settled.