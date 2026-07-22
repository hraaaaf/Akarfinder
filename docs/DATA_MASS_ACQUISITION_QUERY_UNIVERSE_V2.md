# Data Mass Acquisition Engine + National Query Universe V2

## Canonical objective

AkarFinder must move from a feature-complete search product to a deep national property index.

North-star targets:

- **100,000+ raw discovery/observation events**
- **~37,000+ unique deduplicated property clusters** as the first working target
- broad national coverage across cities, districts, transactions and property types
- freshness/lifecycle remains mandatory; volume never overrides publication eligibility

## Production baseline at mission start

Measured on 2026-07-22:

- `discovery_candidates`: **8,484** rows
- unique canonical discovery URLs: **6,616**
- distinct discovery queries observed: **708**
- source domains observed: **755**
- `property_listings`: **664**
- `property_clusters`: **525**
- `property_cluster_members`: **525**
- `source_offer_observations`: **0**

This is approximately **8.48%** of the first 100k raw-observation target and **1.42%** of the 37k cluster target. These percentages describe data scale only, not product-roadmap completion.

## #21 — Data Mass Acquisition Engine

The scale model has four independent acquisition channels:

1. OpenSERP query rotation — fresh discovery.
2. Common Crawl CDX seed harvesting — bulk discovery only on reviewed source patterns.
3. Direct authorized feeds — structured supply where authorization exists.
4. Partner / first-party supply — owned or explicitly authorized data.

No channel may bypass the existing domain registry, admission rules, freshness lifecycle, deduplication or publication eligibility.

The active scheduled scale lane remains `.github/workflows/openserp-github-native-ingestion.yml`, running every 30 minutes. It already enforces the existing three write flags, run lock, engine budgets/backoff, time limits and admission/writer pipeline.

For scale, `scripts/openserp/run-ingestion-github-actions.ts` now materializes Query Universe V2 in the GitHub runner's ephemeral temp directory and passes it to the unchanged ingestion orchestrator through its existing `universePath` fixture interface.

The Vercel serverless route is deliberately not changed and does not gain any new filesystem write.

## #22 — National Query Universe V2

V1 contained roughly 2.7k queries. V2 expands the candidate universe while keeping execution bounded by the existing rotation planner.

Dimensions:

- 16 currently recognized cities (15 Tier-1 + Essaouira)
- 65 vetted districts across 6 cities
- 12 property types
- sale + rent
- French + Arabic city-level queries
- three French intent/order variants where useful
- multiple source-specific property types for reviewed/authorized domains
- source-specific `site:` queries only for registry statuses `approved_discovery`, `partner`, or `authorized_static`

Expected size is deliberately bounded between **5,000 and 20,000** queries; the canonical test enforces that range.

The universe is deterministic:

- stable query IDs
- stable normalized query text
- stable engine rotation
- no invented district names
- blocked/unclassified domains never receive source-specific queries

The universe is a **catalogue**, not a command to execute every query. The existing PostgreSQL rotation state, `next_eligible_at`, discovery yield, engine budgets and per-run limits continue to determine actual execution.

## Acquisition waves

`lib/acquisition-scale-v1/engine.ts` can partition the whole universe into deterministic, geographically round-robin waves (default catalogue wave size: 250 queries).

A wave is planning/measurement only. Runtime execution remains constrained by the existing OpenSERP safety and resource budgets.

## Progress metrics

`public.acquisition_scale_metrics_v1` provides a service-role-only snapshot of:

- target raw observations
- target clusters
- discovery rows
- source-offer observation rows
- total raw observations
- distinct canonical discovery URLs
- property listings
- property clusters
- measurement timestamp

The view is not granted to `anon` or `authenticated`.

## Definition of done

### #21 foundation complete when

- scale targets are explicit and test-locked;
- scheduled GitHub-native ingestion consumes V2;
- progress metrics are available;
- acquisition channels remain compliance-gated;
- canonical CI remains green.

**Reaching 100k observations is an operational data milestone, not something this code mission can truthfully mark complete on day one.**

### #22 complete when

- V2 universe is deterministic and within 5k–20k;
- national city/district/property/transaction coverage is test-locked;
- source-specific queries are registry-gated;
- active GitHub scale ingestion uses V2;
- no serverless safety regression is introduced.
