# DATA-1.6A — Source Policy Evidence Review

## Objective

Turn the **19 `CAPABILITY_REVIEW_READY` sources certified by DATA-1.5** into a bounded, reproducible **policy-evidence review queue** without assigning or changing any Source Registry policy.

This lot exists to answer:

> What public governance evidence is observable for each technically viable candidate, and what should a human reviewer examine next?

It does **not** answer:

> Is this source authorized for ingestion, reuse or publication?

That decision remains outside DATA-1.6A.

## Canonical inputs

DATA-1.6A consumes the certified DATA-1.5 GitHub Actions artifact from run `31178327843` and accepts only rows with:

`technicalGate = CAPABILITY_REVIEW_READY`

Expected input: **19 sources**.

A live read-only Source Registry preflight verifies that none of those domains has become registered since DATA-1.5. If any source is already present, the lot fails closed rather than silently reviewing stale governance state.

## Existing architecture reused

DATA-1.6A does not create a parallel policy model.

It reuses the governance semantics already established by B3.2 and the existing `source_policy_registry` fields, including the concepts of:

- terms evidence found;
- restrictive terms evidence found;
- insufficient explicit permission;
- permission/contact required;
- evidence URLs;
- next action;
- hidden/blocking review when governance signals require it.

The output is designed to be **Registry-compatible evidence**, but all policy-bearing candidate fields deliberately remain `null`.

## Evidence collected

For each candidate, the live audit is bounded to **5 public GET requests maximum** and uses a truthful user agent:

`AkarFinder-Policy-Evidence-Audit/1.0`

The audit may inspect only:

1. `robots.txt`;
2. the public homepage when robots permits it;
3. up to three same-site legal/terms/privacy pages discovered from the homepage;
4. if no legal links are discoverable, a bounded set of conventional public legal paths.

Every candidate path is checked against the observed robots rules before fetching.

The audit never:

- logs in;
- sends cookies or user credentials;
- solves CAPTCHAs or challenges;
- follows redirects to external domains;
- downgrades HTTPS to HTTP;
- bypasses access controls;
- fetches WARC content;
- ingests listing content;
- writes to Supabase;
- creates or modifies Source Registry rows.

## Evidence preservation

Legal/terms page bodies are **not stored** in the artifact.

For a successfully fetched legal page, DATA-1.6A stores only:

- requested/final URL;
- HTTP status;
- content type;
- byte count;
- SHA-256 body hash;
- deterministic signal identifiers;
- fetch error if applicable.

This keeps the evidence reproducible while avoiding unnecessary reproduction of third-party legal text.

## Signal taxonomy

The detector can flag review evidence such as:

### Restrictive signals

- explicit reproduction/extraction restriction;
- prior written authorization requirement;
- automated-access restriction;
- commercial-reuse restriction.

### Protected-content signals

- copyright/all-rights-reserved claim;
- database-rights claim.

### Public-channel signals

- public RSS/Atom/XML feed signal;
- public API/developer-documentation signal;
- explicit hyperlink-permission signal;
- explicit open-license signal.

These are **evidence signals only**. In particular:

`PUBLIC API / FEED / ROBOTS ALLOW / CMS CAPABILITY ≠ PERMISSION TO INGEST OR REUSE`.

## Evidence statuses

DATA-1.6A may emit:

- `RESTRICTIVE_TERMS_FOUND`;
- `TERMS_FOUND_NO_EXPLICIT_PERMISSION`;
- `PUBLIC_CHANNEL_SIGNAL_FOUND`;
- `INSUFFICIENT_LEGAL_EVIDENCE`;
- `ROBOTS_BLOCK_ALL`;
- `NOINDEX_OBSERVED`;
- `ACCESS_OR_FETCH_LIMITED`.

These statuses drive only a **review track**, never a policy.

Review tracks:

- `PARTNERSHIP_REQUIRED_REVIEW`;
- `PARTNER_OR_INDEX_ONLY_REVIEW`;
- `PUBLIC_CHANNEL_REVIEW`;
- `MANUAL_LEGAL_REVIEW`;
- `BLOCKED_OR_INDEX_ONLY_REVIEW`;
- `BLOCKED_REVIEW`.

## Fail-closed contract

For every source:

- `policyAssignment = null`;
- `authorizationStatusCandidate = null`;
- `acquisitionModeCandidate = null`;
- `discoveryPolicyCandidate = null`;
- `detailFetchPolicyCandidate = null`;
- `contentReusePolicyCandidate = null`;
- `displayPolicyCandidate = null`;
- `machineGateCandidate = null`;
- `ingestionGateCandidate = null`;
- `displayGateCandidate = null`.

CI additionally requires:

- `readOnly = true`;
- `writesPerformed = 0`;
- `policiesAssigned = 0`;
- `registryCandidateFieldsAssigned = 0`;
- `authAttempts = 0`;
- `bypassAttempts = 0`;
- `warcFetches = 0`;
- exactly one Source Registry read preflight;
- 19 reviewed sources;
- maximum 5 public GETs per domain.

## Outputs

The workflow creates only CI artifacts:

- `source-policy-evidence-review.json`;
- `source-policy-evidence-review.md`;
- `policy-review-queue.csv`;
- `proof.json`.

## Human/legal review boundary

Deterministic text signals are triage aids, not legal conclusions. A restrictive phrase may justify escalating a source, but an absence of detected restrictions never proves authorization. The reviewer must examine the underlying evidence URLs and, where needed, obtain written permission or partnership terms.

## Exit gate

DATA-1.6A stops here:

`DISCOVERED → AUDITED`

The next policy-write lot may proceed only after explicit review of the evidence artifact:

`AUDITED → POLICY_ASSIGNED`

No connector activation, ingestion or publication belongs to DATA-1.6A.
