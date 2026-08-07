# DATA-4.2 — Reservoir Prioritization

## Objective

Rank known Moroccan real-estate reservoirs after DATA-4.0/4.1A using two separate lanes:

1. **ADMISSIBLE_GROWTH** — sources whose current Registry state permits sitemap discovery + canonical outbound-link representation only.
2. **PARTNERSHIP_UPSIDE** — materially sized, richer/fresher sources that remain hidden/internal-only and therefore require written authorization/feed partnership before public activation.

This lot is **read-only**. It creates no scraper, performs no source fetch, changes no Registry policy and activates no inventory.

## Inputs

Production read-only evidence from:

- `thin_index_normalized_documents_v2`
- `thin_index_display_eligible_v1`
- `source_policy_registry`

Avito and Mubawab are excluded because DATA-4.0/4.1A already resolved their immediate role.

## Scoring principles

Immediate-growth score rewards:

- reservoir scale;
- `city + property_type + intent` structure;
- freshness;
- decision utility (`price` or `surface` when available);
- quality;
- existing structure/connectability;
- **only** a Registry mode already bounded to `canonical_link_only / external_tail_link_only`.

Partnership-upside score rewards:

- reservoir scale;
- structure;
- freshness;
- decision utility;
- quality;
- connectability;
- while explicitly keeping hidden/internal-only sources non-public until authorization changes.

Because DATA-4.2 is selecting the next reservoir capable of materially moving the 5K→20K target, the scale-oriented partnership lane requires at least **500 normalized rows**. Smaller high-quality catalogs remain useful long-tail candidates, but cannot win this lane.

`technical capability ≠ permission` remains absolute.

## Pre-run production observations

Strong candidates observed before the reproducible CI run:

- `daragadir.com`: 6,533 normalized rows; 6,319 core-structured; sitemap/canonical-link mode.
- `promoimmomarrakech.com`: 3,005 normalized; 2,548 core-structured; sitemap/canonical-link mode.
- `limmobiliersansfrontieres.com`: 1,414 normalized; sitemap/canonical-link mode.
- `agenz.ma`: 4,490 normalized; 1,227 fresh; 1,146 decision-structured, but hidden/internal-only.
- `mouldar.com`: 1,539 normalized; 410 fresh; 247 decision-structured, hidden/internal-only.
- `masaken.ma`: 1,210 normalized; 1,109 core-structured, hidden/internal-only.

These are observations, not permissions.

## Expected decision

The CI artifact must name:

- one **admissible-growth winner** for the next bounded activation audit;
- one **partnership-upside winner** for business-development/feed outreach;
- a hold set for sources that do not justify scale-oriented engineering capacity yet.

No source becomes publicly activable in DATA-4.2.
