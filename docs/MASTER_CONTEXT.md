# AKARFINDER — MASTER CONTEXT

Updated: 2026-07-23
Status: canonical durable product and architecture context

This document defines the durable understanding of AkarFinder. It is intentionally more stable than mission reports and implementation notes.

For current implementation details, read `CURRENT_STATE.md` and inspect the repository. For source-of-truth rules, read `README.md`.

---

## 1. Product identity

AkarFinder is a **real-estate search engine + property index + intelligence layer** for Morocco.

It is not primarily a classifieds marketplace and must not evolve into a clone of Avito, Mubawab, Sarouty or another portal.

The long-term ambition is to build the **Property Graph of the Moroccan real-estate market**: properties, offers, sources, observations, neighborhoods, prices, projects, agencies, promoters, history and user intent connected in one coherent system.

The core product is search-first and intelligence-first.

The central user promise is not ownership of every listing. It is the ability to discover, organize, understand, compare and follow relevant Moroccan real-estate supply from one place.

---

## 2. North Star

AkarFinder should optimize the useful coverage of the market, not a vanity listing count.

Conceptually:

**COVERAGE × FRESHNESS × QUALITY × DEDUPLICATION × USER RELEVANCE**

A high raw count with stale, duplicated, poorly sourced or misleading data is not success.

AkarFinder may target **100,000+ usable observations/representations** and a large unique-property corpus, but this is a scale target, never a public claim unless measured and evidenced at that moment.

---

## 3. Canonical product flow

The durable data/product pipeline is:

**DISCOVERY**
→ **INGESTION / OBSERVATION**
→ **NORMALIZATION**
→ **CANONICALIZATION**
→ **FRESHNESS / PROVENANCE**
→ **DEDUPLICATION / CLUSTERING**
→ **ENRICHMENT**
→ **INTELLIGENCE**
→ **DISPLAY ELIGIBILITY**
→ **RANKING**
→ **PUBLICATION / SERP**

No acquisition method is allowed to bypass the later safety and publication gates.

---

## 4. Source and content classes

AkarFinder separates source rights from data usefulness.

### 4.1 Partner / first-party / explicitly authorized structured content

This can support a rich AkarFinder experience when rights are explicit:

- structured property data;
- richer media where authorized;
- professional identity;
- contact and lead flows where authorized;
- full internal property detail;
- AkarFinder enrichment and intelligence subject to evidence rules.

### 4.2 Public indexed / external web results

These are search results, not AkarFinder-owned listings.

They must preserve:

- visible source attribution;
- original URL;
- limited representation appropriate to the source policy;
- no invented fields;
- no unauthorized contact/gallery/media rights.

Depending on evidence and policy, a result can be rich, thin, source-link only or suppressed.

### 4.3 Internal market signal

A source or observation can be useful for intelligence without being eligible for public display.

**Internal signal status is not the same thing as public display eligibility.**

---

## 5. Absolute no-bypass doctrine

AkarFinder must not use:

- stealth or anti-bot evasion;
- proxy rotation to circumvent access controls;
- fake Googlebot or identity spoofing;
- CAPTCHA solving to bypass restrictions;
- login/paywall circumvention;
- technical workarounds whose purpose is to defeat a source restriction.

Source-specific robots, indexing directives, contractual status, access policy and display rights must be respected.

When a direct path is not allowed or reliably accessible, change the acquisition method — not the rule.

Permissible alternatives may include, when independently appropriate:

- direct partner feeds;
- explicit authorization;
- public search/index providers;
- public sitemaps;
- Common Crawl URL-index metadata;
- first-party data;
- other reviewed public discovery channels.

---

## 6. Source registry is mandatory

Every external source must have an explicit policy before it can participate in automated admission or public display.

The source registry should control or document at least:

- source/domain identity;
- discovery status;
- access/compliance notes;
- validated listing URL patterns when applicable;
- permitted acquisition lanes;
- public display policy;
- media/thumbnail rights or restrictions;
- contact/gallery rights;
- provenance expectations;
- freshness/revalidation strategy.

Unknown or unreviewed sources must fail closed for structured automatic admission.

---

## 7. Acquisition strategy

AkarFinder is multi-channel by design.

The architecture may combine:

- direct partner feeds and imports;
- OpenSERP/Yandex-style public search discovery;
- Search Gateway results;
- public sitemap discovery;
- Common Crawl CDX/URL-index metadata;
- first-party submissions;
- other reviewed sources.

Important boundaries:

- a discovered URL is not automatically a listing;
- a seed is not automatically a currently available property;
- a search snippet is not proof of full listing content;
- acquisition scale does not grant publication rights.

All lanes must converge into the same canonical safety, normalization, intelligence and display-governance model.

---

## 8. Property model and deduplication target

The target model is:

**one potential real property / canonical cluster**
→ **N source offers / publications / observations**

AkarFinder must preserve provenance instead of flattening all sources into one untraceable record.

Deduplication is intentionally conservative.

Possible signals include location, price, surface, type, bedrooms, source identifiers, text, timestamps and authorized media evidence.

A similarity score alone must not silently merge unrelated physical properties.

Unknown information remains unknown.

---

## 9. Property Schema V1 doctrine

Partner data must converge toward an extensible AkarFinder Property Schema rather than ad hoc listing forms.

The schema can expose roughly 100–150 potential attributes across property types, but the UI must never show all fields at once.

Fields are conceptually divided into:

- required;
- conditional;
- optional but valuable;
- calculated/enriched by AkarFinder.

The system must distinguish:

- declared facts;
- calculated facts;
- inferred facts;
- verified documentary facts;
- missing/unknown facts.

A calculated or inferred value must never be presented as if the professional declared it.

Partner onboarding follows seven conceptual steps:

1. Property identity
2. Use & potential
3. Location & environment
4. Characteristics & lifestyle
5. Investment & costs
6. Media & projection
7. Transparency, verification & publication

Completeness is weighted: missing an essential field is not equivalent to missing a secondary amenity.

---

## 10. Intelligence is multidimensional

AkarFinder must not collapse every concept into one magic score.

Separate dimensions include:

- information completeness;
- freshness and provenance;
- market context / price positioning;
- anomaly signals;
- multi-source linkage confidence;
- AkarScore / documentation-quality index;
- personalized Property Fit;
- ranking relevance.

### AkarScore

AkarScore represents the quality and explainability of available property information. It is not a certification of truth, legal status, safety or investment quality.

### Market intelligence

Market comparisons are indicative and evidence-dependent. Never claim an official or exact market price without an authoritative basis.

### Anomaly engine

An anomaly is an unusual evidence-backed signal, not a fraud accusation.

### Property Fit

Fit is personalized to a user's Search Profile and must remain separate from objective information-quality measures.

### Commercial neutrality

Gold, Premium, partner tier or sponsored status must never silently increase objective reliability, AkarScore, Property Fit or organic relevance.

Sponsored visibility must be explicitly labeled.

---

## 11. Search is the product core

`/search` is the primary product surface.

AkarFinder search should progressively combine:

- intent understanding;
- structured database results;
- external indexed results;
- filters;
- source-aware display policies;
- deduplication;
- freshness;
- intelligence;
- personalized ranking;
- continuity across sessions.

External results should redirect to the original source unless AkarFinder has the rights and structured data required for its own full property detail.

AkarFinder must feel like a search and decision system, not a wall of copied cards.

---

## 12. Mon Projet AkarFinder

The durable consumer object is **Mon Projet AkarFinder**.

It should unify the user's real-estate intent across:

- objective: buy/rent/invest;
- target locations;
- budget and financing context;
- property constraints;
- preferences and priorities;
- tolerances and trade-offs;
- saved searches and alerts;
- favorites;
- comparisons;
- eliminated properties and reasons;
- history;
- learned preferences where evidence is sufficient.

The Search Profile, Companion and direct Search are different entry modes into the same project continuity, not isolated products.

---

## 13. Companion doctrine

The Companion is a deterministic guided decision experience, not a decorative free-form chatbot.

Its job is to help a user clarify intent, constraints, priorities and trade-offs, then produce a usable Search Profile and search state.

Two canonical entry modes can coexist:

- **I know what I am looking for** → direct Search
- **Help me find it** → Companion

The Companion must not invent neighborhood evidence or eliminate options because data is unknown.

---

## 14. Professional platform

AkarFinder supports a professional layer for agencies and promoters built around:

- authenticated organizations;
- memberships and roles;
- explicit ownership/authorization;
- professional profiles;
- projects;
- structured property submissions;
- media rights;
- review/activation gates;
- leads and dashboards.

A professional cannot self-declare themselves verified, authorized, Gold or Premium in a way that bypasses platform governance.

Publication and lead/contact rights require the appropriate validated organization state and authorization.

---

## 15. Real-data integrity

AkarFinder must never fabricate missing real-estate information to make the UI look complete.

Do not invent:

- old prices or price history;
- availability;
- views or demand metrics;
- neighborhood claims;
- travel times;
- market samples;
- professional verification;
- comparable properties;
- source permissions.

When evidence is missing, show an honest unknown/insufficient state or omit the claim.

---

## 16. Production and release doctrine

Code merged to `main` does not automatically mean a feature is live in Production.

Treat these as separate states:

1. code exists;
2. tests pass;
3. migration exists;
4. migration is applied;
5. data exists;
6. feature flags permit behavior;
7. deployment exists;
8. live UX is verified.

Current release doctrine uses GitHub CI during development and a deliberate Production deployment gate at phase completion. Automatic Git-triggered Vercel deployment is not the assumed source of truth.

Before claiming a Production state, verify the actual deployment, environment, database and live routes.

---

## 17. SEO doctrine

SEO should extend the search/index mission through genuinely useful, indexable real-estate pages.

Useful surfaces may include:

- city pages;
- neighborhood pages;
- property-type and transaction intent pages;
- project/professional pages;
- evidence-backed market content.

Do not generate thin pages or unsupported local claims simply to increase URL count.

---

## 18. UX doctrine

The experience should be premium, calm, clear and evidence-aware.

Every important surface should be validated across:

- mobile;
- tablet;
- desktop;
- French;
- Arabic / RTL where supported.

Visual polish never justifies fabricated data or weakened source boundaries.

---

## 19. Working model for agents

Strategy, product decisions, architecture choices, safeguards and acceptance criteria are decided first.

Execution agents should receive bounded implementation missions.

Before writing code:

1. read `docs/README.md`;
2. read this Master Context;
3. read `CURRENT_STATE.md` and `ROADMAP.md`;
4. inspect the actual relevant code, migrations, tests and current branch;
5. inspect the relevant domain contract;
6. identify contradictions before changing anything.

After implementation, report evidence:

- files changed;
- tests/build;
- migrations/data impact;
- feature flags;
- security/source-governance impact;
- production impact;
- what remains unverified.

---

## 20. Final principle

AkarFinder is not a collection of disconnected features.

It is one coherent chain:

**THE MOROCCAN REAL-ESTATE WEB**
→ **AKARFINDER INDEX**
→ **PROPERTY GRAPH**
→ **INTELLIGENCE**
→ **SEARCH**
→ **MON PROJET**
→ **BETTER REAL-ESTATE DECISIONS**

Every major feature should strengthen this chain.