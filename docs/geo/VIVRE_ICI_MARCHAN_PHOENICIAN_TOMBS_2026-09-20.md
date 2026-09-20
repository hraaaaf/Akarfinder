# Vivre Ici — Tanger / Marchan — Tombes phéniciennes

Date: 2026-09-20
Status: VERIFIED CANDIDATE — runtime insertion intentionally deferred until a byte-complete safe registry patch is available.

## Existing-registry check

`district_tanger_marchan` already has `Café Hafa` in `territory-landmark-registry.ts` (score 96). No `Tombes phéniciennes` / `Phoenician Tombs` entry was found in the current default-branch code search. This candidate adds a different orientation anchor and does not duplicate Café Hafa.

## Candidate

Canonical name: **Tombes phéniciennes de Tanger**
Aliases: `Tombes phéniciennes`, `Phoenician Tombs`, `Nécropole punico-lybienne du Marshan`
Parent: `district_tanger_marchan`
Category target: `heritage`
Point: `35.790869, -5.820036`
Precision target: `verified_landmark_point`

## Territorial proof

1. Communes & Villes du Maroc, Tanger urban commune page: explicitly says the Punico-Libyan necropolis is in **quartier du Marshan**, calls it one of the city's most emblematic places, gives address `Marshan, TANGER`, and publishes the point `35.79086900, -5.82003600`.
2. Le360, 2026-03-15: independently describes the millenary tombs on the Hafa cliff **dans le quartier Marshan à Tanger**.
3. Le Matin, 2018-08-05: independently lists `Tombes phéniciennes (Marchane)` among the principal historic monuments on Tangier's municipal tourist-bus route and attributes the program to a Commune de Tanger note.

## AkarFinder notoriety score

- Public visibility: **19/20** — described as an emblematic city place and a municipal tourist-route stop.
- Orientation value: **19/20** — named destination in Marchan, immediately usable as a local reference.
- Local anchoring: **20/20** — primary/municipal-style source explicitly names quartier Marshan; two independent Moroccan sources corroborate Marchan.
- Visual singularity: **20/20** — rock-cut tombs on a cliff overlooking the Strait; highly distinctive silhouette/terrain cue.
- Source reliability: **19/20** — territorial page + Le360 + Le Matin/Commune note converge; published coordinates are explicit.

**Total: 97/100 — RETAIN.**

## Illustration target

Semi-figurative simplified vignette: ochre/stone cliff slab seen in slight perspective, 3–4 rectangular rock-cut tomb cavities, narrow blue Strait band behind, one minimal low wall/edge cue. No skull, no generic archaeology icon, no text, no logo, no photorealism. The rectangular excavations + cliff/sea relationship must make the site recognizable.

## Zoom / collision target

`minZoom: 13.5`, `retainPriority: true`. Café Hafa already occupies the same micro-area and has score 96, so collision should keep the Tombes phéniciennes at equal/very slightly higher priority only from neighborhood zoom onward; never force both labels simultaneously when they collide.

## Rejected / held candidates in this pass

- **Marchan Park**: HOLD. The official site confirms `Quartier Marchan`, but the current brand is primarily a restaurant/café and does not clear the same durable territorial-notoriety threshold.
- **Palais Marshan / Royal Palace**: HOLD. Historically and visually important, but public-access/orientation utility is weaker and authoritative current point/territorial evidence was not as clean as for the tombs.

## Guardrails

0 Supabase. 0 ranking. 0 merge. 0 deploy.

Runtime insertion is deliberately deferred: the connector returns the large registry in truncated chunks, and replacing the full file from an incomplete read would violate the fail-closed rule. No blind whole-file rewrite.