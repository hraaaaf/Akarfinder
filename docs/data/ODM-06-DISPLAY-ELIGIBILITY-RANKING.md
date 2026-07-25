# ODM-06 — Display Eligibility & Quality-aware Ranking

Status: COMPLETE — implementation staged, no Production migration or Vercel deployment.

## Objective

Turn ODM-05 information-usability tiers into an explicit publication/display policy and a bounded ranking contribution, without allowing quality metadata to bypass source, freshness or publication gates.

## Display classes

- `eligible_primary`: Q2/Q3 results that are sufficiently structured for the main comparable result set.
- `eligible_secondary`: Q0/Q1 results that remain useful as clearly attributed external links but must not crowd out comparable results.
- `ineligible`: missing canonical URL, unsupported provider/freshness state or missing quality classification.

Eligibility is not a legal, truth, availability or source-reliability certification.

## Ranking doctrine

Quality contributes a bounded boost between 0 and 0.35. Relevance remains the primary ranking signal. The boost is composed only from:

- the ODM-05 quality tier;
- the bounded quality score;
- confirmed freshness.

Commercial status, premium placement, partner status and payment never influence organic ranking.

## Implementation

The migration adds:

- `display_eligibility`;
- `display_eligibility_reason`;
- `ranking_quality_boost`;
- `ranking_policy_version`;
- immutable policy functions;
- a deterministic write trigger and idempotent backfill;
- indexes for display and ranking retrieval;
- a service-role-only eligible serving view.

## Invariants

- provider gates remain authoritative;
- rejected/unclassified content cannot become eligible;
- Q0/Q1 remain visible only as secondary external results;
- Q2/Q3 may be primary but receive no truth or reliability label;
- ranking boost is capped and cannot replace textual/structured relevance;
- missing values remain NULL;
- no neighborhood inference;
- no Vercel configuration change;
- no automatic Production deployment.

## Certification

Apply ODM-03 through ODM-06 to an ephemeral/staging database, then run `scripts/data/odm_06_display_ranking_audit.sql`.

Required gate:

- zero unsafe primary rows;
- zero unsafe secondary rows;
- zero unexpected providers;
- zero unsupported freshness rows;
- zero invalid or missing ranking boosts;
- zero duplicate canonical URLs.

## Handoff to ODM-07

ODM-07 may integrate the eligible serving view and bounded quality boost into the Search Gateway only after staging certification. It must preserve source balancing, canonical URL dedupe, original-source CTA and the no-commercial-ranking rule.
