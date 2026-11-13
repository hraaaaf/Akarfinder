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

## Security hardening review — 2026-11-12 (not production authorization)

**Scope:** code and offline-security review of the Draft #1203 GitHub-hosted variant. No AWS resources or GitHub environment protections have been provisioned by this review. No live H1 run, no merge, no Vercel deployment.

### Verified safeguards in Draft code

- The H1 PostgreSQL role is non-owner and SELECT-only (Neon Recovery SQL evidence), with 151,900 joined rows, 53,083 priority rows and **zero missing title/city/URL core identities**. Field precision, freshness and portability remain uncertified.
- Every S3 object HEAD/GET/PUT/LIST is now forced to the **expected bucket-owner account**; KMS ARN must belong to that account and region.
- Resume checkpoints now require every referenced S3 key to belong to the **same run ID and batch index**, with exactly one raw input and one aggregate report, unique keys and matching SHA-256 references. Cross-run, wrong-kind and modified-hash references fail closed.
- The OIDC session request is set to **21,600 seconds** (six hours) rather than 43,200 seconds. The AWS IAM role must have `MaxSessionDuration >= 21600` or assumption will fail before processing. Renewed runs get fresh OIDC credentials. The GitHub job itself has a six-hour timeout; do not promise completion within one attempt.

### Required AWS provisioning — NOT YET VERIFIED

Use dedicated infrastructure in AWS `eu-central-1`, **not** public GitHub artifacts. Fill placeholders out of band. Do **not** paste account IDs, credentials, complete database URLs, bucket inventory or private data into GitHub issue/PR/Notion.

1. Choose an AWS account and create an S3 bucket dedicated to the H1 evidence. Enable **Block Public Access (all four controls)**, bucket versioning, default customer-managed **SSE-KMS**, TLS-only requests, and no expiry/deletion lifecycle for this H1 prefix. Object versioning retains prior versions but **does not make evidence immutable**. If immutable archival is required, evaluate separate Object Lock/retention requirements; do not impose indefinite legal holds by default.
2. Create a customer-managed KMS key in `eu-central-1`. Its key policy must let only the designated IAM H1 role use `kms:GenerateDataKey` and `kms:Decrypt` via S3; an IAM permission by itself is insufficient if the KMS key policy denies it.
3. Configure the GitHub OIDC identity provider `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`. Create a dedicated IAM role with **MaxSessionDuration >= 21600**. Restrict its trust to the exact repo + environment **and** `main`. Confirm the effective trust via AWS IAM Access Analyzer. Example trust statement (replace account id):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {"StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:hraaaaf/Akarfinder:environment:q1e-neon-readonly",
      "token.actions.githubusercontent.com:ref": "refs/heads/main"
    }}
  }]
}
```
4. Grant that role only S3 ListBucket scoped to `akarfinder/h1/*`, PutObject/GetObject scoped to `arn:aws:s3:::<BUCKET>/akarfinder/h1/*`, and KMS data-key/decrypt on the one key. Do not grant S3 DeleteObject, PutBucketPolicy, PutBucketAcl, PutObjectAcl or wildcard bucket access. Example identity permissions (replace placeholders):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow", "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::<BUCKET>",
      "Condition": {"StringLike": {"s3:prefix": ["akarfinder/h1/*"]}}
    },
    {
      "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::<BUCKET>/akarfinder/h1/*"
    },
    {
      "Effect": "Allow", "Action": ["kms:GenerateDataKey", "kms:Decrypt"],
      "Resource": "<KMS_KEY_ARN>",
      "Condition": {"StringEquals": {"kms:ViaService": "s3.eu-central-1.amazonaws.com"}}
    }
  ]
}
```
Validate this sample with IAM Access Analyzer; resource and key policies may further restrict use. `HeadObject --checksum-mode ENABLED` on SSE-KMS encrypted objects can require both KMS permissions. Add bucket-policy enforcement of TLS and encryption after testing actual calls. The H1 job should not need `iam:*`, `kms:Create*`, `s3:Delete*`, or permission to change public access.

5. **Environment gate:** on GitHub `Settings → Environments → q1e-neon-readonly`, restrict deployment branches to `main`, disable administrator bypass, require a second authorized reviewer with **Prevent self-review** if permitted by the repo's plan, and audit who can edit workflows/environment. The environment was previously shown with **No restriction** and administrator bypass enabled; it is **not certified protected**. Repository is public per the connected GitHub repo metadata, so environment reviewer protections are available on supported plans.
6. Configure environment/repo variables `H1_PRIVATE_S3_BUCKET`, `H1_PRIVATE_S3_KMS_KEY_ARN`, `H1_PRIVATE_AWS_ROLE_ARN`, `H1_PRIVATE_AWS_ROLE_NAME`, `H1_PRIVATE_AWS_ACCOUNT_ID`; check that the environment secret `Q1E_NEON_RECOVERY_READONLY_URL` is present and uses the dedicated **direct non-pooler** `akar_h1_ci_readonly` Neon connection with `sslmode=require`. Never display its value in logs/screenshots.
7. **Network gate:** Neon project currently reports no configured allowed IPs and public access enabled, but outbound HTTPS/Postgres reachability from a GitHub-hosted Linux runner has **not** been tested. Verify TLS/connection using a *separate, bounded read-only preflight* before the full dispatch. Never solve connectivity problems by inserting `0.0.0.0/0` into a restrictive allowlist.
8. **Source consistency gate:** counts, ID high-water and uniqueness cannot prove content immutability between successive SQL connections or cross-run resumes. Protect the Recovery branch from writes by other workloads for the entire H1 job and all retries, or build a verifiable source-content fingerprint/snapshot mechanism first. Do **not** call the result a consistent PostgreSQL snapshot without that evidence.

### GO / NO-GO

**NO-GO until:** AWS S3 + KMS + IAM OIDC resources exist and policies are verified, GitHub environment restrictions/reviewer are in place, secrets/variables are verified without revealing values, Neon connection and read-only checks pass, the source-immutability risk is addressed, and the **exact current HEAD** has green CI. No merge or live dispatch is authorized by this security-review edit.

**Once all gates are evidenced**, review merge separately, then explicitly dispatch with `authorize_h1_readonly=true` from `main`. Automatic continuation after the first 1,000 is intentional. Treat any failed check as a stop; after recovery, use `resume_run_id` to replay S3 integrity checks before continuation. Verify 152 batches / 151,900 rows / zero parser errors and private final manifest SHA. Independent field accuracy and publishing remain separate certification work.

Primary references: [AWS OIDC trust](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html), [AWS role session duration](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-settings.html), [AWS HeadObject/KMS](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html), [GitHub environment protections](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
