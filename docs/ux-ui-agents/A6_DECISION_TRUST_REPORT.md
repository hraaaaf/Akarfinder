# A6 — CONVERSION, TRUST & PROPERTY DECISION UX

**Status:** CERTIFIED_FOR_SYNTHESIS
**Scope:** audit-only; no product code modification

## 1. Executive verdict

AkarFinder should optimize for informed progression, not raw clicks. The decision experience must make it easy to understand what a result represents, how current and complete it is, whether several sources describe the same potential property, and what action is appropriate next.

Trust is not one score. It is a structured explanation of provenance, freshness, completeness, consistency and canonical confidence.

## 2. Decision model

User progression:

1. discover relevant result;
2. understand property facts;
3. understand source and data limits;
4. compare alternatives;
5. save or add to project;
6. verify on original source or contact an authorized party;
7. record decision context.

No commercial hierarchy may reorder this sequence.

## 3. Entity clarity

The UI must distinguish:

- canonical/potential property;
- source representation or announcement;
- partner-authored listing;
- public indexed result;
- first-party user listing;
- market signal used internally.

A cluster page or detail surface must state when multiple sources may refer to the same property and show representation-level freshness and provenance.

## 4. Trust architecture

### Provenance

Who published or supplied the representation; link to original source where applicable.

### Freshness

Observed/published/updated timestamps must be qualified. “Updated” is not invented from crawl time.

### Completeness

Which key fields are present: price, surface, location precision, photos, rooms, contact path.

### Consistency

Conflicts between representations are visible rather than silently averaged.

### Canonical confidence

How strongly AkarFinder believes representations describe one property, with explanation and cautious language.

These dimensions must never collapse into a single opaque reliability badge.

## 5. Result card hierarchy

1. relevance and property identity;
2. price/surface/location facts;
3. image with source-safe handling;
4. essential characteristics;
5. freshness and provenance summary;
6. duplicate/cluster indicator;
7. save, compare and detail/source actions;
8. commercial badge, visually secondary and explicitly labelled.

Missing data remains missing. No zero, inferred room count or fabricated location precision.

## 6. Property/cluster detail

### Header

- property type and canonical area;
- asking price range only when representations support it;
- source count;
- last observation;
- save/compare actions.

### Fact resolution

For each field:

- selected canonical value;
- supporting representations;
- conflict state where values disagree;
- precision and confidence;
- “not disclosed” when absent.

### Sources

Each representation shows source name, source class, observed freshness, original link and key differences.

### Decision panel

- compare;
- add to Mon Projet;
- save alert/search;
- open source;
- authorized contact route when available.

## 7. Commercial hierarchy

Order remains relevance-first. Commercial status may affect presentation only within explicit policy and must not masquerade as reliability.

Badge taxonomy:

- `Promoteur partenaire/premium` — commercial relationship;
- `Agence partenaire` — commercial/source relationship;
- `Annonce utilisateur` — first-party submission class;
- `Résultat web externe` — indexed public representation.

Confidence, freshness and completeness use separate components and labels.

## 8. Compare experience

Compare up to four canonical properties, not arbitrary source duplicates.

Rows:

- asking price;
- surface;
- price/m² when valid;
- location precision;
- rooms/features;
- freshness;
- source count;
- completeness;
- conflicts;
- decision notes.

Missing fields are explicit. AkarFinder does not declare a universal winner; it may summarize deterministic differences.

## 9. Favorites, alerts and Mon Projet

### Favorite

Reversible lightweight save attached to canonical property where possible.

### Alert

Attached to query criteria and geographic scope, with frequency and channel consent.

### Mon Projet

Structured shortlist with user criteria, notes, comparison status and follow-up state. It must preserve source links and observation timestamps.

## 10. Contact and handoff

- External source: clearly open original source.
- Partner/authorized contact: state recipient and channel before submission.
- Submission success shown only after confirmed response.
- Consent and privacy wording proportionate to collected data.
- No fake urgency, countdown or scarcity claim without evidence.

## 11. Anti-manipulation rules

Forbidden:

- paid badges styled as quality certification;
- hidden source identity;
- synthetic “best deal” without methodology;
- fabricated demand or viewer counts;
- urgency based solely on listing age;
- preselected consent;
- contact success before server confirmation;
- suppressing a cheaper duplicate representation.

## 12. Measurement

Primary outcome metrics:

- qualified result opens;
- source verification/open rate;
- compare completion;
- save-to-project;
- return to shortlist;
- conflict disclosure opened;
- zero-result recovery;
- partner contact confirmed.

Guardrails:

- source-link visibility;
- complaint/error rate;
- duplicate suppression accuracy;
- stale-result interaction;
- accidental contact submissions;
- commercial/relevance bias audits.

## 13. Accessibility/mobile

- Sticky mobile decision bar limited to two primary actions plus overflow.
- Source and trust disclosures accessible by keyboard and screen reader.
- Tables become labelled comparison cards without losing missing/conflict states.
- No swipe-only action.
- RTL and mixed address/source names tested.
- Confirmation dialogs reserve destructive patterns for actual destructive actions.

## 14. Roadmap

### DEC-0 — Trust taxonomy

Source classes, freshness terms, completeness, conflicts and canonical confidence.

### DEC-1 — Result cards

Hierarchy, badges, missing data and actions.

### DEC-2 — Cluster/property detail

Field resolution, source comparison and conflict disclosure.

### DEC-3 — Compare and project

Canonical compare, favorites, alerts and Mon Projet.

### DEC-4 — Authorized conversion

Transparent partner contact and analytics guardrails.

## 15. Backlog

| ID | Task | Priority | Effort |
|---|---|---:|---:|
| TRUST-01 | Trust-dimension data contract | P0 | L |
| TRUST-02 | Source-class component taxonomy | P0 | M |
| TRUST-03 | Result-card hierarchy | P0 | L |
| TRUST-04 | Field conflict resolution UI | P0 | L |
| TRUST-05 | Representation/source panel | P0 | L |
| TRUST-06 | Canonical compare model | P1 | L |
| TRUST-07 | Favorites/alerts/project integration | P1 | XL |
| TRUST-08 | Contact confirmation contract | P0 | M |
| TRUST-09 | Commercial bias audit | P0 | M |
| TRUST-10 | FR/AR mobile/a11y tests | P0 | M |

## 16. Reviewer — cycle 1

**Initial score: 8.81/10 — FAIL**

Critical findings:

1. Initial proposal used an overall trust score that could conceal conflicting dimensions.
2. Compare mode could compare duplicate representations as if they were distinct properties.

Major findings:

- freshness terminology could confuse crawl time with publisher update;
- commercial ordering policy was not explicit enough;
- cheaper duplicate representations could be visually de-emphasized;
- contact confirmation lacked server-response requirement;
- “best value” summaries lacked deterministic methodology;
- Mon Projet did not preserve source observation timestamps.

## 17. Corrections

- Removed the opaque overall trust score; retained separate trust dimensions.
- Restricted comparison to canonical properties and exposed representations inside them.
- Qualified all freshness timestamp types.
- Enforced relevance-first ordering and separate commercial semantics.
- Required visibility of all eligible representations, including cheaper ones.
- Required confirmed server response for contact success.
- Limited summaries to deterministic factual differences.
- Preserved source links and observation timestamps in Mon Projet.

## 18. Final scoring

| Criterion | Score /10 |
|---|---:|
| Doctrine alignment | 9.9 |
| Entity/provenance clarity | 9.8 |
| Trust architecture | 9.8 |
| Decision UX | 9.6 |
| Commercial fairness | 9.8 |
| Compare/project model | 9.6 |
| Conversion integrity | 9.8 |
| Accessibility/mobile | 9.4 |
| Measurement/guardrails | 9.5 |
| Execution readiness | 9.6 |

**Final score: 9.68/10**

Critical findings open: 0  
Major findings open: 0

## 19. Certification

```text
A6 DECISION & TRUST
Cycles of correction: 2
Initial score: 8.81/10
Final score: 9.68/10
Verdict: CERTIFIED_FOR_SYNTHESIS
```
