# OpenSERP Persisted Listing Display Remediation 1

## Verdict

`GO_FOR_DISPLAY_PROD_ACTIVATION`

## Correction

The Preview validation identified that persisted external cards still offered
internal `/listings/[id]` navigation. `SearchListingCardDark` now sends
external-web-result image, title, and primary navigation directly to the safe
original URL with `target="_blank"` and `rel="noopener noreferrer"`. The
internal "Voir le bien" CTA is suppressed only for those external results.

## Preview Proof

- Deployment: `dpl_GBZXuSeqRWeCQNhk27VBay6ZLTG2`
- URL: `https://akarfinder-igd42w9r0-achraf-benmoussa-s-projects.vercel.app`
- Commit: `d9a08bf9cf551fba59745fc937e3130f487699d1`
- Preview flag: `PERSISTED_OPENSERP_LISTINGS_ENABLED=true`
- Supabase: connected during the Vercel build (`36/316` rows observed by the build read model)

Playwright captured fifteen pages: Casablanca, Rabat, and Marrakech at desktop
`1440x1000`, desktop `1280x800`, mobile `390x844`, and mobile `375x812`, plus
smoke captures for `/acheter`, `/louer`, and `/neuf`. Local screenshots and the
raw sanitized-network capture are retained outside Git at
`C:\Users\lenovo\Documents\AkarFinder-openserp-first-write-captures`.

| Check | Result |
| --- | --- |
| City search HTTP | all 200 |
| Visible external badge | Casablanca, Rabat, Marrakech |
| Horizontal overflow | 0 |
| Internal listing links on external search cards | 0 |
| Invalid/broken images | 0 |
| Safe external links | PASS |
| Partner badge on external result | absent |
| Console and page errors | 0 |
| Critical request failures | 0 |
| Bad HTTP responses | 0 |
| Forbidden wording and PII hits | 0 |

Thirteen aborted internal RSC prefetch requests were observed while moving
between independent pages. They carried no response status, did not concern a
listing request, and are reported as non-critical prefetch aborts.

## Observation History

The first OpenSERP write created no listing observations. This is expected:
the run persists listing and source rows only, observation capture remains
disabled, and public rendering is read-only. No observation was manufactured.

## Production Boundary

No database write, writer run, Production app deployment, alias change, or
Production environment change occurred in this remediation. The Production
OpenSERP display flag remains absent and therefore disabled.
