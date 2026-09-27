# AkarFinder — Recovery + HA Convergence

Date: 2026-09-27  
Status: OFFLINE / PROVIDER-INDEPENDENT CONVERGENCE VERIFIED

## Goal

Converge the certified Recovery V4.11 lineage with the still-valid HA/DR safety work from PR #1087 without rebasing or merging the divergent HA branch wholesale.

Success requires:

1. the Recovery lineage remains the data/recovery baseline;
2. provider-independent single-writer safety is present on that lineage;
3. current Supabase runtime mutation surfaces are fenced;
4. provider-specific claims are re-established only from restored-provider evidence;
5. no production provider or Vercel change occurs during this offline lot.

## Verified branch topology

- default `main`: `b0ec9d6a5526bd60c14653a5679b88e2e6d7194d`;
- Recovery convergence base: `78894aa75e1234e920f26b14461222d04316d715`;
- `recovery/source-expansion-400k-candidates-20260925` equals that exact SHA at convergence start;
- Recovery base contains PR #1095 and the later #1099/#1100 safety decisions;
- old HA PR #1087 head: `1251603620410d37f1f1dcb9209025ca582a6b31`;
- old HA and main are divergent; #1087 must not be rebased or merged wholesale.

Current convergence branch:

- `infra/recovery-ha-convergence-20260927`;
- PR #1101, DRAFT;
- base: `recovery/source-expansion-400k-candidates-20260925`.

## Recovery facts retained

The V4.11 Recovery work remains authoritative for this convergence:

- certified corpus: 226,286 normalized URLs;
- selected conservative cohort: 8,367 rows;
- 21 ambiguous rows quarantined at G6;
- isolated Neon readback after the certified import: 8,544 `property_listings`, 8,544 `listing_sources`, 8,367 active V4.11 sources;
- readback integrity reported 0 orphans, 0 duplicate URLs, 0 duplicate fingerprints, 0 missing core fields and 0 invalid provenance;
- production Neon writes: 0;
- Vercel deployment: 0.

The later Recovery policy from #1100 also remains in force: remaining V4.11 rows must pass pre-DB verification before any DB entry.

## HA delta classification

### A — PORT NOW

Provider-independent runtime safety:

- `lib/db/ha-writer-state.ts`;
- `lib/db/ha-write-policy.ts`;
- state-transition and split-brain tests;
- fail-closed Supabase write fencing on current runtime mutation surfaces;
- static mutation discovery/audit;
- write-surface ordering guards.

Reason: these protections reduce split-brain risk without requiring a live provider, a Neon runtime implementation, a DB mutation, or a production switch.

### B — REUSE AS HISTORICAL BEHAVIORAL EVIDENCE, THEN REVALIDATE ON THE CONVERGED CODE

The old HA branch proved generic disposable PostgreSQL 17 behavior for:

- forward/reverse logical replication rehearsal;
- interruption and catch-up resilience;
- anti-loop behavior;
- writer fencing during failover/failback;
- sequence/identity failback reconciliation work;
- evidence-contract hardening.

These results are useful evidence about the design. They are not current-provider certification and do not certify the new Recovery branch until the corresponding implementation is present and current-branch checks are green.

### C — REBASELINE AFTER SUPABASE RESTORE

Do not copy old conclusions as current facts for:

- restored Supabase ↔ certified isolated Neon baseline parity;
- live capability inventory;
- table allowlist and dependency closure;
- schema fingerprints;
- replica identity;
- sequence/identity state;
- replication slot/LSN boundaries;
- provider-specific `origin` semantics;
- incident write set;
- production RPO/RTO;
- live failover/failback runbook steps;
- current read-provider and write-provider routing.

Reason: Recovery V4.11 changed the target dataset and the source is being restored. Provider state must be measured again.

### D — DO NOT PORT WHOLESALE

Do not reuse as a branch-level operation:

- PR #1087 as a whole;
- old Neon migration/cutover workflow assumptions;
- old provider baseline artifacts as current parity proof;
- the HA replication canary migration before restored-provider comparison;
- old `lib/db/provider.ts` Neon wiring until the current Recovery runtime architecture is explicitly rebaselined.

Current Recovery `lib/db/provider.ts` supports only `sqlite|supabase`. Adding the old read-provider wiring now would silently reintroduce migration assumptions outside this lot.

## Runtime fencing port — current state

The convergence branch contains the HA write guard on all 26 historical Supabase mutation-bearing files identified by the old exact-head runtime audit.

Static readback on 2026-09-27 confirmed every one of the 26 files contains:

- an HA write-policy import; and
- one or more `assertHaSupabaseWriteAllowed()` calls.

Three files had diverged from the old HA patch context and were adapted manually against their current Recovery code instead of forcing the patch:

- `lib/public-property-index/supabase-index-store.ts`;
- `lib/search-gateway-cache/supabase-cache-store.ts`;
- `lib/seller/owner-listing-projection.ts`.

Dynamic CI remains required before this port can be called proved.

## Generic PostgreSQL 17 rehearsal port — current state

Three provider-independent rehearsals from old HA #1087 are now selectively ported onto the Recovery convergence branch:

- `.github/workflows/ha-isolated-rehearsal.yml` — forward/reverse logical replication, anti-loop, writer fencing, failover/failback on two disposable PostgreSQL 17 nodes;
- `.github/workflows/ha-isolated-resilience-rehearsal.yml` — interruption/catch-up resilience on disposable PostgreSQL 17 nodes;
- `.github/workflows/ha-isolated-sequence-failback.yml` — sequence/identity failback reconciliation on disposable PostgreSQL 17 nodes.

Their old PR base trigger was adapted from `infra/neon-migration-20260923` to the current Recovery base `recovery/source-expansion-400k-candidates-20260925`. They contain no provider credentials and do not contact Supabase or Neon.

The old `ha-isolated-baseline-parity-rehearsal.yml` was deliberately **not** ported: it depends on old HA baseline/helper assumptions and belongs in the post-restore rebaseline step.

## Current verification state

Static proof:

- Recovery base exactness: PASS;
- runtime `app/` / `lib/` drift from main across the 228 Recovery commits: none;
- 26/26 historical Supabase mutation surfaces contain HA fencing: PASS;
- provider/live access during this lot: 0;
- Vercel deployment: 0.

Dynamic proof on HEAD `0e6584a6d9d2d329443ac730a08811945ae732fa`:

- HA Isolated Replication Resilience Rehearsal — run 36318212649 — SUCCESS;
- HA Isolated Sequence Failback Reconciliation — run 36318212605 — SUCCESS;
- HA Isolated Logical Replication Rehearsal — run 36318212688 — SUCCESS;
- CI Workflow Efficiency Policy — run 36318212664 — SUCCESS;
- DATA P0 Owner Listing Integration — run 36318212595 — SUCCESS.

The provider-independent/offline HA convergence sub-lot is therefore verified. This does **not** certify live Supabase↔Neon HA or authorize provider mutation/cutover.

## Post-restore sequence

After an explicit restore-complete signal:

1. one minimal source health/read-only sanity check;
2. read-only restored Supabase inventory;
3. read-only certified Neon inventory;
4. compare schemas, counts, PK sets, content fingerprints, FK integrity, replica identity and sequence state;
5. decide whether the certified Neon cohort is a reusable baseline or a new baseline is required;
6. only then prepare provider-specific replication/canary work;
7. only after provider mutation rehearsal may incident write routing be considered;
8. production cutover/deployment remains a separate explicit human gate.

## Safety invariants

- no Supabase SQL while restore is not explicitly complete;
- no Neon mutation in this convergence lot;
- no provider switch;
- no publication/subscription creation;
- no Vercel deployment without explicit authorization;
- no claim of provider HA readiness from isolated PostgreSQL evidence alone.

## Next exact

Wait only for the explicit Supabase restore-complete signal before any provider access. Once received:

1. minimal read-only Supabase health check;
2. restored Supabase inventory;
3. certified isolated Neon read-only inventory;
4. exact parity/rebaseline comparison;
5. decide provider-specific HA delta;
6. prepare provider-specific rehearsal/canary only from current evidence.

No Vercel deployment or production cutover is authorized.