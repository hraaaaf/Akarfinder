# AkarFinder — Durable Decisions

Updated: 2026-07-23

This file contains durable validated decisions only.

Do not append every mission, preview, deployment or temporary implementation state here. Those belong in PR/Git history or `data/audits/`.

When a newer explicit founder decision conflicts with an older one, the newer decision wins and this file should be updated rather than accumulating contradictory entries.

---

## 2026-07-23 — AkarFinder is search-first and intelligence-first

Status: Validated

Decision:

- AkarFinder is a real-estate search engine + index + intelligence layer for Morocco.
- `/search` is the core product surface.
- The long-term target is the Moroccan Property Graph.
- The product must not drift into being merely another classifieds portal.

Impact:

- New features must strengthen discovery, organization, understanding, comparison or continuity.
- Marketplace-style features are subordinate to search/intelligence strategy.

---

## 2026-07-23 — Canonical data/product pipeline

Status: Validated

Decision:

The canonical conceptual pipeline is:

**DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS/PROVENANCE → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP**

Impact:

- Acquisition lanes must not bypass later governance.
- Avoid parallel contradictory pipelines for the same concept.

---

## 2026-07-23 — Absolute no-bypass doctrine

Status: Validated

Decision:

AkarFinder does not use stealth/proxy evasion, fake Googlebot, CAPTCHA solving, login/paywall circumvention or technical bypass of source restrictions.

Impact:

- When a direct path is restricted, use another reviewed lawful/authorized discovery method.
- Source policy and registry remain first-class architecture constraints.

---

## 2026-07-23 — Source rights are separate from analytical usefulness

Status: Validated

Decision:

AkarFinder distinguishes:

- partner/first-party/authorized structured content;
- public indexed/external search results;
- internal market signals.

Internal signal status, reliability/intelligence and public display eligibility are different concepts.

Impact:

- A high score never grants contact/gallery/media/internal-detail rights.
- External results preserve source attribution and original links.

---

## 2026-07-23 — Source registry is mandatory for automated external admission

Status: Validated

Decision:

External automated admission must be governed by an explicit source registry/policy and evidence-based URL rules where applicable.

Impact:

- Unknown/unreviewed sources fail closed for structured automated admission.
- New sources require review instead of implicit trust.

---

## 2026-07-23 — Property Graph target and conservative deduplication

Status: Validated

Decision:

Target model:

**one potential physical property/canonical cluster → multiple source offers/observations**.

Physical-property merging must be conservative and evidence-based.

Impact:

- Old heuristic `duplicate_group_id` behavior is not treated as validated physical identity.
- Technical dedupe and physical-property clustering remain separate.
- Provenance is preserved even when offers are linked.

---

## 2026-07-23 — Property Schema V1 before uncontrolled partner forms

Status: Validated

Decision:

Professional inventory must converge toward an extensible Property Schema V1 with roughly 100–150 possible attributes dynamically exposed by type/context.

Partner onboarding follows seven conceptual steps:

1. Identity
2. Use & potential
3. Location & environment
4. Characteristics & lifestyle
5. Investment & costs
6. Media & projection
7. Transparency, verification & publication

Impact:

- Never show all fields at once.
- Separate declared, calculated, inferred, verified and unknown data.
- Completeness is weighted, not a raw checkbox ratio.

---

## 2026-07-23 — No single magic trust score

Status: Validated

Decision:

Keep separate:

- completeness;
- freshness/provenance;
- market intelligence;
- anomalies;
- multi-source confidence;
- AkarScore;
- Property Fit;
- ranking relevance.

Impact:

- AkarScore is information/documentation quality, not certification of truth.
- Property Fit is personalized.
- Anomaly signals are not fraud accusations.

---

## 2026-07-23 — Commercial neutrality of objective intelligence

Status: Validated

Decision:

Gold, Premium, partner or sponsored status does not silently improve AkarScore, Property Fit, objective reliability or organic relevance.

Impact:

- Sponsored visibility must be explicitly labeled and technically separate from organic/objective scoring.

---

## 2026-07-23 — Mon Projet is the consumer continuity object

Status: Validated

Decision:

Search Profile, Companion, direct Search, favorites, alerts/saved searches, history, comparisons, eliminations and learned preferences should converge into **Mon Projet AkarFinder** rather than remain disconnected features.

Impact:

- Consumer features should preserve intent across sessions and entry modes.

---

## 2026-07-23 — Companion is deterministic decision guidance

Status: Validated

Decision:

The AkarFinder Companion is a guided state-machine experience that clarifies objective, constraints, priorities and trade-offs.

It is not a decorative free-form chatbot and must not invent missing neighborhood/property evidence.

---

## 2026-07-23 — Professional identity, ownership and authorization are explicit

Status: Validated

Decision:

Professional workflows use authenticated organizations, memberships/roles, ownership/authorization, activation/review and media/publication rights.

Impact:

- A simple commercial flag cannot bypass governance.
- Professionals cannot self-assign verification or privileged commercial state.

---

## 2026-07-23 — Real-data integrity

Status: Validated

Decision:

Never fabricate real-estate facts to make the UI look complete.

Impact:

Do not synthesize unsupported:

- old prices/history;
- availability;
- demand/views metrics;
- neighborhood claims;
- travel times;
- comparable properties;
- professional verification;
- market evidence.

Unknown stays unknown.

---

## 2026-07-23 — National scale target is a target, not a claim

Status: Validated

Decision:

AkarFinder pursues 100k+ useful observations/representations and a large deduplicated property corpus without sacrificing legality, freshness, quality or provenance.

Impact:

- Never claim the target is reached without current measured evidence.
- Distinguish discovery candidates, seeds, structured listings, source offers, clusters and public/search-eligible results.

---

## 2026-07-23 — Multi-lane acquisition with one governance model

Status: Validated

Decision:

Acquisition can combine partner feeds, first-party submissions, public search discovery, Search Gateway, public sitemaps and Common Crawl URL-index metadata.

Impact:

- A seed is not automatically a listing.
- A discovered result is not automatically publishable.
- All lanes converge into canonical validation/publication rules.

---

## 2026-07-23 — Release is separate from merge

Status: Validated

Decision:

Code merged to `main` does not prove Production deployment, migration application, flag activation or live UX.

Current release policy uses GitHub CI during implementation and a deliberate Production deployment gate at phase completion.

Impact:

- Production claims require live evidence.
- Do not infer live state from Git alone.

---

## 2026-07-23 — Documentation governance

Status: Validated

Decision:

Canonical documentation is hierarchical:

1. `MASTER_CONTEXT.md`
2. `CURRENT_STATE.md`
3. `ROADMAP.md`
4. relevant domain contracts
5. code/live evidence according to the authority rules in `README.md`

Mission histories and audits do not compete with current canonical docs.

Impact:

- Do not create a permanent `docs/*.md` for every mission.
- Keep one-off evidence in `data/audits/`, PRs and Git history.
- `SESSION.md` is no longer a chronological source of truth.
