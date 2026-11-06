# Search Mobile Card Readability V1 — candidate (06/11/2026)

- **GOAL:** improve the readability of actual `/search` result cards at 360 and 390 px without altering search ranking, public attribution, image licensing, the seller form, or desktop.
- **BEFORE reference:** PR #1147 commit `f97d90e94bd0463390d44a614d83ae0996349dfe`; UX-SEARCH-3 proof artifact `13534425272`, UX-SEARCH-4 artifact `13531501401`, property-type visuals `13532371312`.
- **BEFORE observed:** two mobile columns; compact-card title 12px forced to **one line**, facts 9px, provenance 7.5px under `search-premium-card-density.css`; production-like fixtures reveal clipped titles and barely legible sources.
- **Visual target (the mockup specification):** **preserve two columns**, increase title to 13.75px and **two lines**, price to 18px, location 11px, facts/provenance at least 10.5px, vertically stacked source metadata, 44px secondary source link hit-area, and slightly more whitespace between rows. Keep illustrations identifiable and provenance truthful. Do not widen page or hide sources.
- **Implementation:** isolated CSS loaded last by `app/search/page.tsx`, plus stricter Playwright metric checks in UX-SEARCH-3. No listing APIs, external content reuse, ranking, pricing, permission or `/vendre` change.
- **SUCCESS criteria:** full exact-HEAD CI green; Search UX-SEARCH-3 score >=9 with **0 failures** at 360/390/768/1024/1280/1440; image/source property-type gate green at 390/430/768/1280; UX-SEARCH-4 14 visual fixtures and rights green; provenance remains visible; no horizontal overflow; card <=390px in phone grid.
- **PROOF still pending:** after the candidate commit, new GitHub artifact screenshots for 360/390/430/768/1280 and side-by-side comparison with the SAME fixture before; visual review to check whether the goal >=9/10 is actually demonstrated.
- **Human gate:** no merge of #1147 and no Vercel deployment without separate explicit user authorization. 
