# DATA-4.3D — Freshness Evidence Canary Design

## Objective

Design and certify a **100-row dry-run canary** for Dar Agadir that preserves the provenance of current public-sitemap presence before any production freshness write.

DATA-4.3C proved that 5,564 `seed_only` rows are `SHADOW_READY` when current sitemap presence is treated as a hypothetical freshness signal.

## Existing canonical model

The current seed-freshness matcher promotes exact canonical URLs observed through `discovery_candidates` and records the channel as `openserp_yandex_discovery`. The production reconciliation job writes directly to `source_offer_seeds.freshness_status`, `fresh_last_seen_at` and `fresh_channels`.

DATA-4.3D must **not impersonate that channel**.

The proposed sitemap evidence uses a distinct channel:

`public_sitemap_presence`

and a TTL equal to the Source Registry revalidation interval:

`14 days`

The existing `source_offer_seeds.metadata` already preserves source/sitemap provenance, so this design does not require a parallel evidence table just to model the dry-run.

## Canary contract

The canary contains exactly **100 deterministic canonical URLs**, selected lexicographically from DATA-4.3C rows that are:

- `seed_only`;
- present in the current same-origin public sitemap;
- normalized;
- structured with `city + property_type + intent`;
- quality score >= 40;
- already have technical display evidence;
- non-duplicate;
- inside the current Dar Agadir Registry boundary.

For each row the artifact records:

- complete `before` freshness state;
- proposed state with `fresh_confirmed` + `public_sitemap_presence`;
- nested metadata provenance `freshness_evidence.sitemap_presence`;
- exact rollback state.

## Safety

This lot is **DRY_RUN only**:

- 0 DB writes;
- 0 freshness writes;
- 0 policy changes;
- 0 production activation;
- 0 detail-page fetches;
- 0 content reuse;
- robots/sitemaps same-origin only;
- source budget <= 40 requests;
- Registry remains authoritative;
- canary size fixed at 100;
- rollback manifest must contain exactly the same 100 URLs.

## Decision after certification

Only after the dry-run canary is certified may a separate write lot be proposed. That write lot must remain bounded, reversible and must not automatically activate SERP inventory.
