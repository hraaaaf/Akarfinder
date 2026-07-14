# OpenSERP Persisted Listing Display Production Activation 1

Date: 2026-07-14

## Result

- Status: completed
- Verdict: GO_FOR_DISPLAY_PROD_ACTIVATION
- Production deployment: dpl_DWw8kA4LDEv2R8tHSAXqzFGFPEPF
- Alias: https://akarfinder.vercel.app
- Rollback deployment retained: dpl_55mag9XN1U6qKmyr2HWA6P5hK1iw
- Production flag: PERSISTED_OPENSERP_LISTINGS_ENABLED=true

## Scope

Only the OpenSERP persisted-listing display flag was added in the Production
scope. No Supabase write, migration, corpus refresh, ranking change, provider
change, Search Gateway change, alias change outside the controlled deployment,
or source-page fetch was performed.

## Deployment and Smoke Tests

The deployed application tree matches validated commit
`7e92d8383a0ef5454e48cfed79cfee483ca91604` for `app`, `components`, `lib`,
and `package.json`. Vercel built 63/63 pages successfully.

All requested routes passed with HTTP 200, except `/listings/137`, which
correctly returned 404. `robots.txt` and `sitemap.xml` both returned 200.

## Production Display Proof

Playwright validated desktop 1440/1280 and mobile 390/375 viewports on the
production alias. Persisted external cards were present for each city:

| City | External cards | Result |
| --- | ---: | --- |
| Casablanca | 45 | PASS |
| Rabat | 35 | PASS |
| Marrakech | 20 | PASS |

The public label is `Resultat web externe`. External cards have zero internal
`/listings/` links, no partner badge, safe HTTP(S) source links, no invalid
images, no horizontal overflow, no console or page errors, and no critical
request failures. Browser RSC prefetch aborts were observed and classified as
non-critical because the corresponding routes and page rendering succeeded.

## Read-only Database Verification

Post-deployment verification found 316 `property_listings`, 321
`listing_sources`, and 177 OpenSERP listings/sources. There are zero orphans,
duplicate canonical URLs, unsafe collisions, partner overwrites, or new
observation-history writes. The idempotence dry run would add zero listings and
zero sources.

## Security and Rollback

No PII, forbidden wording, source-page fetch, downloaded image, public data
leak, or critical runtime failure was detected. The immediate rollback remains:

1. Set `PERSISTED_OPENSERP_LISTINGS_ENABLED=false` and deploy.
2. If required, rollback to `dpl_55mag9XN1U6qKmyr2HWA6P5hK1iw`.

The production data batch is preserved; no deletion is needed for display
rollback.
