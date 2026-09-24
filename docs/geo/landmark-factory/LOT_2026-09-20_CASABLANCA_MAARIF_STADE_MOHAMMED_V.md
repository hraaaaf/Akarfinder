# Casablanca / Maârif — verified boundary + Landmark Factory shortlist — 2026-09-20

## Result

The administrative Maârif boundary is now materially verified and usable as a **shadow authoring boundary**.

- OSM relation: `2801474`
- OSM type: `boundary`
- `boundary=administrative`
- `admin_level=10`
- geometry: `MultiPolygon`
- assembled by: pyosmium area processing from real relation members
- geometry validity: true
- outer rings: 1
- inner rings: 0
- registry validator: `ok=true`, `issues=[]`
- publication status: `shadow`
- reviewed: false
- workflow run: `35523711412`
- artifact: `10609109437`
- artifact digest: `sha256:76851354169ba4068fd7e7b68083f4c8b90366c8647b352e0be68b5ee1aa87f5`

Important semantic guardrail: relation 2801474 is the **administrative arrondissement of Maârif**. It must not be presented as a claim that every point in that polygon belongs to the colloquial / real-estate neighborhood called Maârif.

## Official boundary cross-check

CasablancaCity describes the arrondissement boundaries as:
- north: Boulevard d'Anfa + Boulevard Zerktouni
- west: Route Al Jamia + Boulevard Ghandi
- east: Avenue 2 Mars + Avenue Nador
- south: Casablanca motorway

This matches the administrative interpretation of the OSM relation and is the reason the materialized geometry is accepted only as an administrative reference.

## Point-in-polygon result

Input pool: **700** named high-signal POIs from the Casablanca offline PBF artifact.

Inside relation 2801474: **99** POIs before heuristic filtering.

The existing Landmark Factory heuristic is intentionally conservative. With the current threshold of 50, only one new non-registry candidate survives strongly enough to enter editorial review:

### RETAIN candidate — Stade Mohammed V

OSM object:
- way `1349843482`
- `leisure=stadium`
- Wikidata `Q1783824`
- PIP coordinate: `33.58285065,-7.6468283`

Heuristic score: **54 / 80**
- source confidence: 15
- public visibility: 15
- orientation value: 13
- visual distinctiveness: 11

Registry duplicate check:
- Twin Center is already present under `district_casablanca_maarif`.
- No existing Stade Mohammed V / Complexe Sportif Mohammed V entry found.

## Editorial verification — Stade Mohammed V

Independent sources:
1. **SONARGES** — primary operator source. Identifies Complexe Mohammed V in Casablanca, quartier Maarif, address Avenue Al Caid Al Achtar, Maarif.
2. **CasablancaCity** — municipal source. Identifies the Complexe Sportif Mohammed V at Rue Al Azrak Ahmed, Maârif, Casablanca, and describes it as being in the heart of Maârif.
3. OSM-derived geographic evidence independently matches way `1349843482` and point around `33.58285,-7.64683`.

### Final AkarFinder score

- public visibility: **20/20**
- orientation value: **20/20**
- local anchoring: **20/20**
- visual distinctiveness: **19/20**
- source reliability: **20/20**

**Final: 99/100 — RETAIN**

Why not 100: the current registry coordinate is based on the stadium area's deterministic geometry-derived point rather than a separately surveyed public entrance point. This is sufficient for the landmark point contract, but the score remains deliberately non-perfect.

## Rejected / filtered observations

No quota is being filled.

Several real objects lie inside the administrative arrondissement but stay below the current heuristic threshold or are redundant/noisy for the territorial map. Examples include hospitals, hotels, small gardens, universities, mosques, galleries and marketplaces.

The Moroccan Jewish Museum and Derb Ghallef are notable real places, but they did not pass the existing conservative heuristic threshold in this automatic batch. They are therefore not promoted by this run.

## Guardrails

- no Supabase mutation
- no listings/business data mutation
- no ranking mutation
- no GPS displacement for collision avoidance
- no merge
- no deploy
- no landmark promotion from OSM alone

## Next exact

1. Re-run the exact-head Casablanca workflow with the committed PIP step and archive the shortlist JSON.
2. After exact-head SUCCESS, prepare the dedicated semi-figurative Stade Mohammed V artwork and registry entry.
3. Add deterministic reveal/collision tests around Maârif / Twin Center / Stade Mohammed V.
4. Produce visual proof.
5. Keep relation 2801474 in `shadow` until explicit review; do not publish the boundary as a real-estate neighborhood contour.
