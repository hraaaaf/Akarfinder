# DATA MASS-1 — Reservoir Qualification

**Status:** ✅ CERTIFIED / MERGE PENDING  
**Lane:** DATA / Mass Coverage  
**Base:** `main@20ff1683af02c0d4d6fc1efa4a5821674eb88d0f`  
**Branch:** `data/mass-1-reservoir-qualification`  
**PR:** #511  
**Certified behavioral head:** `d768f47e4662430c71066ea9aaa43c85b23477fb`  
**Score:** **9.5/10**

## Responsibility

Qualify the existing `discovery_candidates` reservoir at national scale and rank domains for the next Source Factory lot, without fetching source pages, changing Source Registry policy, ingesting listings, or activating Search.

MASS-1 answers: **what inventory signals do we already possess, which domains carry the most likely Morocco real-estate/listing-detail volume, and what should MASS-2 review first?**

## Truth boundary

- Unit = **URL representation**, never unique property.
- `likely_real_estate` is a deterministic prioritization signal, not an eligibility decision.
- `LIKELY_LISTING_DETAIL` is a structural heuristic, not proof that a live property exists.
- Duplicate signal uses existing `content_fingerprint` or normalized discovery text only; it is **not property-level deduplication**.
- Source Registry remains authoritative. MASS-1 grants no permission and changes no source policy.
- `SOCIAL`, `DISCOVERY_TRANSPORT` and known `FOREIGN_ONLY` domains cannot enter the Morocco MASS-2 Source Factory queue.
- Existing `hidden`, `prohibited`, `permission_required`, `unverified`, `expired`, or internal-only sources remain measurement-only.
- A stale `canonical_link_only` field can never override a restrictive authorization status.
- Every row/domain emitted by MASS-1 remains `publicActivableNow=false`.

## Inputs

Read-only production tables:

- `discovery_candidates`
- `thin_index_search_documents`
- `source_policy_registry`

No source detail-page HTTP request is performed.

## Deterministic classification

### Domain role

- `DIRECT_PORTAL`
- `AGGREGATOR`
- `SOCIAL`
- `DISCOVERY_TRANSPORT`
- `FOREIGN_ONLY`
- `UNKNOWN`

`UNKNOWN` is intentionally preserved instead of inventing a source identity. `FOREIGN_ONLY` is used only for live-proven non-Morocco portals that would otherwise waste Morocco Source Factory review capacity.

### Page kind

- `LIKELY_LISTING_DETAIL`
- `LIKELY_CATEGORY_OR_SEARCH`
- `AMBIGUOUS`
- `NON_REAL_ESTATE`

Signals use only evidence already present in discovery: URL structure, title, snippet and discovery metadata.

### MASS queue

- `POLICY_COMPATIBLE_TAIL` — existing Registry canonical-link tail, only after a genuinely compatible policy snapshot; MASS-2 re-verification still required.
- `SOURCE_FACTORY` — unregistered, materially sized Morocco real-estate reservoir to audit in MASS-2.
- `MEASURE_ONLY` — already registered source whose current policy remains authoritative.
- `HOLD` — insufficient evidence, transport/social/reference/hospitality noise or known foreign-only inventory.

## Final production evidence

Exact-head workflow run: **`31556168993` — SUCCESS**  
Artifact: **`9126213992`**  
Digest: **`sha256:6f99427010bc4477c822f46559823ad7289b18acdc38f99bcfdee69e42bd0dc1`**  
Generated: `2026-08-12T02:22:04.889Z`

### Reservoir snapshot

- discovery rows read: **199,381**
- distinct discovered URL representations: **101,131**
- Thin Index URL representations: **56,812**
- Registry rows: **35**
- exact discovery repetitions collapsed: **98,250**
- **net-new URL representations: 86,741**
- net-new domains: **12,401**
- likely real-estate URL representations: **57,509**
- likely Morocco real-estate URL representations: **51,326**
- likely Morocco listing-detail URL representations: **24,028**

### MASS-2 Source Factory output

- candidate domains: **101**
- candidate URL representations: **17,376**
- likely Morocco real-estate representations inside Source Factory: **15,790**
- likely Morocco listing-detail representations inside Source Factory: **2,989**
- policy-compatible tail domains: **0** on this snapshot because current restrictive/unverified Registry states remain fail-closed.

Top yield candidates begin with:

1. `marocannonces.com` — 1,746 likely Morocco RE representations;
2. `domio.ma` — 260;
3. `1000-annonces.com` — 184;
4. `2p.ma` — 283;
5. `sakane.ma` — 551;
6. `yakeey.com` — 326;
7. `ma.afribaba.com` — 1,120;
8. `milkiya.ma` — 95;
9. `dabaannonce.ma` — 793;
10. `immo.mitula.ma` — 2,583;
11. `immobilier.trovit.ma` — 2,513.

These are **review priorities**, not authorized/public inventory.

## Independent reconciliation

Read-only SQL executed independently of the audit runner reconciled exactly:

- `discovery_candidates` = **199,381** rows;
- distinct raw discovered URL representations = **101,131**;
- `thin_index_search_documents` = **56,812**;
- `source_policy_registry` = **35**;
- raw net-new URL representations versus Thin Index = **86,741**.

## Double-check findings and corrections

The lot was deliberately not certified at the first green run. Independent review found and corrected:

1. restrictive Registry authorization could be combined with stale canonical-link fields → **fail-closed precedence added**;
2. neighborhoods/localities (`Agdal`, `Souissi`, `Guéliz`, `Hay Riad`, `Maârif`, `Aïn Diab`, `Oasis`) leaked into the city metric → **removed from `detectedCities`, retained only as Morocco locality evidence**;
3. directory/catalog surfaces (`telecontact.ma`, `tiendeo.ma`) polluted Source Factory → **HOLD**;
4. hospitality/travel surfaces (`booking.com`, `agoda.com`, `allhotelsmorocco.com`, Airbnb/Tripadvisor/Vrbo/Abritel/Villanovo/Cozycozy families) polluted Source Factory → **HOLD + regression gate**;
5. editorial/reference sources (`petitfute.com`, `combien-coute.net`, `annuaire-horaire.com`) were not inventory → **HOLD**;
6. live-proven foreign-only portals (`mubawab.tn`, `ouedkniss.com`, `ouestfrance-immo.com`, `geolocaux.com`) were consuming Morocco review capacity → **`FOREIGN_ONLY` + HOLD**;
7. foreign domains with real Morocco inventory (`pap.fr`, `paruvendu.fr`, `fazwaz.fr`, `properstar.fr`, `2ememain.be`) were explicitly checked and **remain candidates**, preserving mass rather than applying a crude TLD filter.

Final artifact confirms all known excluded domains have score `0`, queue `HOLD`, and **zero leakage** into Source Factory.

## Blocking gates — final

All PASS on `d768f47e…`:

- database writes = **0**
- DDL changes = **0**
- policy changes = **0**
- source network/detail-page requests = **0**
- public rows created = **0**
- unique properties claimed = **0**
- transport leakage into Source Factory = **0**
- social leakage = **0**
- foreign-only leakage = **0**
- weak-Morocco leakage = **0**
- pseudo-city leakage = **0**
- restrictive policy leakage = **0**

## CI / certification

- MASS-1 unit tests: PASS;
- TypeScript: PASS;
- production build: PASS;
- live production read-only audit: PASS;
- independent SQL reconciliation: PASS;
- manual high-volume + suspicious-domain spot-check: PASS;
- exact behavioral head: **19/19 associated workflows SUCCESS**, including Canonical Baseline, Compile, Search Truth, dedup, Geo, accessibility and MASS-1;
- independent double-check: PASS after three correction rounds;
- final technical score: **9.5/10 — CERTIFIED**.

The remaining 0.5 reflects that MASS-1 is a deterministic prioritization/review engine, not a semantic crawler or unique-property dedup engine; those capabilities belong to later lots and must not be falsely claimed here.

## Next DATA MASS lots

1. **MASS-2 — Source Factory** — audit policy/robots/terms/channel and source shape by highest expected yield; no authorization inferred from MASS-1.
2. **MASS-3 — Minimal Listing Index** — index the minimum policy-admissible representation even when price/photo/surface are absent; quality affects ranking, not existence.
3. **MASS-4 — Mass Reclassification** — re-evaluate quality-blocked historical inventory under `Quality ≠ Eligibility` while keeping source policy fail-closed.
4. **MASS-5 — Discovery Expansion** — widen public sitemaps/indexes/Common Crawl/agency/promoter/partner discovery into the same reservoir.
5. **MASS-6 — National Mass Engine** — permanent discover → classify → policy → index → freshness → dedup → rank pipeline with national coverage observability.

## Closeout condition

MASS-1 becomes **CLOSED** only after PR #511 merge, post-merge replay/verification on the new `main`, and canonical `README.md` + `docs/ROADMAP.md` + `docs/SESSION.md` synchronization.
