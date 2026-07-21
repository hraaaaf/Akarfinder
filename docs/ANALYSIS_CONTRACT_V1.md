# AkarFinder Analysis Contract V1

Status: `LOCKED`
Version: `1.0`

## Purpose

This contract defines what AkarFinder may conclude from property data, what evidence is required, how uncertainty must be surfaced, and which claims are forbidden.

It sits between the canonical Property/Offer/Evidence model and every intelligence consumer:

`Canonical data → Analysis Contract → market/anomaly/dedup/freshness/score/conclusion/fit → UI`

No downstream engine may strengthen a claim beyond the evidence allowed here.

## 1. Core doctrine

1. `DECLARED` is not `VERIFIED_DOCUMENT`.
2. Extraction confidence is not truth confidence.
3. `null` means unknown; unknown is never replaced by zero/false or invented content.
4. Derived values remain derived and must disclose the calculation/reference scope.
5. Inferences remain hypotheses and cannot silently become facts.
6. A missing answer may produce `Données insuffisantes`; it must never produce a fabricated answer.
7. A score is not proof.
8. A recent observation is not proof that an offer is still available.
9. A similarity signal is not proof that two offers are the same physical property.
10. An anomaly signal is not proof of fraud, deception, illegality, or error.
11. A market benchmark is a comparative reference, not an official/exact/real price.
12. A personalized fit score measures compatibility with preferences, not objective property quality.

## 2. Claim strengths

- `observed`: information/material was observed, without verification of underlying truth.
- `declared`: explicitly declared by a source/partner/user.
- `verified`: supported within the scope of a verified document. Requires `VERIFIED_DOCUMENT + verification_status=verified`.
- `calculated`: deterministic computation from eligible inputs.
- `indicative`: comparative/model-based signal that must remain qualified.
- `inferred`: hypothesis/probabilistic signal; confidence is capped and confirmation is required.
- `unavailable`: evidence is insufficient for a meaningful conclusion.

## 3. Evidence → maximum public claim

| Provenance | Maximum default claim |
|---|---|
| `DECLARED` | `declared` |
| `VERIFIED_DOCUMENT`, verified | `verified` within verification scope |
| `VERIFIED_DOCUMENT`, not verified | `observed` |
| `DERIVED_GEO` | `calculated`, preserving geo precision |
| `DERIVED_MARKET` | `indicative` |
| `INFERRED` | `inferred`, confidence capped at medium |
| disputed fact | no assertive public conclusion |
| non-public fact | no direct public claim exposing it |

High confidence on a declaration means AkarFinder is confident it captured the declaration correctly. It does **not** mean the declaration itself is verified.

## 4. Domain rules

### Property facts
Facts may be declared, verified, calculated, inferred or unavailable according to their provenance. Wording must match the claim strength.

### Market position
Only `indicative` or `unavailable`.

Current public eligibility requires:
- supported type: apartment/villa;
- positive price;
- positive surface;
- compatible benchmark;
- neighborhood benchmark → high comparison confidence;
- city benchmark → medium comparison confidence.

Forbidden interpretations include official/exact/real/certified price, guaranteed good deal, scam, overvaluation certainty, guaranteed too expensive, or no-risk language.

### Information completeness
Only `calculated` or `unavailable`.

It measures presence/coverage of useful information. It must never be labeled as reliability, verification, certification or truth.

### Information quality / legacy reliability
The existing legacy reliability score is **not evidence of truth**. It combines completeness, extraction confidence, price/surface presence, seller/media presence and duplicate signals. Until a later V2 replacement, it may only be interpreted as an information-quality heuristic, never as verified reliability.

### Freshness
A last-seen/last-observed timestamp supports only observation recency. It cannot assert current availability unless availability is independently confirmed.

### Duplicate signal
Algorithmic similarity supports only an inferred duplicate/similarity signal. It cannot assert “same property” or “certain duplicate” without a stronger future identity-resolution contract.

### Anomaly signal
An anomaly is a statistical/data inconsistency signal. It cannot be presented as fraud, scam, lie, fake price, illegality or intentional deception.

### Legal
Legal verification wording requires verified-document evidence within a defined scope. A seller/partner declaration remains declared.

### Geo
Centroids/derived coordinates remain calculated with explicit precision. They cannot be presented as an exact verified address.

### Investment
Only indicative/inferred/unavailable. No guaranteed yield, guaranteed profitability, safe investment or financial guarantee.

### Property fit
A fit score measures compatibility with a user profile/preferences. It is not an objective ranking of intrinsic property quality and cannot claim “best property” or “perfect for you”.

### Final conclusion
A final conclusion is never a purchase order or guarantee. It must:
- be `indicative`, `inferred`, or `unavailable`;
- rely on at least two supporting evidence items;
- surface material limitations;
- preserve uncertainty from all underlying signals;
- never turn one score/signal into a global verdict.

## 5. Global forbidden wording

The public analysis layer must reject absolute phrases such as:
- prix officiel / certifié / vérifié / garanti / exact / réel;
- bonne affaire garantie;
- sans risque;
- fraude confirmée;
- certifié par AkarFinder.

Domain-specific forbidden wording is additionally enforced in code.

## 6. Runtime enforcement

Canonical implementation:
- `lib/analysis/analysis-contract.ts`
- `scripts/scrapers/__tests__/analysis-contract.test.ts`

Key functions:
- `capabilityFromFact()` — maps canonical evidence to the strongest safe claim.
- `evidenceFromFact()` — creates evidence metadata without losing provenance/visibility.
- `validateAnalysisClaim()` — rejects strength/evidence/wording violations.
- `assessMarketComparisonEligibility()` — locks current safe market-comparison eligibility.
- `createUnavailableClaim()` — makes “we do not know” a first-class valid output.

## 7. Consumer rule

Future tracks #12–#17C must consume this contract rather than inventing local claim semantics.

No UI component, score engine, LLM layer, ranking layer or advisor may upgrade:

`declared → verified`

`indicative → exact`

`inferred → certain`

`observed recently → available now`

`similar → same property`

`anomalous → fraudulent`

`complete → reliable`

`fit → objectively best`

without new evidence that explicitly satisfies this contract.
