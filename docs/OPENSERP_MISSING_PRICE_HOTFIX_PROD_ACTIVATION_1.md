# OPENSERP-MISSING-PRICE-HOTFIX-PROD-ACTIVATION-1

## Cause

`formatPrice()` (`lib/listings/utils.ts`) formatted any numeric price with `Intl.NumberFormat`, including `0`. When OpenSERP results had no price acquired from the SERP snippet, the read model normalized the missing value to `0`, which then rendered publicly as `0 DH` — a fake price, not a real listing condition.

## Fix deployed

- Commit `5c94919` — `fix(search): hide missing OpenSERP prices`
- Commit `c6315b0` — `docs(search): record OpenSERP price acquisition no-go` (HEAD deployed)
- `formatPrice(price)` now returns `"Prix non communique"` when `price` is `null`, `undefined`, non-finite, or `<= 0`. Valid positive prices render unchanged. No other logic touched (currency, ranking, source, persisted data all unchanged).

## Deployment

| | Before | After |
|---|---|---|
| Deployment ID | `dpl_DWw8kA4LDEv2R8tHSAXqzFGFPEPF` | `dpl_4D3md62NsENrgZxAPcTTDVXiTxKH` |
| Alias | akarfinder.vercel.app | akarfinder.vercel.app |
| Flag `PERSISTED_OPENSERP_LISTINGS_ENABLED` | true | true (unchanged) |

## Tests / build

- `npm run test:openserp-ingestion`: PASS (20/20)
- `npm test` (test:scrapers + test:api): PASS (1439 + 53 = 1492/1492)
- `npm run build`: PASS, 63/63 pages, 0 errors
- `git diff --check`: PASS

## Routes tested (smoke)

`/`, `/acheter`, `/louer`, `/neuf`, `/immobilier`, `/search` (4 query variants), `/demo/promoteur`, `/demo/agence`, `/listings/137`, `/robots.txt`, `/sitemap.xml` — all correct (200 on real routes, 404 on `/listings/137`, demo pages carry `noindex, nofollow`).

## Rabat validation (`/search?q=appartement%20louer%20rabat`)

- 18 external results, 14 missing-price, 4 valid-price
- **0 occurrences of "0 DH"**, 0 occurrences of "0 MAD"
- 14 occurrences of "Prix non communique"
- Cross-check against the previous production deployment (`dpl_DWw8kA4LDEv2R8tHSAXqzFGFPEPF`, still reachable at its own URL): showed 14 occurrences of "0 DH" and 0 "Prix non communique" — a direct 1:1 before/after confirmation that the fix resolves exactly the 14 previously-fake prices without altering the 4 genuinely valid ones.
- External badge present on all 18 cards, no partner badge on external cards, no internal `/listings/` links on external cards.

## Desktop / mobile

- Desktop 1440x1000: screenshot captured, no overflow, no broken images (illustrated placeholders, no real photos fetched for OpenSERP results), "Prix non communique" renders cleanly.
- Mobile 390x844: `scrollWidth === clientWidth` (no horizontal overflow), screenshot captured.
- Desktop 1280x800 and mobile 375x812 were not separately captured (validation stopped early at operator's request once the critical criteria were confirmed); no risk signal from the two viewports that were checked.

## Console / network

- 0 console errors/warnings on the Rabat search page.
- All XHR/fetch requests returned 200; all same-origin (`akarfinder.vercel.app`); no client-side calls to OpenSERP or to source pages (mubawab.ma).

## Security

- No PII patterns (phone/WhatsApp/personal email) or forbidden wording checked via an explicit full scan pass (deprioritized at operator's request); no such content was visually present in the captured screenshots or extracted text during functional validation.
- No secrets found in the precheck audit JSON (`data/audits/openserp-missing-price-hotfix-prod-precheck.json`).

## Rollback

- Prepared: Level 1 = restore `dpl_DWw8kA4LDEv2R8tHSAXqzFGFPEPF` + re-alias `akarfinder.vercel.app`, keep flag `true`, no Supabase changes.
- **Executed: No.** No rollback criterion was met.

## Known pre-existing issue (out of scope, not introduced by this fix)

The `/search` page groups OpenSERP results under a section labeled "Annonces partenaires AkarFinder" / "Annonces intégrées directement par nos partenaires" (`components/search/LightZillowSearchShell.tsx`, `PartnerListingsSection`), which misrepresents scraped web results as AkarFinder partner content. Confirmed present on the pre-hotfix deployment (`dpl_DWw8kA4LDEv2R8tHSAXqzFGFPEPF`) as well, so it predates and is unrelated to this mission. Tracked as a follow-up mission.

## État final Production

- Production DB: unchanged (read-only checks only, confirmed via precheck script).
- Writer/ingestion: not relaunched.
- Search Gateway / ranking / Observation History: unchanged.
- Code modified: no application logic beyond what was already validated in Preview (`5c94919`); this mission only deployed and verified it.

## Re-validation — 2026-07-16

A second activation mission was issued on 2026-07-16 under the same name, unaware that activation above
had already happened on 2026-07-14. Rather than redeploy blindly, this session first confirmed via a
direct Vercel API query (`get_deployment("akarfinder.vercel.app")`) that the live Production deployment
was already `dpl_4D3md62NsENrgZxAPcTTDVXiTxKH` at commit `c6315b0` — i.e. the hotfix above was already
live, not merely "validated in Preview" as the new mission brief assumed. The worktree's HEAD had since
advanced 3 commits past `c6315b0` (`fc36cf2` docs, then `68eea2a` + `4232718b` — a real, well-scoped fix
for the "Annonces partenaires AkarFinder" mislabeling issue flagged above as the next mission,
`OPENSERP-PARTNER-LABEL-MISLABELING-FIX-1` — but not yet deployed anywhere).

Given this mission's explicit scope ("uniquement le rendu public du prix"), the user chose to close it
as already accomplished rather than fold the mislabeling fix into a same-day deployment out of scope.
This section documents a **re-validation of the still-live `dpl_4D3md62NsENrgZxAPcTTDVXiTxKH`**, not a
new deployment.

**DB read-only recheck** (`data/audits/openserp-missing-price-hotfix-prod-revalidation-2026-07-16.json`):
`316`/`321`/`177`/`177` (property_listings/listing_sources/OpenSERP listings/OpenSERP sources) — identical
to the 2026-07-14 reference values, `0` orphans/duplicates/unsafe collisions.

**Smoke HTTP** (14 routes): all correct — main routes 200, `/listings/137` 404, `robots.txt`/`sitemap.xml`
200, demo pages `noindex, nofollow`.

**Rabat** (`/search?q=appartement%20a%20louer%20rabat`): 18 external results (18 distinct external
source links to mubawab.ma), 14 missing-price, 4 valid-price, **0** occurrences of "0 DH" (properly
word-boundary-checked — an initial loose grep falsely matched real prices like "3 600 DH" as containing
"0 DH"; corrected), **0** "0 MAD", **14** "Prix non communiqué", 54 "Résultat web externe" badge
occurrences, **0** internal `/listings/` links on external cards — byte-for-byte consistent with the
2026-07-14 numbers above; Production is unchanged.

**Casablanca** (`/search?q=appartement%20casablanca`): 0 "0 DH"/"0 MAD", 19 "Prix non communiqué", 0
internal links on external cards, genuine partner listings (e.g. "Agenz", real prices `1035000 DH` /
`1260000 DH`) render normally with their own partner badge, unaffected.

**Marrakech** (`/search?q=appartement%20marrakech`): 0 "0 DH"/"0 MAD", 5 "Prix non communiqué", 0
internal links on external cards.

**Console/network** (Playwright, Rabat + Casablanca): 0 console errors/warnings, 0 hydration errors, all
requests 200 and same-origin, 0 client-side calls to OpenSERP or source pages.

**Security scan** (full pass this time, not deprioritized): 0 hits for phone/WhatsApp/personal-email
patterns (816 raw regex hits were all false positives from SVG decorative coordinate attributes, e.g.
`r="0.0767..."`, `opacity="0.806..."` — verified with a stricter boundary-anchored pattern), 0 secrets/
tokens, 0 forbidden wording ("prix confirmé", "meilleur prix", "annonce vérifiée", etc.), all mandated
wording present.

**Visual** (desktop 1440×1000, mobile 390×844, Rabat + Casablanca): no horizontal overflow
(`scrollWidth === clientWidth` = 375/375 at mobile), no broken images, "Prix non communiqué" renders
cleanly, real prices preserved. Screenshots in
`data/audits/openserp-hotfix-revalidation-screenshots-2026-07-16/` (not committed, reproducible).

**Conclusion:** `PROD_ACTIVE_AND_VALIDATED`, confirmed stable 2 days after the original activation. No
redeployment performed. No rollback needed. The partner-mislabeling follow-up
(`OPENSERP-PARTNER-LABEL-MISLABELING-FIX-1`) remains coded but undeployed, pending its own dedicated
activation mission.
