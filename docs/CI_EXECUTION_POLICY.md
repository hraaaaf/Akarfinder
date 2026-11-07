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
- Initial inventory: **539 workflows** before #1114; current `.github/workflows` inventory: **549 files** after adding 10 AFTER workflows (2026-10-27). The existing legacy inventory is **not universally certified compliant**; migrate high-cost workflows with individual reviews, preserving branch protection and active data pipelines. Avoid bulk blind edits.
- Root README is deliberately unchanged in this PR: many legacy gates still subscribe to README-only edits, causing avoidable CI fanout. The canonical policy, engineering governance document and Notion Command Center are updated; scope-cleanup is staged.
- Additional conversions: eight Search visual workflows, plus main-only canonical regression / UX / Phase 1 sweeps and an AFTER compile build. Canonical compile PR retains TypeScript only.
- First conversion: `search-ux-fast-1.yml` (PR quick contracts/types) + `search-ux-fast-1-after.yml` (main-only Chromium/build).
- Tests: `node --test scripts/ci/validate-workflow-efficiency.test.mjs`. Evidence for the converted workflows and AFTER is recorded below; remaining legacy conversions and independent product-quality certification are not complete.

## Success evidence
A PR touching Search UX runs fast checks but no Chromium/build; the subsequent merge on main triggers the scoped AFTER job. Manual dispatch on other refs skips heavy certification. CI policy rejects regression examples in unit tests.

## Post-merge evidence and scope — 2026-10-27

- PR [#1114](https://github.com/hraaaaf/Akarfinder/pull/1114) merged to `main` at `054357d6fda599d5f99ed14c1f4e397e49d4ecc4`. PR checks at head `61bd46d...`: **12/12 SUCCESS**, including Product Constitution Gate and CI Workflow Efficiency Policy. The triggered-workflow count for two PR heads fell from 25 to 12 (**52% fewer workflows**, not verified runtime/cost savings).
- The merge triggered **17 AFTER workflows** on `main`. Their first execution ended **16 SUCCESS, 1 FAILURE**: [Search Desktop Split 40503709423](https://github.com/hraaaaf/Akarfinder/actions/runs/40503709423). No failure was ignored.
- PR [#1115](https://github.com/hraaaaf/Akarfinder/pull/1115) added screenshot capture and geometry logging **before** assertions (head `d2249019...`, merge `38b5b10a...`). [Diagnostic AFTER 40504850007](https://github.com/hraaaaf/Akarfinder/actions/runs/40504850007) reproduced the failure at 360×800: `layoutDisplay=flex`, `mapTop=255`, `listTop=662`. It saved the proof artifact `12735680391`.
- Cross-check of `app/search/mockup-convergence-l2.css` and `app/search/p4-map-shell.css` confirmed **P4 deliberately uses mobile/tablet map-first** and desktop map-dominant 3fr/2fr. The legacy visual test expected list-first and an obsolete ≥45% desktop results rail.
- PR [#1116](https://github.com/hraaaaf/Akarfinder/pull/1116) corrected **only the Playwright and static test contracts**, preserving overflow, price visibility, three-mode transitions and secondary-map checks. It passed **4/4 PR workflows** and was merged at **`7a8f0f415f1b4f96b6518f3c29ca4199f2b599e6`**.
- At exact final product/test HEAD `7a8f0f4`, **4/4 scoped AFTER workflows SUCCESS**: [Search Desktop Split 40509940426](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940426), [Search Post Results 40509940677](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940677), [Canonical Baseline Validation 40509940462](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940462), [Canonical Compile AFTER 40509940412](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940412).
- [Artifact `12737332902`](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940426/artifacts/12737332902) contains five actual screenshots (360×800, 390×844, 768×900, 1280×900, 1440×900), `metrics.json` with `failure:null`, **map-first at all three compact widths**, **side-by-side at both desktop widths**, **no horizontal overflow, no price truncation and zero secondary map blocks in split mode**.
- **Visual-proof limitation:** the screenshot at **360px** captured a blank/unrendered basemap while the other four show tiles. Structural CI certification passed, but this does **not** certify visual readiness/tile loading at 360px or a 10/10 design. Investigate screenshot readiness in a separate, bounded read-only visual QA lot before claiming pixel-perfect map coverage.
- Vercel check after #1116: latest production deployment remained `dpl_DfKCASA5VYcbKErJNfsJDNJxxo2w` on prior `main` HEAD `32a0a076...`; no new deployment observed. **No Vercel deploy or DB mutation initiated.** Git merge and AFTER tests are not production authorization.

**Gate verdict:** the **converted CI execution policy and fixed P4 responsive test contract have the evidence above**; neither all 549 workflows nor all product visuals are certified. For a single exact-HEAD replay of the 17 initial AFTER jobs, a separate explicit benchmark/replay is needed; the 4 scoped runs on the final HEAD are the actual validation of the changed contract.

**Next independent lot:** review the legacy DATA/Neon/Supabase workflows with sensitive credentials, classify read-only vs writes/production, and split costly PR builds without turning manual writes into automatic main pushes. Existing `data-4-3g`, `data-4-3h`, `data-4-5b` and `typesense-odm-shadow-incremental-sync-v1` are concrete examples of heavy PR jobs that still need staged remediation.

## Follow-up gates — MapLibre screenshots and DATA phase-2 (2026-10-27)

**Map screenshot evidence, issue #1118 closed.**
- [PR #1120](https://github.com/hraaaaf/Akarfinder/pull/1120) merged as `a0591eefa53bd1595bb9a2f4d66bc5fc26918007`. Its lightweight visual-readiness marker does not change visible UI: MapLibre must reach `idle`, complete style/tiles and expose at least one rendered styled feature before the screenshot gate proceeds.
- [Exact-HEAD AFTER 40523907085](https://github.com/hraaaaf/Akarfinder/actions/runs/40523907085) **SUCCESS**, [artifact 12743865510](https://github.com/hraaaaf/Akarfinder/actions/runs/40523907085/artifacts/12743865510) verified: **5/5 viewports 360/390/768/1280/1440** have `map_visual_ready:true`, `failure:null`, no horizontal overflow/truncated prices. The original 360 screenshot from 40509940426 had a blank basemap; the new 360 screenshot visibly shows Moroccan basemap tiles. The bounded 25-second gate captures an error screenshot and fails when no real map is ready. This is screenshot-readiness proof, **not** an aesthetic score or proof of universal external tile reliability.

**DATA phase-2 first read-only slice, issue #1119 open.**
- [PR #1121](https://github.com/hraaaaf/Akarfinder/pull/1121) merged as `e32618462d099da4da0413cc5937d20a4a9ccb89`, with **4/4 PR checks SUCCESS**. Typesense unit/type/isolation contracts stay scoped to PR; the build runs only on `main` AFTER, with no production secrets or write steps. MASS-X1 read-only PR has top-level per-PR cancellation.
- [Exact-HEAD Typesense AFTER 40524923722](https://github.com/hraaaaf/Akarfinder/actions/runs/40524923722) **SUCCESS**. Eight selected workflows had deep review. A further **107 of 107 name-filtered DATA/Neon/ingestion candidates** had a static YAML trigger/concurrency/secret/heavy-keyword scan: **not** an in-depth source audit or full inventory certification. See [risk audit](ci/DATA_WORKFLOW_PHASE2_AUDIT.md). Risky DATA/Neon writers, cron and schedules remained untouched.
- No Vercel deployment or database writing command was performed. After both merges, Vercel last observed the prior production deployment `dpl_DfKCASA5VYcbKErJNfsJDNJxxo2w` at old HEAD `32a0a076...`. GitHub merge does not grant production deployment authorization.

**Remaining:** #1119 risk review of sensitive pipelines and all untouched legacy workflows; do not state all 549 workflows compliant. Separate full all-pages visual suites on the #1120 merge run are tracked independently, not conflated with the five-viewport Search MapLibre gate.

## DATA coverage build split — second safe slice (2026-10-29)

- [PR #1123](https://github.com/hraaaaf/Akarfinder/pull/1123) merged on `main` at `04514897f37c1a6eb7fdd862e8edbc65f54cfc8a`, after **four PR checks SUCCESS**. This PR touched only three DATA coverage workflows. The source audit showed local inputs and local reports with no DB credential or production write path in those workflows.
- `data-coverage-gap-auditor-gate.yml` now runs quick contract tests with per-PR cancellation. The heavy `npm run build` moved to the targeted main-only `data-coverage-gap-auditor-after.yml`, with a main-ref guard, read-only permissions and independent concurrency. `data-coverage-mubawab-baseline.yml` gained per-PR cancellation without modifying the report job.
- Exact-main-head [AFTER 40969065083](https://github.com/hraaaaf/Akarfinder/actions/runs/40969065083) was triggered. It **completed SUCCESS** on the exact merge SHA; this certifies the scoped read-only production compilation. This does not grant Vercel deployment authorization or validate all legacy workflows.
- [DATA phase-2 audit](ci/DATA_WORKFLOW_PHASE2_AUDIT.md) and [issue #1119](https://github.com/hraaaaf/Akarfinder/issues/1119) track the remaining protected write and credential workflows. Do not automatically dispatch production writers, revive schedules, or cancel in-flight mutations.

## Privileged DATA job isolation — 2026-10-29

- **PR secret boundary:** credentialed live-job steps must not execute on `pull_request`, `push`, or feature-branch dispatch. For risk-reviewed GET-only DATA audits, the approved pattern is an explicit `if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'` on the live job with `needs: contract`; PR contract stays focused on synthetic unit/regression, TypeScript and static safety checks. Use per-PR cancellation but **never cancel a manual main run automatically**.
- **Build placement:** read-only `npm run build` is moved from relevant PR jobs to `push main` path-scoped AFTER, optional main-guarded dispatch, `permissions: contents: read`, and no service-role credentials. Related DATA-4.3 E/F and G/H builds each share one AFTER job, reducing redundant heavy checks.
- **Verified conversions:** [#1125](https://github.com/hraaaaf/Akarfinder/pull/1125) merged at `fda6b6bc...` with 5/5 PR SUCCESS, live jobs skipped on PR and [shared AFTER 40970467436](https://github.com/hraaaaf/Akarfinder/actions/runs/40970467436) SUCCESS; [#1126](https://github.com/hraaaaf/Akarfinder/pull/1126) merged at `6d047c84...`, 4/4 PR SUCCESS, privileged post-write cert skipped on PR and main; [#1127](https://github.com/hraaaaf/Akarfinder/pull/1127) merged at `d2683f23...`, 4/4 PR SUCCESS, [4.5B AFTER 40971238006](https://github.com/hraaaaf/Akarfinder/actions/runs/40971238006) SUCCESS; [#1128](https://github.com/hraaaaf/Akarfinder/pull/1128) merged at `67fe7261...`, 5/5 PR SUCCESS, its [AFTER 40971587486](https://github.com/hraaaaf/Akarfinder/actions/runs/40971587486) **SUCCESS** on the exact merge SHA.
- [#1129](https://github.com/hraaaaf/Akarfinder/pull/1129) (DATA-4.3D and 4.4A/B) merged at `c02d0b73...` after **6/6 PR workflows SUCCESS**; scoped [AFTER 40972045869](https://github.com/hraaaaf/Akarfinder/actions/runs/40972045869) **completed SUCCESS** on exact merge SHA. See [the detailed DATA risk audit](ci/DATA_WORKFLOW_PHASE2_AUDIT.md).
- **Not authorized:** no Supabase/Neon write, no privileged audit manual dispatch, no OpenSERP cron activation, no Vercel deploy, and no blanket global workflow migration. [#1119](https://github.com/hraaaaf/Akarfinder/issues/1119) remains open.
