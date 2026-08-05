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
- candidates that cannot be admitted now are preserved in a deferred reserve lane;
- no candidate is silently discarded;
- qualified candidates remain non-admitted and non-public until a separate lot.

## Provider mapping

| Provider | Discovery channel |
|---|---|
| `public_sitemap` | `public_sitemap` |
| `openserp` | `public_index` |
| `serper_mass_harvest` | `public_index` |
| everything else | `unsupported` |

## Decisions

Active qualification:

- `qualified_canonical_link`
- `qualified_internal_signal`
- `already_seeded`

Deferred reserve:

- `reserve_channel`
- `reserve_freshness`
- `reserve_gate`
- `reserve_unregistered_source`

Reserve candidates carry a `reserve_lane`, a reason and a priority. They are kept behind qualified candidates until policy, freshness or channel corroboration changes.

`seed_admission_eligible` and `publication_eligible` remain false for every row.

## Certification

Production report: `odm_b3_discovery_expansion_report_v1()`.
