# AkarFinder UI Polish — P1 Mobile Audit

**Status:** ACTIVE — visual scores pending real Chromium screenshots  
**Reference:** `docs/UX_SEARCH_V1_REFERENCE.md`  
**Target viewports:** 390×844 / 430×932

## Scope

Primary routes:

- `/search`
- `/favorites`
- `/map`
- `/alerts`
- `/compare`
- `/mon-projet`

The audit is read-only. Scores are assigned only after inspecting real screenshots.

## Structural matrix — before visual scoring

| Route | Current verified structure | Reusable | Target / gap | Visual score |
|---|---|---|---|---|
| `/search` | Certified Search v1 baseline | `SiteHeader(searchMode)`, premium glass bottom nav, Search surfaces/cards/toolbar | Reference only; reopen only on measured finding | REFERENCE |
| `/favorites` | Functional shortlist, responsive cards, empty state, compare/visit/remove actions | favorite storage, `ListingVisual`, reliability badge, listing facts | Harmonize header/surfaces/cards/spacing with Search; preserve product behavior | PENDING |
| `/map` | `MapNeighborhoodClient` + dynamic map experience + `TerritorialExplorer`; canonical URL state; truth-safe unmapped district fallback | geo registry, navigation state, territorial layers | Visual composition mobile; explicit color legend; price pins/selection/bottom-sheet coherence with Search | PENDING |
| `/alerts` | Truthful inactive-state card; profile + Search CTAs; no fake notification promise | shell, truthful activation state, bottom nav route | Real alert cards, activation state, latest results/history when product capability exists | PENDING |
| `/compare` | Functional 2–4 listing comparator with summary/table and empty/one-item states | compare storage, summary engine, table | Mobile sticky property identity + Search visual language + denser comparison ergonomics | PENDING |
| `/mon-projet` | Dedicated gradient/wizard shell + saved-project entry | project wizard/product flow | Harmonize chrome/tokens/navigation without flattening the distinct guided flow | PENDING |

## Verified structural observations

### Search

`/search` is the certified visual reference v1. Its mobile header and bottom navigation are canonical primitives for transverse reuse.

### Favorites

The page is already a real product, not a placeholder. It loads saved listings, supports remove/clear, compare and visit actions. Its main debt is visual divergence: deep-blue/bronze hero and custom card family instead of Search primitives.

### Map

The map already owns canonical navigation state and truth-safe geography behavior. P3.2 is therefore not a map rewrite. The priority is presentation: colored neighborhoods, explicit legend, price pins, selected-neighborhood state and mobile property sheet aligned with Search.

### Alerts

The current route intentionally exposes an inactive state and does not pretend automatic notifications exist. The roadmap target is materially larger than polish and must remain truth-safe: cards/history can only expose capabilities backed by real alert data.

### Compare

The comparator already enforces the product flow and supports 2–4 listings. P3.4 should preserve this engine while improving mobile scanability and sticky identity.

### Mon projet

The route is a guided wizard and should not be visually flattened into a generic listing page. P2 should harmonize shared chrome/tokens while retaining the distinct journey.

## Chromium evidence gate

Harness: `scripts/audits/ui-polish-p1-mobile-audit.mjs`

Expected evidence:

- 12 full-page screenshots
- HTTP status per route
- horizontal overflow
- global header geometry
- mobile bottom-nav presence/active state
- console errors

No visual score is valid before this evidence exists and is inspected.
