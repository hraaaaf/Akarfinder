# SEARCH Price Coverage v9 — canonical closeout

## Scope

Post-v8, read-only refresh of the full eligible null-price reservoir for `mubawab.ma` and `masaken.ma`. No production mutation path exists in v9.

## Implementation and merge

- PR #727 merged as `7d196602a7070441c1b0e1c315ff1f05765807fc`.
- Audit depth expanded to 10 pages × 120 rows.
- Matrix: 2 sources × 10 pages = 20 read-only shards.
- `PRICE_PAGINATION_WRITE=false` enforced.
- Live robots check, HTTP fetch, strict v5 canonical identity/price audit and safe delays preserved.
- No DB write, Registry mutation, policy mutation or Search activation.

## Exact production read-only audit

Workflow run: `31938666806` — SUCCESS.

### Mubawab

Full null-price cohort at run time was covered by pages 0–9.

| Page | Candidates | Fetched | Identity | Reliable | Failed |
|---:|---:|---:|---:|---:|---:|
| 0 | 120 | 120 | 14 | 4 | 0 |
| 1 | 120 | 120 | 16 | 5 | 0 |
| 2 | 120 | 120 | 44 | 33 | 0 |
| 3 | 120 | 120 | 49 | 43 | 0 |
| 4 | 120 | 120 | 43 | 38 | 0 |
| 5 | 120 | 120 | 41 | 34 | 0 |
| 6 | 120 | 120 | 35 | 32 | 0 |
| 7 | 120 | 120 | 35 | 31 | 0 |
| 8 | 120 | 120 | 47 | 42 | 0 |
| 9 | 4 | 4 | 3 | 2 | 0 |
| **Total** | **1,084** | **1,084** | **327** | **264** | **0** |

Reliable yield: **264 / 1,084 = 24.35%**.

### Masaken

The full null-price cohort at run time was covered by pages 0–3; deeper pages are outside the 444-row cohort.

| Page | Candidates | Fetched | Identity | Reliable | Failed |
|---:|---:|---:|---:|---:|---:|
| 0 | 120 | 96 | 96 | 29 | 24 |
| 1 | 120 | 107 | 107 | 67 | 13 |
| 2 | 120 | 103 | 103 | 69 | 17 |
| 3 | 84 | 66 | 66 | 44 | 18 |
| **Total** | **444** | **372** | **372** | **209** | **72** |

The 72 failures were HTTP 410 stale/deleted pages and produced no mutation.

Reliable yield: **209 / 444 = 47.07%**.

## Global result

- candidates: **1,528**
- fetched: **1,456**
- identity: **699**
- reliable: **473**
- failed: **72**
- written: **0**
- global reliable yield: **30.96%**

## Decision for the next lot

Masaken remains the more efficient source for the next bounded-price write: **47.07%** reliable yield versus Mubawab **24.35%**. Mubawab has a larger absolute reliable reservoir (264 vs 209), but Masaken reaches a 100-row bounded target with substantially fewer live fetches.

Therefore the recommended v10 path is a guarded, Masaken-only bounded write of at most 100 reliable null-price rows, revalidated live immediately before each write.

This closeout does **not** authorize that mutation. Production write still requires a fresh read-only canary and an explicit human production-mutation gate.

## Canonical caveat

`docs/ROADMAP.md` and `docs/SESSION.md` are not rewritten here because the connector cannot safely retrieve their complete current contents without truncation. This dedicated closeout is the non-destructive canonical evidence for v9.
