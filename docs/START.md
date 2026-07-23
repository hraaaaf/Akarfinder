# AkarFinder — Agent Start Guide

Updated: 2026-07-23

This is the shortest safe entrypoint for any new coding, audit or product mission.

## Read before write

Read in this order:

1. `docs/README.md`
2. `docs/MASTER_CONTEXT.md`
3. `docs/CURRENT_STATE.md`
4. `docs/ROADMAP.md`
5. the domain-specific contract relevant to the task
6. the actual code, migrations, tests and workflows involved

For live/Production work, also verify the real Vercel deployment, Supabase state and environment/feature flags.

## Never assume

Do not assume that:

- an old mission document represents current architecture;
- code on `main` is already deployed to Production;
- a migration file has been applied;
- a discovered URL is a current listing;
- a source is authorized because it appeared in search;
- missing data can be inferred safely;
- commercial Gold/Premium status improves objective ranking, AkarScore or Property Fit.

## Permanent invariants

- Search-first / intelligence-first product.
- `/search` is the core product surface.
- No bypass, proxy evasion, stealth, fake Googlebot, CAPTCHA solving or login circumvention.
- Source registry and display eligibility remain authoritative.
- Preserve provenance and original-source links for external results.
- Never fabricate missing real-estate data.
- Unknown evidence stays unknown.
- Commercial status and objective intelligence remain separate.
- Strategy/architecture decisions are made before execution; agents implement bounded missions.

## Before changing code

1. Confirm the repository and target branch.
2. Inspect existing implementation before designing a replacement.
3. Identify source-of-truth modules and tests.
4. Check relevant migrations and feature flags.
5. State the exact scope and non-goals.
6. Preserve safety/publication boundaries unless an explicit newer decision changes them.

## Completion evidence

Every implementation mission should report:

- commit/branch actually changed;
- files changed;
- tests and build results;
- DB/migration impact;
- environment/flag impact;
- source-governance/security impact;
- Production impact;
- unresolved or unverified items.

## Documentation rule

Do not append chronological mission logs here.

- Durable vision → `MASTER_CONTEXT.md`
- Current implementation → `CURRENT_STATE.md`
- Active priorities → `ROADMAP.md`
- Durable decisions → `DECISIONS.md`
- Mission evidence → PR/Git history or `data/audits/`
