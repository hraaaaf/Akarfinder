# Tanger — Product Geography Evidence

Status: **DISCOVERY / FAIL-CLOSED**

Canonical AkarFinder neighborhoods:
- Marchan
- Malabata
- Ville Nouvelle

## Product-taxonomy evidence — 2026-09-22

Yakeey exposes **Malabata** as a distinct Tanger neighborhood. It also exposes **La Nouvelle Ville Ibn Batouta** as a distinct label.

Important semantic guardrail:
- `Ville Nouvelle` in the canonical registry must **not** be automatically equated with `La Nouvelle Ville Ibn Batouta`.
- The latter may be a separate development/product zone.
- Marchan is already an exact same-city discovery match and serves as a reference only.

## Probe

The dedicated workflow checks exact anchors and exact-name relations for:
- Malabata
- Ville Nouvelle
- La Nouvelle Ville Ibn Batouta
- Marchan

The verdict remains fail-closed:
`DISCOVERY_PROBE_ONLY / promotion.allowed=false / NO_PRODUCT_BOUNDARY_CLAIM`.

No Voronoi, buffer, midpoint, inferred polygon, or manual gap closure is allowed.

## Exact-head certification — 2026-09-22

- PR: #1076
- Branch: `feat/landmark-factory-geo-pipeline-20260920`
- Certified input HEAD: `ea55a67899b48b33e4d3832a15c3036fa1c67e07`
- Workflow run: `35711536904` — **SUCCESS**
- Artifact: `landmark-factory-tanger-product-geography-probe`
- Artifact id: `10686447116`
- Artifact digest: `sha256:a5c1ced32a903cab5cb54f40196525825d71e83265b8e043ddee53894fb5d9ca`

Observed evidence:
- exact place-anchor matches: **1**
- exact boundary-relation matches: **0**
- the single exact place anchor is **Malabata** (`name:fr=Malabata`, OSM node `4793814229`)
- no exact boundary relation was found for **Malabata**
- no exact boundary relation was found for **Ville Nouvelle**
- no exact boundary relation was found for **La Nouvelle Ville Ibn Batouta**

Certified interpretation:
- Malabata has product-taxonomy / orientation evidence, but **not** a promotable product polygon.
- Ville Nouvelle remains semantically unresolved and must **not** be equated with La Nouvelle Ville Ibn Batouta.
- No geometry is promoted from this lot.
- Runtime registry, GPS, collision, reveal, ranking and Supabase remain unchanged.

## Gate

Tanger geometry promotion is **blocked fail-closed** until independent, sufficiently authoritative boundary evidence exists.

The safe next action is evidence acquisition or a separate explicitly-scoped product-boundary investigation. It is **not** acceptable to synthesize a polygon from anchors, buffers, Voronoi cells, midpoints, inferred road loops, or manual gap closure.
