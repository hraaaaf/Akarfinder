# LOT B3 — Discovery Expansion

## Objective

Convert already-persisted discovery observations into a deterministic expansion audit governed by Source Registry v2 and Source Freshness Engine.

## Contract

- no detail-page fetch;
- no new network access;
- no mutation of `source_offer_seeds` or `thin_index_search_documents`;
- no ranking or publication change;
- one deduplicated row per source domain and canonical URL;
- provider-to-channel mapping is explicit;
- unregistered, stale or channel-incompatible candidates remain blocked;
- qualified candidates remain non-admitted and non-public until a separate lot.

## Provider mapping

| Provider | Discovery channel |
|---|---|
| `public_sitemap` | `public_sitemap` |
| `openserp` | `public_index` |
| `serper_mass_harvest` | `public_index` |
| everything else | `unsupported` |

## Decisions

- `qualified_canonical_link`
- `qualified_internal_signal`
- `blocked_channel`
- `blocked_freshness`
- `blocked_gate`
- `already_seeded`
- `unregistered_source`

`seed_admission_eligible` and `publication_eligible` remain false for every row.

## Certification

Production report: `odm_b3_discovery_expansion_report_v1()`.
