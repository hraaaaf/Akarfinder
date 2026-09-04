# AkarFinder — Data Ingestion Canonical

**Status:** ACTIVE — authoritative roadmap  
**Repo:** `hraaaaf/Akarfinder`  
**Branch:** `feat/data-ingestion-canonical`  
**PR:** `#996` — OPEN / DRAFT / unmerged until explicit authorization

---

# 1. Product goal

Build a source-agnostic ingestion layer able to discover, extract, normalize, deduplicate, lifecycle-manage and selectively purge real-estate observations without coupling AkarFinder to one portal.

Architecture:

```text
Discovery
→ extraction
→ Collection Listing Contract
→ validation
→ source adapter
→ CanonicalPropertyV1 / CanonicalOfferV1 / MediaAssetV1
→ deduplication / lifecycle / provenance
→ controlled AkarFinder ingestion
```

Application canonical model: `lib/property-schema/`  
Collection/input contract only: `data-ingestion/schema/listing.schema.json`

Portal observations and direct agency/partner/owner observations remain independent. Purging `source=mubawab` must never delete an independent direct observation of the same property.

Long-term AkarFinder target: **≥100,000 canonical exploitable listings across all sources**.

Current strategic priority: before adding another portal, prove and then obtain **100% explained coverage of the publicly accessible, authorized and relevant Mubawab listing universe**.

---

# 2. Non-negotiable execution rules

For every meaningful lot:

- **Goal** — exact result sought;
- **Success** — observable closure criterion;
- **Proof** — test, artifact or measured evidence.

No Goal is declared reached without proof.

Safety:

- public/authorized routes only;
- robots.txt must be evaluated with wildcard/query-aware semantics before live requests;
- if a route form is explicitly disallowed, do not request it;
- identifiable User-Agent;
- no authentication, CAPTCHA or access-control bypass;
- explicit 403/429 → global source stop;
- bounded request budgets;
- no production DB writes;
- no Vercel deployment;
- no merge without explicit authorization;
- no images during discovery/coverage proofs;
- no broad detail-page crawl during Phase 0.

CI noise unrelated to the active lot does not block safe work.

## Human ambiguity gate

Human review is a **last semantic resort**, not the first reaction to a vague listing card.

Canonical decision sequence:

```text
listing card
→ if card evidence is clear: classify
→ if card is ambiguous: robots-check the exact detail URL
→ if the detail URL is public + allowed: inspect ONE detail page / description
→ if detail evidence is clear: classify
→ only if detail remains materially ambiguous or detail access is not authorized: show user
→ explain competing classifications
→ user arbitrates
→ record precedent for genuinely equivalent cases
```

Rules:

- no silent guessing;
- no bulk detail crawl to classify residuals;
- one detail request is acceptable only for a genuinely ambiguous case and only after an explicit robots check;
- never escalate to the user merely because the listing title/card is badly written when an allowed description can resolve it;
- materially different ambiguities still require human arbitration.

Implementation guard: `data-ingestion/sources/mubawab/ambiguity-resolution.ts` + `scripts/scrapers/__tests__/data-ingestion-lot9-phase0-ambiguity-resolution.test.ts`.

### Methodology correction example — Mubawab #8298787

The card title `La miséricorde est le bonheur 1 près du bus à Casablanca` looked semantically useless. The public description explicitly identifies it as an **apartment for sale** in Sidi Othmane, Casablanca.

Therefore this case must be auto-classified from detail evidence and must **not** reach the Human ambiguity gate.

### Canonical precedent #1 — room/colocation inside an apartment

User decision: **A** on 2026-09-04.

When an offer explicitly concerns a room/colocation inside an apartment:

```text
property_type = apartment
transaction_type = rent
offer_scope = room
```

The physical property remains an apartment. The commercial offer is scoped to one room.

`CanonicalOfferV1` therefore carries required `offer_scope: whole_property | room`.

Generic offers default to `whole_property`. Explicit room/colocation wording maps to `room`. Equivalent explicit cases reuse this precedent; materially different cases still go through the Human ambiguity gate.

Reference case: Mubawab source ID `8322103`, visible title `Chambre meublée de 25 m² pour fille`.

---

# 3. Roadmap

```text
Lots 1–8 CLOSED
      ↓
Lot 9 Phase 0 — PROVE COMPLETE, AUTHORIZED MUBAWAB COVERAGE MODEL  ← ACTIVE
      ↓
Lot 9 Phase 1 — FULL HARVEST USING ONLY APPROVED SURFACES
      ↓
Lot 9 Reconciliation — PROVE 100% EXPLAINED COVERAGE
      ↓
Lot 10 — MASSIVE DATASET CERTIFICATION
      ↓
Lot 11 — CONTROLLED AKARFINDER INGESTION
      ↓
Lot 12 — ADD OTHER SOURCES IF NEEDED TO REACH ≥100K
```

**Phase 1 Full Harvest is BLOCKED until all Phase 0 gates PASS.**

---

# 4. Historical Mubawab discovery evidence

## Classic matrix

Historical run `33899083917`:

- 12 cities × 11 enabled categories;
- deep traversal of the configured matrix;
- **29,741 unique source IDs observed**;
- artifact `9947122701`;
- digest `sha256:1b27ba2946bd671644e6ec1bf03a396df6c86a51706f5a17265466d041a0cb6d`.

## National office campaign

Historical run `33906589600`:

- office sale: 710 IDs, technical terminal at page 24;
- office rent: 1,280 IDs through page 40;
- +1,990 IDs over the classic union;
- **historical persistent union: 31,731 unique IDs**;
- artifact `9949834432`;
- digest `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

### Critical compliance correction

These numbers remain useful **historical observations and seed evidence**, but the old deep-pagination proof is no longer treated as authorization proof.

On 2026-09-04, Phase 0 found that Mubawab's public robots policy contains a wildcard `Disallow: /*:` rule. Mubawab's historical `:p:N` pagination therefore falls inside a disallowed route form for our research bot.

The previous robots parser only used literal prefix checks and did not correctly implement `*`, `$`, Allow/Disallow precedence or query matching. It has now been corrected and regression-tested.

Consequences:

- **no future `:p:N` requests are authorized by this project while that robots rule applies**;
- the 31,731 historical union must not be described as a fully compliance-certified harvest;
- Phase 0 must discover an alternative authorized traversal strategy or quantify the robots-restricted remainder explicitly;
- previous technical extinction via colon pagination does not close P0-D.

---

# 5. Lot 9 Phase 0 — Coverage Proof

**Status: 🔵 ACTIVE**

Goal: prove that the eventual collection method can cover the complete authorized Mubawab universe **before** casting the full net.

## Gates

| Gate | Goal | Current status |
|---|---|---:|
| P0-A | identify every inventory-bearing public route family | 🟡 |
| P0-B | enumerate transaction/type/geography/product dimensions | 🟡 |
| P0-C | prove control-surface IDs are explained by approved harvest surfaces | 🟡 |
| P0-D | prove complete authorized traversal / terminal semantics | 🔴 FAIL / BLOCKED |
| P0-E | reconcile the public catalog denominator | ⚪ |

Phase 0 PASS requires **all five** gates PASS.

Working proof: `data-ingestion/MUBAWAB_PHASE0_COVERAGE_PROOF.md`

---

# 6. P0-A — Route families currently known

Current registry includes:

- `st` — city × category;
- `sc` — national category;
- `cc` — broad national aggregate/control;
- `ct` — city × transaction aggregate/control;
- `t` — city aggregate/control;
- `is` — thematic/search-like inventory surface/control;
- `crp` — hierarchical region/prefecture aggregate discovered during Phase 0, pending qualification;
- vacation `st` — distinct vacation transaction family;
- `pl` — new-development/project catalogue, separate non-unit bucket until proven otherwise;
- `a` / `pa` — detail identity, not Phase 0 discovery surfaces.

No family is dismissed as redundant without reachability evidence.

---

# 7. P0-B — Dimension findings

The historical 12-city config is explicitly non-exhaustive.

A bounded 8-request Phase 0 probe already proved missing unit-inventory geographies including:

- Dakhla;
- Essaouira;
- Martil;
- Meknès.

It also exposed unconfigured semantics:

- `appartements-vacational`;
- `bureaux-et-commerces-a-louer`;
- `bureaux-et-commerces-a-vendre`;
- `immobilier-a-louer`;
- `immobilier-a-vendre`.

Project pages expose many additional localities; those must be separated into unit-listing geography vs project-only geography before entering a harvest matrix.

---

# 8. P0-C — Reachability findings

Initial bounded `ct/is` comparison showed residual IDs because only a few primary page-1 surfaces were used.

Run `33912205981` then compared those residuals against the complete historical 31,731-ID union.

Artifact: `9951845045`  
Digest: `sha256:71e34e6f29ae2e7dde1954684af3ea061237d00d2c5a706f8417aee43c0796a9`

Exact result:

- **78 unique sampled residual IDs**;
- **23 already existed in the historical 31,731 union**;
- **55 remain absent from that union**.

Breakdown:

- `ct` Casablanca sale: 5 sampled residuals, **5 already known, 0 absent**;
- `ct` Casablanca rent: 8 residuals, **3 known, 5 absent**;
- `is` Casablanca sale-cheap: 32 residuals, **10 known, 22 absent**;
- `is` Casablanca rent-cheap: 33 residuals, **5 known, 28 absent**.

Interpretation:

- `ct` sale page 1 is explained by the historical union;
- `ct` rent still has a small residual;
- the major unexplained surface is `is`;
- the remaining 55 IDs require route/semantic classification;
- ambiguity resolution must follow **card → allowed detail → human only if still unresolved**.

---

# 9. P0-D — Authorized traversal blocker

**Current status: 🔴 FAIL / BLOCKED.**

Historical pagination used:

```text
...:p:2
...:p:3
...
```

Current robots policy disallows paths matching `/*:`. Therefore colon-pagination cannot be part of the future authorized Full Harvest plan.

P0-D can only PASS when one of these is proven:

1. Mubawab exposes another public, robots-allowed route mechanism that provides complete traversal; or
2. another authorized public surface family covers the same inventory without colon pagination; or
3. the inaccessible remainder is quantifiable and explicitly excluded from the authorized denominator.

No bypass or workaround designed to defeat robots restrictions is allowed.

---

# 10. P0-E — Denominator reconciliation

The public Mubawab catalog presentation is used only as a reconciliation anchor, not as an exact unique-ID denominator.

Observed public counters fluctuate around ~102K and indexed language/page variants are not synchronized. Therefore Phase 0 must decompose the denominator into:

```text
unique authorized accessible unit-listing IDs
+ project/non-unit objects
+ aliases/duplicates
+ documented restricted/non-indexable components
= explained public catalog universe
```

No `100%` claim until the unexplained material remainder is zero.

---

# 11. Current exact next

1. classify the **55 IDs absent from the historical union** using card evidence first;
2. for every card-level ambiguity, robots-check and inspect the individual public detail description when authorized;
3. auto-classify every case resolved by card or allowed detail evidence;
4. reuse Canonical precedent #1 for explicit room/colocation offers;
5. escalate to the user only cases still materially ambiguous after allowed detail evidence, or cases whose detail page cannot be accessed within policy;
6. qualify `crp` and continue route-family discovery until no new inventory-bearing family appears;
7. test `cc`, `t`, `ct`, `is`, `crp` reachability using only authorized surfaces;
8. search for a **robots-allowed complete traversal mechanism**; do not use `:p:N`;
9. if no authorized complete traversal exists, quantify the restricted remainder and reflect it in P0-E;
10. keep Phase 1 Full Harvest BLOCKED until P0-A..P0-E all PASS.

---

# 12. Facts every handover must preserve

- repo `hraaaaf/Akarfinder`;
- branch `feat/data-ingestion-canonical`;
- PR #996 OPEN / DRAFT / unmerged;
- no Vercel deploy;
- no production DB write;
- historical classic union 29,741;
- historical extended union 31,731;
- those historical deep-pagination counts are **not compliance certification** after the robots correction;
- Phase 0 active;
- P0-D currently FAIL/BLOCKED due `/*:` robots restriction on `:p:N`;
- P0-C currently has **55 sampled IDs absent from the historical union**;
- Human ambiguity gate is mandatory but only after card + authorized detail evidence are exhausted;
- Canonical precedent #1: room/colocation inside an apartment = `property_type=apartment` + `offer_scope=room`;
- methodology correction #8298787: vague card + explicit allowed description = auto-classify, do not escalate;
- target remains **100% explained authorized Mubawab coverage**, not an arbitrary count.
