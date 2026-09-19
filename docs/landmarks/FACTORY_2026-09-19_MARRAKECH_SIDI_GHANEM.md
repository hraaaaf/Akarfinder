# Landmark Factory — Marrakech / Sidi Ghanem — 2026-09-19

## Result
Canonical low-density district reviewed: `marrakech/sidi-ghanem`. No existing Sidi Ghanem landmark was found in `VERIFIED_LANDMARKS` on the seed base.

Candidates researched: LRNCE Studio, Chabi Chic Sidi Ghanem showroom, Marrakshi Life atelier/store.

### RETAIN — LRNCE Studio
AkarFinder notoriety score: **87/100 — major**
- public visibility: 84/100
- orientation value: 88/100
- local anchoring: 94/100
- visual singularity: 91/100
- source reliability: 80/100

Evidence:
1. Primary: https://lrnce.com/our-studio/ — official LRNCE page explicitly places the studio at 59 Rue Principale Sidi Ghanem, Marrakech.
2. Independent: https://www.discovermarrakech.city/en/place/lrnce-studio — identifies LRNCE Studio in Sidi Ghanem at 59 Rue Sidi Ghanem.
3. Independent coordinate corroboration: https://capri.ae/espacedeco/annuaire/lrnce-studio/ — publishes GPS 31.6761604, -8.0481564 with the same address and official website.

Verified point for payload: **31.6761604, -8.0481564**.

Artwork brief: simplified semi-figurative rendering of the distinctive ochre/pink industrial-studio frontage, large workshop opening and curated ceramic/textile forms; no generic shopping bag, palette or pin icon; non-photorealistic AkarFinder visual language.

Visibility contract: major; suggested reveal around city zoom 11.0–11.3 in the presentation layer, then normal collision priority. GPS point remains immutable; card may be hidden rather than displaced when crowded.

### HOLD — Chabi Chic Sidi Ghanem showroom
AkarFinder notoriety score: **83/100**
- public visibility: 85/100
- orientation value: 82/100
- local anchoring: 95/100
- visual singularity: 79/100
- source reliability: 74/100

Evidence is strong for identity and district: official Chabi Chic pages give `435 quartier industriel, ZI SIDI GHANEM, MARRAKECH`; Le Guide Marrakech independently gives the same 435 address. However public geocoding is internally inconsistent: another current directory exposes `N°322 Rue Principale`, while a coordinate-bearing source associates 31.66447,-8.03824 with 322. The current official address is 435. **No coordinate is accepted until 435 is independently point-corroborated.**

Sources:
- https://www.chabi-chic.com/a/l/en/pages/our-shops-in-marrakech
- https://media.leguide-marrakech.com/fr/shopping-souks/chabi-chic
- https://www.discovermarrakech.city/en/place/chabi-chic

### REJECT FOR THIS DISTRICT — Marrakshi Life
The official site currently places the atelier/store at Quartier Industriel Al Massar, 933 Route de Safi, not Sidi Ghanem. It is therefore rejected rather than force-attached to the canonical Sidi Ghanem district.
Source: https://marrakshilife.com/pages/contact

## Safety / scope
- No Supabase mutation.
- No business-data mutation.
- No ranking mutation.
- No deploy.
- No merge.
- Runtime registry is intentionally unchanged until the visual/seed integration chain is stable and the retained point can be integrated without branch contamination.

## Next exact
Integrate only LRNCE Studio into the verified registry on the appropriate integration branch, add its dedicated artwork, and run GPS/zoom/collision certification. Revisit Chabi Chic only after independent point-level corroboration of the current 435 address.