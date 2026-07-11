# Price Position V2 Production Activation

## Summary

- Mission: `PRICE-POSITION-REFERENCE-V2-PROD-ACTIVATION-1`
- Status: `completed`
- Verdict: `COMPLETED_PRODUCTION_ACTIVE`
- Production active: `yes`
- Production official progress: `96.5%`
- Price Position workstream: `80%`

## Commit and deployments

- Preview proof docs commit: `ca1c4480516cfe57a39f7bfdd8f4a43d3a3e0ee2`
- Production candidate commit: `091ce53ceb0034394f104da5260c11fce1282334`
- Preview validation deployment: `dpl_45mDn248esS4TyWvF2KrkcA14dqM`
- Production OFF deployment: `dpl_GPX16uaFnmDkgp1oHYcS7vbysJFv`
- Production ON deployment: `dpl_55mag9XN1U6qKmyr2HWA6P5hK1iw`
- Rollback reference deployment: `dpl_GabHGXXjTevd2AEEoXNwsBf77x4K`

## What changed

- Removed the temporary preview-only proof surface before activation.
- Deployed the same code twice in production with different flag values.
- Activated `PRICE_POSITION_REFERENCE_ENABLED=true` after a healthy flag-off smoke test.
- Kept the Search Gateway, OpenSERP, Supabase and public index unchanged.

## Validation

- `npm run test:price-position` PASS
- `npx tsx --test scripts/scrapers/__tests__/price-position-rollback-smoke.test.ts` PASS
- `npm test` PASS
- `npm run build` PASS
- `git diff --check` PASS

## Runtime checks

- Preview final: `/preview/price-position` returned `404`
- Production OFF: public routes and API returned `200`
- Production ON: public routes and API returned `200`
- Public leak scan: `0`
- Forbidden wording scan: `0`
- Eligible public candidates found during inspection: `0`

## Route checks

All inspected public routes stayed healthy across OFF and ON:

- `/`
- `/pro`
- `/profil-recherche`
- `/immobilier`
- `/immobilier/casablanca`
- `/immobilier/casablanca/maarif`
- `/search?q=appartement%20casablanca`
- `/search?q=location%20studio%20casablanca`
- `/search?q=programme%20neuf%20casablanca`
- `/demo/promoteur`
- `/demo/agence`
- `/robots.txt`
- `/sitemap.xml`
- `/preview/price-position` returned `404`
- `/api/internal/public-index/search?q=appartement%20casablanca%20maarif&city=Casablanca&neighborhood=Maarif&limit=5`

## Decision

The production activation is accepted because:

- the candidate commit is controlled and unchanged;
- the preview-only proof surface is removed;
- production OFF and ON were both deployed and smoke-tested;
- no public leak or forbidden wording was found;
- no routing regression was observed.

The one caveat to record is that no eligible public candidate was visible during the inspection window, so the ON deployment could not show a live illustrative badge on a real listing.

## Next step

`LISTING-OBSERVATION-HISTORY-1`
