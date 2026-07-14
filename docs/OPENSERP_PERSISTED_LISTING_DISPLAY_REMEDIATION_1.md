# OpenSERP Persisted Listing Display Remediation 1

## Outcome

The persisted OpenSERP display has complete reproducible Preview evidence and
is ready for the separately authorized Production display activation mission.

The only product correction was navigation policy: a persisted external result
cannot expose an internal detail route. Its image, title, and primary action now
open only the source-original URL in a safe new tab. Partner cards keep their
existing internal navigation and badges.

## Preview Validation

The Preview deployment `dpl_GBZXuSeqRWeCQNhk27VBay6ZLTG2` ran with the display
flag enabled and Supabase connected. Playwright recorded desktop and mobile
captures for Casablanca, Rabat, and Marrakech plus smoke checks for `/acheter`,
`/louer`, and `/neuf`.

- 45 Casablanca, 35 Rabat, and 20 Marrakech external results were available.
- External badges were visible; partner badges were absent from external cards.
- There was no horizontal overflow, invalid image, internal listing link,
  critical console error, page error, critical request failure, forbidden
  wording, or detected contact data.
- External links were safe HTTP(S) links with `noopener` and a new-tab target.

The captured files are deliberately retained outside Git because they render
third-party listing titles and source URLs. The committed audit contains only
the aggregate evidence necessary for release review.

## Production Boundary

Production remains unchanged. The display flag is absent in Production and
therefore false. This document is not an authorization to activate it.
