# ODM-10A — Coverage Audit

## Status

Internal read-only audit foundation over canonical Supabase project `kusfiyimwvxblvsrhaes`.

One Thin Index row is one eligible external representation. It is not proof of one unique physical property.

## Production baseline — 2026-07-27

### Public search corpus

- eligible public representations: **55,946**;
- target: **100,000**;
- remaining gap: **44,054**;
- eligible primary: **1,643**;
- eligible secondary: **54,303**.

### Structured coverage

- normalized city: **42.37%**;
- normalized property type: **3.59%**;
- normalized intent: **3.59%**;
- normalized price: **1.37%**;
- normalized surface: **3.08%**;
- fresh confirmed: **4.02%**.

### Pipeline inventory

- source-offer seeds: **55,946**;
- Thin Index documents: **55,946**;
- public eligible representations: **55,946**;
- structured property listings: **2,355**;
- listing sources: **2,360**;
- property clusters: **2,216**;
- cluster members: **2,216**;
- factual source-offer observations: **224**;
- lifecycle signals: **1**.

### Geographic concentration

- unknown city: **32,243** — 57.63%;
- Agadir: **7,474** — 13.36%;
- Marrakech: **5,388** — 9.63%;
- Casablanca: **3,320** — 5.93%;
- Rabat: **1,728** — 3.09%;
- Salé: **1,541** — 2.75%;
- Tanger: **1,226** — 2.19%.

### Source concentration

The largest source/provider combinations are:

1. avito.ma / Common Crawl: **23,925** — 42.76%;
2. mubawab.ma / Common Crawl: **10,298** — 18.41%;
3. daragadir.com / public sitemap: **5,749** — 10.28%;
4. agenz.ma / Common Crawl: **3,318** — 5.93%;
5. promoimmomarrakech.com / public sitemap: **2,935** — 5.25%.

The two largest combinations represent 61.17% of the public corpus. Coverage expansion must therefore reduce concentration risk while preserving source policy.

## Main finding

AkarFinder has solved public traversability, but most of the current corpus remains discovery-grade rather than listing-grade.

The highest-return sequence is:

1. enrich city on the existing 32,243 unknown-city representations;
2. derive conservative type and intent from URL/title/snippet evidence;
3. increase factual freshness confirmation;
4. acquire new registry-approved representations in under-covered cities;
5. progressively connect eligible representations to structured listings, observations and property clusters.

## 100K gap strategy

The 44,054-representation gap must not be filled by volume alone. ODM-10B and ODM-10C should use the audit to prioritize sources by:

- policy clearance;
- net-new URL potential;
- geographic diversification;
- enrichment potential;
- freshness cost;
- duplicate risk;
- structured-listing conversion potential.

## Deliverables

- service-role-only `odm_10a_coverage_audit(...)` RPC;
- connected read-only JSON report runner;
- deterministic contract tests;
- CI gate;
- production baseline and next-action doctrine.
