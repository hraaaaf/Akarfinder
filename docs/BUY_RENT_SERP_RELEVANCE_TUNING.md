# BUY-RENT-SERP-RELEVANCE-TUNING-1

Date: 2026-07-05
Status: code reconciled + traceable preview validated
Production status: pending explicit GO
Roadmap status:
- Preview / code candidate: 76% confirmed on committed HEAD + traceable preview
- Production remains: 73%

## Objective

Keep the Search Gateway volume gains from
`SEARCH-GATEWAY-COVERAGE-EXPANSION-1`, but improve buy / rent relevance for
the visible top results:

- fewer national pages on city queries
- less buy/rent mixing
- fewer price/reference pages near the top
- cleaner top 10 on major queries
- Gateway doctrine unchanged

## Scope

Touched:

- `app/api/search/gateway/route.ts`
- `lib/search-gateway/search-gateway-query-builder.ts`
- `lib/search-gateway/search-gateway-ranking.ts`
- `lib/search-gateway/search-gateway-relevance-tuning.ts`
- `scripts/audits/buy-rent-serp-relevance-audit.ts`
- `scripts/scrapers/__tests__/search-gateway-relevance-tuning.test.ts`
- `package.json`

Untouched:

- DB / Supabase
- env
- scraping
- partner ranking live
- structured partner inventory
- internal `/listings` behavior for external results

## Reconciliation status

The earlier preview validation was not production-safe because the tuning code
was still only present in local stashes.

This reconciliation phase moved the real tuning code into a committed HEAD:

- base docs HEAD restored in the clean worktree: `46a6a34`
- code commit now carrying the tuning: `879eeba7a090b337c78393666a085843baf3b6bd`
- branch used for reconciliation: `buy-rent-tuning-reconciliation`

Traceable preview redeployed from that committed HEAD:

- preview URL:
  `https://akarfinder-72m37ai5i-achraf-benmoussa-s-projects.vercel.app`
- Vercel inspect URL:
  `https://vercel.com/achraf-benmoussa-s-projects/akarfinder/5vRncNugYjy2Cp9T7Bz74Ydy6JYp`

No production deployment happened during this phase.

## Relevance logic added

Internal-only scoring was added for Search Gateway results. It is never exposed
publicly and is not described as a trust score.

Signals:

- `intentMatchScore`
- `cityMatchScore`
- `propertyTypeMatchScore`
- `pageQualityScore`
- `transactionMismatchPenalty`
- `nationalPagePenalty`
- `priceReferencePenalty`
- `genericPagePenalty`
- `englishPagePenalty`

Important rules:

- buy queries push down rent-only pages
- rent queries push down sale/new pages
- new-build queries favor `programme neuf` / `immobilier neuf` / project pages
- land queries favor `terrain` pages and penalize apartments/villas/rent
- city queries penalize national pages and false city matches
- staging / localhost remain excluded
- price-reference pages remain available for depth, but are deprioritized

Special fix kept after preview verification:

- pages with monthly-rent signals such as `monthly`, `per month`, `DH / mois`
  are treated as rent pages even if they also mention `neuf`
- this prevents rent pages from leaking too high on
  `programme neuf casablanca`

## Cost guard

Provider cost was not increased on the default path.

Current guardrails:

- `num=10` per provider request
- round 2 only if the deduped result set is still `<30`
- total request budget remains `<=12` calls per search
- q-only queries do not trigger secondary structured variants
- rent queries do not inject buy wording
- buy queries do not inject rent wording

## Validation run in reconciliation phase

### Code validation

- `npm test`
  - scrapers: `1317/1317`
  - api: `51/51`
  - failures: `0`
- `npm run build`
  - status: `OK`
  - framework output: `Next.js 15.5.20`

### Full live audit rerun

The 12-query audit script was rerun in this reconciliation phase against:

- current production: `https://akarfinder.vercel.app`
- traceable preview:
  `https://akarfinder-72m37ai5i-achraf-benmoussa-s-projects.vercel.app`

Observed output:

- production rerun: average results `11.4`, A+B `73.0%`
- preview rerun: average results `10.5`, A+B `88.9%`

Important note:

- this rerun showed live-provider variability and several false-zero rows in
  the full sweep, while direct query-by-query API checks immediately after were
  healthy
- because of that instability, the full live audit was not used as the sole
  gate for a production promotion decision
- it is still useful as a warning that provider behavior can drift during long
  live sweeps

### Targeted key-query spot checks on the traceable preview

These checks were run directly against the committed preview API after the full
audit rerun:

| Query | Result count | Top 10 relevant | Notes |
| --- | ---: | ---: | --- |
| `appartement casablanca` | 26 | 10/10 | top 3 now sale/new-build aligned |
| `location studio casablanca` | 30 | 10/10 | location intent preserved |
| `programme neuf casablanca` | 44 | 10/10 | top 3 clearly new-build compatible |
| `location appartement rabat` | 31 | n/a | healthy rent-compatible payload |
| `villa rabat` | 24 | n/a | healthy villa/sale payload |
| `location tanger` | 33 | n/a | healthy rent payload |

Direct payload spot checks also confirmed the Gateway display doctrine on
external results:

- `can_show_contact = false`
- `can_show_gallery = false`
- no internal `/listings/...` target introduced for external results

## Preview checks

Traceable preview routes checked:

- `/search?q=appartement%20casablanca`
- `/search?q=location%20studio%20casablanca`
- `/search?q=programme%20neuf%20casablanca`
- `/search?q=villa%20rabat`
- `/listings/137`
- `/demo/promoteur`
- `/demo/agence`

Observed:

- all checked search/demo pages returned `200`
- `/listings/137` returned `404`
- the preview corresponds to the committed code HEAD, not to a stash-only state

## Doctrine confirmation

Gateway doctrine remains intact:

- external results are still limited previews
- original source remains mandatory
- no contact
- no WhatsApp
- no gallery
- no internal detail page for an external result
- no third-party image rehosting introduced by this mission

## Verdict

Reconciliation status:

- code tuning is now committed in a traceable HEAD
- the preview under review now corresponds to that committed HEAD
- preview / code can be treated as a real `76%` candidate for human review
- production must remain at `73%` until explicit GO

Residual risk:

- the full live 12-query audit remains provider-variable during long sweeps
- because of that, production should be promoted only after human review of the
  traceable preview, not from stale earlier metrics
