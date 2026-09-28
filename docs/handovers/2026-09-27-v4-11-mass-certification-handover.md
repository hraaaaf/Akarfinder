# AkarFinder — V4.11 Mass Certification — Handover 2026-09-27

## Goal

Approach then exceed **200,000 certified real-estate listings** in the isolated Neon recovery database, without weakening V4.11 certification or touching Vercel production.

## Current verified state

Read-only Neon verification executed on project `ancient-violet-43534870`, branch `br-cold-mouse-b2a50yaa`, database `AkarFinder` after Wave8:

- `property_listings`: **139,161**
- `listing_sources`: **139,161**
- distinct `listing_url`: **139,161**
- distinct `canonical_fingerprint`: **139,161**
- V4.11 sources: **139,125**
- legacy sources: **36**
- Wave8 sources: **38,935**
- orphans: **0**
- inactive sources: **0**
- property core gaps: **0**
- source core gaps: **0**

Progress toward 200k: **69.5805%**.
Exact remaining delta: **60,839** listings.

## Certified V4.11 wave ledger

| Wave | Certified/imported rows |
|---|---:|
| wave1 | 8,367 |
| wave2 | 13,421 |
| wave3 | 68,018 |
| wave4 | 3,674 |
| wave4b | 1,126 |
| wave5 | 1,158 |
| wave6 | 3,769 |
| wave7 | 657 |
| wave8 | 38,935 |
| **V4.11 total** | **139,125** |

The wave sum exactly matches the V4.11 count currently present in Neon.

## Wave6 exact technical checkpoint

- Repository: `hraaaaf/Akarfinder`
- Working branch: `recovery/v4-11-freeze-wave6-20260927`
- Pre-handover HEAD: `f9d750ecbaeec47a04206fcba1584f19edd51dcd`
- Commit message: `recovery: authorize certified V4.11 wave6 isolated import`
- Wave6 approved rows: **3,769**
- Certified artifact: `10932325027`
- Artifact digest: `sha256:8727bad853b26dfdc00d5eb9d081f5f7a6d8875769426ae04ad56194154fbccd`
- JSONL sha256: `6aaf71aa6db38a726f033ec61e2e6640740f336e572e0e7ffcd54711f55cfb1c`
- Wave6 approval explicitly keeps `production_neon_writes_authorized=false` and `vercel_deployment_authorized=false`.
- Branch relation observed before handover: **317 ahead / 0 behind main**. Do **not** merge this recovery branch wholesale into `main` as part of Wave7.

## Recent evidence

- Wave5 certification + isolated import: VERIFIED in preceding work.
- Wave6 freeze-enrichment certification + isolated import: VERIFIED.
- Common Crawl 365-day evidence corpus: VERIFIED in preceding work.
- Repository contains `.github/workflows/recovery-v4-11-365d-cc.yml` for the 365-day Common Crawl evidence path.
- This handover independently re-verified the final Neon counts above. It did not re-resolve the historical Common Crawl run ID.

## Safety / scope locks

- Isolated Neon recovery branch only for imports unless a later explicit authorization changes this.
- No Vercel deployment without explicit user authorization.
- No claim that recovery branches are ready to merge into `main`.
- Every new wave must remain: candidate build -> certification -> approval -> controlled atomic import -> independent readback -> ledger update.
- Preserve exact URL and canonical fingerprint uniqueness.
- Preserve zero orphan, zero inactive, zero core-gap invariants.

## Next exact

Create the **Wave7** continuation from the current recovery state and exploit the **Common Crawl 365-day corpus + freeze-enrichment path** to produce the next high-confidence candidate set.

Before any import, Wave7 must prove:

1. candidate count and source breakdown;
2. zero duplicate `listing_url` inside the wave;
3. zero duplicate `canonical_fingerprint` inside the wave;
4. explicit overlap counts against the isolated Neon DB;
5. all V4.11 core fields present;
6. import artifact frozen with digest;
7. approval file bound to exact row count + artifact;
8. controlled isolated-Neon import only;
9. independent post-import readback restoring the global invariants.

## Remaining sequence

Wave7 -> certify -> import -> independent DB readback -> update cumulative ledger -> repeat waves until at least 200,000 -> final 200k reconciliation/certification -> only then decide separately whether/how the recovery line converges back toward product branches.

## Resume instruction for a new window

Read this file first. Then verify:
1. current branch/HEAD;
2. isolated Neon count;
3. latest Wave7-related artifacts/runs if any;
4. no Vercel deployment and no production Neon write authorization has appeared.

If the verified count is still **99,569**, proceed immediately with Wave7 construction. If it changed, reconcile the delta before generating new candidates.


## Wave7 closeout — VERIFIED 2026-09-27

Wave7 is now certified and present in the isolated Neon recovery database.

- Certification run: `36325998063` — SUCCESS.
- Certification artifact: `10934360426`.
- Artifact digest: `sha256:67c0a2ec79fb1668288e42c858fcf35e95951e8dd9b4b76137a34e6c46b57319`.
- Certified JSONL SHA-256: `db5204d10aeda29b7a9228400cebd024462df2d1bde30fd481c8a7f2b2f60e00`.
- Certified rows: **657** = Mubawab 407 + Agenz 248 + Avito 2.
- Input evidence: 3,147 Common Crawl rows; 63 identityless URLs quarantined; 2,725 stable portal identities.
- Certification invariants: 657 unique URLs, 657 unique fingerprints, 657 unique portal identities, 0 core gap, no row pre-approved for import.
- Controlled import run: `36326090825`.
  - Approval validation: PASS.
  - Artifact verification: PASS.
  - CSV/core/identity checks: PASS.
  - DB preflight: PASS.
  - Atomic import: PASS.
  - The run is red only because its nested-shell readback command had a quoting defect after COMMIT; do not reinterpret that red status as a rolled-back import.
- Independent direct Neon readback after import: **100,226** properties / **100,226** sources / **100,226** unique URLs / **100,226** unique fingerprints; Wave7 = 657; V4.11 = 100,190; legacy = 36; orphan = 0; inactive = 0; property core gaps = 0; source core gaps = 0.
- Independent GitHub post-import readback: run `36326210818` — SUCCESS.
- Readback artifact: `10934470283`, digest `sha256:d58150933b528fb3c590c312885621002ab62b7e0121b5963e9cd7a31430590a`.

Current progress: **100,226 / 200,000 = 50.113%**.
Exact remaining delta: **99,774**.

## Current next wave

Wave8 strict-route salvage is prepared and bound to the exact Wave7 artifact.

- Candidate source: Wave6 rejected corpus + frozen V4.11 data.
- Safety rule: city comes only from frozen evidence; Mubawab/Avito URL parsing may fill title/property type/transaction only.
- Portal-identity conflicts are quarantined.
- First observed certification output: **39,132** candidates = Mubawab 26,523 + Avito 12,609.
- The first Wave8 run proved the certification logic but failed only because the expected contract was one row too low.
- Current Wave8 rerun: use the latest exact-input run on this branch; do not import until it is green and its artifact/digest/SHA are independently verified.

## Updated Next exact

1. Complete Wave8 exact certification.
2. Verify Wave8 artifact, digest, row count, uniqueness and core invariants.
3. Run a live read-only overlap preflight against isolated Neon.
4. Only then create an exact Wave8 import approval.
5. Controlled atomic isolated-Neon import.
6. Independent readback + ledger update.
7. Continue subsequent waves until at least 200,000.


## Wave8 closeout — VERIFIED 2026-09-27

Wave8 is certified, price-safe, imported into isolated Neon, and independently read back.

- Raw Wave8 certification run: `36326242303` — SUCCESS.
- Raw certified artifact: `10934176431`, digest `sha256:2b3af158bfc4c0f86f0ac7dd7481bfa2d4acd6530f1b869eedcb2ff30c25384b`.
- Raw candidate rows: **39,132**.
- Neon overlap diagnosis: **0 URL**, **0 fingerprint**, **197 distinct portal identities** already present = 195 Mubawab + 2 Avito.
- Final filtered rows: **38,935** = Mubawab **26,328** + Avito **12,607**.
- One optional price outlier (`99,999,997,952 MAD`) exceeded PostgreSQL int4; it was quarantined to `null/not_disclosed` without altering identity or core fields.
- Price-safe preflight run: `36334430803` — SUCCESS.
- Price-safe artifact: `10936503385`, digest `sha256:b9102a4df8bad75fb68ce138d3b9464a03831628902fbffdd188973f5619d5af`.
- Final JSONL SHA-256: `0f8670915f526ccebfffec7fb83cea78f50f797be85fbb675a400570c3cdf451`.
- Controlled isolated-Neon import run: `36335262199` — SUCCESS.
- Import readback artifact: `10935949669`, digest `sha256:92f74d2710d4dd3371b18a59870534ac7c5016aeda1917a216d5be49be209e79`.
- Independent post-import readback run: `36335376884` — SUCCESS.
- Independent readback artifact: `10937375236`, digest `sha256:f0cd9b5265b72ae9839d5141d154995db2d72d85bc63bae43b831b2c196929f2`.
- Final direct Neon invariants: **139,161** properties / **139,161** sources / **139,161** unique URLs / **139,161** unique fingerprints / V4.11 **139,125** / legacy **36** / orphan **0** / inactive **0** / property core gaps **0** / source core gaps **0**.
- Production Neon writes: **false**. Vercel deployment: **false**.

## Wave9 current checkpoint

Strict route refinement has been hardened against ambiguous `ferme/fermé`, road-name city tokens, `Sala El Jadida`, and Dakhla district ambiguity.

- Hardened certification run: `36334943106` — SUCCESS.
- Artifact: `10937330001`.
- Artifact digest: `sha256:31c5e6f5a02fef7733f37eede5e667f5a1f3c5e4b7f13e36af5cd81932d4175b`.
- JSONL SHA-256: `9baac42bc02b5f0820eac6709a3a3ec5b5e9c9cfea515a8135311fc5fdd56dd6`.
- Offline certified rows: **2,428** = Mubawab **1,693** + Avito **735**.
- Internal uniqueness and V4.11 core checks: PASS.
- Database access/writes during certification: **0 / 0**.
- Wave9 isolated Neon overlap preflight is the next gate; no Wave9 import is authorized before that proof.

## Updated Next exact — post Wave8

1. Finish Wave9 isolated-Neon preflight against baseline **139,161**.
2. If zero URL/fingerprint/portal-identity overlap, bind approval to the exact Wave9 artifact.
3. Controlled atomic isolated-Neon Wave9 import.
4. Independent readback + ledger/canonical update.
5. Continue the new-source Common Crawl and Sarout-safe salvage lanes until at least **200,000**.


## Wave9 reconciliation gate — OPEN 2026-09-27

A later hardened Wave9 route certification superseded the earlier route candidate used by the first Wave9 route import.

Verified facts:

- Earlier filtered Wave9 route import: **2,240** rows, run `36335713081` — SUCCESS.
- Isolated Neon after that import: **141,401** properties / **141,401** sources.
- Hardened Wave9 certification: run `36334943106` — SUCCESS.
- Hardened artifact: `10937330001`.
- Hardened artifact digest: `sha256:31c5e6f5a02fef7733f37eede5e667f5a1f3c5e4b7f13e36af5cd81932d4175b`.
- Hardened JSONL SHA-256: `9baac42bc02b5f0820eac6709a3a3ec5b5e9c9cfea515a8135311fc5fdd56dd6`.
- Hardened route rows: **2,428**.
- Cross-artifact comparison: **2,176 identical URLs**, **64 imported-only URLs**, **252 hardened-only URLs**.
- Of the 64 imported-only rows, **63 portal identities are absent from the hardened candidate** and one shared identity (`mubawab.ma|8282268`) changes from a bad route-derived Casablanca representation to the hardened Marrakech representation.
- Read-only reconciliation preflight run `36335956059` proved all **64** targeted imported rows are currently present.
- A second post-removal simulation is required to determine the exact hardened additions that remain truly missing before any destructive correction.
- No destructive reconciliation has been authorized or executed yet.

Wave9 new-source lane:

- Common Crawl discovery: **1,582** structural URLs.
- Origin-safe certification run `36335996025` — SUCCESS.
- Origin-safe artifact: `10937202447`, digest `sha256:711526a027529879ed89ee86c8bcae802907212016a0a20312956d324384bf05`.
- Certified new-source rows: **1,287** = Fadlimmo 544 + Cap Al Rabat 503 + Bakimmo 137 + ImmoEssaouira 103.
- Previous import attempt `36335798193` rolled back before COMMIT because the prior artifact used an invalid `origin_type`; **0 new-source rows were committed**.
- The certifier now emits DB-valid `origin_type=legacy_import`.
- Exact-artifact Neon preflight is being rerun before any new-source import.

### Next exact

1. Finish hardened reconciliation post-removal simulation.
2. If exact, obtain explicit human approval for the destructive isolated-Neon correction of the **64** targeted Wave9-route rows.
3. Execute one atomic reconcile transaction and independent readback.
4. Re-run/bind the origin-safe 1,287-row new-source preflight against the reconciled baseline.
5. Controlled new-source import only if 0/0/0 overlap.
6. Continue recovery waves to >=200k.



## Wave9 hardened reconciliation — VERIFIED 2026-09-27

The 64-row Wave9 route correction is closed on isolated Neon.

- Explicit user authorization recorded before destructive correction.
- Fail-closed reconciliation preflight: run `36336317768` — SUCCESS.
- Preflight artifact: `10936349631`, digest `sha256:4e286bdaef855fd8ef38b2dc01886125a22b2ec7c9e4d38d8896b99fb29d1352`.
- Atomic reconciliation run: `36340131390` — SUCCESS.
- Reconciliation readback artifact: `10938009412`, digest `sha256:d9e8c2ab5814e057989a27b53ff89d984b6efeb877bc30446fb7e66762e586e6`.
- Mutation: exactly **64** obsolete Wave9-route rows removed and exactly **12** hardened missing rows inserted.
- Isolated Neon direct readback after COMMIT: **141,349** properties / **141,349** sources / **141,349** unique URLs / **141,349** unique fingerprints.
- Wave9 route rows after reconciliation: **2,188**.
- Wave9 new-source rows: **0** at this checkpoint.
- Orphans: **0**. Inactive: **0**. Property core gaps: **0**. Source core gaps: **0**.
- Production Neon writes: **false**. Vercel deployment: **false**.

Neon project usage check before reconciliation reported `data_transfer_bytes=0` for consumption period 2026-09-01 → 2026-10-01. The available project record did not expose a numeric data-transfer quota.

### Next exact after reconciliation

Re-run the exact 1,287-row origin-safe Wave9 new-source Neon preflight against baseline **141,349**. If 0 URL / 0 fingerprint / 0 source identity overlap, bind a fresh approval to that exact run/artifact, controlled-import into isolated Neon, then perform an independent readback before updating the cumulative ledger.


## Wave9 closeout — VERIFIED 2026-09-27

Wave9 is closed after hardened reconciliation and the origin-safe new-source import.

### Final Wave9 route lane
- Hardened reconciliation run: `36340131390` — SUCCESS.
- Readback artifact: `10938009412`, digest `sha256:d9e8c2ab5814e057989a27b53ff89d984b6efeb877bc30446fb7e66762e586e6`.
- Final Wave9 route rows in Neon: **2,188**.
- Exact correction applied: **64 obsolete rows removed + 12 hardened missing rows inserted**.

### Wave9 new-source lane
- Origin-safe certification run: `36335996025` — SUCCESS.
- Certified artifact: `10937202447`, digest `sha256:711526a027529879ed89ee86c8bcae802907212016a0a20312956d324384bf05`.
- Certified JSONL SHA-256: `3eb6f6faad6718694312e3ba468596c85553155a90313a8644a1070971c5e2a4`.
- Certified rows: **1,287** = Fadlimmo 544 + Cap Al Rabat 503 + Bakimmo 137 + ImmoEssaouira 103.
- Post-reconcile Neon preflight run: `36340880049` — SUCCESS.
- Preflight artifact: `10938862509`, digest `sha256:09d83602075aec2f75fedf842b50c50b090fb7a526c3ea3c99d9e6f824c729ab`.
- Exact preflight result: **1287 | 0 URL overlap | 0 fingerprint overlap | 0 identity overlap | 141349 | 141349**.
- Controlled import run: `36340984148` — SUCCESS.
- Import readback artifact: `10938608461`, digest `sha256:0c5299f970beb0ba36515dd6acb9e7ad8e33d9ce842383bb95d7feba194792e8`.
- Independent post-import readback run: `36341043736` — SUCCESS.
- Independent readback artifact: `10939031754`, digest `sha256:764cc22cf6c4c7a80eb00e1d525751b10c3b28b18ec98f4e3872fdc2251e5463`.

### Current authoritative isolated-Neon state
- property_listings: **142,636**
- listing_sources: **142,636**
- unique listing_url: **142,636**
- unique canonical_fingerprint: **142,636**
- V4.11 sources: **142,600**
- legacy sources: **36**
- Wave9 route: **2,188**
- Wave9 new sources: **1,287**
- orphans: **0**
- inactive: **0**
- property core gaps: **0**
- source core gaps: **0**
- progress to 200k: **71.318%**
- exact remaining delta: **57,364**

Current V4.11 ledger total is **142,600**. Wave9 contributed **3,475** net certified rows = 2,188 route + 1,287 new sources.

Neon usage was rechecked after the Wave9 mutations: project record still reports `data_transfer_bytes=0` for 2026-09-01 → 2026-10-01; available API does not expose a numeric egress quota in this project record.

### Next exact
Start Wave10 offline from the remaining strict rejects/new-source residue. Current known residue from the new-source route lane: **286** rows = 132 unsupported Archimmo + 91 core incomplete + 58 ambiguous transaction + 5 identity conflicts. Do not weaken V4.11; enrich or quarantine, then repeat certification → overlap preflight → approval → isolated import → independent readback.


## Wave10 closeout — VERIFIED 2026-09-27

Wave10 strict route residue is closed on isolated Neon.

- Source residue input: **286** rows from the Wave9 new-source rejected set.
- Offline strict certification run: `36341259465` — SUCCESS.
- Certification artifact: `10939012202`, digest `sha256:8c3f280cd02a1f2e45c3d06c4607ec54222491c7d409f7b28a29b6932f0bb3d2`.
- Certified strict rows before Neon filtering: **97**.
- Exact Neon overlap found: **1 identity** already present = `fadlimmo.com|d99515fb`.
- Filtered preflight run: `36341461469` — SUCCESS.
- Filtered artifact: `10938549384`, digest `sha256:c12000bbc52ab472a85c31bcc35ffbe62e0b4c8cdb36b7d6810cd06bd08c0ce4`.
- Filtered JSONL SHA-256: `99cc1c88ac17d10dc3ee0bbef58e86b399f563df5a96735848f6a00c13e30bbc`.
- Final preflight result: **96 | 0 URL overlap | 0 fingerprint overlap | 0 identity overlap | 142636 | 142636**.
- Controlled import run: `36341529713` — SUCCESS.
- Direct isolated-Neon readback after import: **142,732** properties / **142,732** sources / **142,732** unique URLs / **142,732** unique fingerprints.
- Wave10 rows: **96**.
- V4.11 rows: **142,696**.
- Legacy rows: **36**.
- Orphans: **0**. Inactive: **0**. Property core gaps: **0**. Source core gaps: **0**.
- Progress to 200k: **71.366%**.
- Exact remaining delta: **57,268**.

Independent Wave10 readback run: `36351412096` — SUCCESS. Independent readback artifact: `10942915388`, digest `sha256:efc9ac1a3e16a2569aa084109c9c66ff16e10a26f5c90570318e90e019798c07`. Direct Neon verification and independent workflow now both confirm the full invariant set.

### Next exact
Open Wave11 on the **188** strict rejects remaining after Wave10. Keep the 5 prior identity conflicts quarantined. Recover only deterministic evidence paths; no V4.11 weakening. Repeat offline certification → exact Neon overlap preflight → isolated import → independent readback.


## Wave12 major portals closeout — VERIFIED 2026-09-28

Wave12 is certified, overlap-filtered, imported into isolated Neon, and independently read back.

- Broad reservoir benchmark run: `36361501389` — SUCCESS.
- Raw reservoirs: Mubawab **32,774**, Agenz **7,885**.
- Strict certification run: `36407286352` — SUCCESS.
- Certification artifact: `10963070895`, digest `sha256:e0313d39975d4a37981f8ad86f7c7201172041b9007538d5fe11a9954408311d`.
- Certified JSONL SHA-256: `4927313e876a5365c6c216dca3cfd37f438a6eeee9809ed0cb520c1a00c448cc`.
- Strict candidates: **10,867** = Mubawab **5,923** + Agenz **4,944**.
- Initial isolated-Neon overlap preflight run: `36407464440` — SUCCESS.
- Exact initial preflight: **10,867 | 3,051 URL overlaps | 3,051 fingerprint overlaps | 2,276 identity overlaps | 142,732 | 142,732**.
- Exact overlap filter run: `36407892061` — SUCCESS.
- Filtered rows: **7,207** = Mubawab **3,668** + Agenz **3,539**.
- Filtered artifact: `10963776557`, digest `sha256:106b31519e95ddfeceafbe7a76434fbc67b8f2a86f8e8ee56d49fe1fc6c555bf`.
- Filtered JSONL SHA-256: `b905bde380a96522a3f1300b0db076208953e23fb08c49d33c97cc827abd606d`.
- Final zero-overlap preflight run: `36409402298` — SUCCESS.
- Final preflight result: **7,207 | 0 URL overlap | 0 fingerprint overlap | 0 identity overlap | 142,732 | 142,732**.
- Controlled isolated-Neon import run: `36414521010` — SUCCESS.
- Import readback artifact: `10966457646`, digest `sha256:2effc58173e1733ebe77feda1ccc819643020432da6deff2ba7522096eb0bc10`.
- Immediate readback: **149,939 | 149,939 | 149,939 | 149,939 | 7,207 | 0 | 0**.
- Independent post-import readback run: `36414643571` — SUCCESS.
- Independent readback artifact: `10966143073`, digest `sha256:fc4735fe16aa3408c7de498f624398ea14eaec136897dca16f259ba3e548d1ae`.
- Independent invariant result: **149,939 properties | 149,939 sources | 149,939 unique URLs | 149,939 unique fingerprints | Wave12 7,207 | orphan 0 | inactive 0 | property core gaps 0 | source core gaps 0**.
- Production Neon writes: **false**. Vercel deployment: **false**.
- Progress to 200k: **74.9695%**.
- Exact remaining delta: **50,061**.

### Next exact
Open Wave13 from the remaining broad-reservoir URLs already discovered (DarAgadir, Masaken, Avito, Mouldar, PromoImmoMarrakech, Sarouty), preserving strict deterministic route evidence. In parallel, inspect the rejected Mubawab/Agenz route families for a safe Wave12b salvage lane without source-page scraping.


## Wave13 strict multi-source closeout — VERIFIED 2026-09-28

Wave13 is certified, exact-overlap filtered, imported into isolated Neon, and independently read back.

- Raw immutable reservoir: **7,765** URLs = DarAgadir 1,962 + Masaken 1,631 + Avito 1,230 + Mouldar 1,112 + PromoImmoMarrakech 952 + Sarouty 878.
- Strict certification run: `36419048044` — SUCCESS.
- Certification artifact: `10968851094`, digest `sha256:101111b469f075812e4d1f7149aa9d7c79078c64d9168d456e3d2cb4564a0b2a`.
- Certified JSONL SHA-256: `ffbee63fefd6343cde056640758966c2d6751ff0aeac28df5ab15a7e894b103a`.
- Strict candidates: **2,968** = Masaken 1,237 + Mouldar 806 + PromoImmoMarrakech 822 + Avito 86 + Sarouty 17; DarAgadir 0 under strict rules.
- Initial Neon preflight run: `36421088963` — SUCCESS.
- Exact initial preflight: **2,968 | 1,005 URL overlaps | 1,005 fingerprint overlaps | 5 identity overlaps | 149,939 | 149,939**.
- Exact overlap filter run: `36424668309` — SUCCESS.
- Filtered rows: **1,961** = Masaken 1,067 + Mouldar 798 + Avito 79 + Sarouty 17.
- Filtered artifact: `10970967090`, digest `sha256:f6d53416b4d142478ccae36d966d582a3aa72abdc16b2ff581322993ec86c039`.
- Filtered JSONL SHA-256: `80eb719859d962001553be0baed150eb7f2772bcfbb497495066eaf928d4f0f9`.
- Final zero-overlap preflight run: `36428060742` — SUCCESS.
- Final preflight result: **1,961 | 0 URL overlap | 0 fingerprint overlap | 0 identity overlap | 149,939 | 149,939**.
- Controlled isolated-Neon import run: `36429593541` — SUCCESS.
- Immediate readback: **151,900 | 151,900 | 151,900 | 151,900 | 1,961 | 0 | 0**.
- Import readback artifact: `10972559931`, digest `sha256:2126fcf125e132cca695dc59be5966d31044d1ff7cba6d05960b61c3ac80c6c5`.
- Independent post-import readback run: `36429999380` — SUCCESS.
- Independent readback artifact: `10973042867`, digest `sha256:c2300d9c8566d5355a4c3dd6ce2c434e5213acaf416b5eec784eb9931ece176d`.
- Independent invariant result: **151,900 properties | 151,900 sources | 151,900 unique URLs | 151,900 unique fingerprints | Wave13 1,961 | orphan 0 | inactive 0 | property core gaps 0 | source core gaps 0**.
- Production Neon writes: **false**. Vercel deployment: **false**.
- Progress to 200k: **75.95%**.
- Exact remaining delta: **48,100**.

### Next exact
Open Wave14 on the rejected Mubawab/Agenz route families from Wave12, starting with immutable-artifact route classification only. Goal: recover deterministic detail-route variants without source-page scraping or weakening V4.11, then repeat certification → exact overlap → controlled isolated import → independent readback.
