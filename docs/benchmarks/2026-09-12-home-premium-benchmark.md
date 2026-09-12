# AKARFINDER — P1 HOME PREMIUM BENCHMARK

Date: 2026-09-12  
Status: REVIEW — benchmark only, no new visual decision is LOCKED by this document.  
Canonical: `docs/AKARFINDER_PRODUCT_CONSTITUTION_CANONICAL.md`

## Goal

Refine AkarFinder HOME into a premium, search-first real-estate engine without changing the already LOCKED positioning:

> **1er moteur de recherche immobilier au Maroc**

## Success

A HOME candidate is acceptable only if it:

1. keeps search as the unmistakable first action;
2. reduces visual competition around the hero;
3. exposes AkarFinder intelligence after the search rather than before it;
4. uses real, trustworthy content rather than decorative filler;
5. gives `Vivre ici` a clear differentiated role;
6. stays restrained, fast and legible on 390 / 768 / 1280;
7. can be converted into measurable L0 invariants after owner validation.

## Evidence set

### Real-estate leaders

- Zillow — search-first residential discovery; broad journey remains secondary to the initial search.
- Compass — premium editorial restraint; strong whitespace, restrained hierarchy, one dominant property-discovery entry point.
- Redfin — intent-driven navigation around buy / sell / rent and a central search journey.
- idealista — simple intent tabs and search dominance; services stay secondary.
- Rightmove — stable intent architecture; search is the main entry point, with market/services around it.
- Realtor.com — central discovery plus explicit next-step utilities, without turning the hero into a feature catalogue.
- Property Finder — strong search + later tools/insights, new projects and market context.
- Bayut — search supports Buy/Rent, AI, Ready/Off-plan and exposes map/valuation/agent tools after the core search action.

### UX/reference tools

- Baymard — evidence source for search/filter usability; use to reject fashionable patterns that increase friction.
- Mobbin — reference library for real product screens and interaction patterns.
- Page Flows — reference library for full user flows rather than isolated screenshots.
- 21st.dev — implementation/prototyping accelerator; useful to generate alternative component directions, never treated as UX authority.

### Regression tools

- Percy — page-level cross-browser visual diff candidate.
- Chromatic — component/story-level visual baseline candidate if Storybook becomes part of the stack.

## Transferable patterns

### P1-A — HERO must breathe

Observed pattern: premium leaders do not ask the hero to explain the whole company.

Candidate for AkarFinder:
- keep exact LOCKED H1;
- keep Acheter / Louer / Neuf intent tabs;
- make the search field the largest interactive object;
- no adjacent feature panel competing with search;
- no second primary CTA in the same visual hierarchy.

Decision status: REVIEW.

### P1-B — Intelligence belongs immediately after the search

Property Finder and Bayut prove that advanced tools can strengthen the product without polluting the first action.

Candidate for AkarFinder:
- move `AkarFinder Intelligence` out of the hero;
- replace it with a compact trust/intelligence strip directly below search;
- possible signals: `Multi-source`, `Sources visibles`, `Marché & quartiers`.

Decision status: REVIEW.

### P1-C — Vivre ici should be early and distinctive

AkarFinder has a differentiated MapLibre neighborhood/decision experience already validated separately.

Candidate:
- surface `Vivre ici` directly after the trust strip;
- reuse the already validated MapLibre visual standard exactly;
- do not create a decorative HOME-specific map variant.

Decision status: REVIEW pending exact integration and owner approval.

### P1-D — Listings must earn their place

Current HOME cards can fall back to generic property-type artwork labelled `Illustration`.

Candidate:
- show a premium listings section only when compliant real imagery and sufficient property data exist;
- otherwise use a restrained search CTA or hide the section;
- never fake a premium marketplace by enlarging generic artwork.

Decision status: REVIEW.

### P1-E — Cities should orient, not dominate

Candidate:
- keep popular-city discovery;
- reduce oversized city-card footprint;
- prefer a compact, high-signal geographic entry layer.

Decision status: REVIEW.

### P1-F — End the page with three distinct next actions

Candidate:
1. Préparer mon projet
2. Vendre / Estimer
3. Professionnels

Do not repeat `Rechercher un bien` after the page already began with the main search engine.

Decision status: REVIEW.

## Candidate HOME sequence

1. Header
2. Hero LOCKED H1 + intent tabs + dominant natural-language search
3. Trust / intelligence strip
4. Vivre ici preview using validated MapLibre standard
5. Qualified listings only
6. Compact popular cities
7. Three next actions
8. Footer

## Premium visual rules — candidate

- hierarchy before decoration;
- large whitespace only where it clarifies priority;
- one primary action per viewport zone;
- restrained shadows and border effects;
- no gratuitous gradients or animation;
- motion only when it communicates state/location/continuity;
- consistent radius/spacing/type scale instead of bespoke component styling;
- real imagery or intentionally abstract system visuals, never pseudo-real filler;
- mobile receives a deliberate composition, not a collapsed desktop page.

## What NOT to copy

- Bayut/Property Finder density in the hero: too much for AkarFinder's simpler search-engine positioning.
- luxury-site cinematic effects that delay search.
- AI badges merely for signalling sophistication.
- 21st.dev components copied without fitting AkarFinder tokens and information hierarchy.
- any visual polish that changes an existing L0 invariant without explicit owner approval.

## Measurement gate before implementation

Required evidence:
- 390 × 844
- 768 × 1024
- 1280 × 900
- BEFORE and candidate on the same exact HEAD
- deterministic GitHub Actions mode
- local **Next production build** (`npm run build` + `npm run start`), never `next dev`
- exact H1 present
- no horizontal overflow
- no Vercel deployment
- no DB write

Reason for production-build requirement: an initial dev-server capture exposed a Next development issue badge caused by deliberately absent DB secrets. That run is retained as diagnostic evidence but rejected as the canonical visual baseline.

BEFORE workflow:
`.github/workflows/p1-home-before-visual-baseline.yml`

BEFORE capture script:
`scripts/audits/p1-home-before-visual.mjs`

Candidate mockup route:
`/visual-qa/p1-home-candidate`

Candidate workflow:
`.github/workflows/p1-home-candidate-visual.yml`

Candidate capture script:
`scripts/audits/p1-home-candidate-visual.mjs`

Both heavy workflows include a latest-commit scope gate so unrelated PR commits skip build/Chromium work.

## Next decision package

After clean same-HEAD evidence is acquired:

1. show BEFORE captures;
2. show the AkarFinder-specific candidate mockup;
3. compare current vs candidate section-by-section;
4. obtain explicit owner validation;
5. promote every validated decision automatically to L0 on its exact scope;
6. only then implement HOME changes;
7. capture AFTER at the same viewports and score against the approved target.
