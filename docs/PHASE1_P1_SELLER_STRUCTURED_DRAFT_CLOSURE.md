# AF-AUDIT-P1-049 — Seller lead != property dataset

Status before merge: CODE_READY / DB_MIGRATION_PENDING.

Closure contract:
- contact intent remains in `buyer_leads`;
- property declarations are persisted separately in `seller_property_drafts`;
- draft paths align with AkarFinder Property Schema V1;
- only seller-declared facts are stored in `declared_facts`;
- city + property type + surface are required for a structurally useful seller submission;
- missing optional data remains missing;
- no derived/intelligence/verification fact is fabricated;
- `publication_eligible` is permanently false in this draft table;
- anon/authenticated direct table access is revoked and RLS is enabled;
- seller form states clearly that the draft is not a publication, verification, or official estimate.

AF-AUDIT-P1-049 becomes CLOSED only after CI is green, the PR is merged, the migration is applied, and the live database schema is verified read-only.
