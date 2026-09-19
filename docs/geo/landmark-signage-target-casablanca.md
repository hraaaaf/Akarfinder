# AkarFinder — Landmark Signage Target

Status: TARGET LOCK
Validated: 2026-09-19
Scope: Vivre Ici / Visual Landmark Dictionary / Casablanca

## Durable visual source

- File: `AKARFINDER_VIVRE_ICI_LANDMARK_SIGNAL_TARGET_CASABLANCA_2026-09-19.png`
- Dimensions: 1448 × 1086
- SHA-256: `6af2f518102e4e4372f69db0c38bb89ef365b37184f81339a459777feb6be177`
- Google Drive ID: `1RfeNGDAJ8nN25FmKZaE1o73pTFj0IZ5f`
- Google Drive URL: https://drive.google.com/file/d/1RfeNGDAJ8nN25FmKZaE1o73pTFj0IZ5f/view?usp=drivesdk

## Visual contract

Landmarks use an AkarFinder urban-signage language, not generic UI icons.

1. The real landmark remains immediately recognizable from its dominant silhouette, facade or scene.
2. Simplification is allowed only when it preserves the landmark's identity.
3. Map callouts and sidebar thumbnails use the same artwork family.
4. Palette stays inside the AkarFinder system: navy, blue, green, sand/cream and restrained warm accents.
5. Miniatures must remain legible at card scale.
6. Generic buildings are forbidden for TARGET landmarks.
7. GPS projection, tether, collision and reveal remain governed by the frozen localization contract.

## Casablanca TARGET artworks

- Twin Center → twin towers silhouette
- Stade Mohammed V → oval stadium + stands/floodlights
- Morocco Mall → distinctive mall facade/entrance
- CFC First Tower → angular business-tower silhouette
- Anfa Park → landscaped park + paths/palms
- Lycée Lyautey → dedicated institutional facade
- Institut Espagnol Juan Ramón Jiménez → distinct institutional facade / tower
- Forêt de Bouskoura → forest composition

## Implementation branch

- PR: #1044
- Branch: `feat/vivre-ici-landmark-consolidated`
- First signage artwork commit: `81aaa8c30d7597a06f380bc855dc9ece282c3fde`
- Dedicated artwork contract test commit: `643d2ea188fd2afdc6bd457c2c7923cc804bfeb2`

## Success proof required

- exact-head territory tests green
- TypeScript green
- production build green
- Landmark Visual System Certification green
- AFTER screenshots at 390×844 / 768×900 / 1280×900 / 1448×1086
- visual comparison against this TARGET
- 0 major callout overlap
- frozen localization invariants unchanged
