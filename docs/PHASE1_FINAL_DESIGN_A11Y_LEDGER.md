# Phase 1 — Final Design / Mobile / Accessibility Ledger

This ledger tracks the transversal findings from the final UX/UI audit and separates product closure from non-blocking technical debt.

The final candidate is consolidated against `main` and includes the residual P2 closure plus this final UI/accessibility workstream.

The repository was temporarily switched to public visibility by the owner to restore GitHub-hosted Actions capacity after the private-account minute quota was exhausted. This changes no product or release rule.

## Fresh visual validation

The final Playwright run completed successfully on the consolidated candidate at commit `60d64c481c5c26899eb71d167176969691248e6f`.

Coverage:
- 10 core routes: Home, Search, Acheter, Louer, Vendre, Immobilier, Map, Pro, Agences, Promoteurs.
- 3 widths: 390, 768 and 1280 px.
- 30 fresh screenshots.
- 0 automated smoke findings.
- HTTP, horizontal overflow, H1/main landmarks, skip-link, duplicate IDs, accessible names, image alt presence and first keyboard focus all passed.
- CI run: `Phase 1 Final Design Accessibility Gate` run #9, alongside green P0/P1/P2 gates, TypeScript/build and canonical baseline on the same HEAD.

Visual review conclusion:
- Home, Search/intent and Pro use different compositions appropriate to their contexts, but retain one coherent AkarFinder language: shared header/footer, typography, spacing rhythm, card language and blue accent system.
- No blocking responsive fracture or competing visible palette was observed across the 30 captures.
- Supporting copy remains readable after the contrast guard; no Phase-1 blocking low-contrast microcopy was observed in the reviewed core surfaces.
- `bronze-*` aliases and some local page composition styles remain compatibility/technical debt. They are not a second visible design system and do not justify a risky late refactor before release.

| Finding | Status | Closure |
|---|---|---|
| AF-AUDIT-FINAL-079 — Legacy palette / brand-token collision | CLOSED_WITH_COMPATIBILITY_DEBT | Canonical `accent` / `accent-blue` is explicit for new UI and visually consistent across the fresh captures. Historical `bronze-*` remains a documented compatibility namespace only; future code must use the canonical accent namespace. |
| AF-AUDIT-FINAL-080 — Component-style fragmentation | CLOSED_PRODUCT_TECH_DEBT_REMAINS | Fresh 390/768/1280 review shows coherent shared navigation, typography, cards, spacing and action hierarchy across the 10 core routes. Local page composition remains where context differs; forced late primitive extraction would add regression risk without fixing a visible product inconsistency. |
| AF-AUDIT-FINAL-081 — Interactive states not fully semantic | CLOSED | Search transaction choices expose `aria-pressed`; List/Map exposes `aria-pressed`; active desktop/mobile navigation exposes `aria-current`. |
| AF-AUDIT-FINAL-082 — No skip-to-content | CLOSED | Global keyboard skip link targets a focusable `#main-content` wrapper and is the first keyboard focus target in the smoke audit. |
| AF-AUDIT-FINAL-083 — Reduced motion partial | CLOSED | Existing component rules are reinforced by a global `prefers-reduced-motion` safety rule for animation, transitions and smooth scrolling. |
| AF-AUDIT-FINAL-084 — Low-contrast microcopy system | CLOSED_PHASE1_VISUAL_ACCEPTANCE | Legacy white 35–50% text utilities receive a readable minimum override and Search placeholders use stronger semantic contrast. Fresh core-route screenshots reveal no blocking readability failure. A future numeric contrast scanner can further harden this beyond the Phase 1 release gate. |
| AF-AUDIT-FINAL-085 — Mobile header information density | CLOSED | Secondary mobile navigation is reduced to five canonical entries, Search is first, Pro is unified, tap targets are larger, and active state is semantic. |
| AF-AUDIT-FINAL-086 — No automated accessibility gate | CLOSED | The Playwright gate executed successfully on 10 routes × 3 widths, produced 30 screenshots and returned 0 findings on the defined structural/accessibility checks. |

## Remaining release boundary

The final design/mobile/accessibility workstream is closed for Phase 1.

Remaining before public release certification:
1. Merge the consolidated candidate only after its final post-ledger CI remains green.
2. Perform the single explicit end-of-Phase-1 Vercel deployment.
3. Certify the four release-gated P0 findings (`001`, `011`, `012`, `013`) against the deployed Production site.

No intermediate Vercel deployment is allowed.