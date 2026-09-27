# AkarFinder — V4.11 certified import wave 2 — 2026-09-27

## Goal

Import only rows that are verified before database entry, while verification continues for the unresolved corpus.

## Human decision

User instruction: `On balance les certifiés et on vérifie les non certifiés`.

This authorizes isolated-Neon import only for rows that pass the full wave-2 certification gate below. It does not authorize production Neon promotion or Vercel deployment.

## Input ledger

Reconciled pre-DB artifact:
- artifact: 10927761643
- artifact digest: sha256:e549dddcc5e8f4d47b82af81096cfd5f2e46caa1c2757cd068bc7bc6fcc0e01f
- remaining V4.11 rows: 213,992
- existence-verified in ledger: 163,247
- unresolved existence: 50,745
- core4-ready pre-identity: 17,238

Additional Agenz recent Common Crawl evidence adds 871 new existence matches after that ledger; this belongs to later verification waves and is not silently added to wave 2.

## Strict wave-2 gate

A row qualifies only if all are true:
1. strong existence/freshness evidence:
   - direct HTTP200; or
   - recent official sitemap; or
   - recent Common Crawl presence; or
   - recent active listing_source evidence; or
   - thin freshness state = fresh_confirmed and recent.
2. title present and at least 12 characters.
3. city present and deterministically normalized.
4. supported property taxonomy.
5. transaction_type is sale or rent.
6. contradiction flags are empty (already enforced by the input ledger).
7. conservative cross-source identity gate passes.

Internal `minimal_live_recent` or `representation_recent` evidence alone is not enough for DB readiness.

## Expected gate counts

From the 17,238 pre-identity rows:
- strong-evidence rows: 13,517
- weak-evidence rows retained outside DB: 3,721
- after title/taxonomy gate: 13,476
- unsupported/unknown property type among strong-evidence rows: 1
- weak title among strong-evidence rows: 40
- cross-source ambiguous identity groups: 26
- identity-quarantine rows: 55
- strict DB-ready wave 2: 13,421

Deterministic type normalization:
- office_commercial → office
- farm → land
- unknown → rejected

## Import target

Isolated Neon only:
- project: ancient-violet-43534870
- branch: br-cold-mouse-b2a50yaa
- database: AkarFinder

Pre-wave2 baseline to recheck immediately before import:
- property_listings: 8,544
- listing_sources: 8,544
- V4.11 wave1 sources: 8,367

## Import behavior

Prepared workflow:
`.github/workflows/recovery-v4-11-controlled-neon-import-wave2.yml`

It:
- requires the exact certified artifact ID + JSONL SHA in an approval payload;
- hard-pins the isolated Neon endpoint;
- verifies physical row count and SHA;
- stages candidates in a temp table;
- excludes URLs/fingerprints already present before insert;
- inserts property + source records transactionally;
- asserts source/property presence before commit;
- performs readback after commit.

No raw-listings staging is used.

## Parallel verification

Non-certified rows continue through read-only source-specific verification:
- Mubawab direct pilot: robots denied; use external evidence only.
- Agenz direct pilot: robots denied; use external evidence only.
- Avito, Domio, PromoImmoMarrakech direct pilots: in progress at time of this plan.
- recent Common Crawl evidence already added 871 new Agenz matches; Avito recent-CC added 0.

## Safety

- No production Neon write.
- No Vercel deployment.
- No force-fetch against robots denial.
- Transient HTTP failures never imply expiry.
- Rows failing wave2 remain in verification/quarantine, not deleted.

## Next exact

1. obtain deterministic wave2 artifact for exactly 13,421 rows;
2. record artifact ID/digest/JSONL SHA;
3. create the already-authorized isolated-import approval payload;
4. import transactionally;
5. independently read back DB counts/integrity;
6. continue verification of unresolved rows into wave 3+.
