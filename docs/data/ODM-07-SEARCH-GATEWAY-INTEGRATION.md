# ODM-07 — Search Gateway Integration

Status: COMPLETE — code staged and merged only after review; no Production migration or Vercel deployment.

## Objective

Connect the canonical ODM-03 → ODM-06 DATA chain to the real Thin Index Search Gateway without weakening URL safety, provider policy, source balancing or deduplication.

## Serving contract

- Search uses `search_thin_index_v3`.
- Only `eligible_primary` and `eligible_secondary` rows are returned.
- Canonical normalized city, property type and intent drive structured filters.
- Text relevance remains the base signal.
- ODM-06 quality contribution remains bounded.
- Primary comparable results precede secondary link-only/contextual results.
- Existing internal listing URLs are still removed before publication.
- Node re-applies registry listing-pattern safety and URL deduplication.

## Result metadata

Thin-index results expose nullable normalized price, surface and price/m² plus quality tier, score and eligibility. These fields describe indexed information usability; they do not certify truth, availability, legal status or source reliability.

## Safety

- no commercial or partner ranking boost;
- no rejected/unclassified provider state;
- no Q0/Q1 result in the primary comparable class;
- no thumbnail/contact/gallery permission expansion;
- original-source CTA remains mandatory;
- legacy `search_thin_index_v2` remains available for rollback;
- no Production deployment in this PR.

## Deployment gate

Apply ODM-03 through ODM-07 to an ephemeral/staging database. Run `scripts/data/odm_07_search_gateway_audit.sql`, TypeScript checks, targeted tests and build. Require zero unsafe rows, invalid boosts, duplicate canonical URLs or eligibility leaks before Production migration.
