# AkarScore V2 — Explainable Documentation Quality Index

**Mission:** #17 — AKARSCORE V2 EXPLICABLE

## Purpose

AkarScore V2 is a `0–100` explainable index of **how well an AkarFinder structured listing is documented with the information currently available**.

It is **not** a probability that an announcement is true, a certification, a legal verification, a guarantee of current availability, or an investment recommendation.

## Five dimensions

| Dimension | Base weight | Source |
|---|---:|---|
| Useful completeness | 30 | Information Completeness Contract |
| Provenance & traceability | 25 | Freshness & Provenance V2 verification channel |
| Observation freshness | 15 | Freshness & Provenance V2 |
| Data coherence | 15 | Anomaly Engine V1 |
| Market-context quality | 15 | Market Intelligence V2 benchmark compatibility/quality |

### Missing-data rule

An unavailable dimension is **never converted into zero**. It is removed from the denominator and available weights are re-normalized.

A score is produced only when at least **3 dimensions** and at least **60% of base weight** are defensibly available. Otherwise the result is `insufficient_data` and `score=null`.

## Multi-source rule

Multi-source Property Intelligence V1 does not create a required sixth dimension.

- Single-source listings receive **no penalty**.
- Strong, contradiction-free multi-source corroboration may add only a small bonus:
  - `+3` for explicitly supported/high-confidence linkage;
  - `+2` for strong-candidate/medium-confidence linkage;
  - otherwise `+0`.
- Final score remains capped at `100`.

## Anomaly rule

Anomaly Engine V1 affects **only the data-coherence component**. It must not silently reduce completeness, provenance, freshness, or market-context quality.

`coherence_score = 100 - anomaly_score`, when anomaly checks are sufficiently evaluable. If not evaluable, coherence is unavailable rather than zero.

## Public semantics

Recommended labels:

- `85–100`: **Informations très bien documentées**
- `70–84`: **Informations bien documentées**
- `50–69`: **Documentation intermédiaire**
- `<50`: **Documentation limitée**
- insufficient coverage: **Qualité documentaire insuffisamment couverte**

The public claim is governed by **Analysis Contract V1 / `information_quality`** and must preserve its assumptions, evidence, limitations, component breakdown, and coverage.

## Pipeline integration

AkarScore V2 runs after:

1. canonical adaptation and validation;
2. safe enrichment and completeness;
3. Market Intelligence V2;
4. Freshness & Provenance V2;
5. Anomaly Engine V1;
6. Multi-source Property Intelligence V1.

It populates the existing canonical compatibility field `property.intelligence.akar_score` and exposes the full explainable result as `result.akar_score`.

`final_conclusion` and `property_fit` remain explicitly outside mission #17 and stay `not_evaluated`.

## Safety invariants

- No destructive DB migration.
- No Production data rewrite.
- No forced UI cutover.
- No missing-value-to-zero shortcut.
- No single-source penalty.
- No automatic legal or factual certification.
- No collapse of source offers.
