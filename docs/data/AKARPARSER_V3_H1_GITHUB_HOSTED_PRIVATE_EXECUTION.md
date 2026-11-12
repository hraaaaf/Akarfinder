# AkarParser V3 H1 — GitHub-hosted private recovery

Date: 2026-11-12  
Scope: implementation variant for Draft PR #1203; **not live-dispatched, not merged, and not deployed**.

## Goal and current boundary

Run the fixed 151,900-row Neon Recovery input on GitHub-hosted Linux without a Windows runner. The workflow keeps `Q1E_NEON_RECOVERY_READONLY_URL` scoped to the protected `q1e-neon-readonly` environment and consumes only the pinned V3 code at `3eb2b8a7b7ec78832e764e014b387eabd5e74058`.

The first batch is the 1,000-row canary. The exact arithmetic is **152 batches total**: 1 canary + **151** remaining batches, including a final batch of 900 rows. “152 remaining after the canary” would process 1,100 extra rows and is not used. The global input order is the source table's ascending `property_listings.id` keyset, rather than the earlier priority-first cohorts. The snapshot must still match 151,900 joined rows, 53,083 priority rows and 98,817 remaining rows.

The canary parser report must have exactly 1,000 inputs, zero errors, zero database writes, zero network requests, no Neon admission authorization and no claim of verified reuse rights. Only then does the same job continue serially through the rest. The data remain historical; `ready_internal` does not mean admissible to Neon or publishable.

## Flow and restart behavior

1. A manual workflow dispatch is accepted only on `main`, from actor `hraaaaf`, with `authorize_h1_readonly=true`. The job also waits for the protected GitHub environment approval.
2. Ubuntu 24.04 checks Linux, `psql`, Python and AWS CLI. The pinned V3 helper verifies TLS, the expected Neon Recovery endpoint/database, a non-owner role, PostgreSQL `transaction_read_only`, and the absence of write/schema-create privileges.
3. A bounded snapshot checks expected counts and unique ID/source URL linkage. Each page uses ascending ID keyset pagination and contains at most 1,000 rows.
4. One batch of parser inputs and outputs is written at a time to a private runner temporary directory outside the checkout, then removed after successful private upload. Nothing is emitted as a GitHub artifact or cache. The only stdout is generic status/count/checkpoint lines; SQL and AWS output are captured and suppressed.
5. Each batch's gzip JSONL input, parser outputs, and aggregate report are uploaded to the private S3 prefix. A checkpoint is updated only after every object has been uploaded and verified. The checkpoint records object key, byte size, SHA-256, source ID range, status counts and safety flags.
6. If the job is interrupted, dispatch again with `resume_run_id` equal to the original Actions run ID. The runner rechecks snapshot compatibility, every referenced remote checksum and each aggregate safety report, then starts after the last committed batch. Unreferenced objects from an interrupted in-flight batch may be overwritten on retry; S3 versioning preserves prior object versions.
7. The final manifest is written after all 152 batches pass exact count, ordering, range, safety and checksum checks. The workflow prints only the final manifest SHA-256, not its content.

## Private storage requirements — not provisioned

This implementation selects a private S3 bucket in `eu-central-1` with:

- Block Public Access enabled, versioning enabled, default SSE-KMS encryption using the configured customer-managed key, and no expiration/deletion lifecycle for H1 evidence.
- GitHub OIDC federation; no static AWS access key. The IAM role trust policy must restrict the OIDC `aud` to `sts.amazonaws.com`, repository subject to `repo:hraaaaf/Akarfinder:environment:q1e-neon-readonly`, and additionally the approved workflow identity where AWS policy supports it.
- A dedicated role limited to the bucket prefix `akarfinder/h1/*`: `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` only with the matching prefix condition, and only the KMS data-key/encryption permissions required for that bucket/key. No delete, ACL, bucket-policy, key-policy or public-access changes.
- The GitHub environment `q1e-neon-readonly` configured with required reviewer(s), deployment branch restriction to `main`, and no self-approval/bypass. These environment settings must be independently reviewed before any dispatch.
- GitHub repository/environment variables: `H1_PRIVATE_S3_BUCKET`, `H1_PRIVATE_S3_KMS_KEY_ARN`, `H1_PRIVATE_AWS_ROLE_ARN`, `H1_PRIVATE_AWS_ROLE_NAME`, `H1_PRIVATE_AWS_ACCOUNT_ID`. The existing database credential is read from secret `Q1E_NEON_RECOVERY_READONLY_URL`; its value is never read into this report.

The GitHub-hosted runner has dynamic outbound IPs. This change does not broaden Neon IP allowlists or bypass network controls. Before any live run, security review must confirm the approved access route to Neon is compatible with GitHub-hosted egress; do not add a broad allowlist as an implicit workaround. Also confirm the Recovery branch is stable for the duration of a run and across retries: the checks validate counts, high-water ID and key uniqueness, but they cannot provide one PostgreSQL repeatable-read snapshot across separate GitHub-hosted job attempts.

## Workflow gates and non-actions

- Pull request runs only offline contract tests. It has no Neon secret and requests no OIDC token.
- Live recovery is manual-only and explicitly gated. `workflow_dispatch` is available from the repository's default branch, so this PR's variant cannot be live-run until reviewed and merged. No dispatch has been made.
- The implementation performs no Neon/Supabase write, restore, import, publication, Vercel action, Actions artifact upload, or repository data commit.
- No live credentials, database rows, URLs, titles, descriptions, contact details or parser output are stored in GitHub, logs or Notion.

## Verification performed for this variant

Local offline verification in the isolated worktree based on PR #1203 HEAD `1eb1978ce8fd3de175231c92d67afa48d465f1e0`:

- `python -m unittest discover -s scripts/ci/__tests__ -p test_h1_github_hosted_private.py -v`: 9/9 PASS, including the actual pinned V3 parser on synthetic rows, batch math, global ID pagination, canary-gated continuation, idempotent resume, tamper detection, and read-only/report gates.
- `python -m py_compile scripts/ci/h1_github_hosted_private.py scripts/ci/__tests__/test_h1_github_hosted_private.py`: PASS.
- `git diff --check`: PASS.
- `actionlint .github/workflows/akarparser-v3-h1-private-historical.yml`: PASS.
- No Neon, S3, GitHub Actions live run, merge, or deployment was performed. The AWS bucket/role, environment protection, repository variables, Neon secret availability and hosted-runner egress are not verified/provisioned here.

## Next review sequence

1. Review workflow, OIDC subject restrictions, IAM/S3/KMS policy and bucket retention/privacy settings.
2. Confirm the environment reviewer policy and the supported secure network path to the Neon Recovery branch.
3. Provision the private storage resources and non-secret repository/environment variables; verify the Neon secret exists without exposing its value.
4. Merge only after the security review and required CI. A separate explicit operator action is still required for the gated live dispatch. Do not merge or dispatch as part of this preparation task.
