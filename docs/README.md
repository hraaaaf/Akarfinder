# AkarFinder Documentation Map

Updated: 2026-07-23

This directory is organized by authority. Do not treat every Markdown file as an equal source of truth.

## 1. Read this first

For any product, architecture, data, UX or roadmap work, read in this order:

1. `MASTER_CONTEXT.md` — durable product vision, invariants and operating doctrine.
2. `CURRENT_STATE.md` — what is actually implemented on canonical `main` at the latest consolidation.
3. `DATA_LAUNCH_EXECUTION_PLAN.md` — active execution program: DATA → search depth → quality → final production gate.
4. `ROADMAP.md` — active priorities and completion logic.
5. The domain-specific contract relevant to the task.
6. The actual code, migrations, tests and live environment before making a technical claim.

`START.md` is the short boot sequence for agents.

## 2. Authority hierarchy

When documents disagree:

### Technical state

1. Current repository code on canonical `main`
2. Production state actually verified: Vercel, Supabase, environment flags and live APIs
3. Tests and CI
4. `CURRENT_STATE.md`
5. Domain contract documents
6. Historical mission/audit documents

### Product strategy

1. Latest explicit founder decision
2. `MASTER_CONTEXT.md`
3. `DECISIONS.md`
4. `PRODUCT.md`
5. `DATA_LAUNCH_EXECUTION_PLAN.md`
6. `ROADMAP.md`
7. Historical mission documents

No old mission report may override a newer canonical decision.

## 3. Canonical core documents

- `MASTER_CONTEXT.md` — project constitution and durable vision.
- `CURRENT_STATE.md` — current implementation snapshot without pretending code equals production.
- `DATA_LAUNCH_EXECUTION_PLAN.md` — current data-first launch program and exact execution order through the final production gate.
- `PRODUCT.md` — product definition and experience model.
- `ARCHITECTURE.md` — high-level technical architecture and canonical data flow.
- `ROADMAP.md` — active roadmap and next priorities.
- `SCRAPING.md` — data acquisition, source governance and no-bypass doctrine. The filename is retained for compatibility; the scope is broader than scraping.
- `MONETIZATION.md` — business model principles and professional monetization boundaries.
- `DECISIONS.md` — durable validated decisions only.
- `CANONICAL_BASELINE.md` — branch/release/source-of-truth rules.
- `START.md` — agent boot sequence.
- `SESSION.md` — compatibility stub pointing to `CURRENT_STATE.md`; historical session logs belong in Git history/audits, not as a competing source of truth.

## 4. Current domain contracts

These documents describe implemented or actively maintained contracts. They are subordinate to code but remain useful design references:

### Property and intelligence

- `TRACK_B_10_SERIES_CONTRACTS.md`
- `ANALYSIS_CONTRACT_V1.md`
- `UNIFIED_STRUCTURED_LISTING_INTELLIGENCE_PIPELINE.md`
- `FRESHNESS_PROVENANCE_V2.md`
- `MARKET_INTELLIGENCE_V2.md`
- `ANOMALY_ENGINE_V1.md`
- `MULTISOURCE_PROPERTY_INTELLIGENCE_V1.md`
- `AKAR_SCORE_V2.md`
- `PUBLIC_SERP_INTELLIGENCE_V1.md`
- `PROPERTY_DETAIL_V2.md`

### Search, personalization and continuity

- `NEIGHBORHOOD_INTELLIGENCE_REFERENCE_V2.md`
- `DYNAMIC_SEARCH_PROFILE_V2.md`
- `PERSONALIZED_PROPERTY_FIT_V1.md`
- `COMPAGNON_AKARFINDER_STATE_MACHINE_V1.md`

### Professional workflows

- `PROFESSIONAL_AUTH_OWNERSHIP_PROFILES_V1.md`
- `PARTNER_COMMERCIAL_ACTIVATION_V1.md`

### Acquisition and scale

- `DATA_MASS_ACQUISITION_QUERY_UNIVERSE_V2.md`

### Release and launch

- `VERCEL_PHASE_DEPLOYMENT_POLICY.md`
- `FINAL_PRODUCTION_GATE_V1.md`

## 5. Historical and audit material

Mission snapshots, incident reports, one-off validation reports, migration rehearsals and benchmark evidence are not canonical product documentation.

They should live primarily under:

- `data/audits/`
- Git commit/PR history

A historical report can be valuable evidence without being a current instruction.

## 6. Documentation rule

Do not create a new permanent `.md` for every mission.

Create or keep a permanent document only when it represents one of:

- a durable product decision;
- a stable architecture contract;
- a security/compliance invariant;
- a reusable operational policy;
- an active roadmap/state document.

Everything else should be an audit artifact, PR description or Git history.

## 7. Required maintenance

After a major product or architecture change:

- update `MASTER_CONTEXT.md` only if durable understanding changed;
- update `CURRENT_STATE.md` when implementation reality changed materially;
- update `DATA_LAUNCH_EXECUTION_PLAN.md` while the data-first launch program is active and its gates/baselines materially change;
- update `ROADMAP.md` when priorities or completion gates changed;
- update the relevant domain contract;
- do not append thousands of chronological lines to `SESSION.md` or `DECISIONS.md`.