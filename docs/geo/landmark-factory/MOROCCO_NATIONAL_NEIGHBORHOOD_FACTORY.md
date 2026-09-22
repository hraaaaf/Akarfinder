# Morocco National Neighborhood Factory

Status: active authoring doctrine. Coverage target: every real-estate-relevant neighborhood label in Morocco.

## Objective

Landmark Factory is national. Casablanca is the reference implementation, not the scope limit.

The system must progressively build a defensible neighborhood registry for Morocco while keeping three evidence layers separate:

1. **Urban-planning / historical truth** — official agencies, urban plans, commune/administrative material.
2. **Modern real-estate product geography** — public market taxonomies and contemporary public map evidence.
3. **Geometry materialization** — OSM or another reusable, provenance-safe geometry source.

No layer is allowed to impersonate another.

## National pipeline

For every city / urban area:

1. Build a raw candidate inventory from Morocco-wide OSM labels and administrative objects.
2. Normalize names, aliases, Arabic/French variants and parent locality.
3. Compare public modern real-estate taxonomies.
4. Identify official planning / administrative sources where they exist.
5. Create an evidence matrix for each candidate neighborhood.
6. Search for exact public boundaries first.
7. If no exact boundary exists, investigate independently corroborated physical axes only.
8. Materialize only provenance-safe geometry.
9. Run topology, membership and adjacency checks.
10. Keep candidates SHADOW until reviewed.
11. Promote only when the evidence contract passes.

## Required evidence state per neighborhood

Each neighborhood record should converge toward:

- canonical product name
- Arabic/French aliases
- city / commune / prefecture / region
- product-taxonomy evidence
- official planning/administrative evidence
- OSM anchor(s)
- candidate edge evidence
- geometry source + provenance
- topology verdict
- membership test verdict
- adjacent neighborhoods
- confidence / review status
- publication status: DISCOVERY / HOLD / SHADOW / PUBLISHED

## Hard rules

- Never force a modern product neighborhood to equal an AUC/urban-planning sector.
- Never create a polygon from a point radius, Voronoi cell, nearest-label rule or visual guess.
- Never close a gap by drawing an unsupported segment.
- Never infer boundaries from search-result leakage into neighboring districts.
- Never bypass anti-bot/auth or scrape private geometry.
- Never publish geometry merely because a workflow completed successfully.
- AUC/official sources outrank market sources for planning truth.
- Market/public map sources outrank official historical sectors for *modern product naming*, not geometry.
- OSM is the default materialization substrate when the actual edge is independently justified.

## Rollout strategy

Coverage is city-driven, not handpicked-neighborhood-driven.

**Reference lot:** Casablanca + peri-urban Casablanca.

Then expand by metro/market cluster:
- Rabat–Salé–Témara
- Marrakech
- Tanger
- Agadir
- Fès
- Meknès
- Kénitra
- Oujda
- Tétouan
- El Jadida
- Mohammedia
- remaining urban municipalities and market-active localities

This ordering is operational priority only; the end-state is nationwide coverage.

## National discovery artifact

The workflow `Landmark Factory National Neighborhood Inventory` downloads the same Morocco PBF source used by the Casablanca authoring pipeline and emits a machine-readable inventory of named:
- `place=neighbourhood`
- `place=quarter`
- `place=suburb`
- `place=city_district`
- named administrative boundaries

The resulting artifact is **discovery only**. It is the queue, not the truth.

### National inventory v2

The first national run exposed an important distinction: the raw OSM scan contained **5,125 named objects**, but only **1,915** were neighborhood-like product candidates (`quarter`, `neighbourhood`, `suburb`). **3,210** were administrative boundary references.

Schema v2 therefore separates:
- `product_candidates` — the actual neighborhood discovery queue;
- `administrative_references` — useful official/admin geometry references, never product truth by default;
- `urban_centers` — named OSM settlement nodes;
- `backlog_by_locality` — a nearest-settlement grouping marked strictly `HINT_ONLY`.

Nearest-settlement grouping exists only to operationalize the national backlog. It is not certified city membership and cannot activate a neighborhood or geometry.

## Definition of done

Morocco coverage is not complete when every label has a polygon.

It is complete when every relevant neighborhood is either:
- published with defensible provenance and successful gates, or
- explicitly classified HOLD / unresolved with the missing evidence recorded.

Unknown is preferable to fabricated.


### Administrative containment routing

The nearest-settlement backlog is not authoritative enough for national rollout: large catchments can assign many candidates to the wrong city merely because its settlement node is nearest.

Schema v3 therefore adds an independent routing layer:
- extract reusable OSM `admin_level=8` administrative geometries;
- point-in-polygon each coordinate-bearing product candidate;
- group only unique containments into `backlog_by_admin_level_8`;
- mark every containment `HINT_ONLY`;
- preserve ambiguous/uncontained cases instead of forcing assignment.

This routing is stronger than nearest-center distance for operational batching, but still does **not** make an administrative boundary equal to a modern real-estate product neighborhood.


### Canonical registry crosswalk

National discovery must not create a second geographic taxonomy. The workflow therefore emits a fail-closed crosswalk against `GEO_CITIES/GEO_NEIGHBORHOODS`.

A canonical neighborhood can receive `CANDIDATE_EXACT_MATCH` only when:
1. its OSM discovery name exactly matches the canonical name, slug or an accepted alias after normalization; and
2. its unique `admin_level=8` containment maps to the same canonical city.

Other states are preserved explicitly:
- `AMBIGUOUS_CANDIDATE_MATCH`
- `CITY_SCOPE_MISMATCH`
- `NO_OSM_CANDIDATE_MATCH`

The crosswalk is `CANDIDATE_CROSSWALK_ONLY`: it cannot add registry entries, activate map/SEO eligibility, or promote geometry.


### National rollout plan

The workflow now emits `morocco-landmark-factory-rollout-plan.json` from the certified canonical crosswalk.

Execution states are deterministic evidence states, not subjective scores:

1. `REFERENCE_IMPLEMENTATION` — Casablanca only; finish and preserve the reference doctrine.
2. `CANONICAL_MATCHED` — all currently canonical neighborhoods in the city have exact discovery matches; independent product evidence is still required.
3. `MIXED_CANONICAL_EVIDENCE` — some canonical neighborhoods match and some remain unresolved.
4. `CANONICAL_GAP_REVIEW` — canonical neighborhoods exist but have no exact same-city OSM discovery match.
5. `DISCOVERY_ONLY` — discovery candidates exist but no canonical neighborhood is currently registered for that city.

The rollout plan never mutates `GEO_CITIES` or `GEO_NEIGHBORHOODS`, never activates map/SEO eligibility, and never promotes geometry.
