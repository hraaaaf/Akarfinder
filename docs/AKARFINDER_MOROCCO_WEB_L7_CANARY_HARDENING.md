# AKARFINDER — Morocco Web L7 Production Canary Hardening

Status: CLOSED — production activation remains a human gate.

## Goal

Make the first bounded production canary fail-closed, auditable, delta-verifiable and rollback-safe before any production DB mutation.

## Certified implementation

- PR #986 squash-merged.
- Final PR HEAD: `06a61cdd3dba27e5d662049ca3548f2be8901527`.
- Dedicated workflow run `33633641989`: SUCCESS.
- Dedicated job `100258954104`: SUCCESS.
- All dedicated steps passed, including unit tests, zero-write dry-run and CLI dry-run-default certification.
- General PR workflows on the exact final HEAD: 8/8 SUCCESS.
- Evidence artifact: `9847830056`.
- Artifact digest: `sha256:51b3347b6347afb4012b68ee3e591e50ac31fffd9c990519dc550b0a2a2e4a80`.
- Squash merge/main commit: `0cf23db66b64457e912cf21bc8805470e16e4602`.
- Merge commit verification: signed and valid (`verification.reason=valid`).
- Exact merge parent: `775e407bdf0368d3a0063e492720b9472d0f0876`.

## Safety guarantees added

- live writes require `THIRD_PARTY_DB_INGESTION_ENABLED=true`;
- `DATABASE_PROVIDER=supabase` and service-role credentials are required;
- a non-empty exact `THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS` allowlist is mandatory and rechecked at apply time;
- hard batch cap remains 100; production canary target is <=3;
- preflight and postflight exact identity snapshots are supported;
- HTTP 409 is an idempotent duplicate no-op;
- non-409 HTTP errors are fatal;
- exact inserted and duplicate identities are retained;
- partial success followed by a fatal error retains the exact already-inserted identities for evidence/rollback;
- live rollback candidates are only newly inserted identities;
- CLI is dry-run by default and requires explicit `--apply` for live staging writes;
- expected DB delta must match inserted identities.

## Production state

No production DB write was performed during implementation, certification, PR review or merge.
No Vercel deployment was performed.

## First canary candidate set

Fresh public-web verification on 2026-09-02 confirmed these three Leaderimmo listing pages remain discoverable with listing data visible:

1. `https://www.leaderimmo.ma/biens/10/appartement-a-vendre-a-temara-`
2. `https://www.leaderimmo.ma/biens/39/appartement-a-vendre-a-temara-centre-ville-`
3. `https://www.leaderimmo.ma/biens/59/appartement-a-vendre-a-harhoura-temara`

Proposed live allowlist: `www.leaderimmo.ma`.

These URLs are only the bounded canary input. Production mutation is not authorized by this document and remains an explicit human gate.

## Next exact

After explicit human authorization: snapshot before -> apply <=3 rows to `discovery_candidates` -> snapshot after -> prove exact delta -> retain rollback identities -> stop and assess before any scale-up.
