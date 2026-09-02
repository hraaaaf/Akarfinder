# AKARFINDER — Morocco Web L7 Production Canary Hardening

Status: CLOSED — first bounded production canary CERTIFIED.

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

## First production canary — CERTIFIED

Explicit human authorization was received on 2026-09-02 for a maximum of 3 production staging writes.

Target project:
- Supabase project `AqarFinder` / `kusfiyimwvxblvsrhaes`.
- Table: `public.discovery_candidates` only.
- Provider: `leaderimmo`.
- Exact source host: `www.leaderimmo.ma`.
- Query hash: `cc94dbf542ae6a86ef92139b028df87d70b76672ef1c6efdcfd8f4aacc3323ba`.

Candidate identities:
1. `https://www.leaderimmo.ma/biens/10/appartement-a-vendre-a-temara-`
2. `https://www.leaderimmo.ma/biens/39/appartement-a-vendre-a-temara-centre-ville-`
3. `https://www.leaderimmo.ma/biens/59/appartement-a-vendre-a-harhoura-temara`

Before snapshot:
- matching rows: **0/3**.

Apply result at `2026-09-02 15:11:05.352158+00`:
- inserted: **3**;
- duplicates: **0**;
- failures: **0**.

Inserted IDs:
- `fcaa455c-97c0-4ddc-b9ff-f0a290a1fa2a`
- `fb6d6004-82e4-4550-bd2e-a18714a5bbe2`
- `e6214f7b-e915-4965-aa79-9a95a1c1843f`

After snapshot:
- matching rows: **3/3**;
- all three remain `discovery_status='discovered'`;
- source domain/source URL/canonical URL match the intended public Leaderimmo identities;
- metadata marks `ingestion=l7-production-canary` and `source=public-web`.

Exact DB delta:
- expected: **+3**;
- observed: **+3**;
- mismatch: **0**.

Rollback decision:
- no anomaly observed;
- rollback not executed;
- rollback scope, if needed, is limited to the three inserted UUIDs above.

No canonical `listings` publication occurred. No Vercel deployment occurred.

## Boundary

This canary certifies bounded production staging mutation into `discovery_candidates`. It does not certify bulk ingestion, promotion into canonical serving, or visible search-volume growth.

## Next exact

Proceed to L8 Scale + Coverage Certification with staged gates, beginning with a bounded 10k-candidate plan and dry-run/measurement before any larger production mutation.
