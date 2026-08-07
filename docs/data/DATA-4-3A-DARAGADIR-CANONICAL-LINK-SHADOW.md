# DATA-4.3A — Dar Agadir Bounded Canonical-Link Activation Audit

## Objective

Measure the maximum truthful Dar Agadir canonical-link surface that could be considered for a later bounded canary, **without activating anything in this lot**.

Current Source Registry boundary:

`public_sitemap_canonical_link → public_sitemap_only → canonical_link_only → external_tail_link_only`

Additional constraints:

- `detail_fetch_policy=legal_review_required`;
- `content_reuse_policy=unknown`;
- `max_revalidation_interval_days=14`;
- `review_status=due_soon`.

Therefore DATA-4.3A is strictly a **shadow/read-only audit**.

## Pre-run production baseline

Observed before the reproducible CI run:

- normalized rows: **6,533**;
- distinct canonical URLs: **6,533**;
- duplicate excess rows: **0**;
- normalized OK: **6,487**;
- core-structured (`city + property_type + intent`): **6,319**;
- fresh-confirmed: **102**;
- seed-only: **6,431**;
- fresh + core-structured + existing technical display evidence + quality >=40: **5**;
- title present: **5,670**;
- price present: **17**;
- surface present: **29**.

These numbers show that Dar Agadir has strong structural depth but weak confirmed freshness. `seed_only` is not equivalent to currently activable inventory.

## Shadow classification

Every current Dar Agadir normalized row is classified into exactly one bucket:

- `ELIGIBLE_SHADOW` — normalized, fresh-confirmed, canonical HTTPS URL on Dar Agadir, city/type/intent present, technical display evidence present, quality >=40;
- `SEED_ONLY_REVALIDATION_REQUIRED` — not currently fresh-confirmed;
- `INSUFFICIENT_STRUCTURE` — missing core structure or invalid canonical URL;
- `INSUFFICIENT_QUALITY_EVIDENCE` — missing/low quality or technical display evidence;
- `NON_NORMALIZED` — normalization incomplete;
- `DUPLICATE` — duplicate canonical URL;
- `POLICY_BLOCKED` — Registry boundary differs from the contract above.

## Safety invariants

DATA-4.3A performs:

- **0 source requests**;
- **0 detail-page fetches**;
- **0 sitemap traversal**;
- **0 content reuse**;
- **0 DB writes**;
- **0 Source Registry changes**;
- **0 production activation**.

Supabase is read only. The live audit fails closed if the Registry boundary drifts.

`ELIGIBLE_SHADOW` means only that a row is strong enough to be considered in a future canary design. It does **not** mean publication or authorization.

## Decision rule after the run

A DATA-4.3B canary is justified only if:

1. the shadow-eligible set is materially useful;
2. provenance and canonical outbound-link UX are truthful;
3. no copied description/image/contact data is required;
4. freshness can be maintained through channels already allowed by the Registry;
5. the Source Registry is re-reviewed if its `due_soon` state or evidence changes.

If only a handful of rows are shadow-eligible, do not spend engineering capacity on production activation; prioritize revalidation strategy or other reservoirs instead.
