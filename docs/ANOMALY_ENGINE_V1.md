# AkarFinder — Anomaly Engine V1

Status: canonical intelligence contract for roadmap mission #15.

## Purpose

The anomaly engine detects unusual or internally inconsistent signals in structured property data. It is a triage and explanation layer, not a truth verdict.

Core doctrine:

- anomaly != proof of wrongdoing;
- anomaly != proof that a listing is false;
- anomaly != proof that a property is unavailable;
- missing evidence never becomes a negative signal;
- a check that cannot be defended becomes `unavailable`, not a guessed score.

Public wording must stay descriptive and non-accusatory under Analysis Contract V1.

## V1 evaluated signal families

1. `market_price_outlier`
   - Requires Market Intelligence V2 to be evaluated.
   - Triggers only for an absolute asking-price gap of at least 50% versus the compatible indicative benchmark.
   - Confidence remains capped by benchmark quality.

2. `price_range_order_conflict`
   - Detects a declared minimum price greater than the declared maximum price.
   - Does not decide which value is correct.

3. `observation_chronology_conflict`
   - Detects `first_observed_at > last_observed_at`.

4. `future_observation_timestamp`
   - Detects observation timestamps more than one day beyond calculation time.
   - Explicitly allows for clock/timezone tolerance.

5. `offer_lifecycle_conflict`
   - Detects an active offer paired with `sold`, `rented`, or `withdrawn` availability state.
   - May represent synchronization lag; it is not an availability verdict.

6. `surface_fact_divergence`
   - Conservative V1 checks only for unit-like types (`apartment`, `studio`, `duplex`, `office`).
   - Evaluates only strong divergences between total/habitable/built surface labels.
   - Villas/land are excluded from this heuristic because surface semantics are more ambiguous.

7. `multi_offer_price_divergence`
   - Runs only when at least two active valid-price offers are already attached to the same canonical property.
   - >=40% price divergence triggers a signal.
   - Assumes the pre-existing canonical attachment is correct; #16 Multi-source Intelligence remains responsible for cross-source consolidation quality.

8. `abrupt_price_change`
   - Requires real observed price history passed explicitly into the pipeline.
   - History is never synthesized from current price.
   - >=30% change within <=30 days triggers a signal.

## Anomaly score

`anomaly_score` is an intensity index of detected signals among checks that were actually evaluable.

Weights:

- low = 15
- medium = 30
- high = 50
- total capped at 100

Interpretation:

- `0` means no signal was triggered among evaluated checks;
- `null` means no meaningful anomaly check was evaluable;
- it is not a probability and must never be labeled as a probability of deception, fraud, risk, or listing falsity.

## Evidence and provenance

Each signal carries:

- code;
- label and explanation;
- severity;
- confidence;
- evidence references;
- metrics;
- limitations.

The aggregate public claim uses Analysis Contract V1 domain `anomaly_signal` and strength `inferred` only when public-usable evidence exists. Otherwise it degrades to `unavailable`.

## Pipeline integration

The canonical structured intelligence path is now:

`adaptation -> validation -> safe enrichment -> completeness -> Market Intelligence V2 -> Freshness V2 -> Anomaly Engine V1 -> future #16/#17 engines`

The pipeline accepts optional real analysis context:

- `price_history`

No DB history is fabricated when this context is absent.

## Explicit non-goals for V1

- no accusation or legal conclusion;
- no hidden text-based "scam" classifier;
- no geospatial contradiction claim without a defensible external geo reference;
- no synthetic price history;
- no assumption that two similar listings are the same property;
- no automatic block or suppression solely from anomaly score;
- no change to AkarScore until #17.

## Relationship to future roadmap

- #16 supplies stronger multi-source property intelligence and contradiction evidence.
- #17 may consume anomaly signals as one bounded component of AkarScore, never as a standalone truth score.
- #17A final conclusions must preserve Analysis Contract limitations and may not transform one anomaly into a global verdict.
