# Landmark Factory — Fès / Ville Nouvelle — 2026-09-19

Status: VERIFIED CANDIDATE LOT — no merge / no deploy / no Supabase or ranking mutation.

## Coverage decision
Canonical district selected: `district_fes_ville_nouvelle` (`fes/ville-nouvelle`). It is currently among the least-rich canonical map districts in the verified registry/seed.

## Scoring contract
AkarFinder Map Priority = 0.50 × public visibility + 0.30 × orientation value + 0.20 × visual singularity. Source confidence is a separate gate and must be >=80.

## RETAIN — Gare de Fès-Ville
- Proposed id: `landmark_fes_ville_nouvelle_gare_fes_ville`
- Category: transport
- Verified point: `34.04724, -5.00528` (station building point; OSM-backed Mapcarta)
- Public visibility: 94/100
- Orientation value: 100/100
- Local anchoring: 96/100
- Visual singularity: 86/100
- Source confidence: 94/100
- Map Priority: **94.2/100 — Iconique**
- Sources:
  - Apple Maps listing identifies Gare de Fès, links ONCF Voyages and gives Avenue des Almohades.
  - Mapcarta/OSM building point: https://mapcarta.com/fr/W535025035
  - MAP/Le Matin reporting on the new Fès station and ONCF modernization: https://lematin.ma/express/2009/Nouvelle-gare-de-Fes_Nouveau-joyau-des-infrastructures-ferroviaires/124300.html
- Illustration brief: simplified white station façade, central entrance/clock-axis impression and forecourt; preserve the broad horizontal railway-station silhouette; no generic train icon.
- Reveal: iconic/early; `retainPriority=true`; collision engine remains authoritative.

## RETAIN — Borj Fès
- Proposed id: `landmark_fes_ville_nouvelle_borj_fes`
- Category: retail
- Verified point: `34.0460631, -4.9947107`
- Public visibility: 90/100
- Orientation value: 91/100
- Local anchoring: 94/100
- Visual singularity: 78/100
- Source confidence: 90/100
- Map Priority: **87.9/100 — Majeur**
- Sources:
  - Official site: https://borjfez.com/
  - Commune de Fès/MAP article confirms Borj Fès and its position between Ville Nouvelle and the old Medina: https://www.communesmaroc.com/fr/commune/fes-medina/articles/view/2013/05/22021-nouveau-centre-commercial-a-fes
  - Independent address/GPS corroboration: https://warriorsafety.ae/minajliki/annuaire/centre-commercial-borj-fes-fes-212-5356-20492/
- Illustration brief: simplified three-level mall massing with the distinctive broad commercial façade/terrace composition; no shopping-bag pictogram.
- Reveal: major; after the station at district zoom; collision engine remains authoritative.

## REJECT / HOLD — Place Florence
- Public visibility and local anchoring are strong, and multiple sources identify it as an emblematic Ville Nouvelle public space.
- Rejected for this lot because an adequately precise, independently corroborated landmark point was not established to the same confidence as the two retained candidates.
- Do not enter registry until point-level geolocation is independently confirmed.

## Safety / scope
No business data, Supabase, search ranking, listing ranking, deployment, or production state changed. This lot records only verified landmark evidence and visual briefs. Runtime registry insertion should occur on a dedicated follow-up branch after the current seed/visual PR chain is settled, to avoid contaminating PR #1041/#1042.
