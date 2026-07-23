# Phase 1 — Final Design / Mobile / Accessibility Ledger

This ledger tracks the transversal findings from the final UX/UI audit. It deliberately distinguishes structural closure from screenshot-dependent visual closure.

The current validation candidate is consolidated against `main` and includes the residual P2 closure plus this final UI/accessibility workstream, so one CI run can certify their interaction before any merge.

Validation note: the repository was temporarily switched to public visibility by the owner to restore GitHub-hosted Actions capacity after the private-account minute quota was exhausted. This changes no product or release rule; the candidate still requires the same complete CI, screenshot review, and explicit end-of-Phase release gate before any Vercel deployment.

CI retrigger note: a fresh candidate commit was created after public visibility was confirmed so GitHub Actions can execute the final structural, build and Playwright gates on the exact consolidated branch.

| Finding | Status | Current closure state |
|---|---|---|
| AF-AUDIT-FINAL-079 — Legacy palette / brand-token collision | MIGRATION_GUARD_ADDED | Canonical `accent` / `accent-blue` is explicit for new UI. Historical `bronze-*` remains a compatibility namespace and is documented as legacy. Full removal requires visual migration of existing classes and fresh screenshots. |
| AF-AUDIT-FINAL-080 — Component-style fragmentation | OPEN_VISUAL_CONSOLIDATION | `Container` and semantic theme tokens are established, but local page styles still exist. Do not claim closure until screenshot review identifies safe primitives/migrations without visual regressions. |
| AF-AUDIT-FINAL-081 — Interactive states not fully semantic | CLOSED | Search transaction choices expose `aria-pressed`; List/Map already exposes `aria-pressed`; active desktop/mobile navigation exposes `aria-current`. |
| AF-AUDIT-FINAL-082 — No skip-to-content | CLOSED | Global keyboard skip link targets a focusable `#main-content` wrapper. |
| AF-AUDIT-FINAL-083 — Reduced motion partial | CLOSED | Existing component-specific rules are reinforced by a global `prefers-reduced-motion` safety rule for animation, transitions and smooth scrolling. |
| AF-AUDIT-FINAL-084 — Low-contrast microcopy system | STRUCTURAL_GUARD_ADDED | Legacy white 35–50% text utilities receive a readable minimum override and Search placeholders use stronger semantic contrast. Final visual/contrast acceptance remains screenshot-dependent. |
| AF-AUDIT-FINAL-085 — Mobile header information density | CLOSED | Secondary mobile navigation is reduced to five canonical entries, Search is first, Pro is unified, tap targets are larger, and active state is semantic. |
| AF-AUDIT-FINAL-086 — No automated accessibility gate | IMPLEMENTED_PENDING_RUN | A Playwright gate now audits 10 core routes at 390/768/1280, captures 30 screenshots, and checks HTTP status, horizontal overflow, landmarks/H1, skip link, duplicate IDs, accessible names, image alt presence and keyboard focus. GitHub Actions must successfully execute the fresh public-repo candidate before this can be certified. |

## Release boundary

The final design/accessibility workstream is **not closed** while:

1. AF-AUDIT-FINAL-080 remains visually unconsolidated.
2. Screenshot-dependent review for 079/084 has not been completed against fresh 390/768/1280 captures.
3. The Playwright gate has not actually executed successfully.
4. The consolidated candidate has not passed P2 + final UI + canonical baseline CI and merged.

No Vercel deployment is allowed before those gates are resolved and the complete Phase 1 release certification is explicitly approved.