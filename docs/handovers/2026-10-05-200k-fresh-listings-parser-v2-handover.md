# AkarFinder — 200K Fresh Listings / Parser V2 Handover

Date: 2026-10-05

## Goal

>= **200,000 fresh, unique, exploitable listings** with canonical URL + city + district + price + surface.

A `parser_miss` requires positive source evidence that the field exists.

## Verified freeze baseline

Artifact `10910779576` / SHA-256 `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`.

- 226,286 rows / 226,286 unique URLs
- 222,359 scope eligible
- 225,952 KEEP
- DB access/write 0/0

Mixed freeze schema:
- universal URL/crawl metadata;
- optional enrichment on deep-observed rows.

Verified enriched subset:
- HTTP-200 rows 8,487
- title 8,487
- description 8,487
- published_at 8,487
- city 8,454
- district 6,296
- price 3,770
- surface 4,567
- URL+city+district+price+surface complete: **1,191**

Global structured route evidence, state `recoverable_from_url`:
- city 61,547
- district 48,023
- transaction 60,761
- property type 61,543

## Mubawab lot

- raw URLs: **82,796**
- detail routes: **81,996**
- non-detail routes: **800**
- unique detail identities: **74,867**
- historical duplicate URL rows: **7,129**
- total raw overcount: **7,929 / 9.577%**
- scope-eligible dedup live plan: **74,486**
- identity scheme: `a:<id>` / `pa:<id>`
- tests: **6/6 PASS**

URL evidence:
- transaction 48,739 recoverable / 306 conflict
- property type 63,013 recoverable / 4,532 conflict
- surface 10,331 high / 10,160 review / 389 conflict
- free-slug city remains review-only

## Safety state

- branch: `data/200k-fresh-parser-v2`
- PR #1105: **closed**, not merged
- reason: PR opening unintentionally queued the separately human-gated Neon preflight workflow
- Neon run `37296096590`: last verified state **queued**
- Desktop Commander is connected but quota-blocked; no retry in this session
- no Neon result is claimed
- no DB write
- no Vercel deploy

Mubawab benchmark workflow is now **push-only** to avoid needing a PR.

## Next exact

1. Read the push-only Mubawab 100-identity live benchmark.
2. Convert actual source-visible-but-missed fields into true `parser_miss` metrics.
3. Fix Mubawab parser and rerun bounded benchmark if required.
4. Continue Sarout offline identity adapter in parallel.
5. Scale source refresh only after source-specific parser yield is certified.


## Reprise vérifiée — 2026-10-09 / Mubawab surface

Objectif inchangé : >=200 000 annonces fraîches, dédupliquées et exploitables (URL canonique, ville, quartier, prix, surface), avec provenance. Un champ `write_safe` dans le pilote **ne certifie pas la fraîcheur de l'annonce** ni l'exploitabilité finale.

- Run de référence **37606951534**, commit `32675fb4fb213a1543328a69740b597052b5766f` : **success**, échantillon 300 URL, 300 HTTP 200 ; champs `write_safe` : ville 298, quartier 168, prix 175, surface 79, quatre champs simultanés (URL implicite) 22/300 = **7,33 %**.
- Les 79 surfaces `write_safe` proviennent du **slug canonique explicite en m²/m2**, pas de la structure principale HTML. Les 220 valeurs `extractDetail:surface` observées sont `review` : signal générique body susceptible de capter des recommandations. Ne pas promouvoir.
- La page HTML primaire n'est pas encore identifiée de manière fiable pour la surface. Impossible d'affirmer que le 22/300 est une certification d'annonces vivantes/fraîches.
- Diagnostic read-only ajouté : `scripts/data/mubawab-surface-dom-probe-v2.ts` + test, enregistrement **uniquement de valeurs numériques et structure DOM** sur 24 pages, sans texte libre des annonces ; `SURFACE_DOM_PROBE=1` dans le workflow.
- Nouveau run lancé : **37951999652**, commit `59ca291dfd744966e3677b07c35f6375a30d0e1e`, dernier état observé **queued**. Lire l'artifact `mubawab-five-field-300-surface-dom-probe.json` une fois terminé ; aucune affirmation anticipée de résultat.
- Safety : zéro écriture base ; zéro déploiement Vercel ; pas de promotion globale autorisée.

**Next exact** : lire le diagnostic DOM du run 37951999652, isoler le conteneur d'annonce principale, créer parseur surface à preuve stricte, ajouter tests positifs/négatifs (recommandations, terrain/habitable, conflits) ; rerun échantillon déterministe 300 ; comparer au 22/300 de référence et produire preuve `freshness` / dédup avant toute promotion.
