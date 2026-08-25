# Seed → listing: minimum facts contract

## Goal

Increase conversion from a fresh, validated seed/candidate into a `property_listing` when the indexed result carries the three minimum user-facing facts:

- city;
- district;
- price.

Title, surface, bedrooms, photo and description are not required for this minimum path.

## Safety boundary

The minimum-facts rule is a content-completeness override, not a policy bypass.

It does **not** bypass:

- canonical URL and source provenance;
- Source Registry authorization/policy;
- freshness / seed lifecycle requirements;
- external URL safety checks;
- PII / secret rejection;
- category, search, homepage or out-of-scope page rejection;
- canonical deduplication and existing writer idempotence.

For OpenSERP, city and district must be explicit in the indexed result. Query-inferred geography does not qualify. The price must be positive and within the writer's existing trusted-price ceiling.

A Common Crawl `seed_only` row therefore never becomes public by itself. It must still be corroborated by the fresh candidate path before materialization.

## Success proof

The focused regression gate must prove:

1. a quarantined real-estate candidate with explicit city + district + trusted price is admitted even with no surface/rooms/photo/description;
2. missing explicit district does not qualify;
3. category/search pages remain rejected;
4. unapproved domains remain rejected;
5. implausible prices cannot unlock the override;
6. the historical MASS-3A minimal contract now requires city + district + price;
7. TypeScript and production build pass.

No Vercel deployment is part of this lot.
