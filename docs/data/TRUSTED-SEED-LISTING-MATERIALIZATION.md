# Seed → listing materialization

## Goal
Materialize indexed real-estate offers when AkarFinder has the three minimum facts: explicit city, explicit district and a MAD price, while preserving the confidence level of that price.

## Contract
- current source-domain registry must admit the domain and individual-detail URL;
- `document_kind = LISTING` is accepted directly; `document_kind = AMBIGUOUS` is accepted only when the current registry independently proves a strong individual-detail URL;
- `vertical_classification = real_estate_likely` remains mandatory;
- price must be positive and remain <= 30,000,000 MAD;
- `recovery_confidence = trusted_economic_v2` is persisted as trusted (`field_confidence.price = trusted_economic_ledger`, `listing_sources.price_status = valid`);
- doubtful or explicit-but-not-ledger-trusted prices are preserved rather than deleted (`field_confidence.price = price_to_verify`, `listing_sources.price_status = ambiguous`) and receive the lower-confidence scoring policy;
- city and district must both be explicit in indexed evidence;
- structured portal URLs use their dedicated city and district segments rather than whole-URL city substring matching;
- geography evidence priority is URL + page title first, then snippets;
- the latest matching `discovery_candidates` title/snippet may be used as classification-only fallback when thin-index text is insufficient;
- source/discovery text is never copied to `property_listings`;
- persisted listing content is link-only: canonical URL, city, district, price and optional normalized type/intent;
- `listing_sources.origin_type = external_index_seed` preserves provenance;
- exact URL and deterministic fingerprint (`sha256("external_index_seed:" + canonical_url)`) make the path idempotent;
- no source network request is made during materialization.

## Execution
`scripts/data-mass/materialize-trusted-seed-listings.ts` is dry-run by default. Production writes require both `--apply` and `SEED_LISTING_MATERIALIZE_WRITE=1`. `--limit=N` supports a bounded canary.

## Production closeout — 2026-08-26
Baseline before the price-confidence conversion pass:
- 63,721 `source_offer_seeds`;
- 62,747 thin-index rows;
- 3,265 thin rows with city + price;
- 2,373 rows marked `price_to_verify`;
- 596 rows with trusted economic price;
- 6,240 `property_listings`.

Key code changes and certification:
- PR #919 extended the writer to preserve both trusted and `price_to_verify` prices. Dedicated run `32955337167` passed.
- PR #921 added classification-only fallback evidence from `discovery_candidates` and strong-detail override for `AMBIGUOUS` documents. Dedicated run `32958057366` passed.
- PR #923 added source-specific explicit DarAgadir district recovery. Seed Conversion Recovery run `32959371779` passed.
- PR #924 made multiple explicit DarAgadir district matches terminally ambiguous rather than allowing generic fallback. Corrected Seed Conversion Recovery run `32959986611` passed.
- PR #925 added a second conservative DarAgadir district tier. Seed Conversion Recovery run `32960606019` passed.
- PR #926 fixed structured Agenz/Mouldar geography so the city comes from the dedicated city URL segment instead of names embedded in districts such as `route-de-fes` or `route-de-casablanca`. Seed Conversion Recovery run `32962538421` passed; PR #926 merged as `7e62d49d71366a0456220893f31079e6dc96dc60`.

Production materialization used bounded canaries and domain-specific explicit-geography gates. Failed batches were atomic rollbacks before retry. Exact URL deduplication now checks `source_url = canonical_url OR listing_url = canonical_url`; using `coalesce(source_url, listing_url)` was proven insufficient when both columns are populated differently.

Final verified production state after the latest safe batches:
- **7,807 `property_listings` total**, up **1,567** from the 6,240 baseline;
- **2,093 `external_index_seed` source rows**;
- **0** external-index sources referencing a missing property;
- **0** external-index sources without cluster membership.

The latest safe materializations include:
- structured Agenz/Mouldar rows after city-segment correction: **21/21** link-only, minimum-fact complete and membership-complete across canary + bulk;
- Avito Gauthier / Casablanca at 16,000 MAD as `price_to_verify`, canonical-link-only, with no copied source content;
- previous conservative DarAgadir, Mubawab, 1immo and Masaken cohorts retained their link-only provenance and price-confidence state.

## Residual audit
After correct URL deduplication, **878 priced thin-index URLs remain unmaterialized**:
- `daragadir.com`: **337**;
- `masaken.ma`: **300**;
- `mubawab.ma`: **119**;
- `1immo.ma`: **69**;
- `agenz.ma`: **47**;
- `avito.ma`: **2**;
- `aykana.ma`: **2**;
- `mouldar.com`: **2**.

These are not 878 safe listings. Current verified blockers are:

### DarAgadir
Source policy is `canonical_link_only`, but the recorded policy expired on **2026-08-10**. Live policy revalidation could not be completed from the current environment, so no further DarAgadir rows were written. Seven residual rows would otherwise satisfy the current minimum-facts gate (two Abattoirs, Hay Salam, Lekhiam, two Marina, Tassila); a Sonaba row at 31,000,000 MAD remains above the 30,000,000 MAD ceiling. Two other district matches are ambiguous and remain rejected.

### Aykana
The recorded canonical-link-only policy also expired on **2026-08-10**. A Témara / Guich Oudaya row has explicit city, district and price but remains blocked pending source-policy revalidation. The Tiflet row has no distinct district.

### Agenz
The 47 priced residuals are currently explained by:
- **19** generic districts such as `autre`;
- **14** prices above 30,000,000 MAD;
- **14** non-standard geographic URL segments requiring explicit taxonomy treatment rather than silently mapping provinces/communes to larger cities.

Examples include Al Haouz / Oulad Mtaa, Chichaoua / Lamzoudia, Dar Bouazza / Tamaris, Inezgane / Dechira, Khemisset / Tiflet and Taroudannt / Agadir Melloul. These must retain their actual geography; they must not be collapsed into Marrakech, Casablanca, Rabat or Agadir merely to increase counts.

### Mouldar
Two priced rows remain, both using `toute-la-ville`; one Casablanca snippet contains multiple neighbouring-result districts. Neither has an unambiguous district and neither is materialized.

### Avito
One laptop row is non-real-estate. One Racine office URL lacks sufficient retained city/text evidence. The safe Gauthier row was already materialized under the current Avito canonical-link-only policy, which expires on **2026-09-06**.

### 1immo / Masaken / Mubawab
The remaining rows are dominated by missing district evidence, conflicting city evidence, result-list snippets, or thin rows without retained title/snippet. They remain outside `property_listings` unless a source-specific explicit-evidence gate can prove city + district + price without copying source content.

## Data-quality debt discovered
Existing historical materialization predating the tightened gates includes at least one Mouldar source with district `Toute La Ville`, and some optional property-type inferences are questionable. This is logged as remediation debt; it is not silently rewritten as part of this conversion closeout.

## Closeout status
The **safe conversion pass under currently valid policies and current explicit-evidence rules is closed**. It is not equivalent to complete seed coverage. Remaining expansion requires either source-policy refresh, evidence enrichment, or explicit geography-taxonomy expansion.

No Vercel deployment was performed.
