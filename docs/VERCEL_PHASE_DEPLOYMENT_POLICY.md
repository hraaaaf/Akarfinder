# Vercel Phase Deployment Policy

Status: canonical deployment policy for AkarFinder.

## Rule

Vercel is a phase-completion gate, not a per-commit CI system.

During an active phase:
- branches, commits and pull requests are validated by GitHub Actions;
- TypeScript, regression suites and production build checks must pass in CI;
- no automatic Vercel Preview or Production deployment is allowed.

At phase completion:
1. the phase scope is complete;
2. canonical CI is green;
3. the phase is explicitly approved for release;
4. one deliberate Vercel Production deployment is executed from the final validated `main` commit;
5. Production smoke tests and visual/runtime checks are run;
6. the deployed commit is recorded as the certified phase release.

## Enforcement

`vercel.mjs` sets `git.deploymentEnabled` to `false` through Vercel's programmatic project configuration.

`vercel.json` intentionally remains absent so the historical invariant forbidding Vercel Cron configuration on this Hobby-plan project stays intact.

Do not re-enable automatic Git deployments for branches or `main` without an explicit architecture/governance decision.

Manual Production deployment remains the release mechanism at phase completion.
