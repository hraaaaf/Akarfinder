# Public SERP Intelligence V1

**Mission:** #18 — UX SERP Intelligence

## Goal

Expose a compact, understandable and safe public projection of the canonical AkarFinder intelligence pipeline (#11 → #17) on structured SERP listings.

The public UI must help a user read the available information without exposing internal engine details or turning analytical signals into certainty.

## Eligibility boundary

The projection is available only for structured listings whose source is classified as:

- `first_party`; or
- `partner_authorized`.

It is never attached to:

- Search Gateway external results;
- persisted OpenSERP external-web results;
- third-party legacy listings;
- benchmark-only sources;
- suppressed or limited-preview source lanes.

This boundary is enforced before public projection by the source-access registry.

## Public payload

`PublicSerpIntelligenceSummaryV1` exposes only:

- AkarScore V2 score when coverage is sufficient;
- the safe AkarScore public label;
- coverage as `N/5 dimensions documentaires disponibles`;
- at most three concise public signals:
  - information completeness label;
  - observation freshness label when available;
  - indicative market-position label when supported;
  - strong multi-source comparison cue when applicable;
- a cautious attention label when anomaly checks found signals;
- a fixed explanatory disclaimer.

## Explicitly non-public

The SERP projection must never expose raw internal fields such as:

- `anomaly_score`;
- `duplicate_score` / linkage-confidence internals;
- `gap_percent` / raw benchmark math;
- evidence identifiers or internal references;
- association graph metrics;
- internal validation objects;
- hidden assumptions or source-governance internals.

## UX

The projection appears inside the existing **Passeport AkarInfo** as a compact block titled **Lecture AkarFinder**.

Compact SERP presentation:

- score chip (`N/100`) only when AkarScore coverage is sufficient;
- otherwise `Analyse partielle`;
- qualitative score label;
- coverage line;
- maximum three readable signals;
- optional `point(s) à examiner` line.

The longer disclaimer is reserved for the full passport variant to avoid overloading result cards.

## Semantics

The public projection describes documentation quality and indicative analytical context only.

It must not claim:

- certification;
- guaranteed truth;
- guaranteed current availability;
- legal verification;
- an exact or official market value;
- fraud or deception based on anomaly signals.

## Architecture

The canonical intelligence calculation stays server-side in `public-serp-intelligence-v1.ts`.

The client reads only a lightweight serialized projection through `public-serp-intelligence-carrier.ts`. This prevents the #11–#17 engine graph from being bundled into client-side UI code.

No database migration, Production rewrite, ranking change, Gateway policy change or source-governance change is introduced by mission #18.
