# AkarFinder — Landmark Localization Contract

Status: FROZEN
Locked: 2026-09-19
Scope: Vivre Ici / Visual Landmark Dictionary

## Goal

Guarantee that every landmark shown on the map remains geographically truthful and visually unambiguous.

## Frozen invariants

1. The GPS pin is the geographic source of truth.
   - It is projected directly from the verified registry coordinates through MapLibre.
   - It is never displaced for presentation.

2. Cards are presentation only.
   - A card may be offset from its pin only within the certified tether bound.
   - Current certified maximum: 22 px.
   - If no valid nearby placement exists, the card is not shown at that zoom.

3. Nearby landmarks compete by priority.
   - A lower-priority landmark is suppressed when two visible pins are too close to remain unambiguous.
   - It may reappear after zoom increases and screen-space separation becomes sufficient.

4. Collision resolution must never fabricate geography.
   - No large card displacement.
   - No alternate coordinate.
   - No inferred location.
   - No decorative pin detached from registry coordinates.

5. A visible card must have:
   - an exact projected pin,
   - a visible leader line,
   - a deterministic priority,
   - no overlap with another visible card,
   - no overlap with reserved UI zones.

6. Reveal remains progressive:
   - Iconique
   - Majeur
   - Local fort
   - Contextuel

## Certified baseline

- HEAD: `b3bf1f229949184d5cdb4c77f4ce6ae51194a039`
- workflow: `Landmark Visual System Certification`
- run: `35410245863`
- artifact: `10574101924`
- digest: `sha256:55d474ed7c29131cd0c6f36e124e50c9244457672eada1190e09021c0716be78`
- viewports: 390×844 / 768×900 / 1280×900 / 1448×1086
- overlap: 0
- horizontal overflow: 0
- page errors: 0
- measured max pin-to-card tether: <= 20 px
- measured minimum visible pin spacing: 158 px

## Change rule

Any future change to:
- GPS projection,
- tether bound,
- pin spacing,
- priority suppression,
- collision placement,
- leader-line geometry,
- reserved UI zones

must rerun the certification workflow and update this contract only after new evidence passes.

Visual polish may change artwork, typography, shadows, card materials, thumbnail composition and sidebar styling without changing the localization invariants above.
