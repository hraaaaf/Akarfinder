# DATA-4.4A — Second Reservoir Qualification

## Goal

Select the next high-yield reservoir after Dar Agadir using **existing certified evidence only**, without writing or promoting any new source rows.

This lot is qualification-only.

## Candidate universe

Only Registry sources already shaped for public-sitemap canonical-link handling may compete directly for this lane.

Production snapshot on 2026-08-08:

| Source | Total rows | Normalized OK | Technical display | Fresh confirmed | Seed only | City | Type | Intent | Registry review |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| promoimmomarrakech.com | 3,005 | 3,000 | 2,923 | 9 | 2,996 | 3,005 | 2,556 | 2,905 | due_soon |
| limmobiliersansfrontieres.com | 1,414 | 563 | 573 | 94 | 1,320 | 607 | 1,107 | 1,068 | due_soon |
| atlasimmobilier.com | 793 | 414 | 420 | 2 | 791 | 445 | 558 | 70 | due_soon |
| aykana.ma | 647 | 467 | 472 | 62 | 585 | 486 | 507 | 534 | due_soon |

All four have `public_sitemap_canonical_link / public_sitemap_only / canonical_link_only` Registry shape, but `atlasimmobilier.com` remains `display_gate=hidden` and therefore receives a weaker Registry score than `external_tail_link_only` candidates.

## Decision

**Preferred candidate: `promoimmomarrakech.com` — PREFERRED_PENDING_REVALIDATION.**

Reasons:

- largest available reservoir: **3,005** rows;
- **3,000 / 3,005** normalized successfully;
- **2,923 / 3,005** technical display representations already exist;
- city coverage is **3,005 / 3,005**;
- intent coverage is **2,905 / 3,005**;
- current Registry shape already matches the canonical-link lane;
- only **9** rows are fresh-confirmed today, leaving a large seed-only reservoir if source revalidation succeeds.

This decision is **not activation** and is **not permission to write**.

## Mandatory gate before any canary write

DATA-4.4B must independently revalidate:

1. current Registry review and policy shape;
2. public `robots.txt` and sitemap declaration;
3. current sitemap URL population and same-origin constraints;
4. candidate intersection with existing normalized rows;
5. exact Search + technical display presence before mutation;
6. quality/noise distribution and obvious non-property leakage;
7. duplicate/collision risk against the current Property Graph;
8. snapshot + rollback manifest before any write;
9. canary max **50 rows** for the first persistent batch;
10. drift cap **1%**, fail-closed on any anomaly.

## Non-goals

- no detail-page scraping;
- no image/content reuse;
- no Registry mutation;
- no display/publication-policy change;
- no persistent freshness write;
- no bypass if robots/sitemap signals are unavailable or inconsistent.

## Exit condition

DATA-4.4A is complete when:

- the candidate ranking is deterministic and tested;
- `promoimmomarrakech.com` is recorded as preferred **pending revalidation**;
- the three canonical MD files are aligned;
- CI is green;
- no production data write occurred.
