# AkarFinder — Canonical Baseline

Updated: 2026-07-23

This document defines baseline governance. It deliberately avoids freezing a transient commit SHA as eternal truth.

## 1. Canonical Git branch

`main` is the canonical integration branch.

Historical reconciliation branches and old `fix/*`, `feat/*` or `poc/*` lineages are not independent sources of truth once their intended changes have been merged into `main`.

Workflows and agents must not hardcode an obsolete historical branch as the canonical runtime reference.

## 2. Code, database and Production are separate states

Never collapse these into one claim:

- code merged to `main`;
- migration present in the repository;
- migration applied to Supabase;
- Production data reconciled;
- feature flags enabled;
- Production deployment performed;
- live UX verified.

Each requires its own evidence.

## 3. Release doctrine

Current repository policy treats Vercel Production deployment as a deliberate phase-completion gate, not automatic per-commit CI.

Development and PR validation use GitHub CI.

A Production release requires:

1. final intended `main` commit identified;
2. canonical CI green;
3. migrations/data plan verified where applicable;
4. explicit release approval;
5. deliberate Production deployment;
6. post-deploy smoke/visual verification.

Do not infer current Production commit from the latest Git commit.

## 4. Workflow governance

The actual `.github/workflows/` files and their regression tests are the source of truth for current schedules and triggers.

Documentation must not hardcode an old cadence as a permanent invariant when acquisition architecture evolves.

Permanent workflow principles:

- bounded execution;
- least privilege;
- explicit write gates;
- no secret leakage;
- no source-governance bypass;
- no hidden second producer for the same canonical write path without an explicit architecture decision;
- diagnostic workflows must not silently become Production writers.

## 5. Database baseline

`supabase/migrations/` plus verified live schema/migration state define the database baseline.

Never blindly replay an old migration because an historical document says it was pending or applied.

Check the connected Production project first.

## 6. Data baseline

Historical counts in audits are evidence from a moment in time, not current inventory.

For current claims, measure the live database and acquisition state.

Distinguish at minimum:

- discovery candidates;
- seeds;
- structured property listings;
- source offers;
- property clusters;
- public/search-eligible results.

These counts are not interchangeable.

## 7. Required baseline checks before major work

- Confirm target repository and branch.
- Confirm clean/intended working state.
- Inspect relevant recent commits/PRs.
- Read canonical docs and domain contract.
- Identify affected migrations and feature flags.
- Run relevant tests/typecheck/build.
- Verify Production separately when the task depends on live behavior.

## 8. Documentation baseline

Canonical reading order:

1. `README.md`
2. `MASTER_CONTEXT.md`
3. `CURRENT_STATE.md`
4. `ROADMAP.md`
5. relevant domain contract
6. code/live evidence

Historical mission reports cannot override this baseline merely because they contain an older status label such as `PENDING`, `NOT ACTIVATED` or `NOT YET MERGED`.
