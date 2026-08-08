# DATA-4.4B — Promo Immo Marrakech Source Revalidation + Canary 50

## Goal

Revalidate `promoimmomarrakech.com` from current public source signals and prepare an exact, rollbackable **50-row** freshness canary without performing any production write in CI.

DATA-4.4A selected this source as `PREFERRED_PENDING_REVALIDATION`. DATA-4.4B must prove that the source is still admissible immediately before any mutation.

## Live gates

The read-only audit must prove:

1. Source Registry still matches `public_sitemap_canonical_link / public_sitemap_only / canonical_link_only / external_tail_link_only`;
2. `review_status` is `current` or `due_soon`, TTL is 14 days and `public_sitemap` remains an allowed discovery channel;
3. live `robots.txt` declares at least one same-origin sitemap;
4. every sitemap request and discovered URL remains on `promoimmomarrakech.com` or `www.promoimmomarrakech.com` over HTTPS;
5. a non-empty current sitemap population intersects existing normalized rows;
6. the canary contains only `seed_only`, normalized, **Marrakech**, typed, intent-known, quality **A/B** rows;
7. all 50 canary rows already exist in Public Search and technical display before mutation;
8. exact structured cross-source collisions are excluded; no fuzzy matching is invented;
9. any selected row already linked to the Property Graph must not belong to a known multi-member cluster;
10. exact seed snapshots, apply manifest and rollback manifest exist for all 50 rows;
11. source request budget stays bounded; no detail page is fetched.

## Candidate selection

The first canary is deterministic and conservative:

- current sitemap presence;
- `freshness_status = seed_only`;
- `normalization_status = normalized`;
- `city = Marrakech`;
- property type and intent present;
- technical quality tier `A` or `B`;
- display eligibility starts with `eligible_`;
- present in Public Search and technical display already;
- no exact structured cross-source collision;
- sort by quality score descending, then canonical URL ascending;
- hard cap **50**.

Tier C and non-Marrakech rows are measured as source-quality findings but excluded from the canary.

## Dedup / collision boundary

DATA-4.4B does **not** invent fuzzy duplicate matches.

It uses two explicit screens:

- exact structured cross-source fingerprint where title + city + type + intent + price + surface are all present and identical;
- existing Property Graph linkage when a canary URL already maps through `listing_sources` to a cluster. A known multi-member cluster is blocking.

Lack of direct Property Graph linkage is reported as coverage, not silently treated as proof of uniqueness.

## Manifest contract

Each selected row receives proposed evidence:

- channel: `public_sitemap_presence`;
- TTL: 14 days;
- run id: `data-4-4b-promoimmo-canary-50-v1`;
- current sitemap URL and observation timestamp;
- exact rollback snapshot of freshness status, last-seen timestamp, channels, metadata and audit-only `updated_at`.

CI remains `DRY_RUN` and sets `canaryWriteAuthorizedByThisRun=false`.

## Non-goals

- no production DB mutation in the PR;
- no Registry mutation;
- no display/publication-policy mutation;
- no detail-page fetch;
- no content or image reuse;
- no hardcoded old sitemap if current robots/sitemap discovery fails;
- no expansion to 100 or 500.

## Production write rule

Only after this PR is merged with all gates green may the exact 50-row manifest be considered for a separate transaction with:

- exact preflight against the merged manifest;
- 50/50 update assertion;
- 50/50 post-write freshness assertion;
- Public Search and technical display before/after comparison;
- drift cap **1%**;
- immediate rollback on any anomaly.

## Exit condition

DATA-4.4B is not complete until the 50-row canary is both **dry-run certified and, if authorized after merge, independently production-certified**. Until then, no larger Promo Immo expansion is allowed.
