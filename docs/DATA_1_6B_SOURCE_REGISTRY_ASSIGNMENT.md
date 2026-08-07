# DATA-1.6B — Source Registry Assignment

## Objective

Convert the **explicitly reviewed DATA-1.6A decisions** into governance rows in the existing `public.source_policy_registry`, without activating direct acquisition, content reuse or public display for any of the 19 sources.

DATA-1.6B is a governance write, not an ingestion lot.

## Inputs

Certified evidence is pinned to:

- DATA-1.6A policy-evidence run `31182352538`;
- DATA-1.5 technical-capability run `31178327843`.

The decision manifest is versioned at:

`scripts/census/data-1-6b-policy-decisions.json`

Each domain carries an explicit human-reviewed `decisionClass`, evidence URLs, robots status, structure/policy confidence scores and a SHA-256 decision hash.

The migration **does not translate the raw 1.6A category directly into an active policy**. It resolves only the explicit per-domain decision recorded in the manifest.

## Decision classes

### `BLOCK_RESTRICTED`

Used only for `prestigeimmo.ma`, where DATA-1.6A confirmed a substantive public terms restriction.

Registry outcome:

- discovery `paused`;
- detail fetch `prohibited`;
- content reuse `prohibited`;
- display `blocked` + `hidden`;
- authorization `prohibited`;
- acquisition `blocked`;
- machine gate `blocked_invalid_no_bypass`;
- ingestion gate `blocked`;
- no discovery channels.

### `INTERNAL_DISCOVERY_PERMISSION_REQUIRED`

Used for the three sources where public terms/legal pages were found but no explicit AkarFinder reuse authorization was established:

- `mhproperties.ma`;
- `nouraimmobilier.ma`;
- `agadirimmobilier.org`.

Registry outcome:

- public-index/Common Crawl discovery only as internal signal ;
- detail fetch `permission_required` ;
- content reuse `permission_required` ;
- authorization `permission_required` ;
- acquisition `public_index_internal_only` ;
- display `internal_signal_only`, gate `hidden`.

### `INTERNAL_DISCOVERY_UNVERIFIED`

Used for the 11 sources where bounded review did not establish adequate legal/reuse evidence.

Registry outcome:

- public-index/Common Crawl discovery only ;
- detail fetch `legal_review_required` ;
- content reuse `unknown` ;
- authorization `unverified` ;
- acquisition `public_index_internal_only` ;
- machine/ingestion `internal_signal_only` ;
- display hidden.

### `INTERNAL_DISCOVERY_ACCESS_LIMITED`

Used for the four sources whose legal-evidence collection remained bounded by fetch/robots limitations:

- `rabatimmo.ma` ;
- `marrakech-luxury-properties.com` ;
- `alamal-immobilier.ma` ;
- `immobilier-a-marrakech.com`.

Registry outcome remains internal-only, with detail fetch explicitly `paused`. No retry/bypass capability is granted.

## Robots evidence

`robots_status` is evidence-backed, not inferred from CMS capability:

- `sitemap_declared` is accepted only when the certified DATA-1.5 audit records a public sitemap in robots and DATA-1.6A still observes robots as present ;
- `allow_with_restrictions` requires current robots presence without a stronger sitemap claim ;
- `unverified` is used when the current bounded policy review could not verify robots.

Robots accessibility remains a technical signal and never grants reuse permission.

## Policy hash

Each manifest decision has a SHA-256 `policyHash` calculated over the canonicalized explicit decision fields, excluding the hash itself.

The migration stores the same hash in `source_policy_registry.policy_hash`. CI fails on hash drift or when the migration no longer contains every domain/hash pair.

## Migration safety

Migration:

`supabase/migrations/20260807140000_data_1_6b_source_registry_assignment.sql`

Safety properties:

1. **no `ON CONFLICT` / no upsert** ;
2. before insert, abort if **any** of the 19 domains already exists in Source Registry ;
3. insert exactly 19 rows under policy version `source_registry_v2:data_1_6b_20260807` ;
4. post-insert assert exactly 19 rows ;
5. post-insert fail if any row enables:
   - `authorized_partner` ;
   - `authorized_detail_feed` ;
   - `partner_feed` ;
   - `partner_content` ;
   - `allowed_bounded` ;
   - non-hidden public display ;
6. post-insert assert the complete hard block for `prestigeimmo.ma`.

No schema change is required: DATA-1.6B reuses the existing Registry v2 columns and constraints.

## PR preflight

The GitHub workflow is deliberately **read-only**. Before merge it:

1. validates unit tests, TypeScript and production build ;
2. downloads certified DATA-1.6A evidence ;
3. downloads certified DATA-1.5 technical evidence ;
4. validates all 19 status/track/evidence URL/score/robots relationships ;
5. validates the migration against the explicit manifest ;
6. performs **one** read-only Source Registry preflight ;
7. fails if any target domain already exists ;
8. confirms zero activating assignments and all 19 display gates hidden ;
9. uploads only preview/proof artifacts.

**The PR workflow never applies the migration.**

## Production write gate

Only after the PR is fully certified and merged may the exact committed migration be applied through the canonical Supabase migration mechanism.

Expected production outcome after application:

- new Registry rows: **19** ;
- `authorization_status`:
  - prohibited: **1** ;
  - permission_required: **3** ;
  - unverified: **15** ;
- `acquisition_mode`:
  - blocked: **1** ;
  - public_index_internal_only: **18** ;
- public direct-detail acquisition enabled: **0** ;
- partner assignments: **0** ;
- public content display enabled: **0** ;
- display gate hidden: **19**.

The production migration is not considered complete until these invariants are queried and verified after application.

## Exit gate

DATA-1.6B advances the governance pipeline from:

`AUDITED → POLICY_ASSIGNED`

It does **not** advance a source to `ELIGIBLE` for direct connector ingestion.

Any future activation requires a new evidence-backed lot, especially after written permission/partnership or a policy re-review.
