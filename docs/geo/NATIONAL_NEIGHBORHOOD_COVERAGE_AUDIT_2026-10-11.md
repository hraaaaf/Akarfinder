# AkarFinder — National Neighborhood Coverage — Offline Audit (2026-10-11)

## GOAL / SUCCESS / PROOF

**Goal**: enumerate source-backed neighborhood labels and genuine coordinates in the existing HCP/Barid/OSM V5 packed catalog, city by city, **without** implying that a label, center, or administrative arrondissement proves a neighborhood polygon.

**Success**: an exact-code GitHub Actions run decodes all eight N2 chunks and `places-0`, checks accounting invariants and creates a complete JSON report and parent-city CSV.

**Proof**: [GitHub Actions run 38105071300](https://github.com/hraaaaf/Akarfinder/actions/runs/38105071300) — **success** at code HEAD `246de3deeb677230c30d0f3b8524b7c85910ff38`; job `114368732463`; artifact **11689790233**. Script syntax, decoding, invariants, and artifact upload passed. This file is documentation added **after** the validated code commit; it must not be mistaken for a second executed audit.

## VERIFIED INVENTORY

| Source metric | Observed |
|---|---:|
| Places in packed national places catalog | 341 |
| Packed N2 parent groups | 93 |
| Parent groups uniquely linked to place catalog | 70 |
| Parent groups not linked by current exact-key lookup | 23 |
| Ambiguous parent matches | 0 |
| N2 source label rows decoded | **11,413** |
| Source rows with finite valid centers | **1,648** |
| Source rows lacking centers | **9,765** |
| Source rows with invalid centers | **0** |
| OSM-tagged source rows | 1,648 |
| Barid-tagged source rows | 9,765 |
| Repeated normalized names within one parent | 106 |
| Distinct normalized parent+name keys | 11,307 |
| Canonical GEO_NEIGHBORHOODS records | 23 |
| Validated map-eligible canonical neighborhoods | **17 across 8 cities** |
| Reviewed/published actual neighborhood polygon boundaries | **0** |

**Important discrepancy:** `NATIONAL_TERRITORY_META.neighborhoodCount` is statically **10,799**, but decoding the eight actual N2 chunks yields **11,413 rows**, a difference of **614**. These counters must not be conflated. Neither count means certified unique Moroccan neighborhoods.

## CITY CANDIDATES — NOT VALIDATED NEIGHBORHOODS

| City | Map-eligible registered | Packed source labels | Source rows with valid centers | Distinct centered names not matching the current map-eligible canonical names/aliases |
|---|---:|---:|---:|---:|
| Casablanca | 3 | 1,617 | 134 | 130 |
| Rabat | 3 | 318 | 27 | 23 |
| Marrakech | 3 | 1,193 | 44 | 40 |
| Tanger | 2 | 322 | 22 | 22 |
| Agadir | 2 | 254 | 35 | 32 |
| Fès | 2 | 791 | 42 | 38 |
| Kénitra | 1 | 205 | 38 | 38 |
| Mohammedia | 1 | **not joined** | **unknown** | **unknown** |
| **Seven joined cities** | **16** | **4,700** | **342** | **323** |

The national map registry still contains **17** eligible neighborhoods in 8 cities; the 7 joined cities account for **16**, with **Mohammedia** not joined by this source-parent lookup. Do not label it zero coverage.

**Crucial interpretation:** the 323 nonmatching normalized names are a **candidate review queue**, not 323 additional certified neighborhoods; some may be alternate spellings, neighborhood subdivisions, misclassified places, or inconsistent city-parent links.

## FIX-PRIORITY FINDING: PARENT LINKAGE

The packed source contains **23 N2 parent groups not linked to a uniquely matched place**. One striking example is parent `el jadida`: **544 centered source rows, 0 matches** in the currently used exact parent lookup. The runtime `parentKey` removes separators from city names, whereas a packed parent group may preserve them. This discrepancy is a plausible bug contributor; verify the full 23-group source identity and safe normalization contract before changing runtime code.

**Do not** automatically attribute these 544 rows to a similarly spelled city without reviewing source IDs and the parent-key contract. Do not publish these rows as neighborhoods from this finding alone.

## READ-ONLY AUDIT IMPLEMENTATION

- `scripts/audits/national-neighborhood-coverage.mjs`
- `.github/workflows/carte-national-neighborhood-coverage-audit.yml`
- Artifact contents: `data/audits/national-neighborhood-coverage/report.json` and `by-parent.csv`.
- No network fetch, dependency install, DB call, production file mutation, UI change, merge, or Vercel deploy.

This PR [#1111](https://github.com/hraaaaf/Akarfinder/pull/1111) remains **DRAFT**. Cartographic Flat Living Map PR [#1108](https://github.com/hraaaaf/Akarfinder/pull/1108) is a separate product gate, not automatically unblocked by these candidate counts.

## NEXT EXACT / REMAINING SEQUENCE

1. Produce a read-only **23-parent reconciliation matrix** from the CSV: city alias/spelling, available `places-0` candidates, exact source provenance and whether the runtime key mismatch is reproducible. First prioritize **El Jadida** and **Mohammedia**. No speculative joins.
2. Fix and test the stale `10,799` meta count against the actual packed source count (do not silently change upstream data). Keep **raw**, **mapped** and **centered** metrics distinct.
3. Qualify the **323** centered name candidates in the seven currently joined cities by unique city-scoped identity; separate axes, landmarks, districts, neighborhoods and aliases. Review source attribution and ODbL requirements.
4. Only after source qualification, add or enable each validated center through the existing shared MapLibre engine. Do not infer polygon boundaries or force `map_eligible` from names alone.
5. For any product UI change: BEFORE, TARGET, 390/430/768/1280 AFTER, compare, accessibility and actual tile/POI checks. Maintain unrelated PR gates and explicit merge/Vercel human authorization.
6. Merge/post-merge/closeout only with required gates actually proven; do not merge this draft audit PR on the basis of a green single workflow.

**Current completion**: offline national **inventory measured**; actual expanded, verified **national quartier coverage NOT achieved**. No new neighborhood promoted.

**Notion cross-reference**: https://app.notion.com/p/3f677c6633628114aaa1eedfeb448473

## COMPLETE 23-PARENT RECONCILIATION BACKLOG — VERIFIED

CI [38105223915](https://github.com/hraaaaf/Akarfinder/actions/runs/38105223915) **SUCCESS** on exact audit code HEAD `7258f7a8454085c509344a26c7cdf95433d9431d`, job `114369201962`. The job logs include the complete 23-group backlog below.

- **23 parent groups** unlinked to a unique city/place in current normalized runtime lookup.
- **1,255 unlinked source label rows**, including **675 centered** and **580 lacking a center**.
- The total **1,648 centered rows = 973 from source parents joined unambiguously to places + 675 from unlinked parents**. Neither population equals a set of reviewed neighborhoods.
- El Jadida alone contributes **544** source center rows under a currently unlinked `el jadida` parent. **No automatic re-parenting**.

| Packed parent key (not verified canonical city) | Source rows | Centered | Missing center |
|---|---:|---:|---:|
| el jadida | 544 | 544 | 0 |
| dcheira el jihadia | 48 | 48 | 0 |
| ait melloul | 16 | 16 | 0 |
| kasba tadla | 13 | 13 | 0 |
| al hoceima | 37 | 12 | 25 |
| es semara | 6 | 6 | 0 |
| sidi bibi | 5 | 5 | 0 |
| el hajeb | 5 | 5 | 0 |
| m diq | 4 | 4 | 0 |
| sidi kacem | 77 | 3 | 74 |
| mechouar fes jdid | 3 | 3 | 0 |
| beni mellal | 483 | 2 | 481 |
| madagh | 2 | 2 | 0 |
| oued zem | 2 | 2 | 0 |
| el marsa | 2 | 2 | 0 |
| fkih ben salah | 1 | 1 | 0 |
| ain bni mathar | 1 | 1 | 0 |
| imouzzer kandar | 1 | 1 | 0 |
| sidi yahya gharb | 1 | 1 | 0 |
| sidi ifni | 1 | 1 | 0 |
| bab taza | 1 | 1 | 0 |
| al machouar stinia | 1 | 1 | 0 |
| had soualem | 1 | 1 | 0 |

### Root-cause hypothesis and fail-closed policy

The V5 builder records parent names in multiple source-specific normal forms (`parentCityNormalized`); the runtime performs its own `parentKey` normalization on place display names and looks up exact keys. The 23 misses may reflect name, separator, transliteration or missing-place divergences. Inspect the exact source pair and canonical city identity before changing the resolver. **Never infer an OSM neighborhood parent from a nearby point or name alone.**

Next: introduce a deterministic, collision-checked candidate parent alias matrix for these 23 group keys on an isolated feature branch, with explicit `unresolved` outcomes and tests. No silent fuzzy matching, no polygon publication, no deploy.

## STRICT NORMALIZATION-ONLY PARENT RECOVERY — CERTIFIED READ-ONLY

[CI run 38105321214](https://github.com/hraaaaf/Akarfinder/actions/runs/38105321214): **SUCCESS**, exact audit-script commit `5d3a2e8deda117c0cd02b735386fbbf8e0960116`, job `114369508119`. This pass tests separator/diacritic-insensitive **exact** normalization against names present in the packed `places-0` catalog, without changing the product runtime.

- **20/23 previously unlinked parent keys** have **one and only one candidate place identity** in the known place catalog; these contain **671 centered source rows**. There are **zero ambiguous normalized joins**.
- **3/23 remain unmatched** even after normalization: `madagh` (**2 centers**), `sidi yahya gharb` (**1**), `bab taza` (**1**).
- Combined accounting: **1,648 centered source rows = 973 already under exactly matched parents + 671 under strictly normalizable, unique proposed parent matches + 4 still orphaned**.
- Example: packed group `el jadida` has a unique proposed place `el-jadida` via exact normalization and **544** centered rows. **This is not a claim that 544 urban neighborhoods of El Jadida have been verified**; an OSM point may represent a different geographic level or extended territory. No live parent remapping has occurred.
- This experiment only diagnoses an index-key compatibility bug/opportunity. Do **not** promote the 20 candidate links to production without provenance, geographical containment and UI/performance certification.

### Shortest safe next lot

1. Build a **shadow normalized-parent resolver** that compares strict normalized keys and returns a city only when the mapping is unique; keep three unresolved names in a review queue. Never use fuzzy proximity guesses.
2. Measure whether each proposed parent is actually geographically consistent with the source point, checking city-boundary/topology and name classification; reject locations outside defensible city scope.
3. Test an incremental canary of a small source-backed candidate set on the shared map, preserving clear "limites non certifiées" semantics. Capture BEFORE/AFTER on 390/430/768/1280 and assess density/performance (especially El Jadida).
4. Only after those gates consider activating source-backed locality points. Certified neighbourhoods remain **17/8**, not 1,648 or 1,644.
5. Keep source/meta mismatch `10,799` versus `11,413` as a separate contract fix.

**Status:** SOURCE COVERAGE INVENTORY AND STRICT NORMALIZATION DIAGNOSTIC VERIFIED. **National neighborhood coverage is not expanded/merged/deployed.**

## SPATIAL SHADOW CHECK — VERIFIED, NO PRODUCTION CHANGE

[GitHub Actions run 38105463500](https://github.com/hraaaaf/Akarfinder/actions/runs/38105463500) **SUCCESS**, exact audit-code SHA `8b3ce41c7e760f4947ad73685740a2622a453af6`, job `114369932484`. It decoded all **292 existing OSM candidate city-boundary features**, then tested every source-backed center against the polygon of its parent found by either the existing exact key or the strict-normalized unique candidate key. Ring-holes and multipolygons were accounted for. This is a **shadow-only spatial sanity check**, not a city/quarter certification.

| Shadow classification | Source-point rows |
|---|---:|
| Inside candidate parent-city OSM polygon | **1,628** |
| Outside candidate polygon — requires manual review | **16** |
| Parent city unresolved | **4** |
| Parent resolved but no city polygon | **0** |
| **Total candidate points tested** | **1,648** |

Examples: Casablanca **134/134 inside**, Rabat **27/27**, Agadir **35/35**, Marrakech **44/44**; El Jadida **538 inside / 6 outside** from 544 points under the strictly proposed `el-jadida` parent, and Dcheira El Jihadia **43 inside / 5 outside**. These figures do **not** authorize automatic activation of any locality.

**Important distinction:** OSM city administrative polygons are candidate/simplified geometry, not statutory or official neighborhood polygons. An `inside` result cannot prove a feature is a residential neighborhood; an `outside` result cannot alone disprove it. Check original OSM IDs, dates, sources, boundary precision, settlement category and source licensing before promotion.

**Territorial scope caveat:** the packed source includes `ceuta` and `melilla` groups (38 and 28 centered source rows in the current log). These require an explicit territorial-data policy to avoid misrepresenting all embedded source rows as certified Moroccan neighborhoods. Keep distinct source-volume and product-coverage KPIs.

### Final audit decision

- **Success proven:** national compressed source inventory, strict parent-key analysis, and spatial shadow checks all completed with green exact-code CI.
- **Not proven/not performed:** a complete list of Moroccan neighborhoods, 1,628 uniquely verified neighborhood identities, reviewed district boundaries, UX performance for thousands of labels, app activation, or general production release.
- **Next exact:** first inspect the 16 spatial exceptions and 4 unresolved parents and classify 323 unique centered candidate names across the current seven mapped city catalogs; then prepare a bounded city-specific map canary and BEFORE/AFTER screenshots on four viewports. No mass promotion, merge, DB write, or Vercel deployment.


## SOURCE CANDIDATE REVIEW QUEUE — VERIFIED

Read-only [CI 38105877702](https://github.com/hraaaaf/Akarfinder/actions/runs/38105877702) on exact audit-script SHA `b67c83500d90cb19f81a39de99582231a47eaf1b` (job `114371192561`) created the fully explicit candidate-review queue and name-level spatial exceptions.

**323** distinct centered **names** from seven directly joined city source groups split as:

| Class | Count | Policy |
|---|---:|---|
| Source-only name not yet matched by internal registries | **297** | Original OSM feature identity + semantic review required |
| Already in older listing district dictionary | **20** | Registry reconciliation before promotion |
| Already canonical validated, but `map_eligible=false` | **6** | Preserve deliberate safety gate; never auto-enable |
| **Total** | **323** | These are review records, NOT 323 certified neighborhoods |

**4 candidate names** triggered conservative POI/real-estate-project-name flags, and **9 pairs** of distinct names are within 150 meters. Neither heuristic proves equivalence or invalidity; manual source/semantics review is mandatory.

**All 20 spatial and parent-identity exceptions are now named in the audit artifact** `source-review-exceptions.json` (plus CSV): 16 outside simplified candidate city polygons and four orphaned parent identities. Original OSM feature IDs are not stored in the packed V5 input; the audit deliberately records them as `null` rather than manufacturing stable identity.

- **Outside:** Fès/Aouint Hajjaj (1), Ceuta/El Sarchal and Juan XXIII (2), Melilla/Melilla La Vieja (1), El Hajeb/Paysannat (1), Dcheira El Jihadia/Irhalne, Rochdi, Idder, Zaitoun and Narjiss (5), El Jadida/Résidence Khalil Jabrane, Lot. Annasr, Skippa, Palmiers 8, Lot. Nessma and Lot. Jnane (6). **Total 16.**
- **No source parent resolved:** Madagh/Hay Chrarba and Hay Essalam (2), Sidi Yahya Gharb/Hay Al Wahda (1), Bab Taza/Tifouzale ès Sefli (1). **Total 4.**
- These exceptions remain `HOLD`; a coordinate outside a simplified city polygon is not necessarily wrong or outside a residential locality.

## SOURCE-ONLY PILOT AGADIR AL QODS — SOURCE GATE VERIFIED

Selected pilot is **Al Qods / Agadir**, already present in the packed V5 catalog as `osm_neighborhood_label` with longitude **-9.5551165** and latitude **30.4177326**.

- Independent geolocated identity: [Mapcarta / OSM node 3848139959](https://mapcarta.com/N3848139959), `place=suburb`, rounded 30.41773 / -9.55512 matching the packed center.
- Postal naming corroboration: [Barid search index](https://www.codepostal.ma/search_carte.aspx?keyword=80), `AGADIR QUARTIER QODS 80060`.
- Independent local descriptions: [Le360 (18 January 2026)](https://fr.le360.ma/societe/agadir-lisolement-des-habitants-du-quartier-al-qods-interpelle-aziz-akhannouch-president-du-conseil_FZTEVMQIL5ENXJSUWLLZVWEUPY/) and [TelQuel (17 July 2018)](https://telquel.ma/2018/07/17/a-agadir-la-nomenclature-palestinienne-des-rues-fait-debat_1603577) both call the place a neighborhood of Agadir.
- Source fixture: `data/geo/pilot-agadir-al-qods-evidence.json`.
- Offline canary: `scripts/audits/verify-agadir-al-qods-pilot.mjs`. [CI 38105994983](https://github.com/hraaaaf/Akarfinder/actions/runs/38105994983), exact SHA `35da8eedb4f122d64801dccceffb92a32260d7ba`, **SUCCESS**, job `114371534875`; JSON artifact `agadir-al-qods-pilot.json` produced.
- Direct OSM node page was not accessible in the verification browser; OSM ID and tag are supported by Mapcarta's explicit OSM reference. Preserve that provenance distinction.

**Source gate PASS only**, NOT public map eligibility. The pilot remains `HOLD` for certified boundaries, public route, visual quality and release. No source center is repurposed into a fabricated polygon.

For real four-viewport browser certification of the existing shared map without product changes, child DRAFT PR [#1112](https://github.com/hraaaaf/Akarfinder/pull/1112) targets map DRAFT [#1108](https://github.com/hraaaaf/Akarfinder/pull/1108). Its first harness commit is `449ac6cbce06b427832e0cdc3bf0db6acf3357eb`. N2 browser run **pending at this documentation checkpoint**, with the exact four requested screenshots `agadir-al-qods-{390,430,768,1280}-after.png`.

**Next exact**: inspect the one N2 run; if green download/screenshots, inspect 4 viewports and compare to Flat Living Map target, update proof and score. If red diagnose and fix only the actual source/harness error. Keep all PRs DRAFT and Vercel/DB untouched.

## AL QODS CARTOGRAPHIC UX CORRECTION — BEFORE / TARGET / CURRENT GATE

The independent source-only pilot [child PR #1112](https://github.com/hraaaaf/Akarfinder/pull/1112), based on the ongoing Flat Living Map [#1108](https://github.com/hraaaaf/Akarfinder/pull/1108), ran **real** N2 browser captures across `390/430/768/1280` on product HEAD `449ac6cbce06b427832e0cdc3bf0db6acf3357eb`. [CI 38106102003](https://github.com/hraaaaf/Akarfinder/actions/runs/38106102003) **SUCCESS**, artifact **11689767359**. Site showed the truthful center-only disclaimer but the P4 decision rail headline remained **Agadir**, not **Al Qods**. Visual review rated this BEFORE **7.2/10 subjective**, below aspirational target. A 4-viewport screenshot montage was prepared for user review.

**Goal:** headline should say **Al Qods** only after source API confirms city/slug/name/center/provenance; kicker must say `Agadir · Repère indicatif`; body reminds boundaries unverified; CTA must remain **city-only `/search?city=Agadir` without a fabricated district**. No new polygon/SEO/DB write/deployment.

- First two-file UI + browser assertion implementation: `0a0385a8c56eeddbb2dd329ae0fee948ec6d3519`, followed by accent regex correction `6774b515a2e0b97fffc12f5c767cc7bb364a170b`.
- Exact-head [CI 38106603617](https://github.com/hraaaaf/Akarfinder/actions/runs/38106603617) **FAIL in browser after TypeScript and build passed**, missing element `data-p4-map-source-point=al-qods` after timeout. **Root cause proven in code:** `parseMapNavigationState` intentionally drops noncanonical district from `navigationState.district`; the P4 rail had mistakenly read this canonical-only field instead of the raw URL source candidate, unlike NationalMapRouter. No semantic or Search regression proven.
- Corrective commit `1c9db0ea0256da45d812a429d2b0896b697ec8e0`: read raw `searchParams.get("district")` **only as an untrusted candidate slug**, and verify it against N2 city/source/center before displaying. Do **not** alter canonical parser/Search semantics.
- New exact-head N2 run [38106758647](https://github.com/hraaaaf/Akarfinder/actions/runs/38106758647) triggered; **pending at this document checkpoint**. It must pass TypeScript/build/4-viewport assertions and produce 4 AFTER screenshots, inspect against BEFORE and assign an evidence-backed score **before** closing UI defect.
- Keep PRs #1111/#1112/#1108 DRAFT; 17 certified neighborhoods / 8 cities stay unchanged; no Vercel deploy, DB write, merge or mass promotion.

**Next exact:** read one CI #38106758647 result and its artifact; if red diagnose the actual failed assertion then fix, if green inspect all 4 `agadir-al-qods-*-after.png`, create and show BEFORE/AFTER comparison, score and synchronize Notion.


## AL QODS AFTER VERIFIED — FOUR-VIEWPORT UI CLOSEOUT (2026-10-11)

**Result:** source-only Al Qods source point has consistent contextual rail labeling across all four browser viewports. **This is pilot UI certification only, not a production release or a new canonical map-eligible neighborhood.**

- Child DRAFT [PR #1112](https://github.com/hraaaaf/Akarfinder/pull/1112), exact product/harness HEAD `887e2fa38ce7e459ef12d861a8dc1e2ce3765816`, base product DRAFT #1108.
- [GitHub Actions CI 38106898114](https://github.com/hraaaaf/Akarfinder/actions/runs/38106898114) **completed / success**, head SHA matches. Job `114374224880`: npm ci, TypeScript, production build, Playwright Chromium, 4-viewport N2 browser certification and artifact upload **success**.
- Evidence artifact [11689662979](https://github.com/hraaaaf/Akarfinder/actions/runs/38106898114/artifacts/11689662979), 4 images `agadir-al-qods-{390,430,768,1280}-after.png`, also city/no-center/Casablanca regression screenshots and `report.json` (`ok:true`, `cases.length=4`, `failure=null`).
- **BEFORE**: successful browser [CI 38106102003](https://github.com/hraaaaf/Akarfinder/actions/runs/38106102003) at HEAD `449ac6cbce06b427832e0cdc3bf0db6acf3357eb`, artifact `11689767359`. The map marker named "Al Qods" but P4 context panel displayed generic "Agadir", subjective visual score **7.2/10**.
- **AFTER**: P4 rail now reads exact city/source slug through the raw URL and independently validates `label_candidate` / `not_claimed` / original-source kind / finite center through the national API before showing **Al Qods**. Eyebrow **Agadir · Repère indicatif**, explicit noncertified-boundary wording.
- **Search safety:** the rail's `/search?city=Agadir` link does not contain `district`. This is deliberate; cannot pretend property listings belong to a source-only quartier without geolocation evidence. CI asserts absence of `district` in the search handoff on all 4 sizes.
- **Spatial truth:** point `lng=-9.5551165, lat=30.4177326`, `sourced-label-candidate`, `center-only`, `boundary semantic=none`, `focus semantic=context-focus-not-boundary`, disclaimer visible. No invented quartier footprint or SEO activation.
- **Browser passes:** widths `390 / 430 / 768 / 1280`, zero horizontal overflow in all cases; original Casablanca, Maârif, uncoded source center and no-center postal regressions also passed in the same run.
- **AFTER visual review:** screenshot montage and 390px side-by-side BEFORE/AFTER were prepared and shown to the user. Subjective UI quality **7.8/10**, vs **7.2/10 BEFORE**. Gain is honest selection-context hierarchy, not a redesign; remaining premium polish (better desktop rail density/typographic hierarchy, search field city-only wording) is separate.
- No merge, no Vercel deploy, no production DB write, no new certified neighborhood. PRs #1111 (data), #1112 (UI pilot), #1108 (product) remain DRAFT pending review and later merge gates.

### Goal / Success / Proof closeout

**Goal:** demonstrate a truthful and visually coherent national N2 point fallback for a cross-checked locality (Al Qods / Agadir) without inventing neighborhood boundaries or Search district availability.

**Success:** production Next build + 4/4 Playwright run, route resolved, city-only Search assertion, contextual rail, disclaimers, map loaded, no overflow, actual captures inspected.

**Proof:** exact HEAD GitHub CI #38106898114, its machine-readable report and screenshots, BEFORE/AFTER image comparison. **This pilot goal is met on the draft branch only.**

**Remaining national expansion sequence:** (1) candidate original OSM ID + semantic classification; (2) correct and test 10,799 vs 11,413 metadata contract without falsely equating labels to quartiers; (3) review 16 out-of-polygon + 4 orphan points; (4) city-by-city small cohorts with 4-viewport UX proof; (5) source licensing, performance/accessibility, PR checks; (6) permitted merge/post-merge and separate explicit Vercel deployment approval if needed. Never claim 323 names or 1,628 centered points are certified neighborhoods.


## TANGER BOUKHALEF — SOURCE-IDENTITY GATE (2026-10-12)

**Purpose:** choose a defensible source-only map reference in the second city, without misclassifying a historical rural commune as a current certified residential quartier.

- V5 packed source review for **Tanger/Boukhalef**: OSM-tagged row `lng=-5.8831334, lat=35.7337667`, source flag `1`, parent Tanger; input V5 does **not** retain the original per-row OSM feature ID.
- [Mapcarta OSM-derived entry](https://mapcarta.com/25438180) cites `node 1999241428`, `place=suburb`, rounded `35.7338, -5.8831`, GeoNames `6546251`, Wikidata `Q12199841`. It agrees with the V5 center at the precision exposed by Mapcarta, but the OSM API could **not** be read directly in the research browser: mark the OSM ID **corroborated indirectly**, not directly queried.
- [Mapcarta alternate gazetteer entry](https://mapcarta.com/17489970) cites **GeoNames `2572146`**, `35.7328,-5.89954`; **approx. 1,485 m** great-circle distance between recorded centers. A different ID and center do **not** prove two distinct neighborhoods or that the entries are aliases of one legal quartier. Preserve as separate source references pending reconciliation; **no automatic merge/split**.
- Historical primary source: [Haut Commissariat au Plan, RGPH 2004/2012 report](https://www.hcp.ma/region-tanger/attachment/992796/) explicitly lists `CR Hjar Ennhal (ex Rural CR Boukhalef)` for 2004/2009 administrative comparisons. [Wikidata Q12199841](https://www.wikidata.org/wiki/Q12199841) identifies former rural commune history, ended 2009; no current quartier polygon verified by either. [Commune de Tanger](https://fr.tanger.ma/sites/aeroport-de-tanger-ibn-battouta/) mentions the airport in the Boukhalef area; proof of commonly used toponym only.
- Evidence fixture: `data/geo/pilot-tanger-boukhalef-evidence.json` (separates OSM node, GeoNames 6546251, GeoNames 2572146, former commune administrative identity, source categories and explicit release HOLD).
- Offline test: `scripts/audits/verify-tanger-boukhalef-source-gate.mjs` decodes all V5 chunks, requires exactly one Boukhalef candidate within packed Tanger, checks point/rounded reference, source flag, two distinct GeoNames identities and separation, explicit no auto-merge, no official-classification claim, no map geometry, no property district filter, and no canonical promotion. **[CI 38262256372](https://github.com/hraaaaf/Akarfinder/actions/runs/38262256372) SUCCESS** at exact HEAD `0a71ddb426bb048497d9218c293943b1059ae104`.
- Product/UI canary remains a separate child of product map PR [#1112](https://github.com/hraaaaf/Akarfinder/pull/1112), updated harness-only HEAD `d28f8851714594edba6b6563800e573bfb3dac94`; four viewports `390/430/768/1280`, source city/slug/coords API gate, visible indicative disclaimer, `center-only` and `boundary semantic=none`, truthful Tanger-only `/search?city=Tanger` with no district, zero page overflow and screenshots `tanger-boukhalef-*-after.png`. **Browser CI [38262453390](https://github.com/hraaaaf/Akarfinder/actions/runs/38262453390) in progress at documentation checkpoint**. No screenshot or grade can be declared certified until it completes.
- **Decision:** source-identity evidence gate **PASS for indicative source point only**; current residential-quartier status, official neighborhood polygon, cross-gazetteer equivalence, listing geofilter, and publication remain **HOLD**. Certified 17/8 map registry stays untouched.
- **Next exact:** read CI #38262453390 once; inspect 4 actual screenshots/artifact. If red correct browser harness/root cause, if green show images and score, then record proof in this canonical and Notion. Do not deploy Vercel/merge/create boundaries.


## TANGER BOUKHALEF — FOUR-VIEWPORT BROWSER PASS (2026-10-12)

**Source gate:** exact-code [CI 38262256372](https://github.com/hraaaaf/Akarfinder/actions/runs/38262256372) **SUCCESS**, parent audit fixture `data/geo/pilot-tanger-boukhalef-evidence.json` + offline verifier `scripts/audits/verify-tanger-boukhalef-source-gate.mjs`. The source `place=suburb` point label/center matches an OSM-derived gazetteer reference, with historical rural commune name and alternate GeoNames ID left unresolved. No official neighborhood identity or legal boundary granted.

**Browser gate:** [CI 38262453390](https://github.com/hraaaaf/Akarfinder/actions/runs/38262453390) **SUCCESS**, PR [#1112](https://github.com/hraaaaf/Akarfinder/pull/1112), exact HEAD `d28f8851714594edba6b6563800e573bfb3dac94`, job `114856144294`; artifact [11752518939](https://github.com/hraaaaf/Akarfinder/actions/runs/38262453390/artifacts/11752518939). Machine report `ok=true, cases=4, failure=null`.

| Browser viewport | Route and source | Truthful status | Search contract | Overflow |
|---|---|---|---|---:|
| 390×844 | Tanger/Boukhalef loaded | label candidate, center-only, no polygon; disclaimer visible | city=Tanger, **no district** | 0px |
| 430×932 | Tanger/Boukhalef loaded | same | same | 0px |
| 768×900 | Tanger/Boukhalef loaded | same | same | 0px |
| 1280×900 | Tanger/Boukhalef loaded | same | same | 0px |

The browser also revalidated Casablanca/Maârif and Agadir/Al Qods regression checks in the same run. Original screenshots: `tanger-boukhalef-390-after.png`, `...430-after.png`, `...768-after.png`, `...1280-after.png`, captured by Playwright and extracted from the artifact. A four-viewport composite was produced and displayed to the user. Visual assessment **7.8/10 subjective**: mobile controls and marker legible, premium basemap cohesive, desktop information rail relatively sparse and typography needs further refinement. **No product UI implementation delta for Tanger**: the browser exercise qualifies the existing codepath; a BEFORE/AFTER code change for Tanger would be misleading.

### Decision / closeout

- **Success proven:** a second city can render an externally cross-checked source point with truthful sourcing, no invented polygon or property filter, on 4 browser widths.
- **Not proven/not permitted:** current official Boukhalef quartier boundaries, automatic equivalence of OSM node 1999241428 and GeoNames 2572146, modern administrative classification, SEO eligibility, production publication, nationwide rollout.
- **Release posture:** source record **HOLD**, map pilot DRAFT, no DB write, no merge, no Vercel deploy, no additional canonical `map_eligible` entity; 17 neighborhoods across 8 cities unchanged.
- **Next:** tackle evidence-first normalized parent backlog and semantics/OSM original IDs before any bulk visual or source expansion. Review national metadata mismatch `10,799` static vs `11,413` decoded source rows as different unverified definitions, not an arithmetic patch by assumption. Visual 10/10 convergence remains an independent UI scope and requires BEFORE/TARGET/AFTER.
