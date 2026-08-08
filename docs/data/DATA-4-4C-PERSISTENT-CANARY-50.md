# DATA-4.4C — Persistent Canary 50

Status: **BLOCKED ON SAFETY FIX / SOURCE ROLLED BACK**

## Scope

Persist exactly the immutable 50-row Promo Immo canary produced by DATA-4.4B, then independently re-certify Production with drift <= 1%.

No expansion beyond 50 is authorized by this lot.

## Immutable input

- source: `promoimmomarrakech.com`
- DATA-4.4B run id: `data-4-4b-promoimmo-canary-50-v1`
- canary: 50 rows
- before write: Search 50/50, technical display 50/50, quality A/B 50/50
- source rows before write: `seed_only`, no `public_sitemap_presence`
- registry/policy/display policy unchanged

## First Production attempt — 2026-08-08

The exact 50 rows passed the transactional preflight:

- manifest rows: 50/50
- `seed_only`: 50/50
- `fresh_last_seen_at IS NULL`: 50/50
- no `public_sitemap_presence`: 50/50
- Search: 50/50
- technical display: 50/50
- Registry gate: PASS

The transaction persisted all 50 freshness mutations atomically. Immediate row-count checks passed:

- controlled rows: 50/50
- `fresh_confirmed`: 50/50
- `public_sitemap_presence`: 50/50
- Search: 50/50
- technical display: 50/50

Independent re-certification then detected an unacceptable quality mutation:

- quality A/B: **50 -> 0**
- the source-seed write had fired `sync_thin_index_search_document_row()`
- that trigger rebuilt enriched `thin_index_search_documents` rows from sparse `source_offer_seeds.metadata`
- Promo Immo sitemap seeds do not carry the historical `serper_search` enrichment fields used by that rebuild path
- enriched title/type/intent state was therefore lost and quality/display were recomputed downward

This is a real write-path defect; Search/display row counts alone were insufficient to detect it.

## Rollback executed

The exact source-side freshness mutation was rolled back immediately.

Promo Immo source state after rollback:

- `fresh_confirmed`: 9
- `seed_only`: 2,996
- `public_sitemap_presence`: 0

This matches the pre-write source aggregate.

The source rollback fired the same lossy Thin Index synchronization path, so the affected derived rows require restoration before DATA-4.4C can be retried.

## Recovery evidence

The 50 canary rows are covered 100% by persisted historical activation snapshots:

- A5.2 snapshot: 7 rows
- A5.3 snapshot: 22 rows
- A5.4 snapshot: 21 rows
- total: 50/50

Those snapshots persist the canonical-link-only recovery titles used by the original activation and provide a non-fabricated recovery basis.

## Mandatory safety fix before retry

A freshness/evidence-only update to `source_offer_seeds` must preserve the existing enriched Thin Index projection. The synchronization function must take a narrow fast path when:

- id, canonical URL, source domain and provider are unchanged; and
- seed metadata is unchanged after removing `freshness_evidence`.

That fast path may propagate only freshness state / audit timestamp into the existing Thin Index row. It must not rebuild title, structured fields, price/surface, quality or display fields from sparse metadata.

## Retry gates

DATA-4.4C remains blocked until all are true:

1. the 50 derived projections are restored from persisted internal recovery evidence;
2. the freshness-only projection safety migration is merged and applied;
3. the exact immutable 50-row manifest again passes preflight;
4. pre-write Search = 50/50, display = 50/50, quality A/B = 50/50;
5. the second write is one atomic 50-row transaction;
6. post-write Search/display/quality identities remain unchanged row-for-row;
7. drift is <= 1% (for a 50-row canary this means zero changed rows);
8. Registry and publication/display policy remain unchanged;
9. rollback material covers both source freshness state and derived projection safety.

No +100 / +500 expansion is authorized before these gates pass.
