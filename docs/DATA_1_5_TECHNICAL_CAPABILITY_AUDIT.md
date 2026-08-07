# DATA-1.5 — Candidate Technical Capability Audit

## Objective

Measure the **technical integration capability** of the highest-priority unregistered first-party candidates from DATA-1.4 without assigning policy, authorization, ingestion rights, or display rights.

Canonical separation:

`CAPABILITY ≠ PERMISSION ≠ INGESTION ≠ PUBLICATION`

## Certified input

The seed is versioned in `scripts/census/data-1-5-seed.json` and comes from the certified DATA-1.4 artifact:

- workflow run: `31175110373`;
- artifact digest: `sha256:88609917b16608ce11b22cfed75654282b29a77d73a1612c992cff0c963996d2`;
- selection: Top 20 unregistered `PRIMARY_SOURCE_CANDIDATE` domains, excluding existing Source Registry entries.

This prevents a changing live ranking from silently changing the lot scope.

## Public-metadata probes only

The live audit is deliberately bounded and sequential. For each domain it may inspect only:

1. `robots.txt`;
2. homepage `/` when robots evidence does not stop the audit;
3. public sitemap URLs declared in robots plus conventional public SEO sitemap endpoints;
4. at most two same-site child sitemap references discovered from a sitemap index;
5. `/wp-json/` only when the homepage already provides WordPress/Houzez/RealHomes evidence and robots permits the path.

Hard limit: **8 HTTP GET requests per domain**.

The user agent identifies the audit explicitly:

`AkarFinder-Technical-Audit/1.0 (... public metadata only; no bypass)`

Responses are truncated locally after 1 MB. The runner is single-domain/sequential with a pause between domains.

## Fail-closed stop conditions

The runner performs no deeper probes when:

- `robots.txt` returns 401 / 403 / 429;
- robots is unavailable or 5xx;
- `User-agent: *`/matching rules disallow `/`;
- homepage is unavailable/non-2xx/3xx;
- homepage signals `noindex`;
- homepage signals CAPTCHA, human verification, access denied or equivalent access control.

A stop signal is recorded as evidence. It is never bypassed.

## Capability evidence

For each selected domain DATA-1.5 records:

- robots status, block-all state and declared sitemap URLs;
- homepage status/final URL/title;
- noindex and access-control signals;
- listing-like public links visible in homepage markup;
- sitemap URL count and listing-like URL count;
- latest observable sitemap `lastmod`;
- JSON-LD presence and schema types;
- CMS family: `HOUZEZ`, `REALHOMES`, `WORDPRESS`, `CUSTOM`, `UNKNOWN`;
- public WordPress REST evidence when already technically indicated;
- explicit public feed/API links exposed in public markup;
- capability score;
- connector-family candidate;
- technical gate.

## Connector-family candidates

Possible technical hints:

- `WORDPRESS_HOUZEZ`;
- `WORDPRESS_REALHOMES`;
- `WORDPRESS_GENERIC`;
- `PUBLIC_FEED_DISCOVERED`;
- `PUBLIC_REST_DISCOVERED`;
- `SITEMAP_JSONLD`;
- `SITEMAP_STRUCTURED_HTML`;
- `STRUCTURED_HTML`;
- `MANUAL_REVIEW_CUSTOM`;
- `BLOCKED_OR_INACCESSIBLE`.

These labels mean **"a connector of this family may be technically appropriate if a later Source Review authorizes it"**. They do not authorize crawling or reuse.

## Capability score

The score rewards observed machine-readable structure only:

- accessible homepage;
- public sitemap;
- listing-like sitemap URLs;
- listing-like homepage links;
- JSON-LD;
- recognized CMS family;
- public WordPress REST where explicitly supported by prior WordPress evidence;
- explicitly exposed feed/API links.

Volume alone does not grant permission and does not alter Source Registry.

## Outputs

The workflow produces local CI artifacts only:

- `technical-capability-audit.json`;
- `technical-capability-audit.md`;
- `capability-ranking.csv`;
- `proof.json`.

`proof.json` must certify:

- `readOnly=true`;
- `writesPerformed=0`;
- `effectivePoliciesAssigned=0`;
- `authAttempts=0`;
- `bypassAttempts=0`;
- `warcFetches=0`;
- 20/20 seed domains attempted;
- max 8 requests/domain.

## Next gate

Only after DATA-1.5 is certified should a later lot perform **Source Review / policy assignment** on the highest-value technically viable candidates. No candidate enters ingestion during DATA-1.5.
