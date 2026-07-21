# Unified Structured Listing Intelligence Pipeline V1

Status: `#12_UNIFIED_STRUCTURED_LISTING_INTELLIGENCE_PIPELINE_IMPLEMENTED`

## Purpose

Every authorized structured listing origin must pass through one canonical intelligence orchestration before future product intelligence is exposed.

Supported origins in V1:

- direct partner feed (`ValidatedFeedRow`)
- authorized scraper output (`ScrapedListingP0`)
- partner standard listing (`PartnerListingStandard`)
- legacy DB/UI listing compatibility (`Listing`)
- first-party data already expressed as `CanonicalPropertyV1`

## Canonical sequence

1. Origin adapter → `CanonicalPropertyV1 + CanonicalOfferV1`
2. Property ingestion validation
3. Offer ingestion validation
4. Safe enrichment only (`enrichWithoutInventing`)
5. Information completeness calculation
6. Publication validation
7. Market comparison under Analysis Contract V1
8. Versioned unified result

No origin may have a privileged parallel scoring path after entering this orchestration.

## Explicit non-goals

V1 does not invent or silently activate future engines. The following remain `not_evaluated` and their canonical intelligence values remain `null` until their dedicated roadmap missions:

- freshness (#13)
- duplicate/multisource intelligence (#16)
- anomaly intelligence (#15)
- AkarScore V2 (#17)
- final conclusion (#17A)
- personalized fit (#17B)

This is intentional. `null/not_evaluated` is safer than a legacy or synthetic substitute.

## Market analysis

Market position is only produced when Analysis Contract V1 eligibility is satisfied: supported property type, positive exact price, positive surface, and a compatible benchmark scope.

Otherwise the pipeline emits an `unavailable` market claim with `Données marché insuffisantes`.

A successful market claim remains:

- relative
- indicative
- benchmark-scoped
- evidence-backed
- non-prescriptive

It is never an official valuation, exact value, guaranteed deal signal, or purchase recommendation.

## Publication boundary

Pipeline execution does not imply publication eligibility.

`validation.publication.valid` remains a distinct gate. Restricted partner records, inactive offers, unknown property types, missing cities, or non-authorized offers can be ingested and analyzed safely while remaining blocked from structured public publication.

## Migration strategy

This implementation is additive:

- no destructive DB migration
- no bulk rewrite of Production listings
- no UI cutover in #12
- no forced removal of legacy readers yet

Consumers can migrate incrementally to the pipeline output. Legacy calculations must not be treated as canonical once a consumer is migrated.

## Invariants

1. Missing price never becomes `0`.
2. Unknown booleans remain `null`.
3. `Property` and `Offer` remain separate.
4. Provenance survives adaptation.
5. Completeness is not reliability.
6. Analysis claims must obey Analysis Contract V1.
7. Future intelligence remains explicitly unevaluated until implemented.
8. First-party data uses the same intelligence orchestration as external structured data.
