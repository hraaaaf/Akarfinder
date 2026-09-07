# Q1D — Normalized property features + fingerprints

## Goal

Enrichir les **251 046 représentations row-level** certifiées par Q1C avec les features structurées déjà disponibles, sans nouveau crawl source et sans inventer les champs absents.

## Inputs

- Q1C artifact `10020459850` — exact identity manifest.
- Supabase read-only export of `thin_index_search_documents`, `listing_sources`, `property_listings`.
- DATA4.9B remains separate: `2 326` aggregate-only, no row-level placeholders.

## Exact matching policy

1. URL identities: canonical URL equivalence limited to scheme/host normalization, removal of `www`, fragment removal and trailing slash normalization while preserving query text.
2. Mubawab/Avito ID identities: match only when the exact source ID is deterministically recoverable from an already-stored DB URL and the resulting ID key is unique.
3. Ambiguous DB keys are excluded, never guessed.
4. No physical-property merge happens in Q1D.

## Feature precedence

`property_listings` wins when the representation is tied exactly through `listing_sources`; missing fields may be filled from `thin_index_search_documents`.

Target fields:

- city
- district
- property_type
- transaction_type
- price_mad
- surface_m2
- rooms_count
- bedrooms_count
- bathrooms_count
- latitude / longitude when actually available (currently expected sparse/null)
- title
- address_text when actually available
- deterministic title/address tokens

## Fingerprint V1

Fingerprint input is deterministic and only uses present normalized evidence:

`city | district | property_type | transaction_type | price_mad | surface_m2 | bedrooms_count | title_tokens`

A fingerprint is **not** a property-cluster decision. It is an input to later blocking/clustering. Rows without usable structured evidence keep `fingerprint_v1=null`.

## Invariants

- 251 046 input -> 251 046 output.
- Q1C keys and identities preserved.
- missing data stays null.
- no freshness inference.
- no authorization inference.
- no physical-property merge.
- databaseWrites=0.
- productionWrites=0.
- sourceSiteFetches=0.
- vercelDeployments=0.
