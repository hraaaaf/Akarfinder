# Landmark Factory — Tanger / Marchan — 2026-09-19

## Scope

Canonical parent: `district_tanger_marchan` (`tanger` / `marchan`). The current seed register contains no Marchan landmark, so this is a zero-density canonical district and a priority enrichment target.

No business data, Supabase, ranking, deployment or merge is touched by this batch.

## Scoring contract

Factory score /100 = 25% public visibility + 25% orientation value + 20% local anchoring + 15% visual singularity + 15% source reliability. Confidence/source reliability below 80 is a hard reject.

## RETAIN — Café Hafa

- Proposed id: `landmark_tanger_marchan_cafe_hafa`
- Canonical name: Café Hafa
- Parent: `district_tanger_marchan`
- Category: `heritage`
- Verified point: **35.79140, -5.82198**
- Public visibility: 100/100
- Orientation value: 96/100
- Local anchoring: 100/100
- Visual singularity: 94/100
- Source reliability: 91/100
- **Factory score: 96.7/100 — Iconique**
- Suggested runtime importance: 97; `retainPriority: true`; initial reveal around city zoom 10.2 / registry `minZoom` around 13.4.

### Evidence

1. Primary: Moroccan National Tourist Office (ONMT), Tangier destination/football page, explicitly uses Café Hafa as a Tangier destination reference: https://www.visitmorocco.com/en/morocco-kingdom-of-football/en/six-cities-one-passion/tangier
2. Independent OSM-backed point: Mapcarta Café Hafa, 35.79140 / -5.82198: https://mapcarta.com/N2856148906
3. Independent routing corroboration: Waze address `Q5RH+J5M, Rue Hafa, Tanger`: https://www.waze.com/fr/live-map/directions/ma/tangier-tetouan-al-hoceima/tanger/cafe-hafa?to=place.ChIJzTCl17Z4DA0ReUvtGnNMz6M
4. Independent local-context source: Discover Tanger explicitly places the café in Marshan and describes its stepped white terraces.

A secondary guide publishes a discrepant approximate point (~280 m south); it is not used. The selected point is the OSM point corroborated by the Waze plus-code/address.

### Artwork brief

Semi-figurative AkarFinder miniature: white stepped terraces descending toward a navy/blue Strait horizon, compact cliff edge, tiny green accents, no generic coffee-cup pictogram, no photorealism. Recognition must come from the distinctive stacked terraces + sea relationship.

## RETAIN — Nécropole punico-romaine de Hafa / Tombeaux phéniciens

- Proposed id: `landmark_tanger_marchan_necropole_hafa`
- Canonical name: Tombeaux phéniciens de Tanger
- Aliases: Nécropole punico-romaine de Hafa; Phoenecian Gravesite
- Parent: `district_tanger_marchan`
- Category: `heritage`
- Verified point: **35.79097, -5.82013**
- Public visibility: 86/100
- Orientation value: 88/100
- Local anchoring: 100/100
- Visual singularity: 90/100
- Source reliability: 86/100
- **Factory score: 90.0/100 — Iconique**
- Suggested runtime importance: 90; `retainPriority: false`; reveal later than Café Hafa because the two anchors are only ~175 m apart.

### Evidence

1. Independent heritage reporting: Yabiladi identifies the tombs on the Marchan plateau, near Café Hafa: https://www.yabiladi.com/articles/details/75884
2. Independent OSM-backed point: Mapcarta archaeological site, 35.79097 / -5.82013: https://mapcarta.com/N8847621694
3. Independent travel/heritage description: Vanupied identifies the necropolis on the Marshan cliff, about 450 m from the Kasbah and under five minutes from Café Hafa: https://www.vanupied.com/maroc/guide-tanger/necropole-punico-romaine-de-hafa-a-tanger-plus-belle-vue-sur-le-detroit-de-gibraltar.html

No sufficiently specific primary public page was found for the necropolis in this run; therefore source reliability is deliberately capped at 86 rather than treated as primary-grade evidence.

### Artwork brief

Semi-figurative miniature: a few rectangular rock-cut tomb cavities in warm sandstone on a cliff terrace, navy Strait horizon behind, restrained vegetation. No skull, grave icon or generic archaeology pictogram. The rock-cut geometry + sea overlook must carry recognition.

## REJECT / HOLD — Palais Marshan

Real and locally identifiable, but rejected for this batch. Public-access/orientation value is weaker than Café Hafa and the necropolis, and the available sources did not establish a sufficiently strong independently corroborated public landmark point. Do not create a coordinate by inference from nearby streets or real-estate descriptions.

## Collision / reveal contract

Café Hafa and the necropolis are a micro-cluster (~175 m). Their GPS anchors must never be moved. Café Hafa wins at lower zoom due to the higher Factory score. The necropolis appears only when projected pin spacing clears the existing deterministic collision threshold; otherwise it remains suppressed. At deeper zoom both may appear with separate pins and short tethered cards. No label/card placement may imply a false geographic point.

## Registry state

This batch is **verified evidence ready**, but the runtime registry is intentionally not mutated in this commit because the active seed PR and visual-system PR are still the current integration chain. The two proposed entries above are the exact registry payload specification for the subsequent integration commit after that chain is stabilized. This avoids parallel edits to the same large registry while preserving the verified batch without merging it.

## Result

2 retained / 1 rejected. No merge. No deploy. No Supabase. No ranking mutation.
