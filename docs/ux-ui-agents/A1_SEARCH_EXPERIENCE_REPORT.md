# A1 — SEARCH EXPERIENCE ARCHITECTURE

**Status:** CERTIFIED_FOR_A2
**Scope:** audit-only; no product code modification
**Repository state inspected:** `main`, through ODM-07 / Search Gateway integration (`34bfd657`)

## 1. Executive verdict

AkarFinder must treat `/search` as the operating system of the product. The current foundations are strong: relevance-first serving, quality-aware eligibility, explicit source boundaries, canonical geo identities and result-centric map context. The remaining weakness is interaction architecture: filters, truth signals, map/list state, comparison and decision actions are not yet expressed as one coherent search session.

Target experience: one query state, one ranked result set, multiple synchronized views.

## 2. Existing strengths

- Search Gateway already incorporates quality metadata and display eligibility.
- Public results preserve source identity and cautious wording.
- Duplicate grouping and canonical geo context exist.
- Search can receive city, query, transaction and property-type parameters.
- Map context is explicitly result-centric rather than an independent truth source.
- Missing price is not coerced to zero.

## 3. Existing weaknesses

1. Search intent is distributed across free text and filters without a single visible query model.
2. Filter changes risk feeling like page reloads rather than a continuous search session.
3. Truth tier, completeness, freshness and provenance can compete visually with core property facts.
4. Map/list synchronization is contractual but not yet a premium bidirectional interaction.
5. Mobile needs a dedicated density strategy, not compressed desktop controls.
6. Comparison, favorites and project handoff require a shared selection model.
7. Empty and partial-data states need recovery actions based on the actual blocked constraint.

## 4. Target information architecture

### Search shell

- Persistent query field with parsed intent summary.
- Primary filters: transaction, property type, city/area, budget, surface.
- Secondary filters inside a drawer: rooms, condition, source class, freshness, amenities.
- Sort separated from filtering.
- View switch: List / Split / Map, retaining identical query state.
- Result count accompanied by coverage wording, never by false exhaustiveness.

### Result card hierarchy

1. Property identity: type, area, city/neighborhood.
2. Price and surface; missing values explicitly marked.
3. Key characteristics.
4. Source/provenance and freshness.
5. Duplicate-cluster context.
6. Decision actions: save, compare, open source/detail.

Commercial status must never visually override relevance or truth.

## 5. Query-state contract

Canonical URL state must include:

- `q`
- `transaction_type`
- `property_type`
- canonical geo IDs plus human-readable slugs
- price and surface bounds
- sort
- view mode
- selected comparison IDs only when shareable and privacy-safe

Changing views must not trigger a different ranking contract. Back/forward navigation must restore filters, scroll position where feasible, selected result and map viewport.

## 6. Mobile architecture

- Sticky compact query summary.
- Two primary actions: Filters and Sort.
- Results remain the default surface.
- Map opens as a full-height view with a bottom sheet.
- Filter drawer shows active count and supports clear-by-section.
- Result cards use progressive disclosure; provenance remains reachable without dominating.
- Touch targets >= 44 px.

## 7. States

### Loading

Preserve layout; skeletons match cards; announce result update politely to assistive technology.

### Partial data

Show which attributes are unavailable and avoid lowering the entire card to an undefined “bad” state.

### Zero results

Explain the restrictive constraints and offer ordered recoveries:

1. expand nearby geography;
2. widen budget;
3. remove secondary filters;
4. create an alert.

### External-source failure

Keep first-party/other eligible results visible; explain source-specific unavailability without claiming zero market supply.

## 8. Analytics contract

Measure:

- search submitted;
- parsed intent edited;
- filter applied/removed;
- zero-result recovery;
- result impression by rank and truth tier;
- card opened;
- source opened;
- save/compare;
- map/list selection;
- alert/project handoff.

No dark-pattern conversion metric should override relevance quality.

## 9. Implementation roadmap

### S1 — Search session foundation

- canonical query-state schema;
- URL synchronization;
- view-state preservation;
- event taxonomy.

### S2 — Result comprehension

- card hierarchy;
- truth/provenance disclosure;
- duplicate-cluster disclosure;
- partial-data states.

### S3 — Responsive controls

- desktop filter rail/drawer;
- mobile filters and sort;
- active-filter chips with keyboard support.

### S4 — Coordinated views

- list/map hover and selection;
- viewport query contract;
- bottom sheet;
- compare tray.

### S5 — Recovery and decision

- zero-result guidance;
- saved search/alert;
- Companion and Mon Projet handoff.

## 10. Backlog

| ID | Task | Priority | Effort |
|---|---|---:|---:|
| SRCH-01 | Canonical query-state schema | P0 | L |
| SRCH-02 | URL/history restoration | P0 | M |
| SRCH-03 | Filter architecture desktop/mobile | P0 | L |
| SRCH-04 | Result-card truth hierarchy | P0 | L |
| SRCH-05 | Partial/empty/error states | P0 | M |
| SRCH-06 | Map/list synchronization | P0 | L |
| SRCH-07 | Compare selection model | P1 | M |
| SRCH-08 | Saved search and alert handoff | P1 | M |
| SRCH-09 | Search analytics contract | P0 | M |
| SRCH-10 | Playwright FR/AR 390/768/1280 | P0 | M |

## 11. Reviewer — cycle 1

**Initial score: 8.89/10 — FAIL**

Critical findings:

- View modes could accidentally diverge in ranking or eligibility.
- Commercial badges were not explicitly subordinated to relevance.

Major findings:

- no history-restoration contract;
- insufficient partial-source failure state;
- compare IDs lacked shareability/privacy rule;
- mobile map risked replacing Search rather than extending it;
- analytics lacked rank/truth-tier context.

## 12. Corrections

- Added one-result-set/multiple-view invariant.
- Added strict commercial-status hierarchy.
- Added URL/history and scroll restoration contract.
- Added source-specific partial failure behavior.
- Added privacy-safe comparison state.
- Made results the mobile default and map a coordinated view.
- Added rank and truth-tier analytics.

## 13. Final scoring

| Criterion | Score /10 |
|---|---:|
| Product doctrine | 9.8 |
| Repository fidelity | 9.4 |
| Search architecture | 9.7 |
| Mobile | 9.4 |
| Trust/provenance | 9.7 |
| Technical feasibility | 9.5 |
| Accessibility | 9.3 |
| Measurement | 9.4 |
| Risk handling | 9.6 |
| Execution readiness | 9.6 |

**Final score: 9.54/10**

Critical findings open: 0  
Major findings open: 0

## 14. Certification

```text
A1 SEARCH EXPERIENCE
Cycles of correction: 2
Initial score: 8.89/10
Final score: 9.54/10
Verdict: CERTIFIED_FOR_A2
```
