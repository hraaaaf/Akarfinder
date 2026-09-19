# AkarFinder — Landmark Signage Target

Status: TARGET LOCK
Validated: 2026-09-19
Scope: Vivre Ici / Visual Landmark Dictionary / Casablanca

## Durable visual source

### Current canonical target — V2
- File: `AKARFINDER_VIVRE_ICI_LANDMARK_SIGNAL_TARGET_CASABLANCA_V2_2026-09-19.png`
- Dimensions: 1448 × 1086
- SHA-256: `a4a10347aee85341d971040baa1b5afb3d85460d3208c79b7b614329b4ca5c98`
- Google Drive ID: `10q6MdevKYec8PE297NRa6L210nhCUwNQ`
- Google Drive URL: https://drive.google.com/file/d/10q6MdevKYec8PE297NRa6L210nhCUwNQ/view?usp=drivesdk
- Drive size verified: 1,746,099 bytes

### Superseded target — V1
- File: `AKARFINDER_VIVRE_ICI_LANDMARK_SIGNAL_TARGET_CASABLANCA_2026-09-19.png`
- SHA-256: `6af2f518102e4e4372f69db0c38bb89ef365b37184f81339a459777feb6be177`
- Google Drive ID: `1RfeNGDAJ8nN25FmKZaE1o73pTFj0IZ5f`
- Status: superseded as fidelity target; retained for history.

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

- Consolidated baseline: PR #1044 merged into the seed lineage.
- Current stacked base: PR #1046 / `factory/landmarks-casa-ain-diab-sindibad-20260919`.
- V2 branch: `polish/vivre-ici-landmark-signal-v2`.
- V2 artwork commit: `b466abb434f821a823a4aecb23c342ed62a993a8`.
- Scope: artwork fidelity only; localization contract remains frozen.

## Success proof required

- exact-head territory tests green
- TypeScript green
- production build green
- Landmark Visual System Certification green
- AFTER screenshots at 390×844 / 768×900 / 1280×900 / 1448×1086
- visual comparison against this TARGET
- 0 major callout overlap
- frozen localization invariants unchanged
