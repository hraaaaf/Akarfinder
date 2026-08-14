# AkarFinder — UI Design System v1

**Status:** P2 foundation active  
**Reference:** `docs/UX_SEARCH_V1_REFERENCE.md` + real P1 mobile audit

## Goal

Unify the active public product around the certified Search visual language without flattening product-specific journeys.

## Shared primitives

Canonical source: `components/ui/design-system.ts`.

- `pageLight` — neutral light application canvas.
- `chrome` — shared white navigation chrome.
- `searchChrome` — exact certified Search header surface.
- `surfacePremium` — elevated white content card.
- `surfaceGlass` — premium mobile glass navigation/sheet surface.
- `fieldPill` — compact pill input/control.
- `primaryActionPill` / `secondaryActionPill` — compact strong/secondary actions.
- `chip` / `chipActive` — filter/status pills.
- `toolbar` — dense white toolbar row.
- `emptyState` — truthful empty/inactive product state.

## Rules

1. Search v1 remains the visual reference and is not redesigned without a measured finding.
2. Shared chrome, surfaces, pills, actions and toolbars must prefer these primitives over page-local hardcoded duplicates.
3. Product behavior, DATA, ranking, geography truth, provenance and confidence semantics are not changed by visual convergence.
4. A page may keep a distinct journey when the product requires it, notably Map and Mon Projet.
5. Mobile bottom navigation stays at five destinations. `/compare` belongs to the Favoris destination instead of creating a sixth tab.
6. Empty states must stay truthful. UI must not imply alerting/history/data capabilities that do not exist.
7. Every page migration requires real Chromium evidence before final visual scoring.

## P1 visual priorities

Measured baseline from the real 390 / 430 audit:

- Favoris: 7.5/10 — harmonize cards, surfaces and hierarchy.
- Carte: 8.0/10 — explicit legend + mobile composition polish.
- Alertes: 6.5/10 — sparse truthful inactive state; largest product/UI gap.
- Comparer: 7.0/10 — mobile scanability and sticky identity; navigation active-state finding addressed in P2.
- Mon Projet: 8.0/10 — preserve eight-step wizard; harmonize chrome and density.

## Migration order

P2 foundation → Favoris → Carte → Alertes → Comparer → Mon Projet → secondary active routes → global certification.
