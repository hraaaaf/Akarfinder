# BUY-RENT-SERP-RELEVANCE-TUNING-1

Date: 2026-07-05
Status: code + preview validated
Production status: pending explicit GO
Roadmap status:
- Preview / code candidate: 76%
- Production remains: 73%

## Objective

Keep the Search Gateway volume gains from `SEARCH-GATEWAY-COVERAGE-EXPANSION-1`,
but improve buy / rent relevance for the visible top results:

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
- partner ranking live
- structured partner inventory
- internal `/listings` behavior for external results

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

Special fix added after preview verification:

- pages with monthly-rent signals such as `monthly`, `per month`, `DH / mois`
  are treated as rent pages even if they also mention `neuf`
- this specifically fixed a rent page leaking too high on
  `programme neuf casablanca`

## Cost guard

Provider cost was not increased on the default path.

Current guardrails:

- `num=10` per provider request
- round 2 only if deduped result set is still `<30`
- total request budget remains `<=12` calls per search
- q-only queries do not trigger secondary structured variants
- rent queries do not inject buy wording
- buy queries do not inject rent wording

## Baseline and after

Baseline source:
- production before tuning
- `https://akarfinder.vercel.app`

Preview measured after tuning:
- `https://akarfinder-cmt32aer4-achraf-benmoussa-s-projects.vercel.app`
- Vercel preview deployment: `dpl_2F7CyKRd3wvEnNusn3ZvzczHanTN`

Global metrics:

- average results: `31.9 -> 32.3`
- global A+B rate: `79.9% -> 82.7%`
- `/listings/137`: `404 -> 404`
- contact / gallery / internal listing page for external results: unchanged

## Query table

| Query | Total before | Total after | A+B before | A+B after | Mismatch before | Mismatch after | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| appartement casablanca | 29 | 33 | 65.5% | 69.7% | 7 | 4 | top 10 cleaned from mixed rent pages, now 10/10 |
| appartement a vendre casablanca | 23 | 24 | 100.0% | 100.0% | 0 | 0 | stable, still clean |
| location studio casablanca | 27 | 29 | 96.3% | 100.0% | 0 | 0 | rent intent preserved, top 10 still clean |
| location appartement rabat | 31 | 30 | 83.9% | 86.7% | 2 | 0 | buy leakage removed from top |
| villa rabat | 24 | 26 | 75.0% | 92.3% | 5 | 1 | much cleaner villa/sale ordering |
| villa a vendre rabat | 26 | 27 | 100.0% | 96.3% | 0 | 0 | still strong, top 10 clean |
| appartement marrakech | 38 | 35 | 60.5% | 68.6% | 12 | 7 | city/type ordering improved, top 10 now clean |
| terrain marrakech | 37 | 39 | 89.2% | 87.2% | 1 | 3 | volume stable, top 10 still terrain-clean |
| terrain a vendre marrakech | 32 | 30 | 93.8% | 93.3% | 0 | 1 | negligible change, top 10 still clean |
| programme neuf casablanca | 45 | 43 | 48.9% | 46.5% | 17 | 16 | long tail still noisy, but top 10 cleaned and top 3 now clearly new-build |
| location tanger | 31 | 32 | 100.0% | 100.0% | 0 | 0 | stable and clean |
| maison fes | 40 | 40 | 72.5% | 77.5% | 9 | 5 | `Route de Fes` false match pushed down, top 10 now clean |

## Tested queries

- `appartement casablanca`
- `appartement a vendre casablanca`
- `location studio casablanca`
- `location appartement rabat`
- `villa rabat`
- `villa a vendre rabat`
- `appartement marrakech`
- `terrain marrakech`
- `terrain a vendre marrakech`
- `programme neuf casablanca`
- `location tanger`
- `maison fes`

## Tests and build

Local validation already completed during the tuning phase:

- `npm test`
  - scrapers: `1317/1317`
  - api: `51/51`
  - failures: `0`
- `npm run build`
  - status: `OK`
  - framework output: `Next.js 15.5.19`

## Browser verification

Preview routes checked:

- `/`
- `/search?q=appartement%20casablanca`
- `/search?q=location%20studio%20casablanca`
- `/search?q=programme%20neuf%20casablanca`
- `/listings/137`

Observed:

- all tested search pages returned `200`
- `/listings/137` returned `404`
- external results still show source + limited preview only
- no contact CTA on external results
- no gallery CTA on external results
- no internal `/listings/...` page created for external results

Console / network:

- no blocking console error linked to Search Gateway tuning
- one non-blocking browser issue remains:
  `A form field element should have an id or name attribute`
- this warning is outside the Search Gateway tuning scope
- network remained same-origin plus normal Vercel preview tooling

## Doctrine confirmation

Gateway doctrine remains intact:

- external results are still limited previews
- original source remains mandatory
- no contact
- no WhatsApp
- no gallery
- no internal detail page for external results
- no third-party image rehosting introduced by this mission

## Verdict

Mission status:

- success on code + preview
- candidate for roadmap `76%` in preview/code terms
- production must remain `73%` until an explicit production GO is given

Residual risk:

- some long-tail national and reference pages still appear in deeper ranks,
  especially on very broad `programme neuf` searches
- however the visible top 10 is materially cleaner, which was the main goal
