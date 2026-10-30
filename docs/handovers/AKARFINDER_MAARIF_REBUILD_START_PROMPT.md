# START PROMPT — AKARFINDER MAÂRIF REBUILD TO MATCH TARGET

Repository: `hraaaaf/Akarfinder`  
Branch: `feat/akar-map-quartier-target-couche3`  
PR: #1090 — **keep DRAFT until human gate**  
Current HEAD at handover: `b3549b5f5a901652b7fa445d3bef2afcadd31965`

## 1. Mission

Rebuild the real AkarFinder Maârif neighborhood page so that the live product **visibly converges toward the approved premium mockup**, instead of continuing low-impact camera/CSS micro-tweaks.

This is a **localized Maârif page rebuild**, not a national map rewrite.

Primary success condition:
- the real rendered page should immediately feel like the approved target in composition, hierarchy, premium quality and map presence.

Do not claim visual success from CI green alone.

## 2. Canonical visual direction

Desktop target characteristics:
- large premium map on the left
- structured neighborhood sidebar on the right
- clean AkarFinder header/navigation
- premium search bar and map controls
- dense, readable urban fabric
- strong but elegant Maârif focus
- refined coastline/sea rendering
- clear POI callouts
- balanced map/sidebar proportions

Mobile target characteristics:
- map first
- neighborhood information below
- same visual system, not a fallback layout
- tabs, market card, CTA and POI cards remain legible

The target mockup is a **visual direction**, not a license to invent geographic facts.

## 3. Truth doctrine — non-negotiable

Keep truthful:
- real coastline
- real roads
- real administrative geometry
- real neighborhood/district names
- real POIs and real POI coordinates
- real search/routing/data behavior

Allowed:
- illustrative cartographic styling
- non-metric visual shadows
- decorative pseudo-depth / 2.5D treatment
- color grading
- stylized building-footprint treatment
- editorial label hierarchy

Forbidden:
- invented boundary
- invented POI
- invented coordinates
- fabricated building heights presented as real
- fabricated market/data values in production
- claiming decorative relief is measured 3D data

If visual depth is decorative, document it in code/comments as decorative and non-metric.

## 4. Strategy change

STOP treating this as Pass 13/14/15 camera polishing.

The previous approach is superseded:
- no more incremental score inflation
- no more isolated CSS tweaks presented as target convergence
- no more repeated zoom/offset passes unless they are part of a larger composition correction

New strategy:
1. rebuild shell
2. rebuild Maârif-specific map renderer/styling
3. calibrate composition
4. certify responsive states
5. visual convergence loop

## 5. Execution lots

### LOT A — Freeze target contract

Create a written target contract covering:
- desktop proportions
- mobile hierarchy
- map/sidebar split
- search/header/control hierarchy
- major visual tokens
- Maârif focus behavior
- prohibited fake-data behavior

No product-code change required until the target contract is explicit.

DONE:
- target contract exists in repo
- implementation can be reviewed against objective visual criteria

### LOT B — Premium shell rebuild

Rework the real page shell to match target hierarchy.

Desktop:
- AkarFinder header/nav
- search bar
- Repères / Maroc controls
- 2D/3D control
- right sidebar
- neighborhood hero
- tabs: Marché / Vie locale / Mobilité
- market overview card
- primary + secondary CTA
- Lieux d’intérêt cards

Mobile:
- preserve the same design language
- map first
- neighborhood content below
- no horizontal overflow
- no overlapping controls

DONE:
- shell alone reads as the target product even before final map styling
- 1280 / 768 / 430 / 390 renders are structurally clean

### LOT C — Maârif premium map renderer

Build a Maârif-target visual treatment using truthful geographic sources.

Required improvements:
- warm premium land/building palette
- stronger road hierarchy
- richer building-footprint readability
- subtle non-metric depth/shadows
- refined sea/coast treatment
- cleaner neighboring district labels
- stronger Maârif focal hierarchy
- premium POI callouts
- clean administrative contour disclosure

Do NOT use unverified upstream derived height as “truth-safe real height”.

If OpenFreeMap / OpenMapTiles building properties do not expose provenance for height, do not present extrusion as verified physical height.

DONE:
- map alone produces an obvious visual jump
- Maârif is dominant without lying about geography
- coast/urban density feels intentional and premium

### LOT D — Composition calibration

Only after shell + renderer are structurally correct:
- camera zoom
- camera offset
- Maârif position
- sea/land ratio
- rail/sidebar proportion
- POI density
- surrounding labels

Use one-variable-at-a-time changes when calibrating camera values.

DONE:
- first-glance comparison no longer looks “far from target”

### LOT E — Responsive premium pass

Certify:
- 1280×900
- 768×900
- 430×932
- 390×844

Check:
- no overflow
- no duplicated labels
- no badge stretching
- no Retour overlap
- map readable
- CTA visible
- tabs usable
- sidebar/content hierarchy preserved

### LOT F — Visual convergence gate

Use existing GitHub Actions + Playwright rendering pipeline.

For each candidate HEAD:
1. render exact HEAD
2. collect desktop/tablet/mobile artifacts
3. compare directly against target
4. inspect target↔actual side by side
5. compute supporting metrics if useful (RMSE/MAE/correlation)
6. keep or revert based on visible improvement

Metrics are diagnostics, not the final product verdict.

## 6. Existing baseline / historical context

Previous measured Pass 11 baseline:
- normalized RMSE ≈ `0.2220`
- MAE ≈ `0.1287`
- luminance correlation ≈ `0.486`

Pass 12 camera-only change improved some pixel metrics but remained visually far from target.

Conclusion:
- camera tuning alone is insufficient
- the new rebuild strategy is required

## 7. Files likely in scope

Known existing hotspots:
- `components/map/MapLibreNeighborhood3D.tsx`
- `components/map/MapNeighborhoodClient.tsx`
- `components/map/MapNeighborhoodExperience.tsx`
- `components/map/P4MapDecisionRail.tsx`
- `components/map/NationalMapRouter.tsx`
- `app/map/quartier-target-couche3.css`
- `app/map/**`
- `scripts/audits/carte-lot8-casablanca-visual-after.mjs`
- `.github/workflows/carte-lot8-casablanca-visual-after.yml`

Do not assume all need changes. Inspect first and keep changes scoped.

## 8. Data / backend safety

Do not:
- rewrite DB data for visual work
- add new scraping
- change territorial canonical data without evidence
- increase DB pressure unnecessarily
- alter national search semantics as a side effect

This rebuild is primarily presentation/rendering.

## 9. CI doctrine

Every implementation checkpoint must report:
- exact HEAD
- exact workflow run IDs
- exact visual artifact ID + digest
- viewport coverage
- known failures with logs before declaring them out-of-scope

Do not call a workflow failure “baseline” without checking the failing job/log.

Existing unrelated workflow failures must not be silently ignored.

## 10. Review doctrine

Before merge:
- primary review
- independent second review
- strict visual review
- truth-safety review
- responsive review
- human gate

No merge from an automated “looks good” conclusion.

PR #1090 stays DRAFT until the human gate.

## 11. Deployment doctrine

**NO VERCEL PRODUCTION DEPLOYMENT without fresh explicit human authorization.**

GitHub Actions local rendering is allowed.

A preview deployment also requires explicit authorization if one is needed later.

## 12. Scoring doctrine

Do not report 9.5/10 because the code is cleaner.

A score ≥9.5/10 requires:
- strong first-glance target similarity
- premium shell
- premium map rendering
- responsive quality
- no obvious UX/UI defects
- truth-safe semantics

If the result still looks materially different from the target, say so.

## 13. Immediate next action

Start with LOT A + LOT B:
1. inspect the current page components and CSS
2. write the target contract
3. rebuild the shell structure toward the approved target
4. render 1280/768/430/390
5. evaluate the shell before beginning the map-renderer rewrite

Do not spend another pass on camera-only tweaks first.

## 14. Human gate

Stop before:
- merging PR #1090
- deploying production
- changing territorial truth
- accepting a final visual score

Human approval is required for those actions.
