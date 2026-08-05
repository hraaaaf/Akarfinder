# ODM A2 — Recoverable Listing Depth

## Scope

A2 measures how much of the publicly eligible `AMBIGUOUS` reserve is technically consistent with a detail page, then separates four independent gates:

1. deterministic detail-URL evidence;
2. normalized city, property type and intent;
3. freshness evidence;
4. source policy and display rights.

This LOT is read-only. It does not reclassify a document, fetch a detail page, copy content, change ranking or activate publication.

## Production baseline — 5 August 2026

- truthful public `LISTING` baseline: **7,483**;
- publicly eligible `AMBIGUOUS` rows: **14,849**;
- distinct ambiguous canonical URLs: **14,849**;
- technical detail candidates: **14,573**;
- structured detail candidates with city/type/intent: **10,654**;
- candidates needing dimension recovery: **3,919**;
- unproven ambiguous rows: **276**;
- matches to already certified source rules: **1,800**;
- matches to audited source patterns: **12,752**;
- content-and-structure candidates: **21**.

## Policy and freshness truth

- structured candidates in a `canonical_link_only` lane: **9,689**;
- structured candidates blocked by partnership or legal policy: **944**;
- structured candidates with missing source policy: **21**;
- A2 V1 originally reported candidates publicly recoverable now as **0**.

The canonical-link potential is not certified inventory. Every candidate requires current freshness evidence and source-specific validation.

If all 9,689 canonical-link candidates were later validated without duplication or policy regression, the representation depth would become **17,172**, leaving a truthful gap of **22,828** to 40,000. This is a scenario, not a current production claim.

## Largest canonical-link recovery lanes

| Source | Structured candidates | Blocking work |
|---|---:|---|
| daragadir.com | 6,319 | freshness recrawl; 209 additional rows need dimensions |
| promoimmomarrakech.com | 2,547 | freshness recrawl; 387 additional rows need dimensions |
| limmobiliersansfrontieres.com | 405 | freshness recrawl; 200 additional rows need dimensions |
| aykana.ma | 384 | freshness recrawl; 96 additional rows need dimensions |
| atlasimmobilier.com | 34 | permission-aware freshness validation; 387 additional rows need dimensions |

## Partnership or legal lanes

The following structured candidates remain internal signals until policy changes or written authorization exists:

- Masaken: 424;
- Sarouty: 237;
- Souk Immobilier: 139;
- 1immo: 63;
- Mubawab: 40;
- Kawtar Immobilier: 25;
- Mouldar: 9;
- Agenz: 6;
- Avito: 1.

`marrakechrealty.com` contributes 21 structured candidates but has no completed Source Registry policy. Its next action is policy completion, not publication.

## Certification rules

A row never becomes recoverable public depth merely because its URL looks like a detail page.

Public recovery requires all of the following:

1. deterministic source-specific detail evidence;
2. city, property type and intent present;
3. freshness evidence accepted by the current canonical freshness contract;
4. a Source Registry display policy that permits the exact representation;
5. no content reuse beyond the recorded policy;
6. provenance and deduplication preserved.

No robots.txt or sitemap is interpreted as a reuse licence. Source Registry remains authoritative for detail fetch, content reuse, imagery and display policy.

## A3 correction — canonical report V2

A2 V1 compared `thin_index_search_documents.freshness_status` with the vocabulary `fresh/aging`. That column actually uses seed-state values such as `fresh_confirmed/seed_only`, so the V1 freshness-dependent field was not a valid activation measurement.

A2 V1 remains available for backward compatibility. Its `public_recoverable_now` field is deprecated.

`odm_a2_recoverable_listing_depth_report_v2()` is now canonical. It derives validated freshness from the A3 persisted public-sitemap audit and explicitly keeps publication plus reclassification disabled.

A3 initially covers only `daragadir.com` and `promoimmomarrakech.com`. The remaining canonical-link sources stay outside the current freshness pilot.

## Fail-closed output

Both A2 reports return aggregate metrics only. They are executable by `service_role` and inaccessible to `PUBLIC`, `anon` and `authenticated`.

The canonical V2 report explicitly states:

- no automatic reclassification;
- publication unchanged;
- ranking unchanged;
- no detail-page network access;
- candidate depth is not certified inventory.
