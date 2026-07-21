# AkarFinder Track B — 10-series canonical contracts

Status target: `TRACK_B_10_SERIES_CONTRACT_FOUNDATION_COMPLETE`

This document locks the implementation foundation for #10B through #10G. It is additive: no destructive DB migration, no UI cutover, no production data rewrite.

## #10B — Property Schema V1

Canonical separation:

1. `CanonicalPropertyV1`: physical property identity + facts.
2. `CanonicalOfferV1`: one commercial offer/source for that property.
3. `CanonicalFact<T>`: value + provenance + confidence + observation + verification + visibility.
4. `PropertyIntelligenceV1`: calculated signals only.
5. `OfferDisplayPolicyV1`: display/legal policy only.
6. `MediaAssetV1`: media rights and usage policy separate from property facts.

Absolute rules:

- unknown = `null`, never fake `0`;
- boolean unknown = `null`, not `false`;
- `DECLARED` is not `VERIFIED_DOCUMENT`;
- acquisition channel is separate from provenance;
- scores and display permissions are never physical property facts;
- source offers are preserved even when clustered into one property;
- title alone is never an identity key.

Canonical transaction is only `sale | rent`. `new` is represented by `market_segment = new_build | off_plan`, not as a transaction.

## #10B2 — Project Schema V1

`CanonicalProjectV1` is separate from individual properties/units. It contains developer, project status, location, timeline, inventory summary, product/amenities, legal status, commercial terms, media, and unit property IDs.

A project is not encoded as a fake property type. Units may reference `project_id` and `project_unit_id`.

## #10C — Completeness Contract

`computeInformationCompleteness()` returns a 0–100 information-presence score with contextual weights by property type.

Public framing is strictly `Niveau d'information`:

- Informations limitées
- Informations partielles
- Informations détaillées
- Informations très détaillées

It is explicitly not a reliability, truth, verification, certification, fraud, or quality guarantee score.

## #10D — Dynamic Partner Onboarding

`getDynamicOnboardingFields()` generates a contextual form from property type, transaction and market segment.

Rules:

- 12 base fields;
- maximum 45 fields for any context;
- irrelevant questions are removed (e.g. bedrooms/elevator for land);
- land, apartment, villa and new-build paths activate different fields;
- missing price remains allowed via price status;
- media rights confirmation is explicit.

## #10E — Automatic Property Enrichment

`buildBasePropertyIntelligence()` and `enrichWithoutInventing()` only calculate deterministic values that can be justified from canonical facts.

Current foundation derives only price/m² when both a valid positive price and a usable positive surface exist. Market position, AkarScore, anomaly score and other intelligence remain `null` until their authoritative engines provide them.

No guessed prior price, location, market value or missing characteristic is generated.

## #10F — Listing Validation Engine

Two distinct gates:

### Ingestion gate

Allows sparse/unknown data when structurally safe. It validates identities, numeric sanity, coordinates, price semantics and PII boundaries without requiring a rich public listing.

### Publication gate

Adds stricter requirements: known property type, city, active offer and explicit `compliance_status = allowed`.

A record may therefore be ingested but not publicly published.

## #10G — Canonical Adapter Layer

Adapters exist for:

- `ValidatedFeedRow` → canonical property + offer;
- `ScrapedListingP0` → canonical property + offer while preserving extraction confidence;
- `PartnerListingStandard` → canonical property + offer;
- legacy frontend `Listing` → low-confidence compatibility projection.

Adapter rules:

- no missing price becomes `0`;
- scraper `false` feature defaults are treated as unknown when absence cannot prove false;
- legacy values are low-confidence/inferred rather than silently promoted to verified facts;
- partner data is declared, not automatically document-verified;
- display policy fields from legacy `Listing` do not contaminate canonical property facts;
- partner `new` becomes `transaction_type = sale` + `market_segment = new_build`.

## Migration strategy

The current `property_listings` / `listing_sources` tables remain intact during this foundation phase. Adapters provide a compatibility boundary first. Future DB evolution must be additive and reversible, with shadow reads/writes before any canonical cutover.

`Listing` becomes a UI ViewModel over canonical property + offer + intelligence + display policy. It must not remain the source of truth.

## Validation

The `property-schema-track-b.test.ts` suite covers all #10B–#10G contracts and is wired into `npm run test:scrapers` plus a dedicated `npm run test:property-schema` command.
