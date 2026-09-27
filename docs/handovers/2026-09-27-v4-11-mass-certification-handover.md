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
