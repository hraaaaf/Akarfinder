# AKARFINDER — Morocco Web L8 Scale + Coverage Certification

Status: ACTIVE.

## Goal

Turn the existing production discovery corpus into a measurable, high-quality Moroccan real-estate inventory by certifying scale gates on **accepted / active / deduplicated / sufficiently complete** inventory rather than raw URL volume.

## Starting production baseline — 2026-09-02

Supabase project: `AqarFinder` / `kusfiyimwvxblvsrhaes`.

Verified `public.discovery_candidates` counts:
- total rows: **304,933**;
- `rejected`: **142,143**;
- `unclassified`: **137,868**;
- `accepted`: **13,757**;
- `discovered`: **11,165**.

The raw 10k/50k/100k/250k candidate thresholds are therefore already exceeded in total-row terms. This does **not** certify the corresponding usable-inventory gates.

Top observed source domains include:
- `mubawab.ma` 14,750;
- `agenz.ma` 12,725;
- `avito.ma` 11,907;
- `1immo.ma` 9,371;
- `sarouty.ma` 8,718;
- `immobilier.trovit.ma` 8,400;
- `immo.mitula.ma` 7,685;
- `daragadir.com` 6,189;
- `ma.afribaba.com` 5,481;
- `masaken.ma` 4,978;
- `marocannonces.com` 4,285.

The same top-domain scan also exposes clear non-property/noise domains such as `support.google.com`, `reddit.com`, `youtube.com` and `tiktok.com`. Therefore L8 must measure quality and admission, not celebrate raw corpus size.

## Certified entry condition from L7

First production canary is certified:
- before snapshot: 0/3;
- inserted: 3;
- duplicates: 0;
- failures: 0;
- after snapshot: 3/3;
- exact DB delta: +3;
- target remained `discovery_candidates` only;
- no canonical listings publication;
- no Vercel deployment.

Canonical evidence: `docs/AKARFINDER_MOROCCO_WEB_L7_CANARY_HARDENING.md`.

## L8 success gates

Raw candidate count is an input metric only. A scale gate passes only when inventory is measured through these layers:

1. **Discovery corpus** — unique candidate identities.
2. **Source quality** — real-estate source/domain classification; noise quarantined.
3. **Listing-detail validity** — public page is a property listing rather than search/category/social/help content.
4. **Active/fresh** — page remains active under L6 semantics.
5. **Canonical extraction** — minimum required property facts are supported by source evidence.
6. **Deduplication** — cross-source duplicates collapsed without provenance loss.
7. **Listing Factory quality** — canonical object gets completeness/trust/media quality passport.
8. **Serve admission** — only validated canonical records are eligible for search serving.

## Scale gates

Certification sequence:
- Gate A: **10k usable canonical candidates**;
- Gate B: **50k**;
- Gate C: **100k**;
- Gate D: **250k**;
- Gate E: **500k**, only if the public Moroccan market and source stability support it.

Each gate requires observed counts by:
- source/domain;
- city/geography;
- property type;
- transaction type;
- freshness bucket;
- admission/rejection reason;
- dedupe prevalence;
- completeness/trust distribution.

## Immediate L8 problem

The production corpus is already large enough that **classification debt**, not discovery volume, is the dominant bottleneck:
- 137,868 rows remain `unclassified`;
- 142,143 rows are already rejected;
- only 13,757 are currently `accepted`;
- visible noise domains prove that raw discovery includes non-property content.

Therefore the shortest path to the north-star is to build a bounded **Corpus Triage + Admission Audit** before adding more discovery volume.

## Next exact

1. Measure accepted/unclassified/rejected distributions by source domain using bounded indexed queries.
2. Define deterministic source-domain triage: real-estate / aggregator / agency / developer / noise / unknown.
3. Audit a representative bounded sample from the largest `unclassified` domains.
4. Quantify how many rows can safely move toward listing-detail validation and canonical extraction.
5. Produce the first usable-inventory Gate A denominator without bulk DB mutation.

No Vercel deployment is required. Any bulk production status mutation remains separately bounded and audited.
