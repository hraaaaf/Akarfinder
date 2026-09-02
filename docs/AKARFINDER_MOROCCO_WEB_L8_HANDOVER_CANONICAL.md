# AKARFINDER — Morocco Web Acquisition L8 — HANDOVER CANONICAL

Status: **ACTIVE**

Last verified: **2026-09-02**

This file is the **canonical restart / handover entrypoint** for L8. For deeper historical evidence, read `docs/AKARFINDER_MOROCCO_WEB_L8_SCALE_COVERAGE.md`.

If this file and the detailed scale document disagree on runtime status, **this handover file wins until the detailed document is refreshed**.

---

## Goal

Build and certify **more than 100,000 usable Moroccan real-estate listings** from public web inventory.

Success is **not** raw discovery URL volume. A listing only counts toward the final target after:

1. public source-first enumeration;
2. listing-detail validity;
3. active/fresh validation;
4. canonical extraction with source evidence;
5. cross-source deduplication;
6. quality / Listing Factory admission where observable;
7. serve admission for validated canonical records.

Final scale gates: **10k → 50k → 100k usable canonical listings**.

---

## Guardrails

- Public content only.
- No CAPTCHA bypass.
- No credential abuse.
- No private/internal API unless explicitly authorized and legitimately public-facing.
- No proxy/fingerprint/block evasion.
- Respect robots rules and source crawl delays.
- Stop on HTTP 429 / hard block.
- Current L8 enumeration is read-only against production Supabase.
- No bulk production DB mutation without a separately authorized bounded canary + rollback proof.
- No Vercel deployment without explicit human approval.

---

## Repo state

Repository: `hraaaaf/Akarfinder`

Main HEAD verified before this handover commit:
`b289cd800d43f3fbd596d95f525d7488381f2cc1`

Detailed L8 canonical:
`docs/AKARFINDER_MOROCCO_WEB_L8_SCALE_COVERAGE.md`

---

# Completed evidence

## L1–L7

L1 Discovery, L2 portal expansion, L3 Common Crawl, L4 extraction, L5 dedupe, L6 freshness/revisit, and L7 bounded production ingestion are already certified in their prior canonical evidence.

L7 first production canary:
- target: `public.discovery_candidates` only;
- before: 0/3;
- inserted: 3;
- after: 3/3;
- exact delta: +3;
- no canonical publication;
- no Vercel deployment.

Do not reopen L1–L7 unless a dependency regresses.

---

# L8 current state

## Production raw corpus baseline

Verified 2026-09-02 in Supabase project `AqarFinder` / `kusfiyimwvxblvsrhaes`:

- total `discovery_candidates`: **304,933**
- rejected: **142,143**
- unclassified: **137,868**
- accepted: **13,757**
- discovered: **11,165**

These counts are **not** usable-listing certification.

Supporting triage of the 137,868 unclassified rows:
- 5,536 listing-detail candidates;
- 44,749 discovery pages;
- 7,420 obvious noise;
- 80,163 uncertain.

The triage is useful for cleanup but is **not the critical path** to >100k.

Current critical-path doctrine:

`productive source → public shard/sitemap manifest → listing IDs/URLs → freshness → extraction → dedupe → quality → serving`

---

# Source 1 — Mubawab

Core enumerator merged via PR #988.

Merged commit:
`c7306784653339ab942a69403cfaca9a39688973`

Robots constraint:
- current robots disallows `:` paths;
- legacy `:p:N` pagination removed;
- enumerator rejects colon paths.

Production source slice:
- source rows: **14,750**
- unique robots-safe public shards: **3,172**

Certified gates:

### Gate 25
- run `33662143708` — SUCCESS
- 25 shards
- 615 listing references
- **301 unique listing IDs**
- 22/25 productive
- no 429
- zero DB writes

### Gate 100
- run `33662906605` — SUCCESS
- 100 shards
- 2,149 listing references
- **663 unique listing IDs**
- 89/100 productive
- no 429
- zero DB writes

### Gate 500
- run `33663293707` — SUCCESS
- 500 shards
- 9,533 listing references
- **5,195 unique listing IDs**
- 427/500 productive
- ~45.5% cross-shard overlap
- no 429
- zero DB writes

Mubawab remains productive, but **full Mubawab is no longer the immediate critical path** until Avito + Sarouty union evidence is measured.

---

# Source 2 — Avito

Core source-first implementation merged via PR #989.

Merged commit:
`ef2af49f96aeb8b2b4962d0f90bad8fa35a85452`

## Sitemap verdict

Public robots declares `https://www.avito.ma/sitemap.xml`.

Safety probe run `33665119348`:
- robots accessible;
- sitemap declared;
- sitemap request returned HTTP 403 from GitHub runner;
- no bypass attempted;
- zero DB writes.

Therefore Avito acquisition uses only public discovery shards that respond normally.

## Certified scale gates

### Gate 25
Run `33665320708` — SUCCESS
- source rows: 11,907
- safe public shards: 2,505
- selected/requested: 25/25
- 716 listing references
- **689 unique listing IDs**
- 23/25 HTTP 200 productive
- 2/25 HTTP 403 respected
- ~3.77% overlap
- no 429
- zero DB writes

Artifact: `9860501534`
Digest: `sha256:a31e42e6c3e00dd87ef17f884ac7cbdfa841477e1b0a078520dc123b865e2d54`

### Gate 100
Run `33666296763` — SUCCESS
- selected/requested: 100/100
- **2,652 unique listing IDs**
- 26.52 IDs/shard
- 9/9 unit tests PASS
- no 429
- zero DB writes

Artifact: `9860777972`
Digest: `sha256:a7cb05be67130e36172ce8a85769420a26607fe1c907f7aba8e0b55e37847f35`

### Gate 500
Run `33667799510` — SUCCESS
- selected/requested: 500/500
- **12,172 unique listing IDs**
- 24.34 IDs/shard
- 9/9 unit tests PASS
- no 429
- no early stop
- zero DB writes

Artifact: `9862395809`
Digest: `sha256:867b00cc5bcda186cc136d657f163112cf071dab4bffbeec8cc42db0acaaa5cd`

## FULL MANIFEST — CERTIFIED

Branch:
`feat/avito-full-manifest`

HEAD:
`4866fe6e33525c24a867b0d7559d438c520ddb84`

Run:
`33672899097` — **SUCCESS**

Exact result:
- source rows: **11,907**
- safe shard manifest: **2,505**
- selected shards: **2,505 / 2,505**
- HTTP requests: **2,505 / 2,505**
- **27,053 unique real-estate listing IDs**
- stoppedEarly: `null`
- no HTTP 429
- zero DB writes
- runner unit tests: **4/4 PASS**

Artifact:
`9865177626`

Artifact digest:
`sha256:f952e9e6d57c1752dd2c1762a0bdd95c24e083dfa7bbead7b7a6e8474d0f9836`

This is the strongest current L8 source-scale proof.

Important: **27,053 enumerated Avito IDs are not yet 27,053 usable canonical listings**. Freshness, canonical extraction and cross-source dedupe still remain.

---

# Source 3 — Sarouty

Preparation branch:
`feat/sarouty-source-first`

Preparation HEAD verified:
`197c39ede17f7e5dd7fed165f064c931423d9163`

Current public robots contract recorded in the detailed canonical:
- sitemap index: `https://www.sarouty.ma/sitemap_index.xml`
- `Crawl-delay: 10` for `User-agent: *`

Observed listing identity formats that must be supported:
- SEO transaction URL ending `-<listing_id>/`
- `property-details/?listing_id=<id>`
- legacy `/plp/...-<id>.html`

Prepared enumerator contract:
- public robots + declared sitemap docs only;
- recursive sitemap-index support;
- gzip support;
- all observed listing-ID formats;
- dedupe by listing ID;
- enforce at least 10 seconds between Sarouty requests;
- immediate stop on HTTP 429;
- zero DB writes.

**No Sarouty live scale result is certified yet.**

---

# Decisions already made

1. The >100k target is explicitly **multi-source**.
2. Raw `discovery_candidates` volume does not count as success.
3. Avito is currently the strongest source reservoir, with **27,053 unique IDs certified** from its entire current safe manifest.
4. Do **not** waste another immediate benchmark on Avito; full manifest is already exhausted/certified.
5. Do **not** bypass Avito sitemap 403.
6. Next source is Sarouty, respecting its 10-second crawl delay.
7. Mubawab full replay is deferred until multi-source union shows whether it is still necessary.
8. No production bulk writes are currently authorized.
9. No Vercel deployment is required for this L8 acquisition work.

---

# Next exact

**Certify Sarouty source-first.**

Exact sequence:

1. Rebase/refresh `feat/sarouty-source-first` against current `main` if needed.
2. Run Sarouty unit tests.
3. Verify robots parser and enforced `Crawl-delay >= 10s`.
4. Run a very small live sitemap/document probe first.
5. If green and no 429/block, enumerate declared sitemap inventory under the same 10-second delay.
6. Record exact unique listing-ID total + artifact + digest.
7. Update this handover canonical and the detailed L8 canonical.
8. Then measure source union: Avito + Sarouty + Mubawab certified IDs/URLs.
9. Apply freshness + canonical extraction + cross-source dedupe to move from enumerated IDs to **usable canonical listings**.
10. Certify 10k → 50k → 100k usable gates.

If Sarouty blocks or becomes unproductive, pivot next to **MarocAnnonces**, then **Agenz**. Do not burn time trying to defeat a hard block.

---

# Remaining sequence to L8 closeout

`Sarouty certification → MarocAnnonces/Agenz if needed → multi-source union → freshness validation → canonical extraction → cross-source dedupe → quality admission → 10k usable → 50k usable → 100k usable → bounded production-ingestion plan/canary if required → closeout docs → merge/post-merge verification`

---

# Human gates

Only stop for human approval when required by project rules, especially:

- bulk production DB mutation / ingestion apply;
- Vercel deployment;
- irreversible production-critical action.

Read-only enumeration, tests, CI, docs, safe PRs and merges may continue autonomously.

---

# Resume checklist for a new window

1. Read this file first.
2. Verify current `main` HEAD.
3. Verify `feat/sarouty-source-first` HEAD and whether it has diverged from main.
4. Check GitHub Actions load once before any heavy benchmark.
5. Continue from **Sarouty unit/live certification**.
6. Do not reopen already certified Avito/Mubawab gates unless evidence regresses.

---

## Current handover state

- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- strongest current enumeration proof: **Avito full = 27,053 unique IDs**
- active next source: **Sarouty**
- production DB mutation: **none pending / none authorized**
- Vercel deployment: **not required / not authorized by this file**
- real blocker: **none at handover creation**
- Next exact: **Sarouty unit tests → tiny robots/sitemap live probe → bounded source-first certification**
- global project percentage: **intentionally unassigned; do not invent one**
