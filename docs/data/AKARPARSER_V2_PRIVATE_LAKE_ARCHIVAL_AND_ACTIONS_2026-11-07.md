# AkarParser V2 Q1E — Private Lake, GitHub Actions, Neon admission only

## Decision (07/11/2026)

**GitHub Actions does the work, not the storage.** The raw 151,900 historical Neon Recovery rows live in a verified private archive, with a second copy on an **independent storage volume**. The GitHub Actions workflow orchestrates an isolated **self-hosted Windows runner**, colocated with this private lake. This avoids giving a GitHub-hosted PR or an external cloud account access to the historical listings. No owner Neon credentials, no PR secrets, no raw ZIP or JSON uploaded to GitHub, no Vercel.

**Neon product** is reserved for independently validated import-ready listings. Existing **Neon Recovery is a historical evidence source**, not the destination for new raw rows; leave it unchanged until the private archive is certified. The Q1E code **never imports into product Neon** and does not claim a single new certified observation. `ready_internal` from the parser is not admission to Neon. The separate promotion gate requires reviewer-authored, access-controlled evidence of rights, latest availability, deduplication and privacy. Its current output is **eligible for separate import review**, not permission to publish, nor an authenticated proof signature.

## Available evidence / blocking facts

- `neon_recovery_export_20261107.jsonl.gz` — reported location: `C:\Users\lenovo\Desktop\AkarFinder-DataMass-2026-11-07\` (not accessible inside GitHub-hosted Actions or this remote environment).
- Reported historical SHA-256 **`c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08`**, **151,900 JSONL rows**. Confirm these before copying. We do **not** recalculate or claim source integrity from GitHub now.
- Existing PR #1188 parser code has successful fixture and checked-in repo cohort regression; a **true 1,000-row Python run on the historical private export** has not been performed.
- The scripts and workflow can be committed and tested without needing private data. Activation depends on an authorized self-hosted Windows runner with access to a **second physical/logical volume**, private environment variables and workflow rules. Do not interpret a passing PR CI as a private data run.

## Implementation files

- `scripts/acquisition/akarparser_v2_private_archive.py`: validates the original SHA, gzip and exact row count; writes content-addressed immutable copies in pre-provisioned primary and replica roots on different volumes, verifies both copies and source; replays idempotently without rewriting anything. Requires both roots to exist. No network, no cloud DB.
- `scripts/acquisition/akarparser_v2_canary.py`: streams the verified historical source, selects 1,000 stratified records and generates 100 **unreviewed** private dossiers. JSON and dossiers never leave local runner folders.
- `scripts/acquisition/akarparser_v2_promotion_gate.py`: independently checks identity, Morocco, canonical parity, core fields, last observation, conflicting fields and **external attestation** of rights, availability, privacy, dedup and freshness; no import/write; approvals must be separately authenticated by a trusted workflow before any product use. `eligible_for_separate_import_review` ≠ ready for public search.
- `.github/workflows/akarparser-v2-private-windows-lake.yml`: manual-only on `main`, boolean explicit gate, protected environment `q1e-private-local`, runner `[self-hosted, windows, akarfinder-private-lake]`, source and destinations set via environment **variables**; fails closed if not present. No artifact upload or raw logs. No webhook/PR execution.

## Human-controlled setup for a private GitHub Actions runner

Register a dedicated self-hosted runner on the Windows workstation, scoped/restricted to trusted branches/workflows and isolated from untrusted PR jobs. Install Python 3.11+. On an environment `q1e-private-local`, allow only trusted `main` branch, require approval where supported, and set the variables:

- `Q1E_RAW_EXPORT_PATH`: exact local verified historical `.jsonl.gz` input path.
- `Q1E_ARCHIVE_PRIMARY`: pre-existing private directory on archive volume 1.
- `Q1E_ARCHIVE_REPLICA`: pre-existing private directory on separate archive volume 2 (not merely a second folder on the same volume).
- `Q1E_PRIVATE_RESULTS`: pre-existing private directory for canary output, outside repo checkout.

**Do not add raw source paths or credentials as public repo constants.** Exclude the working directories from the repo; restrict filesystem ACL to the dedicated runner identity. GitHub Actions code from PRs must never run on this runner. `workflow_dispatch` becomes available after this file is **reviewed and safely merged to main**, an independent gate. The user has not authorized merging in this lot. Never use a privileged Neon URL to shortcut the archive.

## Acceptance criteria

1. `SOURCE_SHA256_MISMATCH`, malformed gzip, count !=151900, a replay conflict, missing second volume => **refuse the archive**.
2. Two independent-volume immutable copies with matching SHA and count; source SHA unchanged; aggregate manifest only in private archive. No deletion of source branch or Windows input.
3. Windows Actions run processes exactly 1,000 **actual** historical JSONL source rows; 100 review dossiers **prepared**, `publication_allowed=0`, `new_detailed_observations_certified=0`, and the output stays private.
4. Manual independent annotations of at least 100 originals establish observed price/surface/type precision. Target >=98% on the defined annotated metrics, not automatically inferred by the code.
5. Only after evidence, legal permissions, verified availability, unique source identity, safe dedup and privacy: promotion gate can *prepare* a private import-candidate JSONL. A separate restricted Neon importer and post-import DB checks require explicit authorization. No current code is allowed to write Neon.

**Next exact:** review the PR code + tests; make the Windows runner and independent backup volume available; authorize a `main` workflow execution; inspect only the aggregate manifest. If archive verification fails, stop without changing the source and diagnose mismatch. Never publish personal data or claim new detailed observations from an archive or a candidate URL.
