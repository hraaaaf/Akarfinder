# OpenSERP Persisted Listing Display Production Activation 1

## Decision

The persisted OpenSERP listing display was activated in Production on
2026-07-14 after the validated Preview and production smoke controls.

- Production deployment: `dpl_DWw8kA4LDEv2R8tHSAXqzFGFPEPF`
- Production alias: `https://akarfinder.vercel.app`
- Application evidence commit: `7e92d8383a0ef5454e48cfed79cfee483ca91604`
- Rollback deployment: `dpl_55mag9XN1U6qKmyr2HWA6P5hK1iw`
- Flag: `PERSISTED_OPENSERP_LISTINGS_ENABLED=true` in Production only

## Verified Behavior

The production search pages display the persisted OpenSERP stock as external
web results, with the `Resultat web externe` label and a safe external source
link. They do not expose an internal listing detail URL or a partner badge.

The activation was verified on desktop and mobile for Casablanca, Rabat, and
Marrakech. The sampled API results contained 45, 35, and 20 external cards
respectively. No PII, forbidden wording, visual overflow, invalid image,
browser console error, page error, or critical request failure was detected.

## Data and Boundaries

The activation did not write to Supabase, change the OpenSERP corpus, fetch
source pages, alter Search Gateway, alter ranking, or modify other production
environment variables. The first batch remains 177 OpenSERP listings and 177
sources, with read-only integrity and idempotence checks passing.

## Rollback

Display rollback is flag-first: set
`PERSISTED_OPENSERP_LISTINGS_ENABLED=false` and deploy. If that does not
resolve an incident, restore deployment
`dpl_55mag9XN1U6qKmyr2HWA6P5hK1iw`. The database batch remains preserved.
