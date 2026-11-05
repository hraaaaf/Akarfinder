# AkarFinder R2 — Freshness evidence gate — 2026-11-05

**Status: OBSERVATION AUDIT PASS / CURRENT FRESHNESS UNVERIFIED / NO_PROD_WRITE / NO_DEPLOY.**

## Goal, success, proof
Goal: distinguish a source identity, a historical active flag, a last-seen timestamp, and a **trusted positive recent availability confirmation**. R2 may mark a source offer as active/fresh **only** with verified status + reference + checked_at within the accepted time horizon, independent of discovery and ingestion time.

Success for this audit: reproducible per-source archived counts and an explicit fail-closed decision. This is **not** proof of a present-day inventory or a live partner feed.

### Verified GitHub R1 prerequisite
- Draft PR #1158 HEAD `9fafcb8385165dbe533bf5d333938e1784887de4`, dedicated [CI #42034845618](https://github.com/hraaaaf/Akarfinder/actions/runs/42034845618) **SUCCESS**.
- Exact source-key union **77,072** (Avito 40,200; Mubawab 36,872); intersection 685 (328 + 357); **12,815 archived Neon rows with no numeric explicit identity quarantined**.
- `fresh_unique_eligible=UNKNOWN`. R1 identity union is NOT 77,072 live or distinct physical properties.

## Read-only Neon recovery proof
**Database:** project `ancient-violet-43534870`, branch `br-cold-mouse-b2a50yaa`, database `AkarFinder` (archived, not production). **As-of:** 2026-11-05 13:03 UTC, 48-hour interval to 2026-11-03 13:03 UTC.

| Source | Rows | is_active=true | missing last_seen_at | observed last 48h | observed since Oct 6 | latest last_seen_at UTC |
|---|---:|---:|---:|---:|---:|---|
| avito.ma | 14,000 | 14,000 | 256 | 0 | 0 | 2026-09-08 11:09:09.601 |
| mubawab.ma | 44,099 | 44,099 | 16,020 | 0 | 0 | 2026-09-08 11:14:08.493 |
| mubawab (alias) | 13 | 13 | 0 | 0 | 0 | 2026-07-13 15:16:27 |
| **TOTAL** | **58,112** | **58,112** | **16,276** | **0** | **0** | — |

The three sources have historical `is_active=true` throughout, **even though none has recent recorded observations in this archived branch**. This demonstrates that `is_active` cannot establish present-day activity/freshness.

**Evidence SQL:** `scripts/audits/r2_archived_freshness_snapshot_2026-11-05.sql`. Aggregates only. SQL source columns confirmed via `information_schema.columns`; no fields for trusted activity-verifier, evidence-reference and checked_at were found in `listing_sources` or `property_listings`. This is a **scope-limited schema observation**, not an assertion about all possible pipelines.

**Careful interpretation:** The archive cannot attest actual present-day availability. Zero observations in this historical database does **not** prove that zero listings are live on their source websites. Therefore the verified present-day count is **UNKNOWN**, never `0` or `58,112`.

## Existing implementation — do not duplicate
- Existing draft [PR #1155](https://github.com/hraaaaf/Akarfinder/pull/1155) implements a fail-closed partner feed bridge in `lib/feeds/partner-v2-bridge.ts`: source-update timestamp cannot fall back to `now`; no recent verified positive activity evidence means `availability_status='unknown'`; positive activity requires a nonempty reference, upstream `verified=true`, `status='available'` and checked_at age **0–48h**; delete/unpublish are lifecycle events.
- **#1155 remains DRAFT/unmerged.** `verified=true` is an assertion from the caller, **not independent proof of a real partner license or live availability**. Treat it as a software gate only until the trusted verifier and real source evidence are reviewed.
- `lib/feeds/schema.ts` and `lib/feeds/staging.ts` already handle partner ingestion and tombstones. Reuse them; no duplicate ingestion implementation.

## R2 acceptance gates
1. **Source provenance:** stable source-scoped identity, trusted verifier, explicit reference.
2. **Current activity:** `status=available` positively verified at `checked_at`, not just `is_active=true` or `last_seen_at`. Time must not be future; temporary SLA proposal 48h, pending source agreement.
3. **Negative transitions:** delete/unpublish/withdrawn overrides prior active observations; no stale activation.
4. **Rights (R3):** separate independently verified permission to index/display, not inferred from source URLs or bridge assertions.
5. **Physical uniqueness:** separate conservative grouping, not merely exact source-key union.
6. **KPI:** no numeric `fresh_unique_eligible` until all gates pass on real authorized live sources.

## Next exact (autonomous)
1. Check whether a real authorized partner feed + independent positive availability event source is presently connected. If not, label **R2_EXTERNAL_SOURCE_BLOCKED** rather than inventing live proof.
2. Audit the R2 negative pathways in the already-prepared #1155 bridge, plus any consumer that could promote `is_active` or `last_seen_at` to availability.
3. Obtain a bounded real authorized feed sample (only after partner agreement and applicable permission), verify activity evidence and tombstones under 48h or contracted SLA, run integrated tests.
4. Publish aggregate R2 report in GitHub and Notion; R3 rights audit only after establishing source-specific authorization evidence.
5. No production DB write, external mass crawl, merge, or Vercel deploy without distinct approval.

**Canonical relationship:** [R1 audited source identity](AKARFINDER_R1_LOCAL_NEON_FULL_RECONCILIATION_2026-11-05.md); [200k roadmap](AKARFINDER_200K_FRESH_INVENTORY_ROADMAP_2026-11-04.md). The roadmap's older "R2 = first 10k eligible" milestone is **not met** by this R2 freshness subgate; maintain that distinction.

## Canonical adapter finding and safe code gate (R2 implementation)
**Observed code defect:** `lib/partners/partner-listing-v2.ts::adaptPartnerListingV2` previously mapped `availability_status="unknown"` (also `reserved`, `upcoming`) into canonical `offer_status="active"`. The canonical schema supports `offer_status="unknown"`; treating missing positive proof as active is unsafe for freshness KPIs.

**R2 branch fix:** only `availability_status="available"` maps to `offer_status="active"`; `sold/rented/withdrawn` map to `inactive`; `unknown/reserved/upcoming` map to `unknown`. This preserves the distinct availability status, identity and source timestamp. **It does not independently prove positive activity** — that still requires a trusted upstream evidence source and the unmerged bridge gate in draft PR #1155.

**Regression:** 2 targeted cases added to the existing `scripts/scrapers/__tests__/partner-listing-v2.test.ts` and an isolated PR CI workflow `.github/workflows/akar-r2-freshness-evidence-gate.yml` running `tsx --test` and `tsc --noEmit`. No production activation.

**Testing status at authoring:** tests committed but **execution not yet certified**. Do not claim R2 PASS until dedicated CI is green. R2 live availability remains UNKNOWN irrespective of CI.
