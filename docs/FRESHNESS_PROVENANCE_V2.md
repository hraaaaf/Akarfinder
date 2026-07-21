# Freshness & Provenance V2

Status: implementation contract for roadmap mission #13.

## 1. Core doctrine

Freshness describes **how recently AkarFinder observed a structured signal**. It does not prove that a property is currently available.

Absolute rule:

> `vu récemment` != `encore disponible`

No freshness result may be presented as a guarantee of availability.

## 2. Two different freshness clocks

AkarFinder intentionally keeps two distinct systems:

### Historical seed freshness

Used by `source_offer_seeds` and the 100K acquisition track.

- `fresh_confirmed`: exact canonical URL was re-observed by an authorized fresh discovery channel.
- `aging` / `stale`: age of that discovery overlap.
- Existing 30/90-day thresholds remain unchanged.

This is acquisition/discovery metadata only. It must never create or publish a listing by itself and must never mean that the property is available.

### Structured listing observation freshness V2

Used by the unified structured listing intelligence pipeline.

- `fresh`: last structured observation <= 7 days.
- `aging`: > 7 and <= 30 days.
- `stale`: > 30 days.
- `unknown`: no defensible observation timestamp.

These bands are observation-recency bands, not truth, reliability, availability or quality scores.

## 3. Three clocks are kept separate

For each selected canonical offer:

- `first_seen_at`: earliest defensible structured observation.
- `last_seen_at`: latest defensible structured observation.
- `source_updated_at`: timestamp declared by the source/partner when available.

`source_updated_at` never silently replaces `last_seen_at`.

A source saying "updated today" is not the same evidence as AkarFinder observing the offer today.

## 4. Verification / observation channels

V2 normalizes the channel that supports the freshness signal:

- `first_party`
- `partner_structured`
- `authorized_source_observation`
- `search_discovery`
- `legacy_import`
- `system_unknown`

The channel qualifies the evidence source. It does not upgrade declared information to verified truth.

## 5. Legacy safety

Legacy DB adapters currently stamp facts at adapter execution time for compatibility.

Those timestamps must **not** be interpreted as fresh source observations.

Therefore `legacy_db` is excluded from the fact-timestamp fallback. Without a real historical observation timestamp, its freshness result is `unknown` and `freshness_score = null`.

## 6. Availability is a separate signal

V2 exposes one of:

- `declared_available`
- `explicitly_unavailable`
- `not_currently_available`
- `unknown`

Examples:

- source says `available` -> **Disponibilité déclarée par la source**.
- sold/rented/withdrawn/deleted/unpublished -> **Indisponibilité déclarée**.
- reserved/upcoming -> **Non disponible immédiatement selon la source**.
- no explicit availability signal -> **Disponibilité non confirmée**.

`can_claim_current_availability` is always `false` in V2. A stronger future availability claim would require a dedicated contract and evidence model.

## 7. Freshness score

The existing `PropertyIntelligenceV1.freshness_score` is populated only when a defensible observation exists:

- fresh -> 100
- aging -> 60
- stale -> 20
- unknown -> null

This is an internal recency-band score only. It must never be labelled as reliability, verification or probability of availability.

## 8. Analysis Contract integration

Every public freshness conclusion passes through Analysis Contract V1 (`domain = freshness`).

Public labels:

- `Vu récemment`
- `Observation à actualiser`
- `Observation ancienne`
- `Date d’observation inconnue`

Every non-unavailable claim explicitly states that observation recency does not confirm current availability.

Forbidden transformations include:

- recently observed -> still available
- active internal status -> currently available
- source_updated_at -> fresh observation
- legacy adapter execution time -> fresh observation
- historical seed overlap -> live listing availability

## 9. Unified pipeline integration

The #12 pipeline now executes:

`adaptation -> ingestion validation -> safe enrichment -> completeness -> publication validation -> market analysis -> freshness/provenance V2`

The following future engines remain intentionally `not_evaluated` until their dedicated roadmap missions:

- duplicate intelligence V2
- anomaly intelligence
- AkarScore V2
- final conclusion
- property fit

## 10. Migration policy

This mission is additive:

- no destructive DB migration;
- no Production data rewrite;
- no forced UI cutover;
- no change to historical seed-freshness thresholds;
- no inference of current availability from recency alone.
