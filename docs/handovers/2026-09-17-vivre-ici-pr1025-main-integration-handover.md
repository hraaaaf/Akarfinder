# HANDOVER — AkarFinder / Vivre Ici — current-main integration — 2026-09-17

Repository: `hraaaaf/Akarfinder`

Canonical: `3-vivre-ici-akarfinder.md`

Safe integration branch: `integration/vivre-ici-main-2026-09-17`

Integration PR: `#1037` — DRAFT / `mergeable=true` / NOT MERGED / HUMAN GATE

Historical source PR: `#1025` — OPEN / `mergeable=false` / `72` changed files / `247` commits — DO NOT MERGE DIRECTLY

Verified main base: `8578f7a492980dcac35e7a094383c70411ca44c5`

Historical source HEAD: `75d28ef7652bda9a59b0ed1ac5a0a81d418d0aee`

Certified source product HEAD: `f1f4d35ecdd0a5a6b83df1dc945e2d291e9b2533`

Product transplant commit: `0c84954d1c2ce53938677e9cb2b89e9241c52260`

Exact certification HEAD: `f5d5bce0edac47021953cd7cb091fc60fde52cdd`

Workflow-trigger restore commit: `33e30f72b6c26e02a60f460d6fad73856c717599`

Final product tree: `b04bc649746b5b2a3733e058af0ca59df8dc2930`

No production DB write. No Vercel deployment authorized or observed for the integration branch.

---

## GOAL

Integrate the certified Vivre Ici `/map` product onto current `main` while preserving the newer shell/navigation, then certify browser/build/visual behavior before any merge.

## RESULT

**The integration is implemented and certified on PR #1037. Merge has NOT been authorized.**

Supabase live gates remain externally blocked by `exceed_egress_quota` and stay fail-closed.

---

## SOURCE → MAIN RECONCILIATION

Historical PR base: `b8c89681358e93ec254016bcca9b78f4717ea8de`.

Current main: `8578f7a492980dcac35e7a094383c70411ca44c5`.

The actual live overlap is exactly 5 paths:
1. `components/layout/MobileBottomNav.tsx`
2. `scripts/audits/ux-bottom-nav-10of10-1.mjs`
3. `scripts/audits/ux-premium-bottomnav-glass-1.mjs`
4. `scripts/scrapers/__tests__/ux-bottom-nav-10of10-1.test.ts`
5. `scripts/scrapers/__tests__/ux-premium-bottomnav-glass-1.test.ts`

Decision: current-main contract wins on all five. Preserve `PRODUCT_MOBILE_BOTTOM_NAV`, `/map → Vivre ici`, the current five-item mobile navigation and current glass contract.

Do not reuse older overlap names from stale summaries.

Integration arithmetic:
- 72 historical PR paths;
- 5 main-owned overlaps excluded from transplant;
- 3 docs deferred to closeout;
- **64 product/harness paths transplanted** in `0c84954d…`.

`0c84954d…` is a direct child of verified main `8578f7a…`; its diff contains exactly those 64 paths and none of the five overlaps.

---

## EXACT CERTIFICATION

The available connector did not expose `workflow_dispatch`. Two workflow branch filters were temporarily adapted on the integration branch only, without product-code changes, so AFTER and N3 could run on the same exact HEAD.

Certification HEAD: `f5d5bce0edac47021953cd7cb091fc60fde52cdd`.

### AFTER integration
Run `35282869300` — SUCCESS  
Artifact `10523630593`  
Digest `sha256:c4d0fe087d7194bb5554c109f87d5d9750ffd088d9f2edf94a4a0bc15822a4fb`

Passed:
- npm install contract;
- current-main navigation contracts;
- TypeScript;
- production build;
- Chromium capture;
- AFTER validator.

8/8 cases (`national + N3 × 390×844 / 430×932 / 768×900 / 1280×900`):
- HTTP 200;
- horizontal overflow 0;
- Supabase requests 0;
- page errors 0;
- national TopoJSON ready, 12 regions / 12 entries;
- N3 MapLibre ready, OpenFreeMap vector, 52–77 buildings depending viewport;
- decision rail visible;
- false zero signal grid hidden when `anchorCount=0`;
- exact Search CTA and territory-back link preserved;
- `zeroDbWritesByScript=true`;
- `zeroDeploymentActionsByScript=true`.

### N3 integration
Run `35282869261` — SUCCESS  
Artifact `10523455762`  
Digest `sha256:700a62489b3943345ca505829e11e92801a4a0420cf232d9fe9a7e351432eb4b`

`report.json`: `ok=true`; 390 + 1280 both select Casablanca → Maârif, MapLibre ready, Search rendered, exact handoff `/search?city=Casablanca&district=Ma%C3%A2rif`, overflow 0.

### Trigger cleanup
The temporary workflow trigger edits were restored at `33e30f72…`.

Original blobs now present again:
- `.github/workflows/vivre-ici-after.yml` → `32e06198cc44267c47628768d3b9fb17b754c369`
- `.github/workflows/carte-national-journey-n3.yml` → `62cf743d21457b30d61bcbf7354a615a6b7f2556`

No product code changed after the certified HEAD; only workflow trigger restoration and closeout docs changed.

---

## BEFORE / AFTER — EXACTLY WHERE TO LOOK

### Historical BEFORE
Run `34977355451`  
Artifact `10399777496`

Naming trap: this BEFORE artifact itself uses `vivre-ici-after` / `map-after-*`. Identify by run + artifact ID, not filename prefix.

Exact PNGs:
- `map-after-premium-national-390x844.png`
- `map-after-premium-national-430x932.png`
- `map-after-premium-national-768x900.png`
- `map-after-premium-national-1280x900.png`
- `map-after-n3-casablanca-maarif-390x844.png`
- `map-after-n3-casablanca-maarif-430x932.png`
- `map-after-n3-casablanca-maarif-768x900.png`
- `map-after-n3-casablanca-maarif-1280x900.png`

### Integration AFTER
Run `35282869300`  
Artifact `10523630593`

The same 8 filenames/viewports are present.

Visual inspection result:
- national map materially larger/more dominant at all four viewports;
- N3 mobile more map-first;
- unproven zero indicators removed;
- `← Maroc` visible;
- current-main shell/navigation intact, including `Vendre` replacing historical `Alertes`;
- desktop still materially less context-rich than TARGET LOCK.

Internal visual score: **9.2/10**, not `≥9.8`.

---

## TARGET LOCK

File: `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`  
Drive ID: `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`  
Dimensions reverified: `1536×1024`  
SHA-256 reverified: `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

The target is visual authority only; it never authorizes invented market/location facts.

---

## LIVE DATA / SUPABASE

External blocker: `exceed_egress_quota`.

Keep affected live gates fail-closed. Do not substitute synthetic/local proof for live-market certification. Do not rerun live jobs repeatedly while restriction remains.

When access is restored, rerun only the affected live gates.

---

## PR / DEPLOYMENT STATE

PR #1037:
- base `main@8578f7a…`;
- head branch `integration/vivre-ici-main-2026-09-17`;
- DRAFT;
- mergeable;
- NOT merged.

PR #1025 remains historical/source only and is not the merge vehicle.

Vercel was explicitly inspected after the integration pushes: no deployment for the integration branch / integration SHA was present among recent AkarFinder deployments. No Vercel action was invoked.

---

## HUMAN GATE / NEXT EXACT

**STOP BEFORE MERGE.**

Next exact only after explicit authorization from Achraf:
`merge PR #1037 → post-merge checks → canonical post-merge closeout`.

Separately:
- Supabase restoration → targeted live reruns only;
- security Next/npm → separate lot;
- provider/licence/attribution → separate decision;
- Vercel → separate explicit authorization gate.

---

## RESUME

Read:
1. `3-vivre-ici-akarfinder.md`
2. this handover
3. verify live `main`, PR #1037 HEAD/CI, Supabase state

Do not re-transplant the product: that work is complete and certified. Do not merge without explicit human authorization.

`3-vivre-ici-akarfinder.md — Vivre Ici AkarFinder — 92 %`
