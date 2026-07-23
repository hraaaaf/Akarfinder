# AkarFinder — Current State

Consolidated: 2026-07-23
Baseline inspected before this documentation branch: canonical `main` after merged PR #51.

This file summarizes implementation reality in the repository. It is not a substitute for live Production verification.

---

## 1. Executive state

AkarFinder is no longer an initialization-stage MVP.

The repository now contains substantial foundations across five connected systems:

1. search and public result presentation;
2. canonical property/intelligence contracts;
3. consumer personalization and continuity;
4. professional organizations and partner workflows;
5. national-scale acquisition/index infrastructure.

The strategic direction is now **search-first + intelligence-first + continuity**, with `/search` as the product core and a long-term Property Graph target.

---

## 2. Structured property and intelligence stack

Implemented foundations include:

- Property Schema V1 and Project Schema V1 contracts;
- weighted information completeness;
- dynamic seven-step partner onboarding model;
- safe enrichment boundaries;
- declared/calculated/inferred/verified-data separation;
- Analysis Contract V1;
- unified structured listing intelligence pipeline;
- Freshness & Provenance V2;
- Market Intelligence V2;
- Anomaly Engine V1;
- Multi-source Property Intelligence V1;
- explainable AkarScore V2;
- safe Public SERP Intelligence V1.

Important semantic separation:

- AkarScore = information/documentation quality;
- Market Intelligence = evidence-based market context;
- anomaly signals = unusual evidence, not fraud claims;
- multi-source intelligence = linkage/corroboration evidence;
- Property Fit = personalized suitability;
- commercial tier = business metadata, not an objective ranking boost.

---

## 3. Search and property experience

Implemented repository capabilities include:

- structured database search;
- external Search Gateway results;
- thin indexed results backed by a reviewed seed reservoir;
- server-side filters;
- source-aware public result policies;
- deeper structured-index scanning instead of the former 200-row ceiling;
- bounded cursor/load-more behavior;
- safe SERP intelligence for eligible structured listings;
- Property Detail V2 for first-party/partner-authorized structured properties;
- no mock fallback for an absent authorized property detail.

External indexed results remain source-linked limited representations and must not be silently upgraded into full internal property pages.

---

## 4. Consumer personalization and continuity

Implemented foundations include:

- Dynamic Search Profile V2;
- Personalized Property Fit and personalized ranking;
- deterministic Companion state machine;
- homepage orchestration between direct Search and guided Companion;
- consumer authentication/session boundary;
- `Mon Projet` continuity workspace;
- user-owned models for projects, favorites, saved searches/alerts, history, comparisons, eliminated properties/reasons and learned preferences.

Weak behavioral inference is not allowed to become a high-confidence absolute user constraint.

---

## 5. Professional and partner platform

Implemented foundations include:

- Supabase Auth boundary for professional APIs;
- multi-tenant organizations for agencies/promoters;
- memberships, roles and permissions;
- explicit listing ownership claims;
- professional project ownership foundation;
- professional public profiles;
- organization-scoped stats and lead access;
- partner activation lifecycle separated from validation/authorization;
- dynamic seven-step property onboarding;
- tenant-scoped property submissions;
- explicit media rights and publication permissions;
- staff review/activation gates.

Commercial Gold/Premium metadata is explicitly separate from Property Fit, AkarScore and organic relevance.

---

## 6. Acquisition and national scale

The repository has moved from one-source/MVP ingestion to a multi-lane national acquisition architecture.

### Current acquisition families represented in code/workflows

- OpenSERP/Yandex public search discovery/freshness lane;
- registry-reviewed public sitemap harvesting;
- Common Crawl CDX/URL-index metadata harvesting;
- direct CSV/JSON/XML partner-feed capability;
- Search Gateway external search results;
- seed confirmation/reconciliation paths.

### Geography and query scale

The acquisition geography has been expanded beyond the old 16-city model to a national set covering more than 50 Moroccan urban/regional centers, while preserving vetted district taxonomies where available.

A National Query Universe V2 and adaptive acquisition planning exist for scale work.

### Seed reservoir

`source_offer_seeds` represents discovered URL-level candidates and is deliberately separate from public structured listings.

A seed alone is not proof of a live listing.

The repository includes:

- exact canonical-URL freshness/confirmation logic;
- bounded seed-to-listing confirmation;
- high-confidence admission requirements;
- thin-index search representation for eligible reviewed seed URLs without inventing price/photo/contact/availability.

### Common Crawl current direction

The latest merged Common Crawl acquisition logic is:

- URL-index metadata only;
- no WARC/page fetch;
- no direct source-site request;
- source registry and validated listing patterns required;
- canary-first harvest/import;
- fail-soft per domain/index;
- remainder processed after canaries;
- no direct seed write to public property listings.

The canary set currently includes four reviewed domains before the remainder of the eligible registry.

### Search depth

Structured DB search no longer depends on the old first-200-row candidate ceiling. The current fallback can scan bounded chunks deeper into the index and expose additional result pages through cursor/load-more behavior.

A dedicated search engine such as Typesense remains a future scaling option rather than a prerequisite for the current architecture.

---

## 7. Scale targets versus proven state

The repository contains scale targets around:

- 100k raw observations/representations;
- a working unique-cluster target on the order of tens of thousands.

These are **targets**, not a statement that Production currently contains that volume.

Do not copy historical counts into current claims.

Before reporting current scale, query the actual Production database and relevant acquisition metrics.

---

## 8. Source governance and safety

Current durable invariants:

- no bypass/proxy/stealth/fake Googlebot/CAPTCHA/login circumvention;
- registry-controlled source admission;
- reviewed listing URL patterns for automated seed lanes where applicable;
- no invented missing fields;
- PII/unsafe URL gates on ingestion paths;
- source attribution and original-link preservation for external results;
- publication eligibility is separate from reliability/intelligence scoring;
- internal signals do not automatically gain public display rights.

---

## 9. Deduplication / Property Graph state

The long-term target is one potential physical property cluster connected to multiple source offers and observations.

The repository includes conservative clustering/multi-source foundations, but automatic physical-property merging remains intentionally cautious.

Do not treat old `duplicate_group_id` behavior as a validated Property Graph identity.

Strong multi-source association requires explicit or sufficiently corroborated evidence under the current contracts.

---

## 10. Release and Production state

The repository now contains a Vercel phase-deployment policy:

- GitHub CI is used during implementation/PR work;
- automatic Git-triggered Vercel deployments are disabled by repository policy;
- Production deployment is a deliberate phase-end action after green gates and explicit approval.

Therefore:

**`main` state ≠ guaranteed Production state.**

Before stating what users see live, verify:

- actual Vercel Production deployment/commit;
- Supabase migrations and live data;
- environment/feature flags;
- live APIs and routes;
- mobile/desktop rendering;
- French and Arabic/RTL behavior where required.

---

## 11. Launch-readiness items that require current verification

A prior launch-readiness gate identified or warned about areas including:

- full Arabic/RTL core-journey evidence;
- final Production deployment proof;
- final mobile/tablet/desktop visual certification;
- incomplete national neighborhood-intelligence evidence.

Do **not** assume these remain open or have been closed solely from this document. Re-run or inspect the current launch gate and Production evidence before deciding GO/NO-GO.

---

## 12. Current strategic priorities

At this consolidation point, the most important next work is:

1. keep documentation and code truth aligned;
2. verify the exact Production baseline before launch claims;
3. grow national acquisition toward scale targets without weakening source governance;
4. measure real conversion from discovery/seeds to useful searchable results;
5. improve freshness, data quality, deduplication and benchmark coverage;
6. complete and certify Arabic/RTL and responsive core journeys where still missing;
7. run the final Production/launch gate after the above evidence is current.

---

## 13. How to use this file

This is a snapshot, not an eternal truth.

For a task that depends on a specific implementation detail:

1. inspect current `main` or the target branch;
2. inspect relevant migrations/tests/workflows;
3. inspect Production when the question concerns live behavior;
4. then update this file if the project state materially changed.
