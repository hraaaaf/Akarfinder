# AkarFinder — Product Definition

Updated: 2026-07-23

## 1. One-line definition

AkarFinder is the **Moroccan real-estate search engine, property index and intelligence layer** that helps users discover, understand, compare and follow properties across fragmented sources.

It is not primarily a classifieds portal.

---

## 2. Product thesis

Moroccan real-estate supply is fragmented across portals, agency sites, promoters, indexed web pages and direct professional inventory.

The user problem is not merely “there are not enough listings.”

It is:

- fragmented search;
- duplicate representations of the same potential property;
- stale or incomplete information;
- unclear provenance;
- difficult price/context comparison;
- disconnected search sessions;
- weak continuity from discovery to decision.

AkarFinder solves this through:

**Search → Index → Property Graph → Intelligence → Personalization → Continuity**

---

## 3. Core product surfaces

### Search

`/search` is the core product.

It combines, subject to source rights and evidence:

- structured AkarFinder/partner inventory;
- external indexed/search results;
- source-aware filtering and ranking;
- deduplication signals;
- freshness/provenance;
- market context;
- personalized fit.

### Structured Property Detail

A full AkarFinder property detail is reserved for first-party or partner-authorized structured data with sufficient rights.

It can organize:

- essential facts;
- source and provenance;
- AkarFinder intelligence;
- market context;
- costs/history when real evidence exists;
- environment data when evidence exists;
- professional/project information;
- authorized actions and media.

No missing data is fabricated to fill the page.

### External indexed results

External/public results remain limited source-linked search representations.

They must:

- show the source;
- preserve the original link;
- avoid unauthorized contact/gallery/media behavior;
- avoid pretending AkarFinder verified or owns the listing.

### Mon Projet

`Mon Projet AkarFinder` is the persistent user-intent layer connecting:

- Search Profile;
- direct searches;
- Companion;
- favorites;
- saved searches/alerts;
- comparisons;
- history;
- eliminated properties/reasons;
- learned preferences.

### Companion

The Companion is a deterministic guided decision flow for users who need help clarifying what they should search for.

It feeds the same Search Profile and project continuity as direct search.

### Professional platform

Agencies and promoters can progressively operate through:

- authenticated organizations;
- ownership and authorization;
- professional profiles;
- projects;
- structured property submissions;
- seven-step dynamic onboarding;
- media rights;
- activation/review gates;
- leads and dashboards.

---

## 4. Target users

### Buyers and renters in Morocco

Need faster discovery, less duplication, clearer facts, better comparison and continuity.

### MRE and remote buyers

Need strong provenance, remote clarity, trustworthy professional identity and structured decision support without false guarantees.

### Investors

Need market context, costs, comparability and evidence-aware analysis rather than a simplistic “good deal” badge.

### Agencies

Need structured inventory, visibility, ownership, organization workflows and qualified demand.

### Promoters

Need project/property presentation, demand capture, professional identity, leads and measurable commercial value.

### Internal operations

Need source governance, quality monitoring, acquisition metrics, deduplication, provenance and launch controls.

---

## 5. Product result families

AkarFinder must preserve a strict distinction between:

### Structured authorized result

Can support richer AkarFinder intelligence and, when rights allow, internal detail/contact/media flows.

### External/public indexed result

Limited representation intended to help discovery and redirect to the original source.

### Internal market signal

Useful for intelligence/coverage but not necessarily publicly displayable.

The same data point can be analytically useful without granting publication rights.

---

## 6. Intelligence model

AkarFinder deliberately separates different questions.

- **Completeness:** how much useful information is available?
- **Freshness/provenance:** when/how was it observed and from where?
- **Market Intelligence:** how does available evidence compare with a compatible reference?
- **Anomaly:** are there unusual evidence-backed inconsistencies?
- **Multi-source intelligence:** how strong is the relationship/corroboration between offers?
- **AkarScore:** how strong and explainable is the available information package?
- **Property Fit:** how well does this property match this user's real project?
- **Ranking relevance:** how useful is this result for this query now?

There is no universal “truth score.”

Commercial status must not secretly alter these objective dimensions.

---

## 7. Property data model

AkarFinder's structured professional model is based on an extensible Property Schema.

Potential attributes are dynamic by property type and context, not one giant static form.

Canonical partner onboarding:

1. Identity
2. Use & potential
3. Location & environment
4. Characteristics & lifestyle
5. Investment & costs
6. Media & projection
7. Transparency, verification & publication

Data provenance must distinguish declared, calculated, inferred, verified and unknown values.

---

## 8. Trust and wording rules

AkarFinder must never make stronger public claims than the evidence supports.

Avoid unsupported claims such as:

- official price;
- guaranteed good deal;
- verified/certified property without a documented verification process;
- currently available when only recently observed;
- fraud/scam conclusion based on an anomaly signal;
- exhaustive market coverage without proof.

Preferred behavior:

- state the source;
- explain evidence and limitations;
- use `insufficient data` when appropriate;
- separate observation from availability;
- separate analysis from fact.

---

## 9. Business differentiation

AkarFinder's defensibility should come from the combined system:

- broader useful discovery;
- source governance;
- normalized property data;
- Property Graph/deduplication;
- freshness and provenance;
- explainable intelligence;
- personalized project continuity;
- professional structured supply.

No single feature alone is the moat.

---

## 10. Success metrics

Product success should be measured with evidence such as:

- useful market coverage;
- freshness of searchable inventory;
- duplicate reduction / cluster quality;
- query relevance and result depth;
- search-to-original-source engagement for external results;
- saved-project/search continuity;
- qualified lead conversion for authorized professional inventory;
- structured-data completeness;
- return usage and successful decision progression.

Raw page views or raw listing counts alone are insufficient.

---

## 11. What AkarFinder is not

- Not a generic luxury agency site.
- Not a scraper that republishes everything it can reach.
- Not a portal that treats every source as owned inventory.
- Not an official valuation authority.
- Not a black-box AI score claiming certainty.
- Not a pay-to-rank system disguised as objective relevance.

---

## 12. Product principle

The best version of AkarFinder makes the fragmented Moroccan real-estate web feel like one searchable, understandable and continuous decision system — while preserving source rights, provenance and uncertainty.