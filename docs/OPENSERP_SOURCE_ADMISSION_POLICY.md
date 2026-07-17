# OpenSERP Source Admission Policy

**Mission:** AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 (sections 12-15)

## Domain registry (`data/openserp/source-domain-registry.json`)

Every discovered result's `source_domain` is looked up in the registry. Statuses:
`approved_discovery`, `partner`, `authorized_static` (all three admit), `blocked`,
`rejected_non_real_estate`, `unclassified` (default for any domain not present — never admits).

The `approved_discovery` seed set (13 domains) is exactly the set already used to publish real,
live-validated listings in Production during `OPENSERP-TO-SUPABASE-FIRST-WRITE-1`/
`OPENSERP-FIRST-WRITE-EXECUTE-1` (`lib/openserp-ingestion/first-write.ts`'s
`ALLOWED_PUBLIC_SOURCE_DOMAINS`) — no new domain is admitted without an explicit registry entry
and `compliance_note`. 4 domains are `blocked` explicitly (1 reject-all per `classify.ts`'s
`DOMAIN_RULES`, 3 meta-search aggregators that structurally never reach the `individual_listing`
classification lane). Every other domain OpenSERP might surface — including the 207 (33.3% of raw
results) the project's own benchmark found "unclassified" against a much looser domain heuristic —
defaults to `unclassified` and cannot produce a public listing.

## Admission gates (`national-admission.ts`'s `decideAdmission()`), all must pass

1. `classifyOpenSerpResult()` (unchanged `classify.ts` logic, national city/district extractors
   injected) must return a non-null result with `classification_lane === "individual_listing"`.
2. `source_domain` must be `approved_discovery`/`partner`/`authorized_static` in the registry.
3. Both `canonical_source_url` and `original_url` must be safe `http(s)` URLs (no
   `javascript:`/`data:` schemes).
4. No PII/secret token may survive into `title`/`snippet`/`original_url` after redaction
   (`redactSensitiveText` — phone, WhatsApp, personal email, common secret-token words). Title/
   snippet PII is stripped upstream by `classify.ts` before this check ever sees it (so it almost
   never fires there); a URL carrying PII in a query string is never auto-redacted and is caught
   here.
5. The URL must not structurally look like a homepage/category/search hub (bare or non-numeric
   single-segment path) — a second, independent guard beyond `classify.ts`'s own per-domain regex
   rules.
6. Admission confidence must be `high` (a domain's own `strongIndividual` URL pattern matched) or
   `medium` (no strong URL pattern, but enough textual detail signals — price/surface/bedrooms/
   detail language — matched `classify.ts`'s existing threshold). Anything weaker is `low`
   confidence and does **not** admit.

A result that fails step 1 stays a `discovery_candidates` row with `discovery_status = "rejected"`
(if `classify.ts` itself rejected it as out-of-scope) or `"unclassified"` (everything else that
didn't clear every gate) — never deleted, never silently dropped, available for a future human
review pass, but never public.

## What is never extracted or invented

Only from the SERP result itself (URL, domain, title, snippet, rank, engine, query, timestamp).
From title/snippet only: price (`parsePriceMad` — requires an explicit `DH`/`MAD`/`million`/`MDH`
unit, never a bare number; `0` or negative is never returned as a price), surface, transaction,
property type, city/district (national extractor, falls back to the query's own target city/
district when the text itself is ambiguous — never a different city than the query intended,
since a text match against a *different* recognized city is treated as a location contradiction
and the whole result is rejected in `classify.ts`'s `explicitLocationMatchesQuery` check),
bedroom count. An absent field is `null`, never a fabricated default.

## Never happens (defense-in-depth, verified by test)

No `duplicate_group_id` reference anywhere in the new module surface. `cluster_origin` on every
`property_clusters` row this pipeline creates is always `deterministic_same_source_identifier`
(never `legacy_one_to_one_projection`, `manual_review`, or `explicit_partner_identifier`).
`origin_type` on every `listing_sources` row is always `persisted_openserp` (never a partner-facing
value — enforced at runtime by `assertOpenSerpOriginIsNeverPartnerFacing`, reused unchanged from
the Market Index foundation). No `source_offer_observations` row is ever created by this mission.
No two `listing_sources` rows are ever assigned to the same `property_clusters` row (1:1 only, by
construction — one cluster per newly admitted SourceOffer, keyed on that offer's own
`property_listings.id`).
