# AkarFinder V7 multi-site, GitHub Actions

## Objective and proof boundary

Goal: grow beyond V6.4.6 Mubawab-only into a centrally normalized,
multi-source Akarfinder discovery architecture, ultimately scheduled every
ten minutes via GitHub Actions, staged privately through AkarParser V3.

This draft introduces **two offline connectors**, NOT two active live scrapers.
V6.4.6 is reused as a signed Mubawab snapshot producer; Agenz accepts
externally supplied observations of individual pages with an exact URL/ID.
Neither adapter establishes freshness, rights, availability or site coverage.

## Source registry, not a coverage claim

| Portal | Adapter status | Unresolved gate |
| --- | --- | --- |
| Mubawab | offline HMAC snapshot | approved live source + durable trusted-head |
| Agenz | offline individual observation | independent live source verification |
| Avito | NOT integrated | source onboarding |
| Sarouty | NOT integrated | source onboarding |
| MarocAnnonces | NOT integrated | source onboarding |
| Yakeey | NOT integrated | source onboarding |
| Mitula | NOT integrated | aggregator/dedup review |
| Immoneuf Avito | NOT integrated | program-neuf strategy |
| Masaken | NOT integrated | source onboarding |
| Portail-Immobilier | NOT integrated | source onboarding |

Other agency/developer portals may be onboarded after evidence and a
specific source adapter. This inventory is NOT an assertion of exhaustive
Moroccan site coverage or permission to collect.

## Onboarding per source

1. Verify permitted entry points, terms, robots, and stable retrieval
   without bypassing challenges or retrying 403/429.
2. Capture *authorised* individual-page snapshots and representative
   ground-truth labels; no site-derived accuracy claim from synthetic tests.
3. Identify canonical domain, page vs SERP, portal listing ID, redirects,
   transaction, property type, currency, price and area semantics.
4. Implement a source adapter that is reject-by-default, then run
   adversarial parsing and manual source-precision benchmarks.
5. Preserve URL/ID and provenance; **first discovered** is not editorial
   **published_at**. Keep uncertain fields empty.
6. Stage with real AkarParser V3 and the private Radar10 DB layer.
   No automated public admission or cross-site physical-property identity.
7. Evaluate source yield, latency, access blocks, 0/partial records,
   revisit churn, suspected physical duplicates, and measured coverage.

## Tests and API

The real pipeline lives in pipeline.py and only uses supplied inputs:
- signed V646 snapshot: --verified-v646-root ROOT; it invokes the actual
  immutable read_verified_publication code, never unsigned artifacts
- externally supplied Agenz individual records: --agenz-jsonl FILE
- all output local to a private temporary directory
- code pathway: source-specific bridge -> AkarParser V3 run() ->
  Radar10 strict normalization -> aggregate counters
- 0 network calls, 0 DB writes, 0 published listing admissions

An Agenz record must contain source_url, evidence_url (exact URL),
source_offer_id, observation_kind=individual_page, transaction_type=sale,
property_type=apartment and optional explicit title, city, district,
price_mad and surface_m2. The evidence assertion is supplied by the
input producer; the adapter does not verify the website content. Only
sale-apartment pages are currently covered by this connector.

The normalizer in ../radar10/ingest.py now accepts only canonical V646
and Agenz individual-page URL/ID formats. The source domain is canonical,
so www and non-www aliases share the same source/offer identity.
The existing PostgreSQL private staging transaction and RLS checks are
unchanged except for multi-domain identity support.

## GitHub Actions 10-minute plan: NOT ACTIVE

.github/workflows/akar-v7-multisource-gate.yml defines cron on minute
3,13,23,33,43,53. GitHub scheduled workflows execute only when the
workflow is on the default branch, and timing can be delayed or dropped.
This workflow is currently only a stacked Draft PR. Its **only**
scheduled job is a guarded NO-NETWORK status probe, disabled by default
without repo variable AKAR_V7_SCHEDULE_PROBE_APPROVED=approved.

The Pull Request CI job tests signed V646 synthetic fixture -> genuine
V3 -> Radar10 validator, separate Agenz synthetic fields and ephemeral
PostgreSQL 17. It never contacts real estate portals or production DB.
No special GitHub Actions secret is needed for CI. No raw page artifact is
uploaded. CI green != live portal correctness.

Critical unsolved blockers for live ingestion on GitHub-hosted runners:
- Runners are ephemeral. They cannot maintain V646 SQLite history or
  a tamper-resistant trusted HMAC generation log between runs without
  separately designed and reviewed persistent external state.
- Source-specific live acquisition is not implemented/certified for Agenz
  or the other eight inventoried portals; current V646 source limits
  and source site restrictions still apply.
- Notion's hourly ChatGPT discovery radar is separate. There is no
  approved live feed that promotes its observations into V7.
- No private Supabase migration/login/CA secret is provisioned.
- The workflow has not been approved for main or real collection.
- A ten-minute cron does not guarantee site completeness or run precision.

## Next exact sequence
1. Observe the CI at the latest source SHA and fix red tests.
2. Finalize documentation and update Notion with confirmed evidence.
3. After distinct source/live + security approval, add one genuine
   network connector at a time with offline golden fixtures and
   source-specific accuracy reports.
4. Design external durable anti-replay state for Actions; provision
   least-privilege staging secret with explicit operator approval.
5. Review and approve a main-branch workflow, test source canaries,
   then verify 24h schedule and actual new URL yield.
6. Only then retire the hourly ChatGPT radar and consider separate
   public admission/merge/Vercel approvals.
