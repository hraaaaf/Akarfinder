# DATA-4.3C — Dar Agadir Sitemap-Presence Freshness Shadow

## Objective

Measure the hypothetical impact of treating **current public-sitemap presence** as a bounded freshness signal for already-held Dar Agadir observations, without writing freshness state or activating inventory.

DATA-4.3B certified that 5,749 existing URLs are still present in the current public sitemap, including 5,673 rows currently marked `seed_only`.

## Shadow rule

A row may become `SHADOW_READY` only when all of the following are true:

1. Registry boundary remains `public_sitemap_only / canonical_link_only / external_tail_link_only`;
2. the canonical URL is present in the current same-origin HTTPS sitemap;
3. normalization is complete;
4. `city + property_type + intent` are present;
5. quality score is at least 40;
6. technical display evidence already exists;
7. the canonical URL is not duplicated.

The only hypothetical change is freshness evidence:

`seed_only + sitemap_present_now → sitemap_present_shadow`

This is **not** written as `fresh_confirmed`.

## Safety

- 0 DB writes;
- 0 freshness writes;
- 0 policy changes;
- 0 production activation;
- 0 detail-page fetch;
- 0 content reuse;
- source network limited to robots.txt + same-origin public sitemap documents;
- max 40 source requests;
- fail closed on Registry drift.

## Decision gate

If the number of `seedOnlyShadowReadyRows` is material (thousands), define a separate canary/write proposal for explicit review. If it remains small, stop engineering on Dar Agadir and move to the next admissible reservoir.
