# Landmark Factory — Rabat / Océan — lighthouse verification pass

Date: 2026-09-19

## Baseline / dedup

The reconciliation baseline already contains Musée National de la Photographie / Fort Rottembourg for `district_rabat_ocean`. The Rabat lighthouse had previously been held out because source confidence was below the canonical gate. This pass re-evaluates it rather than creating a duplicate.

## Candidate 1 — Phare de Rabat / Borj Sirat — RETAIN

Canonical point: `34.03140, -6.84440` (rounded from the corroborated public point around 34.03147, -6.84440).

Score: **92/100 — Iconique**.

- Public visibility: 92/100
- Orientation value: 95/100
- Local anchoring: 94/100
- Visual singularity: 96/100
- Source reliability: 84/100

Evidence:

1. Wikidata Q3378343 identifies Rabat Lighthouse, gives a coordinate at 34°01′52″N, 6°50′38″W, Admiralty D2554 / NGA 113-23036, and points to the former Moroccan Ministry of Equipment `Phares du Maroc` page as the official website: https://www.wikidata.org/wiki/Q3378343
2. AroundUs independently publishes `34.03147,-6.84440` and identifies the same Rabat lighthouse on Boulevard Mokhtar Gazoulit: https://fr.aroundus.com/p/8473939-phare-de-rabat
3. Wikimedia Commons independently provides a large visual corpus and identifies the structure as the Rabat Lighthouse on Borj Sirat: https://commons.wikimedia.org/wiki/Category:Rabat_Lighthouse
4. The Wikimedia image record explicitly describes the lighthouse as built on the Borj Sirat platform: https://commons.wikimedia.org/wiki/File:Phare_de_Rabat_01.jpg

Decision rationale: identity, physical existence, visual form and point now cross-corroborate sufficiently for the AkarFinder gate. The old Ministry reference is preserved as provenance but is not treated as currently reachable primary evidence. Reliability therefore remains below the other four dimensions rather than being inflated.

Artwork brief: white square/cylindrical lighthouse mass with dark lantern cap, sitting on the low ochre Borj Sirat platform, Atlantic edge suggested by two restrained wave strokes. Semi-figurative, simplified, recognizable; no generic lighthouse pictogram, no photorealism.

Theme intent: `lighthouses-forts-ramparts` + `historic-monuments` once the editorial theme layer is merged.

## Candidate 2 — Bab El Had — REJECT for Océan

Real and highly recognizable, but territorial attribution is cleaner to the Medina / boundary context. Do not force it into `district_rabat_ocean`; keep it as citywide/backlog candidate.

## Candidate 3 — Plage de Rabat — REJECT as landmark object

Real and useful geographically, but too broad as an object and insufficiently singular for the semi-figurative landmark layer. It belongs to a future coastline/amenity layer rather than this point-landmark registry.

## Zoom / collision contract

- GPS is immutable; no decorative displacement.
- Fort Rottembourg remains the first retained Ocean landmark at low zoom.
- Phare de Rabat is revealed only when projected spacing satisfies the frozen localization/collision contract.
- If both compete for the same screen-space slot, the higher runtime priority wins; the hidden item is not moved.
- No change to business ranking, Supabase, listing data or district geometry.

## Integration status

Evidence and artwork target are committed on `factory/landmarks-rabat-ocean-lighthouse-20260919`.
Runtime registry mutation is intentionally deferred until the exact registry patch can be validated without disturbing the concurrent theme-contract branch. No merge and no deployment are authorized by this lot.
