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
