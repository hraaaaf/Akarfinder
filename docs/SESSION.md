# AkarFinder — Session Compatibility Note

Updated: 2026-07-23

`SESSION.md` is no longer a chronological source of truth.

The former pattern of appending every mission, preview and deployment state into one continuously growing file created stale and contradictory instructions. Git and PR history already preserve that history more accurately.

Use instead:

- `README.md` — documentation map and authority hierarchy;
- `MASTER_CONTEXT.md` — durable product/architecture context;
- `CURRENT_STATE.md` — current repository implementation snapshot;
- `ROADMAP.md` — active priorities and gates;
- `DECISIONS.md` — durable validated decisions;
- `data/audits/` — mission evidence, benchmarks and historical validation artifacts;
- Git commits and pull requests — chronological implementation history.

## Rule for agents

Do not append mission reports to this file.

If a mission changes durable project understanding, update the appropriate canonical document. Otherwise keep the evidence in the PR, commit history or `data/audits/`.
