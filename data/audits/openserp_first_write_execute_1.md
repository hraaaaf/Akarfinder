# OPENSERP-FIRST-WRITE-EXECUTE-1

## Verdict
`PARTIAL_DATA_WRITTEN`

The authorized first production database write completed once from the locked OpenSERP corpus. The public production application and its Vercel environment were not changed. Persisted OpenSERP display remains disabled in Production.

## Locked Corpus And Write
- Source run: `pilot-openserp-quality-remediation-2`
- Run id: `openserp-first-write-2026-07-13-01`
- Locked manifest checksum: `cf03e16422e91fcb29d1f518fdc5ffd2dec1bb45b4b97155758ef16471f602f8`
- Candidate file checksum: `1ec8d0a0cb76cb6bfc518832e003aa5e2d301a296d064698ccf5df618d75a3a9`
- Locked candidates: `180`; executable candidates: `177`; explicit exclusions: `3` prices outside PostgreSQL `INTEGER` range.

The writer ran with `--write`, the locked manifest, one explicit run id, `--max-new 177`, `--max-sources 177`, and batches of `20`. It did not refetch any source page.

## Database Evidence
| Metric | Before | After |
| --- | ---: | ---: |
| property_listings | 139 | 316 |
| listing_sources | 144 | 321 |
| OpenSERP property_listings | 0 | 177 |
| OpenSERP listing_sources | 0 | 177 |

- New listings/sources: `177` / `177`; updates: `0` / `0`; failed writes: `0`.
- Orphan sources, orphan listings, duplicate canonical URLs, unsafe collisions, partner overwrites, and unknown-city rows: `0`.
- Listing observations created or updated: `0`.
- The post-write dry run planned `0` new listings and `0` new sources, with stable listing and source identities.

## Rollback Readiness
Before the production write, the run produced a targeted snapshot, write manifest, and rollback manifest. The rollback was proved on the same manifest in isolated PostgreSQL before this execution. Production rollback was not run because all post-write checks passed. Run-local rollback artifacts remain under `data/ingestion-runs/openserp-first-write-2026-07-13-01/` and are intentionally not committed as data snapshots.

## Preview Evidence
- Deployment: `dpl_B33hAB933bxPQieesncrSXDsSxyM`
- URL: `https://akarfinder-bu2a5ug76-achraf-benmoussa-s-projects.vercel.app`
- Inspect: `https://vercel.com/achraf-benmoussa-s-projects/akarfinder/B33hAB933bxPQieesncrSXDsSxyM`
- Commit proof chain: clean worktree at `bb27b1a5362c04d550be1ab4d46ebe5b9fff2040` immediately before deployment.
- Preview-only flag: `PERSISTED_OPENSERP_LISTINGS_ENABLED=true`; runtime database provider: `supabase`.

The Preview API returned external-web-result models for city searches: Casablanca `45`, Rabat `35`, Marrakech `20`. External models have no partner badge and use safe HTTP(S) original links. Two earlier Preview deployments are configuration attempts only and are not display proof; their correction changed Preview variables only.

## Safety And Scope
- Direct source-page fetches and downloaded images: `0`.
- Phone, WhatsApp, personal-email, secret, and unsafe-URL hits: `0`.
- Search Gateway and ranking modified: `false`.
- Production application deployed: `false`; Production display flag: absent and therefore `false`.

The in-app browser could not attach its webview. Responsive and browser-console checks are recorded as not verifiable rather than passed. HTTP, Preview API, build, and Vercel build-log checks passed.

## Next Mission
`OPENSERP-PERSISTED-LISTING-DISPLAY-REMEDIATION-1`
