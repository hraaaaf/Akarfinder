# ODM-10C2 — Truthful Listing Baseline

## Canonical production truth — 5 August 2026

The Thin Index contains 56,792 documents. The previous report counted every publicly eligible `real_estate_likely` document toward 40K, including category and ambiguous pages.

That metric is no longer accepted as listing depth.

- publicly eligible real-estate documents: 22,370;
- eligible detail pages classified `LISTING`: **7,483**;
- eligible `AMBIGUOUS` documents: 14,849;
- eligible `CATEGORY` documents: 38;
- truthful gap to 40,000 listings: **32,517**;
- listing pages with city: 7,483;
- listing pages with property type: 7,108;
- listing pages with intent: 7,138;
- listing pages with trusted price: 854;
- listing pages with surface: 2,085;
- listing pages with both price and surface: 719;
- non-real-estate leakage target: zero.

The 7,483 value is an observed production baseline, not a hard-coded database value. The report remains dynamic and must always calculate the current truthful count.

## Certification rule

The milestone is certified only when:

1. at least 40,000 documents are classified `LISTING`;
2. those listings are `real_estate_likely` and publicly eligible;
3. `CATEGORY`, `AMBIGUOUS`, null and unknown document kinds do not count toward the target;
4. no `non_real_estate` document remains publicly eligible;
5. every net-new listing is a real detail URL with provenance, source policy and deduplication evidence.

The report exposes `LISTING`, `CATEGORY`, `AMBIGUOUS` and other document kinds separately. The backward-compatible `public_real_estate` field now mirrors `public_listings`; it no longer represents all public real-estate documents.

## Acquisition backlog

The existing acquisition backlog remains a planning tool. Its historical quotas do not close the truthful 32,517-listing deficit and must not be presented as discovered or admitted inventory.

Counts change only after actual acquisition, classification, policy validation, deduplication and admission.

No robots.txt or sitemap is interpreted as a reuse licence. Source Registry remains authoritative for detail fetch, content reuse, imagery and display policy.

## Internal audit security

`public.odm_trusted_price_reconciliation_audit_v1` is an internal audit table. Row Level Security is enabled and table plus sequence privileges are removed from `PUBLIC`, `anon` and `authenticated`. Operational access remains available to `service_role`; no public RLS policy is created.

## Fail-closed behavior

No document is promoted or reclassified by this LOT. The change corrects measurement and access control only. Certification remains false until the database contains at least 40,000 eligible real-estate `LISTING` documents with zero leaked non-real-estate documents.
