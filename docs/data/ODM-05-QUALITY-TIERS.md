# ODM-05 — Quality Tiers

Status: COMPLETE — implementation staged, no Production migration or deployment.

## Purpose

ODM-05 classifies each Thin Index representation by **information usability**, not by truth, legal validity, professional reliability or commercial priority.

The classification is deterministic, versioned and explainable. It does not replace AkarScore V2 and must never be presented as certification.

## Tiers

| Tier | Meaning | Minimum contract |
|---|---|---|
| `Q0_link_only` | A safe external property link with almost no structured context | approved provider and canonical listing URL |
| `Q1_contextual` | Enough context to understand the likely offer, but not enough for reliable comparison | quality score >= 3 |
| `Q2_comparable` | Structurally filterable and carrying at least one explicit market fact | score >= 6, at least 2/3 classification facts and at least one price/surface fact |
| `Q3_intelligence_ready` | Current, classified and sufficiently structured for downstream intelligence | score >= 8, fresh confirmation, complete city/type/intent and at least two market facts |

## Dimensions

- **Freshness**: 2 points only for `fresh_confirmed`.
- **Provenance**: bounded provider-channel points; this is traceability, not source trust.
- **Classification**: city, property type and intent, one point each.
- **Market facts**: price, surface and price/m², one point each.
- **Descriptive context**: usable title and sufficiently informative snippet.

Maximum score: 10.

## Invariants

- missing values remain `NULL`;
- no tier can create or infer a fact;
- source and recovered evidence remain untouched;
- Q3 requires current confirmation and cannot be achieved from score alone;
- payment, partnership or premium status cannot affect tiers;
- provider publication gates remain authoritative;
- tiers do not alter organic relevance by themselves;
- no Vercel configuration change;
- no Production migration or deployment.

## Implementation

The migration adds:

- `quality_tier`;
- `quality_score`;
- `quality_dimensions`;
- `quality_version`;
- immutable evaluation functions;
- a deterministic write trigger;
- idempotent backfill;
- service-role-only view `thin_index_quality_documents_v1`;
- indexes for future quality-aware serving and measurement.

## Certification

Run `scripts/data/odm_05_quality_tiers_audit.sql` after applying ODM-03, ODM-04 and ODM-05 to an ephemeral or staging database.

Required result:

- zero missing tiers or scores;
- zero invalid scores;
- zero unsafe Q2/Q3 rows;
- zero unexpected providers;
- zero duplicate canonical URLs.

## Handoff to ODM-06

ODM-06 may use these tiers as one bounded quality signal for display eligibility and ranking, but must keep relevance, freshness, provenance and commercial status separate.
