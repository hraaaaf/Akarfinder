# AkarFinder — Authorized Source Adapter & Controlled Proof V1

## Purpose

Connect one policy-gated source adapter to the certified recrawl worker boundary and produce a real, bounded network proof without creating a publication bypass.

## Selected canary

- source: Mubawab;
- scope: one existing individual listing URL matching `/fr/a/{numeric-id}/{slug}`;
- origin: an existing `listing_sources` row already observed through the approved OpenSERP lane;
- no category/search/list page is eligible for this adapter.

## Mandatory controls

1. HTTPS only.
2. Exact host allowlist.
3. Exact individual-detail path allowlist.
4. `robots.txt` fetched before the page.
5. Redirects rejected.
6. Explicit AkarFinder user agent.
7. 20-second timeout.
8. 2 MB response ceiling.
9. HTML only.
10. One request canary; no pagination or concurrency.
11. No CAPTCHA, login, proxy, stealth or authentication bypass.
12. No production persistence in the proof workflow.
13. `publication_eligible=false` remains invariant.

## Observation contract

The adapter may emit only facts present in the fetched response:

- HTTP status;
- content type;
- title;
- explicit price and currency metadata when present;
- explicit surface text when present;
- factual source status based on the HTTP response;
- deterministic title/content fingerprints.

Missing values remain `null`. Age alone never becomes withdrawal evidence.

## Controlled proof

The GitHub Actions gate:

- runs deterministic policy/parser tests;
- fetches current `robots.txt`;
- fails closed if the detail path is disallowed;
- performs one controlled page request;
- writes a JSON artifact whether the proof passes or fails;
- runs TypeScript and the production build.

## Persistence boundary

This V1 proof deliberately does not persist the live response. Persistence into `source_offer_observations`, ledger derivation, lifecycle evaluation and rescheduling requires a second explicit activation after the live adapter has been certified.
