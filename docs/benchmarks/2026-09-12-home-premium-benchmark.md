# AKARFINDER — P1 HOME PREMIUM BENCHMARK

Date: 2026-09-12  
Status: FINAL — HOME V1 benchmark implemented, owner-approved and promoted to L0.  
Canonical: `docs/AKARFINDER_PRODUCT_CONSTITUTION_CANONICAL.md`

## Goal

Refine AkarFinder HOME into a premium, search-first real-estate engine without changing the LOCKED positioning:

> **1er moteur de recherche immobilier au Maroc**

## Final owner-approved HOME V1 contract

1. Exact H1 remains `1er moteur de recherche immobilier au Maroc`.
2. Search dominates the hero; no competing intelligence panel.
3. Existing approved hero imagery remains.
4. Trust strip sits immediately below the hero.
5. `Vivre ici` comes immediately after the trust strip.
6. HOME V1 does not render `HomeListingsSection`; any future listing block requires compliant real imagery and a new L0 approval.
7. Popular cities remain compact and secondary.
8. The page ends with exactly three actions: `Préparer mon projet`, `Vendre / Estimer`, `Agences & promoteurs`.
9. No HOME CTA points to legacy `/compagnon`.
10. Header/footer were excluded from the P1 freeze and handed to P2 Information Architecture.

Final HOME sequence:

`Hero → Trust strip → Vivre ici → Villes populaires → 3 actions`

## Reference set used

Real-estate leaders reviewed: Zillow, Compass, Redfin, idealista, Rightmove, Realtor.com, Property Finder and Bayut.

Transferable conclusions retained:
- search-first hierarchy;
- restrained hero;
- intelligence after search rather than beside it;
- geographic discovery early but subordinate to search;
- no decorative listings block without trustworthy inventory media;
- compact city discovery;
- distinct end-of-page next actions.

## Rejected patterns

- hero density copied from marketplaces with broader product scope;
- cinematic effects that delay search;
- AI badges used as decoration;
- generic or pseudo-real listing imagery presented as premium inventory;
- visual polish that reopens an existing L0 invariant without owner approval.

## Verified implementation evidence

Canonical product tree:
`19d8da53b1d4b40ce8a19676d009af62f60f012d`

AFTER visual certification:
- run: `34702315678` — SUCCESS
- artifact: `10300675974`
- artifact digest: `sha256:79dc9193a96ca7321251f737bf182de505be36da0f85bb967a71e59ecd72e673`
- viewports: 390 / 768 / 1280
- finding count: 0
- failed responses: 0
- console errors: 0
- exact H1 count: 1
- trust strip count: 1
- `Vivre ici` count: 1
- compact cities count: 1
- HOME listings count: 0
- end-action count: 3
- legacy `/compagnon` links: 0
- competing intelligence panel count: 0
- horizontal overflow: 0

Measured body-height reduction versus clean BEFORE:
- 390: `4489 → 3432` = **-23.5%**
- 768: `4983 → 3013` = **-39.5%**
- 1280: `3171 → 2471` = **-22.1%**

Final visual score: **9.1/10**.

Minor reserve recorded, non-blocking: on 390 px, the legacy fixed mobile bottom navigation could reduce first-viewport breathing. Ownership of that issue moved to P2 navigation/mobile and does not reopen HOME V1.

## Governance

This benchmark is no longer a proposal. Its exact owner-approved HOME V1 scope is L0/LOCKED through the Product Constitution. Any future change to those invariants requires the explicit L0 override process.

No Vercel deployment and no DB write were part of this benchmark closeout.
