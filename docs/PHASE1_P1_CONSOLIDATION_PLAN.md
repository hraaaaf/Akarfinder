# Phase 1 — P1 consolidation plan

Baseline: `main` after P0 closure (`3befc76c6b5359b297ccfe9c79583564f1d02824`).

Release rule: no Vercel Preview or Production deployment during Phase 1 implementation. P1 merges may advance on GitHub only after CI; the single production deployment remains the explicit end-of-phase release.

## Operating rule

Every P1 is revalidated against current `main` before editing. Findings already fixed by intervening work are marked `CLOSED_ALREADY` and are not reworked. No broad redesign: consolidate current foundations.

## Workstream A — Search Truth UX (first)

IDs: `014, 015, 016, 017, 018, 020, 021, 022, 023` plus overlapping `002`.

Target contract:
1. relevance/intent remains the primary ranking constraint;
2. structured results with sufficient intelligence are presented as **Analysé par AkarFinder**;
3. structured but insufficient results are presented as **Analyse partielle**;
4. external/index-only results are presented last as **Résultat web / offre observée — aperçu limité**;
5. “analysé” never means verified/certified/guaranteed;
6. source/origin and original-source CTA remain explicit;
7. recommended ranking gets a plain-language explanation;
8. dedup/similarity value becomes visible without overclaiming one-property certainty;
9. legacy buyer-journey links point directly to the canonical Companion/Mon Projet flow.

## Workstream B — Home proof and truthful affordances

IDs: `003, 004, 005, 006, 007, 008, 010` plus global `002`.

Target: keep the current home skeleton; replace generic intelligence claims with demonstrable proof, remove dead/duplicate CTAs, and avoid mixed evidence levels.

## Workstream C — Buyer continuity / project UX

IDs: `026, 027, 029, 031, 032`.

Target: one vocabulary and one object: **Mon Projet AkarFinder**. Companion builds/edits it; Search consumes it; favorites/comparisons/alerts attach to it.

## Workstream D — Intent hubs / Neuf / seller / alerts

IDs: `034, 037, 038, 039, 041, 042, 043, 044, 045, 046, 049`.

Target: intent hubs do not become duplicate search engines; no false controls; unify alerts; Neuf distinguishes illustrative/demo from live partner inventory; seller lead capture is not confused with structured property ingestion.

## Workstream E — Geo / SEO productization

IDs: `053, 054, 055, 056, 057, 059, 060, 061, 062, 064`.

Target: Geo Registry identity is shared; `/immobilier`, city, district, `/map`, `/quartiers` become complementary product surfaces; SEO scale remains gated by useful real data, not mass thin pages.

## Workstream F — Professional/B2B conversion

IDs: `065, 066, 067, 069, 070, 071, 072, 073, 074, 075, 076, 078`.

Target: value proposition centers on rich structured data → enrichment → discoverability/matching/leads; agency and promoter journeys are explicit; demos stay transparent; no simulated traction used as proof.

## Workstream G — Design system / mobile / accessibility

IDs: `079, 080, 081, 082, 083, 084, 085, 086`.

Target: finish token migration, remove legacy palette collisions, add missing semantic states/skip link/reduced-motion/contrast protections and automated accessibility gate without a global visual rewrite.

## P1 definition of done

- Every listed P1 has status `CLOSED`, `CLOSED_ALREADY`, `DEFERRED_WITH_REASON`, or `RELEASE_GATED`; no forgotten finding.
- Canonical CI + compile/build green for each merged workstream.
- No Vercel deployment during P1 implementation.
- Final Phase 1 release occurs only after all Phase 1 workstreams are audited and explicitly approved.
