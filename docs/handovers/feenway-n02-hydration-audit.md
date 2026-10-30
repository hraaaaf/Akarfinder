# FeenWay N02 — Public hydration audit mission, 2026-10-30

**Goal.** Determine whether three allowlisted public French landing pages reveal new listing anchors after up to three scrolls, without opening property details or disallowed APIs.

**Proof.** A CI artifact records the initial listing anchor count, counts after each scroll, newly observed IDs, denied request categories, HTTP errors and per-page conclusion. Three offline guard tests must pass before opening Chromium.

**Safety.** Before browser startup, fetch and check robots.txt; reject 403/429 and disallowed/ambiguous rules. Browser network interception permits only the exact landing document and same-host /_next/static/ script/style resources. Block every /api, /listings, /admin, /samsar and /paiement path, non-GET requests, dynamic XHR/fetch, off-host resources, images and downloads. No login, data writes, screenshots or visits to individual listings.

**Interpretation.** A positive new-links count means new public anchors were observed on that sample. A zero count is not proof of site-wide completeness. If dynamic requests were blocked, result must remain INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS, not proof that no additional listings exist.

**Existing evidence.** FeenWay N01 currently certifies 1736/1736 public FR market/quartier landing pages listed in the snapshot and 73710 distinct discovered listing URL links (58513 from six XML plus 15197 outside XML). It does not certify active unique properties or reuse rights.

**Dependencies and next.** Verify the specific N02 GitHub run, download the artifact and independently check URL counts and forbidden request records. If browser setup fails, distinguish infrastructure failure from product behavior; do not invent a result. PR #1105 remains DRAFT with separate Mubawab/Sarout full-field checks blocked by expired GitHub artifact 10910779576 (HTTP 410). No deploy, SQL write or merge.
