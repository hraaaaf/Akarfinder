# OpenSERP Price Acquisition Remediation 1

## Verdict

`NO_GO` for any price-enrichment write or source-page collection.

The display hotfix from commit
`5c94919d54a8ca97d6dd7d6e24d788d1f580d487` is valid in Preview
`dpl_ufV8zBHFvvh8BeXuAxb8mSwKETZP`. Missing values render as `Prix non
communique`; the Rabat rent search contains no artificial `0 DH` output.

## Root Cause

The OpenSERP classifier extracts `price_mad` only from the SERP title and
snippet. It does not fetch an original listing page. The preview search for
Rabat apartment rentals returns 18 external results, including 14 rows without
a captured price. Thirteen of these missing-price candidates are Mubawab rows.

## Source Audit

No source is currently approved for targeted listing-page fetches.

| Domain | Policy | Result |
| --- | --- | --- |
| mubawab.ma | third_party_legacy; robots disallow | BLOCKED |
| avito.ma | third_party_legacy | BLOCKED |
| sarouty.ma | third_party_legacy; robots disallow | BLOCKED |
| mouldar.com | unknown registry; robots disallow | BLOCKED |
| agenz.ma | public external only; robots disallow | BLOCKED |
| barnes-marrakech.com | robots disallow | BLOCKED |
| 1immo.ma | no explicit authorization | NEEDS_LEGAL_REVIEW |
| marrakechrealty.com | no explicit authorization | NEEDS_LEGAL_REVIEW |

`robots.txt` is a technical instruction, not a legal authorization. No source
page was requested, no HTML was retained, no image or personal data was
collected, and no price was inferred.

## Production Boundary

No Supabase Production write, migration, application deployment, flag change,
Search Gateway change, ranking change, or OpenSERP rerun occurred in this
mission.

## Required Next Step

`OPENSERP-SOURCE-PRICE-ACCESS-REVIEW-1` must obtain and record explicit source
authorization or an official API/feed for a pilot domain. Only then can a
source-specific extractor, isolated rehearsal, idempotent write manifest and
rollback be implemented.
