# AkarFinder — Mockup Convergence Target

**Status:** L1 doctrine candidate  
**Date:** 2026-08-15  
**Scope:** Search, Favorites, Map, Alerts, Compare, Mon projet  

## 1. Decision

AkarFinder current product remains the **functional and data source of truth**. The supplied mockup is the **composition, density and premium-perception reference**.

The convergence program must never replace verified product behavior, truth/data guards, ranking, permissions, source governance or real funnels merely to imitate a static picture.

Target doctrine:

> Keep AkarFinder's real behavior and truth contracts. Borrow the mockup's information density, hierarchy, compactness and immediately-useful presentation.

This is therefore a **hybrid target**, not a pixel-copy program.

## 2. Global keep / adopt rules

### Keep from current AkarFinder

- existing product routes and real functional flows;
- current truth/data, ranking, source, entitlement and publication guards;
- current light AkarFinder identity: white surfaces, deep navy text, primary blue, rounded surfaces;
- canonical `SiteHeader`, mobile navigation architecture and shared design-system primitives unless a measured defect requires change;
- existing real empty/error/loading states;
- existing reusable listing visual, favorite, reliability and search components;
- current responsive and accessibility requirements;
- current certified viewport set: 390×844 / 430×932 / 768×900 / 1280×900.

### Adopt from the mockup

- more useful information above the fold;
- compact cards and tighter vertical rhythm where readability is preserved;
- data-first hierarchy: action → useful information → explanation;
- rich populated states as the primary visual reference, while truthful empty states remain available;
- compact segmented controls and contextual toolbars;
- stronger continuity between Search, Favorites, Map, Alerts, Compare and Mon projet;
- dashboard-style summaries when the underlying data genuinely exists.

### Explicitly forbidden

- fabricated listings, alerts, activity, project progress, lead counts or partner states;
- invented user identity or history;
- fake map precision or neighborhood facts;
- fake saved items merely to make production look populated;
- weakening current validation, ranking, publication or permission contracts;
- a second parallel design system created only for mockup convergence.

## 3. Page-by-page target

| Surface | Keep from current product | Adopt from mockup | Target bias |
|---|---|---|---|
| Search | real search engine, filters, ranking, source/truth rules, current certified header/search controls | denser results composition, compact result cards, lighter toolbar hierarchy | **Current-first (≈70/30)** |
| Favorites | real saved IDs, compare/visit actions, loading/empty behavior | compact grid, transaction segmentation when derivable from real listing data, less introductory chrome in populated state | **Mockup-led (≈40/60)** |
| Map | real map/search behavior, filters, safe location semantics | stronger visible price markers, compact selected-listing sheet/card, clearer neighborhood context where backed by real data | **Balanced (≈50/50)** |
| Alerts | real alert creation/storage semantics and truthful empty state | alert dashboard, enable/disable affordance, new-result/history presentation only when real alert data supports it | **Mockup-led (≈30/70)** |
| Compare | real selection and data-availability behavior | comparison table as the primary populated view, image/price header, scan-friendly attribute rows | **Mockup-led (≈30/70)** |
| Mon projet | current onboarding/profile capture and deterministic criteria | post-onboarding dashboard, progress/criteria/activity only from persisted facts | **Balanced (≈50/50)** |

The ratios are design-direction heuristics, not release metrics.

## 4. Shared UI contracts

Every convergence lot must preserve these contracts unless the lot explicitly replaces one with stronger evidence:

1. **One visual language** — reuse `components/ui/design-system.ts`; do not fork styling primitives page-by-page.
2. **One primary mobile chrome** — shared AkarFinder header/navigation should feel identical across the six key surfaces.
3. **Populated state first, empty state truthful** — certification must exercise both when deterministic fixtures exist; production must never fabricate population.
4. **No explanation wall above useful content** — on populated screens, user data/content comes before long explanatory copy.
5. **Touch targets remain accessible** — compactness must not reduce critical controls below the existing accessibility bar.
6. **Responsive parity** — no mobile-only mockup imitation that degrades tablet/desktop.
7. **Truth before beauty** — unavailable values remain absent/explicitly unavailable; they are not visually synthesized.
8. **No business-logic drift** — UI convergence must not silently alter search ranking, DATA, source Registry, entitlements or publication status.

## 5. Reusable component policy

Prefer extending or composing existing shared components before creating new ones.

Known reusable foundations already in current main include:

- `components/ui/design-system.ts`
- `components/layout/SiteHeader.tsx`
- existing mobile navigation/chrome components
- search controls/results components already certified in previous UX lots
- `ListingVisual`
- `FavoriteToggleButton`
- `ReliabilityBadge`
- existing Map, Favorites, Compare, Alerts and Mon projet shells/routes

New shared primitives are allowed only when at least two target surfaces require the same interaction or visual contract.

## 6. Baseline evidence

Reference before convergence implementation:

- UI All Pages run: **31891405842 — SUCCESS**
- artifact: **9248716663**
- digest: `sha256:5b9223953cbfab597923601be2e88b49f1c1589ad662aa6e2da3fbeeb2cb4a3c`
- exhaustive certified set: **208 captures** across 390 / 430 / 768 / 1280 viewports
- the artifact contains baseline captures for all six target routes: `search`, `favorites`, `map`, `alerts`, `compare`, `mon-projet`.

This baseline certifies render/accessibility coverage and absence of the audited findings. It **does not certify fidelity to the supplied mockup**.

## 7. Six-lot execution roadmap

### L1 — Doctrine + design target

- lock hybrid keep/adopt decisions;
- lock shared UI contracts;
- identify reusable foundations;
- pin the real pre-convergence screenshot baseline;
- add a regression contract so future lots cannot silently replace the doctrine.

### L2 — Search + Map

Search density/result composition and Map selected-listing/price-context convergence.

### L3 — Favorites

Populated shortlist composition, segmentation and compact listing presentation.

### L4 — Compare

Populated comparison-first table and mobile scanability.

### L5 — Alerts

Real-data alert dashboard and history/new-result presentation.

### L6 — Mon projet + global harmonization

Post-onboarding dashboard, final header/navigation/spacing harmonization and full cross-route certification.

## 8. Lot exit criteria

A convergence lot is not CLOSED until:

- implementation matches this doctrine;
- targeted behavior/contracts pass;
- TypeScript/build pass when affected;
- real screenshots exist at the required viewports;
- populated and empty/error states are not confused or fabricated;
- human visual comparison has no unresolved blocking finding;
- canonical docs are updated after merge with executed evidence only.

## 9. L1 closure criteria

L1 can close when this target document and its machine-readable source contract are merged after exact-head CI. No runtime UI change is required in L1.
