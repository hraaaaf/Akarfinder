# Multi-source Property Intelligence V1

Status: implementation contract for roadmap #16.

## Purpose

AkarFinder may observe several offers that appear related. V1 creates an explainable consolidated view without collapsing source offers or turning similarity into certainty.

The engine separates:

1. **offer structure** — how many offers and sources are attached to the canonical property;
2. **record linkage** — duplicate URL / same source identifier / explicit partner identifier;
3. **property linkage inference** — whether the available evidence supports a public multi-source rapprochement;
4. **divergences** — price, availability, transaction and display-policy differences that must remain visible.

## Absolute rules

- A source offer is never deleted, overwritten or silently merged by this engine.
- A heuristic match is never promoted to certainty.
- `possible_match` remains low-confidence.
- `cross_source_high_confidence` is accepted as strong only with at least three corroborating structured signals and zero contradiction.
- Strong price or surface contradictions downgrade heuristic linkage.
- URL duplication or a same-source identifier establishes strong **record-level linkage**, but does not by itself certify physical-property identity.
- Explicit partner identifiers or documented manual review are stronger than heuristics.
- Missing association evidence produces `unresolved`, never a guessed duplicate score.
- The Analysis Contract `duplicate_signal` policy remains authoritative; public wording cannot claim certain physical identity.

## Association evidence

Supported bases:

- `manual_review`
- `explicit_partner_identifier`
- `deterministic_same_source_identifier`
- `url_duplicate`
- `same_source_offer`
- `cross_source_high_confidence`
- `possible_match`
- `legacy_one_to_one_projection`
- `unknown`

The existing Dedup Clustering V2 scorer stays a shadow/candidate generator. #16 does **not** widen `property_cluster_members.origin_type` and does not activate automatic heuristic cluster writes.

## Linkage levels

- `explicitly_supported` — explicit/manual evidence connects the evaluated offers without contradictions.
- `strong_candidate` — structured evidence strongly supports rapprochement, but identity remains inferred.
- `possible_candidate` — partial/weak evidence or contradictions require confirmation.
- `unresolved` — no defensible linkage conclusion.

`confidence_score` is a **linkage-confidence index**, not a duplicate probability, truth score or fraud score. The legacy `PropertyIntelligenceV1.duplicate_score` field receives this value only as a compatibility projection.

## Consolidated view

The engine exposes without manufacturing consensus:

- offer count;
- active offer count;
- distinct source count;
- active asking-price min/max/spread;
- distinct availability states;
- distinct transaction types;
- display/compliance-policy divergence;
- association evidence coverage and contradictions.

It does not choose a universally “correct” price or source.

## Pipeline integration

`#12 canonical pipeline -> #14 market -> #13 freshness -> #15 anomalies -> #16 multi-source -> #17 AkarScore`

Single-offer inputs return `insufficient_data` for #16 and keep `duplicate_score = null`.

## Database safety

No destructive migration.
No Production rewrite.
No widening of the cluster-member origin constraint.
No automatic heuristic merge/write path.
