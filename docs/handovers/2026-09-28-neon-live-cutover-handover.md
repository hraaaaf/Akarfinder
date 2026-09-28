# HANDOVER — AkarFinder / Neon live cutover — 2026-09-28

## Goal

Mettre en ligne le corpus certifié de **151 900 annonces** depuis Neon sur AkarFinder, sans toucher à Supabase pour l’instant.

Success observable:
- preview release sur Vercel = READY;
- `/api/stats` retourne `total_listings: 151900`;
- `/api/listings?limit=1` retourne au moins 1 annonce;
- logs runtime confirment `provider=neon`;
- ensuite promotion production, preuve live, merge PR #1103, closeout.

## Repo / PR

Repository: `hraaaaf/Akarfinder`

Release branch:
`release/neon-recovery-live-20260928`

HEAD:
`0c8c19fd93e06284b8fc02df16ad3dbf52b6743d`

PR:
`#1103 — feat(db): serve certified recovery corpus from Neon`

PR status at handover:
- open
- draft
- mergeable = true

Do NOT merge until preview/live proof is green.

## Certified Neon corpus

Neon project:
`ancient-violet-43534870`

Branch:
`br-cold-mouse-b2a50yaa`

Database:
`AkarFinder`

Certified state:
- properties: **151900**
- sources: **151900**
- unique URLs: **151900**
- unique fingerprints: **151900**
- orphans: **0**
- inactive: **0**
- property core gaps: **0**
- source core gaps: **0**

Wave13 independent readback:
- run: `36429999380` SUCCESS
- artifact: `10973042867`
- digest: `sha256:c2300d9c8566d5355a4c3dd6ce2c434e5213acaf416b5eec784eb9931ece176d`

## DB architecture

Current intended production architecture:

Primary:
`DATABASE_PROVIDER=neon`

Neon connection:
`DATABASE_URL=<real Neon PostgreSQL connection string>`

Supabase:
- intentionally untouched for now;
- not part of current priority;
- future backup work remains separate.

Code has support for an explicit backup provider, but do not activate/certify Supabase backup in this lot.

Important behavior fixed in PR #1103:
- provider failures are no longer silently converted to fake empty results;
- invalid provider config fails closed;
- SQLite remains local/dev when explicitly selected.

## CI proof

Release provider certification:
`36462562536` → **SUCCESS**

Verified:
- TypeScript ✅
- targeted DB/API tests ✅
- build ✅
- Neon smoke ✅

## Vercel

Project:
`akarfinder`

Project ID:
`prj_RCs2Ku5vex9cpABWnwaCjbuKrhhc`

Team ID:
`team_NNhXPDOIfjGNBcn253btpyk0`

Production URL:
`https://akarfinder.vercel.app`

### Current preview

Deployment:
`dpl_DgbWQGRaTnxNDZUGYPdHstpQrMJN`

URL:
`https://akarfinder-dj0adzs9j-achraf-benmoussa-s-projects.vercel.app`

Branch:
`release/neon-recovery-live-20260928`

State:
**READY**

### Current blocker

Preview sees Neon as provider:

`[db] role=primary provider=neon configured=true`

But the Vercel `DATABASE_URL` value is wrong.

Exact runtime error:

`Database connection string provided to neon() is not a valid URL. Connection string: DATABASE_URL`

This proves the Vercel variable value is literally:

`DATABASE_URL`

instead of the actual PostgreSQL connection string.

Observed preview results:
- `/api/stats` → HTTP 503, total_listings 0
- `/api/listings?limit=1` → HTTP 500, source `neon`

## Human action required

Open Neon:
`https://console.neon.tech`

Project:
`ancient-violet-43534870`

Branch:
`br-cold-mouse-b2a50yaa`

Database:
`AkarFinder`

Use **Connect** and copy the full PostgreSQL connection string.

Then in Vercel:
`https://vercel.com/achraf-benmoussa-s-projects/akarfinder/settings/environment-variables`

Edit:
`DATABASE_URL`

Replace the literal `DATABASE_URL` with the full Neon connection string.

Ensure scope includes **Preview**.

Do not paste the secret into ChatGPT.

Redeploy:
`release/neon-recovery-live-20260928`

## Next exact

1. User fixes `DATABASE_URL` in Vercel Preview.
2. Redeploy the release branch.
3. Verify new deployment = READY.
4. Verify `/api/stats` = **151900**.
5. Verify `/api/listings?limit=1` returns a real listing.
6. Check runtime logs for Neon errors.
7. If preview green, promote/deploy to production.
8. Verify `https://akarfinder.vercel.app/api/stats` = **151900**.
9. Smoke Search.
10. Merge PR #1103.
11. Post-merge verification.
12. Update canonical docs + Notion closeout.
13. Resume Wave14.

## Important non-priority

Supabase is NOT the priority now.

Known state:
- about 19.6k rows;
- Data API restricted by `exceed_db_size_quota`;
- do not spend time on Supabase until Neon is live and cutover is closed.

## Separate security follow-up

Supabase has RLS-disabled tables flagged by the connector:
- `source_public_index_owner_override_v1`
- `mubawab_public_minimal_index_v1`
- `minimal_live_search_documents_v1`

Do not auto-enable RLS without policy design. Handle as a separate security lot after Neon cutover.


## Execution update — 2026-09-28

The previous manual blocker is now superseded for the release preview.

- PR #1103 HEAD before preview-fix commit: `0bea4385cd612e0291f3bcd64813d9f89f95b091`.
- Temporary preview-only workflow added in commit `f1b85af89c3d1ac6a2365abb1670ff8dc9faef8f`.
- GitHub run `36475341286` → **SUCCESS**.
- The workflow used existing encrypted repository secrets and did not expose the Neon connection string.
- Vercel update scope: `target=["preview"]` and `gitBranch=release/neon-recovery-live-20260928`.
- Production was not modified and no production deployment was performed.
- This canonical-doc update intentionally creates a fresh branch commit after the env correction so the next Vercel preview is built with the corrected branch-specific Preview configuration.

Next exact:
1. Identify the fresh Vercel preview for this new HEAD.
2. Verify deployment = READY.
3. Verify `/api/stats` = **151900**.
4. Verify `/api/listings?limit=1` returns a real listing.
5. Inspect runtime logs for Neon errors.
6. Stop at the explicit production deployment gate.


## Execution update — explicit Preview deploy retry

- Preview env upsert run `36475341286` remains **SUCCESS**.
- OLD Preview BEFORE rechecked at 19:56 UTC:
  - `/api/stats` → HTTP 503, `total_listings=0`;
  - `/api/listings?limit=1` → HTTP 500, `source=neon`, 0 listing.
- Explicit Preview deploy run `36475600860` failed only at Vercel CLI project retrieval. Secret validation, Preview DATABASE_URL upsert and checkout were all SUCCESS.
- Exact CLI error: `Could not retrieve Project Settings`.
- Corrective commit: `acdc590a1595dbcc1d9129b047493f70dc58b83a`.
- Correction: explicit Vercel team + project scope; deployment command remains Preview-only and contains no `--prod`.
- Retry run: `36475737422` — queued at last observation.
- Production unchanged; no production deployment performed.

Next exact:
1. Read retry run `36475737422` once when necessary.
2. If green, identify the resulting Preview and verify READY.
3. Prove `/api/stats = 151900` and one real listing.
4. Inspect Preview runtime logs.
5. Stop at explicit production deployment authorization.


## Preview redeploy proof — 2026-09-28

- Preview configuration update: verified.
- New Vercel deployment: `dpl_7H5ifiFxH4wvyc4CqpvWCx8JL8Pi`.
- URL: `https://akarfinder-lkft0ooix-achraf-benmoussa-s-projects.vercel.app`.
- Deployment target: `null` = Preview.
- Source branch: `release/neon-recovery-live-20260928`.
- Source product commit: `0c8c19fd93e06284b8fc02df16ad3dbf52b6743d`.
- State at first direct check: `BUILDING`.
- Production deployment: none.

Next exact:
1. Check this deployment again only after independent work.
2. If READY, verify `/api/stats`, `/api/listings?limit=1`, and Preview runtime logs.
3. Stop before any production deployment and request explicit authorization.


## Runtime cutover diagnosis + policy-safe pagination fix — 2026-09-28

Fresh Neon readback on project `ancient-violet-43534870`, branch `br-cold-mouse-b2a50yaa`, DB `AkarFinder`:
- `property_listings = 151900`
- `listing_sources = 151900`
- unique fingerprints = `151900`
- unique listing URLs = `151900`
- inactive sources = `0`
- orphan sources = `0`

Preview `dpl_7H5ifiFxH4wvyc4CqpvWCx8JL8Pi` reached READY with corrected Preview DATABASE_URL:
- `/api/stats` → HTTP 200, `total_listings=151900`
- runtime logs → `provider=neon configured=true`
- unfiltered `/api/listings?limit=1` → HTTP 200 but `listings=[]`, `total=151900`

Root cause:
- Neon paginated raw recovery rows before the application publication guard.
- The first raw rows are recovery/legacy sources that are correctly rejected by the public guard.
- No first-party or partner-authorized source exists in the current 151900-row corpus.
- Recovery certification / existence evidence is NOT treated as publication authorization.
- Existing repository policy remains fail-closed.

Existing policy-compatible public subset:
- `36` rows have the already-approved persisted OpenSERP metadata contract:
  - provider/acquisition_provider = `openserp`
  - publication_lane = `external_web_result`
  - classification_lane = `individual_listing`
- source distribution: sarouty 14, mubawab 13, barnes-marrakech 8, mouldar 1
- required-field gaps among these 36 = 0
- PII-like rows under the current guard patterns = 0
- targeted Preview proof (`Marrakech + studio + rent`) returned real listing id `143` from Mouldar with `source_badge=external_web_result`, `primary_cta=view_original`, `production_allowed=true`.
- Therefore `PERSISTED_OPENSERP_LISTINGS_ENABLED` is active in Preview.

Policy-safe correction:
- `DbListingsQuery.public_search_only` is an internal server-side hint.
- Neon preselects only plausible public candidates:
  - existing OpenSERP metadata contract, OR
  - first-party / partner-authorized source names read from the canonical source registry.
- `canPublishDbRowToPublicSearchSurface` remains the final publication authority.
- No recovery status, domain suffix, robots result or technical certification is promoted into authorization.
- `/api/stats` remains full-corpus statistics.

Code commits:
- `ee40a6d2cc3842d4dc8b467bc1d77a93281a736a`
- `e289424f3ae1d119f3c35d66285ee76721b9967b`
- `446f2f8f5dd73df32540da601a086308234c79ac`

Exact-head Preview deployment workflow:
- final HEAD: `fdf768ed44d4e3bc4ea7f5f7c6ec38330fd337e5`
- workflow creates a Preview directly from `GITHUB_SHA` via Vercel REST `gitSource`
- request contains no production target
- response is required to resolve to Preview or the workflow fails
- run `36477643156` in progress at last observation

PR #1103 at this point:
- OPEN
- DRAFT
- mergeable
- exact HEAD `fdf768ed44d4e3bc4ea7f5f7c6ec38330fd337e5`

Next exact:
1. Let exact-head CI / Preview creation run while doing independent work.
2. Verify exact-head Preview deployment is READY and its Git SHA equals `fdf768ed...`.
3. Verify `/api/stats = 151900`.
4. Verify unfiltered `/api/listings?limit=1` returns >= 1 policy-compliant listing.
5. Verify runtime logs stay Neon with no provider errors.
6. Do NOT deploy production without explicit user authorization.
7. Before merge, remove/retire the temporary cutover workflow and recertify the final PR head.
