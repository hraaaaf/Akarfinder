# CI execution policy — AkarFinder
Adopted 2026-10-27. Applies prospectively to changed workflows, with a staged review of legacy files.

## Before merge — cheap, scoped, actionable
- Only quick unit/contract, lint, type, security and policy gates necessary to prevent unsafe changes.
- Use `pull_request.paths` scoped to **actual** source/test/workflow dependencies. Never use a last-commit-only scope gate to hide a workflow change.
- Set top-level `concurrency.group` to workflow + PR number/ref with `cancel-in-progress: true`; superseded PR runs may cancel.
- Keep required branch-protection checks and critical security/data-integrity checks. Do not remove a required check without verifying the ruleset.
- Exceptions to the fast-only policy require documented justification and human approval.

## After merge — heavy, main only
- Full `npm run build`, broad test suites, Chromium/Playwright, multi-viewport screenshots, benchmark and exhaustive certifications must run on `push` to `main` with targeted `paths`.
- Optional `workflow_dispatch` for heavy jobs must have a job-level `if: github.ref == 'refs/heads/main'`. Dispatch on a feature branch must skip the job.
- Heavy read-only tasks may cancel older same-workflow main runs. Production/DB writers require independent idempotency and non-overlap safety; never indiscriminately cancel an in-flight mutation.
- An AFTER failure is a real failure: stop promotion, diagnose and fix in a follow-up PR. Post-merge is not equivalent to safe production.
- No Vercel deployment, database mutation, or merge is authorized by this policy.

## Guardrails and rollout
- `.github/workflows/ci-workflow-efficiency-policy.yml` runs unit tests and scans the **complete base...HEAD PR diff**, rather than `HEAD^ HEAD`.
- `scripts/ci/validate-workflow-efficiency.mjs` prevents newly changed heavy PR workflows, missing PR paths/concurrency and unguarded heavy dispatch runs.
- Existing 539 workflows (inventory on 2026-10-27) are **not all certified compliant**; migrate high-cost workflows with individual reviews, preserving branch protection and active data pipelines. Avoid bulk blind edits.
- Root README is deliberately unchanged in this PR: many legacy gates still subscribe to README-only edits, causing avoidable CI fanout. The canonical policy, engineering governance document and Notion Command Center are updated; scope-cleanup is staged.
- First conversion: `search-ux-fast-1.yml` (PR quick contracts/types) + `search-ux-fast-1-after.yml` (main-only Chromium/build).
- Tests: `node --test scripts/ci/validate-workflow-efficiency.test.mjs`. CI execution proof and AFTER runs still required before declaring rollout complete.

## Success evidence
A PR touching Search UX runs fast checks but no Chromium/build; the subsequent merge on main triggers the scoped AFTER job. Manual dispatch on other refs skips heavy certification. CI policy rejects regression examples in unit tests.
