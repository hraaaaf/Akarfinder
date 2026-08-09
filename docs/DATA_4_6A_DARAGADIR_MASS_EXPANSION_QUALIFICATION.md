# DATA-4.6A — Dar Agadir Mass Expansion Qualification

## Responsibility

Qualify, read-only, the remaining Dar Agadir mass-expansion reservoir beyond the already persistent sitemap-confirmed cohort.

## Hard boundaries

- source: `daragadir.com` only;
- discovery/revalidation channel: current public sitemap only;
- no detail-page fetch;
- no content/image reuse;
- no DB write;
- no freshness write;
- no Registry/policy mutation;
- no production activation;
- no ranking/Search/Map change;
- source request ceiling: 40;
- source redirects must remain same-origin;
- Registry gate must allow sitemap revalidation at execution time.

## Qualification intersection

A candidate is counted conservatively only when it is simultaneously:

1. currently present in the live sitemap;
2. still `seed_only`;
3. normalized;
4. has city, property type, intent, title, price and surface;
5. has technical display metadata;
6. quality tier A or B;
7. already represented by the public Search read model.

DATA-4.6A does not change freshness or display eligibility. It only measures the cohort eligible for a subsequent controlled-write design.

## Output

- `.tmp/data-4-6a/results/proof.json`
- `.tmp/data-4-6a/results/candidate-urls.txt`

The proof contains current sitemap volume, DB reservoir counts, exact conservative intersection and a suggested first checkpoint for DATA-4.6B.

## Exit condition

DATA-4.6A may close only after exact-head CI passes and the live proof demonstrates the current reservoir size with all mutation counters at zero.
