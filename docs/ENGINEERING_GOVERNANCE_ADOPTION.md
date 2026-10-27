# Engineering governance adoption

Akarfinder explicitly adopts the central engineering-governance baseline:

- version: `1.0.0`
- exact source commit: `4c0ed295cc095fc5e7f9d0ddde3b1af95ac8dba9`
- adoption manifest: `.governance/adoption.json`

The central doctrine is the minimum engineering standard for this repository. No pre-existing repository-local governance entrypoint was identified during the adoption inspection.

This adoption does not authorize deployment, production configuration changes, database/schema/data mutation, merge, or irreversible action. Existing product behavior and architecture are unchanged.

Any future project-specific governance may tighten the central baseline. Weakening it requires explicit human approval and a recorded exception. Future doctrine upgrades require a new immutable version/SHA pin; moving references such as `main` or `latest` are invalid.

## CI execution convention — 2026-10-27

See [CI execution policy](CI_EXECUTION_POLICY.md): targeted PR triggers, PR concurrency cancellation, post-merge main-only heavy tests, manual dispatch guards and protected mutation/deployment exceptions. Existing legacy workflows remain subject to staged audit; do not claim universal compliance.

## Implementation closeout — CI governance 2026-10-27

- Converted PR/AFTER split merged via [#1114](https://github.com/hraaaaf/Akarfinder/pull/1114); regression diagnosis/repair merged via [#1115](https://github.com/hraaaaf/Akarfinder/pull/1115) and [#1116](https://github.com/hraaaaf/Akarfinder/pull/1116).
- Final code HEAD `7a8f0f415f1b4f96b6518f3c29ca4199f2b599e6`: [Search split AFTER](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940426), [Search cleanup AFTER](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940677), [canonical validation](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940462) and [canonical compilation](https://github.com/hraaaaf/Akarfinder/actions/runs/40509940412) **all SUCCESS**. Exact evidence, rollout scope, screenshot limitations and remaining legacy work are in [CI execution policy](CI_EXECUTION_POLICY.md).
- This is **not** a general certification of the 549 workflow inventory, of visual map tile readiness at 360px, or of production deployment. No Vercel deployment or DB write authorized by this closeout.

## Continued verification — MapLibre and legacy DATA CI

MapLibre screenshot readiness was certified in [AFTER run 40523907085](https://github.com/hraaaaf/Akarfinder/actions/runs/40523907085) at code merge HEAD `a0591eef...`: 5/5 responsive captures show tiles and non-regressed layout. The blank 360px capture from the earlier run is no longer accepted as a passing visual proof.

The first reviewed legacy DATA CI subset landed in [PR #1121](https://github.com/hraaaaf/Akarfinder/pull/1121); the [Typesense AFTER 40524923722](https://github.com/hraaaaf/Akarfinder/actions/runs/40524923722) passed at exact merged HEAD `e3261846...`. Detailed scope, the 107-file name-filtered static sweep, and the open sensitive-workflow backlog are in [CI policy](CI_EXECUTION_POLICY.md) and [DATA audit](ci/DATA_WORKFLOW_PHASE2_AUDIT.md). No blanket 549-workflow compliance or production release is implied.
