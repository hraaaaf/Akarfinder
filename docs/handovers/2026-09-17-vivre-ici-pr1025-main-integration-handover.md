# HANDOVER — AKARFINDER / VIVRE ICI — PR #1025 → MAIN

Date: 2026-09-17

Repository: `hraaaaf/Akarfinder`

Canonical file: `3-vivre-ici-akarfinder.md`

Source branch / PR branch: `docs/3-vivre-ici-akarfinder`

Source branch HEAD at handover creation: `11753494266694c28fa2a70214dd771fc7e512d9`

Last product+harness UX L9 certified HEAD: `f1f4d35ecdd0a5a6b83df1dc945e2d291e9b2533`

PR: `#1025 — feat(vivre-ici): converge /map toward premium territorial 3D experience`

PR state verified 2026-09-17:
- OPEN
- merged: false
- mergeable: false
- 246 commits
- 71 changed files

Verified `main` HEAD: `8578f7a492980dcac35e7a094383c70411ca44c5`

Safe integration branch already created from this exact `main`:
`integration/vivre-ici-main-2026-09-17`

Integration branch HEAD at handover creation:
`8578f7a492980dcac35e7a094383c70411ca44c5`

Important: the integration branch currently contains **main only**. No Vivre Ici delta has yet been reapplied there. Do not claim integration complete.

---

## GOAL

Integrate the proven Vivre Ici `/map` work from PR #1025 onto the current `main` while preserving the current shell/navigation architecture from `main`, then re-run exact visual/browser gates before any merge.

## SUCCESS

Integration is successful only if all of the following are observable:

- Vivre Ici map architecture is present on a branch based on current `main`;
- current `main` shell/navigation remains intact;
- the five overlapping navigation/test files keep the correct current-main contract unless an explicit, reviewed adaptation is required;
- TypeScript/build and targeted Vivre Ici tests pass;
- AFTER and N3 browser gates pass on the integrated exact HEAD;
- screenshots are recaptured at the same viewports;
- no Supabase DB write occurs;
- live-data gates remain fail-closed while Supabase is restricted;
- no Vercel deployment occurs without explicit authorization;
- no merge occurs before the human merge gate.

## CURRENT PROOF

### UX convergence L9 — certified

Product/harness commits:
- `edf7f95c004f71427c92bff61dc38525863d4801` — national framing + N3 hierarchy + territorial return + harness
- `f1f4d35ecdd0a5a6b83df1dc945e2d291e9b2533` — reliability proofline separation

Exact-HEAD runs:
- `35271588119` — **Vivre Ici AFTER Certification — SUCCESS** on `f1f4d35e...`
- `35271588076` — **Carte National Journey N3 Certification — SUCCESS** on `f1f4d35e...`
- `35271023716` — **Vivre Ici Premium Interactive Integration — SUCCESS** on functional commit `edf7f95c...`

Final L9 visual score recorded honestly: **9.2/10**.
The `>=9.8` threshold is **not** certified.

---

## BEFORE / AFTER — EXACTLY WHERE TO LOOK

These are the durable visual references for the L9 comparison. Use the GitHub Actions artifacts, not old `/mnt/data` paths.

### BEFORE reference for L9

GitHub Actions run:
`https://github.com/hraaaaf/Akarfinder/actions/runs/34977355451`

Run ID: `34977355451`

Artifact:
- ID: `10399777496`
- artifact name: `vivre-ici-after`
- digest: `sha256:08ca0b66a6ef295656fd7593b451fb2d7e32c681eaae3f8c9167dd09eb7ca85e`
- artifact expiry currently reported by GitHub: `2026-10-15T13:50:39Z`
- source HEAD: `1213342725ae053b63254fb5444331d8d8be66f6`

Important naming note: this artifact is the **BEFORE reference for the later L9 change**, even though the historical workflow/artifact is named `vivre-ici-after` and the PNG files start with `map-after-...`.

Files to inspect inside the artifact:
- `map-after-premium-national-390x844.png`
- `map-after-premium-national-430x932.png`
- `map-after-premium-national-768x900.png`
- `map-after-premium-national-1280x900.png`
- `map-after-n3-casablanca-maarif-390x844.png`
- `map-after-n3-casablanca-maarif-430x932.png`
- `map-after-n3-casablanca-maarif-768x900.png`
- `map-after-n3-casablanca-maarif-1280x900.png`
- `summary.json`

### AFTER final L9

GitHub Actions run:
`https://github.com/hraaaaf/Akarfinder/actions/runs/35271588119`

Run ID: `35271588119`

Artifact:
- ID: `10519291559`
- artifact name: `vivre-ici-after`
- digest: `sha256:4e280feee73a0881b2bcb565f98fdf031d44d637781b5722e2c90f93281fc5e8`
- artifact expiry currently reported by GitHub: `2026-10-17T20:36:17Z`
- source HEAD: `f1f4d35ecdd0a5a6b83df1dc945e2d291e9b2533`

Files to inspect inside the artifact:
- `map-after-premium-national-390x844.png`
- `map-after-premium-national-430x932.png`
- `map-after-premium-national-768x900.png`
- `map-after-premium-national-1280x900.png`
- `map-after-n3-casablanca-maarif-390x844.png`
- `map-after-n3-casablanca-maarif-430x932.png`
- `map-after-n3-casablanca-maarif-768x900.png`
- `map-after-n3-casablanca-maarif-1280x900.png`
- `summary.json`

For a valid visual comparison, compare BEFORE and AFTER at the **same viewport and same scenario**.

Observed AFTER automated contract across the 8 scenarios:
- HTTP 200
- horizontal overflow 0
- Supabase requests observed 0
- page errors 0
- national TopoJSON ready / 12 regions
- N3 MapLibre ready / OpenFreeMap vector / buildings > 0
- territorial return and Search handoff exact
- `zeroDbWritesByScript=true`
- `zeroDeploymentActionsByScript=true`

---

## TARGET LOCK

Visual authority retained for the original Vivre Ici direction:

- file: `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Google Drive ID: `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions: `1536 x 1024`
- SHA-256: `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

Do not substitute an ephemeral `/mnt/data` copy for this TARGET.

---

## CURRENT PRODUCT ARCHITECTURE TO PRESERVE

- `/map` national exploration → city → district → local MapLibre N3 → Search handoff
- `MapLibreNeighborhood3D.tsx` reusable by city/district/center
- OpenFreeMap vector buildings
- C7 market intelligence separated from N3 exploration:
  - N3 uses `layer=explore`
  - C7 keeps `layer=price|density|listings`
- truth gate fail-closed
- no fake property pins
- synthetic market lane is UI-only and never replaces live certification
- Esri imagery remains prototype-only until production license/support/attribution is locked

---

## SUPABASE / LIVE DATA

External blocker remains open.

Verified state recorded in canonical:
- Supabase project `AqarFinder` control-plane: `ACTIVE_HEALTHY`
- organisation: Free plan
- live restriction: `exceed_egress_quota`
- impacted live gates return HTTP 503

Rule:
- do not hide or bypass this failure with synthetic data;
- do not rerun live gates repeatedly while the restriction remains;
- rerun only the affected live gates after access is restored.

Synthetic Market lane already proved separately:
- run `34624935672` — SUCCESS
- artifact `10273807531`
- digest `sha256:17a13f57cbb314e413dd873192c23c0a896400d4c94b186a563826ea5f5b64b4`

---

## PR #1025 ↔ CURRENT MAIN — CONFLICT QUALIFICATION

Historical PR base:
`b8c89681358e93ec254016bcca9b78f4717ea8de`

Current verified `main`:
`8578f7a492980dcac35e7a094383c70411ca44c5`

`main` is 73 commits ahead of the historical PR base.

The apparent divergence is large, but the exact filename intersection between:
- the 71 files changed by PR #1025, and
- the files changed on `main` since the historical PR base

is only **5 files**:

1. `components/layout/MobileBottomNav.tsx`
2. `scripts/audits/ux-bottom-nav-10of10-1.mjs`
3. `scripts/audits/ux-premium-bottomnav-glass-1.mjs`
4. `scripts/scrapers/__tests__/ux-bottom-nav-10of10-1.test.ts`
5. `scripts/scrapers/__tests__/ux-premium-bottomnav-glass-1.test.ts`

Critical finding:
- there is no changed-file overlap from recent `main` in `app/map/**`;
- no changed-file overlap in `components/map/**`;
- no changed-file overlap in `lib/map/**`;
- no changed-file overlap in `package.json` / `package-lock.json`.

`main` has refactored mobile navigation around `PRODUCT_MOBILE_BOTTOM_NAV` and already includes `/map` labelled **Vivre ici**.

Therefore the integration must preserve the current-main navigation contract rather than restoring the old PR implementation blindly.

Do **not** rebase/force-push the long PR branch as the first strategy.

---

## SAFE INTEGRATION BRANCH

Branch:
`integration/vivre-ici-main-2026-09-17`

Created from exact current `main`:
`8578f7a492980dcac35e7a094383c70411ca44c5`

Current state at handover:
- branch exists;
- HEAD equals current `main`;
- no Vivre Ici delta has been applied yet;
- no PR has been opened from this integration branch;
- no merge has been done;
- no Vercel deployment has been done.

This branch is the recommended working surface for the next session.

---

## NEXT EXACT

1. Read this handover, then `3-vivre-ici-akarfinder.md`.
2. Re-fetch and verify:
   - current `main` HEAD;
   - `docs/3-vivre-ici-akarfinder` HEAD;
   - PR #1025 state/mergeability;
   - integration branch HEAD.
3. If `main` has not moved materially, continue on `integration/vivre-ici-main-2026-09-17`.
4. Reapply only the required Vivre Ici deltas from PR #1025 onto the integration branch.
5. Preserve current-main versions/contract for the 5 overlapping navigation/test files unless a minimal explicit adaptation is proven necessary.
6. Verify code-level integration first: TypeScript/build + targeted structural/tests.
7. Run the exact integrated visual/browser gates:
   - Vivre Ici AFTER Certification;
   - Carte National Journey N3 Certification;
   - same `390x844 / 430x932 / 768x900 / 1280x900` matrix.
8. Download and inspect the new AFTER artifact. Compare it against the durable BEFORE reference above at the same viewports. Show the captures before claiming visual success.
9. If visual/browser tests fail: diagnose → fix → rerun the minimal affected gate.
10. If integration is green but Supabase remains restricted: keep live gates blocked/fail-closed; do not fake closure.
11. If integration exact-HEAD is green: update canonical with exact commits/runs/artifacts.
12. Stop at the **human merge gate** before merging any integration PR into `main`.
13. Vercel deployment remains a separate explicit human gate.

---

## DO NOT DO

- no blind rebase of the 246-commit PR branch;
- no force-push to PR #1025;
- no automatic choice of the old MobileBottomNav over current main;
- no synthetic fallback presented as live market truth;
- no repeated live Supabase CI polling/reruns while egress remains restricted;
- no Vercel deployment without explicit authorization;
- no merge without explicit human merge gate;
- no claim of `>=9.8/10` without new visual proof.

---

## RESUME LINE

**Next exact:** use `integration/vivre-ici-main-2026-09-17`, transplant the Vivre Ici deltas while preserving current-main navigation, then certify TypeScript/build + AFTER/N3 at identical viewports and inspect the new screenshots before any merge.
