# AkarFinder — Technical Architecture

Updated: 2026-07-23

This document defines the high-level architecture. Current code, migrations and live infrastructure remain the final technical evidence.

---

## 1. Architecture principle

AkarFinder is one system with several controlled lanes, not a collection of unrelated scrapers and pages.

All structured real-estate data should converge toward a common model and common governance before public display.

Canonical flow:

**Discovery → Ingestion/Observation → Normalization → Canonicalization → Freshness/Provenance → Deduplication/Clustering → Enrichment → Intelligence → Display Eligibility → Ranking → Search/Detail**

---

## 2. Application stack

Primary application stack:

- Next.js App Router;
- TypeScript;
- Tailwind/component-based UI;
- Supabase PostgreSQL;
- Supabase Auth for consumer/professional identity where implemented;
- Vercel for web deployment;
- GitHub Actions for CI and controlled data/acquisition workflows.

Do not treat an old architecture document as proof of exact package versions or live infrastructure configuration.

---

## 3. Search architecture

Search currently combines distinct result families.

### Structured database search

Searches persisted structured listings under publication/display rules.

The database fallback can scan bounded chunks deeper than the former 200-row ceiling and expose additional pages through cursor/load-more behavior.

### Search Gateway

External search-provider results are normalized as source-linked limited representations.

They remain distinct from AkarFinder-owned structured inventory.

### Thin seed index

Reviewed public seed URLs can provide additional search depth as thin external results without pretending they are fully structured/current listings.

A seed result must not invent price, photo, contact, availability or full property detail.

### Future dedicated search engine

Typesense/Meilisearch or another dedicated provider can be introduced when measured scale/performance justifies it. It must preserve the same canonical publication and ranking contracts.

---

## 4. Acquisition architecture

AkarFinder uses multiple bounded lanes.

### Direct structured lanes

- partner CSV/JSON/XML feeds;
- partner/first-party structured submissions;
- explicit authorized imports.

### Public discovery lanes

- OpenSERP/Yandex-style search discovery;
- public sitemap harvesting under registry/robots policy;
- Common Crawl CDX URL-index metadata;
- Search Gateway.

The source registry controls automated admission eligibility.

No lane grants itself publication rights.

---

## 5. Common Crawl boundary

Common Crawl is used as an offline/public URL-index metadata reservoir when applicable.

Current durable boundaries:

- no WARC/page-content download in the mass seed lane;
- no direct source-site request through that lane;
- registry-approved sources only;
- validated listing URL patterns required;
- seeds stored separately from structured listings;
- canary-first, fail-soft harvesting is the current direction;
- seed confirmation/admission remains separate.

---

## 6. Core data concepts

Exact schema lives in Supabase migrations and code. Conceptually:

### Property / structured listing

`property_listings` remains a major structured read/persistence surface in the legacy-compatible model.

### Source offer

`listing_sources` represents source-level publication/provenance and has evolved toward a SourceOffer role.

### Property cluster

`property_clusters` and membership structures provide a stricter identity layer than old heuristic `duplicate_group_id` behavior.

Target:

**one potential physical property cluster → multiple source offers/observations**

### Discovery candidate

`discovery_candidates` stores pre-admission discovery evidence and classification outcomes.

Discovery is not publication.

### Seed

`source_offer_seeds` stores URL-level reservoir candidates discovered through lanes such as sitemap/Common Crawl.

Seed-only rows are not public structured listings.

### Observation/freshness state

Observation and freshness concepts preserve when/how a source offer or seed was seen without treating recency as guaranteed availability.

### Professional domain

Organizations, memberships, ownership claims, projects, submissions, media rights and lead assignments are tenant-scoped professional entities.

### Consumer continuity

User projects, favorites, saved searches/alerts, history, comparisons, eliminations and learned preferences are user-owned continuity entities.

---

## 7. Canonical structured intelligence pipeline

Authorized structured origins should converge through one orchestration rather than bespoke intelligence logic per source.

The pipeline conceptually performs:

1. source adapter / normalization;
2. ingestion validation;
3. safe enrichment;
4. information completeness;
5. publication validation;
6. freshness/provenance;
7. market intelligence where compatible;
8. anomaly analysis;
9. multi-source intelligence;
10. AkarScore/documentation quality;
11. safe public projection.

Personalized Property Fit is a separate user-context layer applied after the objective property/intelligence foundation.

---

## 8. Evidence and claim boundary

`Analysis Contract V1` is the policy boundary between data and public claims.

Architecture must preserve:

- fact vs analysis;
- source-declared vs AkarFinder-calculated/inferred;
- sufficient vs insufficient evidence;
- observation vs current availability;
- market reference vs asking price;
- anomaly vs fraud accusation;
- information quality vs truth/certification.

Unknown values remain null/unknown rather than becoming synthetic defaults.

---

## 9. Deduplication and clustering

Technical deduplication and physical-property identity are different problems.

Use deterministic identifiers/unique constraints for technical idempotency.

Use conservative evidence for physical-property clustering.

Never convert a loose similarity score into an irreversible automatic merge without the required evidence/contract.

The old `duplicate_group_id` lineage must not be treated as a validated Property Graph identity.

---

## 10. Source governance

`data/openserp/source-domain-registry.json` and related source-policy code are key machine-readable authorities for external automated admission.

Principles:

- unreviewed source defaults closed for structured admission;
- listing URL patterns must be evidence-based;
- source status and display rights are explicit;
- PII/unsafe URL checks remain upstream of publication;
- source attribution/provenance is preserved;
- source policy can restrict media/contact/gallery independently of analytical usefulness.

---

## 11. Authentication, tenancy and security

Consumer and professional authenticated surfaces use Supabase Auth boundaries where implemented.

Professional organization data is tenant-scoped.

RLS and explicit server-side ownership/user filters are defense-in-depth requirements, not interchangeable substitutes.

Service-role access must remain server-only.

No client-provided commercial/verification state may bypass staff/admin governance.

---

## 12. Ranking architecture

Ranking must separate:

- baseline query relevance;
- display eligibility;
- objective intelligence signals that are safe to use;
- freshness/completeness/source confidence where appropriate;
- personalized Property Fit when a real Search Profile exists.

Commercial tier or sponsorship must not silently modify organic/objective relevance.

Sponsored placements require explicit labeling and separate business logic.

---

## 13. Release architecture

Git, database and Production are separate gates.

Current policy:

- development/PR → GitHub CI;
- final phase candidate → explicit release gate;
- Production → deliberate deployment;
- post-deploy → smoke/visual certification.

Automatic Git-triggered Vercel deployment is not assumed.

The actual `.github/workflows/` and `vercel.mjs` are the technical source of truth for current release behavior.

---

## 14. Architecture rules

- Prefer one canonical model over parallel truths.
- Reuse proven modules before adding a new pipeline.
- Keep discovery separate from admission and publication.
- Keep source rights separate from scores.
- Keep commercial tier separate from objective intelligence.
- Keep unknown data unknown.
- Preserve provenance.
- Make write paths idempotent and bounded.
- Fail closed on authorization/display uncertainty.
- Fail soft where a single acquisition source failure should not destroy healthy independent results.
- Do not overengineer without measured need, but do not sacrifice data governance for speed.
