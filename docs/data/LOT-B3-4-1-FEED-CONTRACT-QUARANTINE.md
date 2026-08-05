# LOT B3.4.1 — Feed Contract & Quarantine

## Objective
Create the organization-scoped foundation for partner catalogue uploads without parsing or publishing any listing.

## Contract
- reuse `professional_organizations` and `professional_memberships`;
- accept metadata for files up to 20 MiB;
- quarantine every import and row by default;
- keep raw payload separate from canonical payload;
- no listing, ranking, search or publication mutation;
- only service-role code may create parsed rows or audit events;
- authenticated members may only see their organization;
- only owners/admins may configure a feed source or change import workflow state;
- authenticated writes cannot set `publication_eligible=true` or mark an import `published`;
- every future transition must be auditable.

## Tables
- `partner_feed_sources`
- `partner_feed_imports`
- `partner_feed_import_rows`
- `partner_feed_audit_events`

## Statuses
Imports: `uploaded`, `parsing`, `quarantined`, `validated`, `rejected`, `approved`, `published`, `rolled_back`.

Rows: `quarantined`, `valid`, `warning`, `invalid`, `approved`, `published`, `rolled_back`.

## Non-effects
This lot does not implement file storage, CSV/XLSX parsing, mapping, deduplication, approval UI or publication.

## Certification
Production report: `odm_b3_4_1_feed_quarantine_report_v1()`.
