# DATA-4.3B — Dar Agadir Public Sitemap Revalidation Feasibility

## Objective

Determine whether Dar Agadir's large `seed_only` reservoir can be re-observed through the **only discovery channel already allowed by the Source Registry: `public_sitemap`**.

This lot does **not** update freshness and does **not** activate inventory. It only measures whether existing canonical URLs are currently present in the public sitemap surface.

## Registry boundary

Required live policy:

- `source_domain=daragadir.com`;
- `acquisition_mode=public_sitemap_canonical_link`;
- `discovery_policy=public_sitemap_only`;
- `display_policy=canonical_link_only`;
- `display_gate=external_tail_link_only`;
- `robots_status=sitemap_declared`;
- `allowed_discovery_channels=[public_sitemap]`;
- `max_revalidation_interval_days=14`;
- review status must be `current` or `due_soon`;
- evidence contains `https://daragadir.com/robots.txt`.

If any of those constraints drift, the audit fails closed before source access.

## Network scope

Allowed source reads are strictly limited to:

1. the Registry-backed `robots.txt` URL;
2. same-origin HTTPS sitemap documents declared by robots or nested sitemap indexes.

Hard limits:

- maximum **40 source requests**;
- maximum **50,000 sitemap URLs**;
- same-origin HTTPS only (`daragadir.com` / `www.daragadir.com`);
- no listing/detail page request;
- no image/contact/description reuse;
- no WARC;
- no bypass.

## Interpretation

The audit produces `SITEMAP_PRESENT_EVIDENCE` by comparing current public sitemap URLs with the 6,533 canonical URLs already held by AkarFinder.

Important:

`present in sitemap ≠ fresh_confirmed write ≠ public activation`.

A sitemap presence signal can justify a later, separate freshness shadow/write design only if the evidence is strong and the Registry remains valid.

## Previous DATA-4.3A baseline

- Dar Agadir rows: **6,533**;
- `ELIGIBLE_SHADOW`: **5**;
- `SEED_ONLY_REVALIDATION_REQUIRED`: **6,425**;
- `NON_NORMALIZED`: **46**;
- `INSUFFICIENT_STRUCTURE`: **57**;
- duplicates: **0**;
- policy blocked: **0**.

DATA-4.3B exists to test whether the 6,425 seed-only rows have current sitemap-presence evidence without fetching the underlying listings.

## Decision after live run

- High seed-only sitemap presence: design a separate **freshness shadow** lot; do not mutate immediately.
- Low presence: stop investing in Dar Agadir and move to the next admissible reservoir.
- Registry/policy drift or source blocking: stop and re-review policy; no retry/bypass strategy.
