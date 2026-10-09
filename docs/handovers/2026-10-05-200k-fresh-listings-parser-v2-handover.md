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


## Reprise vérifiée — 2026-10-09 / main detail hardening

Source: artifact `11626517251` du run `37951999652` (success), sample 300; probe structure DOM redacted pour les 24 premières pages.

**Preuve diagnostics DOM (24/24 examinées):**
- 9 réponses avec au moins un script JSON-LD : exactement **1 surface distincte** dans `adDetailFeature` pour chacune.
- 15 réponses sans script JSON-LD : **4 à 29 surfaces distinctes** dans `adDetailFeature`, vraisemblablement annonces associées/cartes, mais ce classement est **une hypothèse structurelle**, pas une assertion prouvée sur la validité de chaque URL.
- Le seul HTTP 200 ne prouve ni une fiche active, ni la fraîcheur, ni la présence du bon ID. Le slug M² sans fiche primaire est au mieux un indice `review`.

**Implémentation stricte** (branche `data/200k-fresh-parser-v2`):
- `scripts/data/mubawab-strict-surface-v2.ts` : recherche h1.searchTitle dans un seul bloc `.blockProp`, extrait les surfaces de la section primaire `.col-8 .adDetails .adDetailFeature > span`, exclut `.contentBox/.dataRelat`, refuse plusieurs surfaces différentes ; garde les paires de labels explicitement structurées.
- `scripts/data/github-freeze-full-field-recovery.ts` : vérifie que `response.url` préserve l'identité `a:{id}` ou `pa:{id}` ; n'accorde `write_safe` à la superficie Mubawab que si la page primaire est reconnue. DOM != slug => `review` avec conflit explicite.
- `.github/workflows/mubawab-200k-certify-one-shot.yml` : métrique V3 restreinte aux pages primaires avec identité préservée ; une baisse face au V2 non gaté indique un **durcissement des preuves**, et non nécessairement une régression d'extraction.
- Tests nouveaux : page primaire + annonces recommandées, multiple valeur incohérente, page catalogue sans h1, double bloc primaire, regex échappée correctement.

**CI** : run de certification `37954471765` sur commit `fbe0f39eac2fcb96d6373f967eedd071ef64f9ba` dernier état observé **queued**. Aucun verdict anticipé. L'objectif final 200k frais/dédupliqué est distinct du benchmark strict des champs.

**Next exact** : vérifier ce run une fois, diagnostiquer toute erreur ; si vert, lire `mubawab-five-field-coverage.json` V3 et comparer taux strict + `primary_detail_verified` aux 24 éléments du probe, corriger si nécessaire, répéter échantillon 300. Pas de DB/Vercel/merge sans gates humains.


## État probant — 2026-10-09 V3 après CI `37954471765`

- Run exact-head `fbe0f39eac2fcb96d6373f967eedd071ef64f9ba`: **success** le 2026-10-09 16:02Z, artifact **11628306392** (`mubawab-five-field-300`).
- **300/300 HTTP 200** mais seulement **92/300** avec identité conservée (`a:id` ou `pa:id`) ET vrai bloc primaire `.blockProp h1.searchTitle`. **208/300** avec identité finale non conservée ; auparavant leurs villes/quartiers/prix pouvaient être faussement comptés.
- Sur 92 vrais blocs primaires : ville **92**, quartier **0**, prix **59**, surface **81**, cinq champs **0/300**. **3 conflits** de surface DOM / URL. **49/92** ont déjà ville + prix + surface `write_safe`, il manque le quartier. Les 22/300 V2 **ne satisfont donc pas les critères V3**.
- Source du diagnostic : décompte réanalysé sur `mubawab-five-field-300.jsonl`, pas simple inférence à partir de CI verte.
- Modifications en cours (NE PAS dire validées tant que run exact-head non vert) :
  - `scripts/data/github-freeze-full-field-recovery.ts` rétrograde tous les champs `write_safe` provenant de pages sans identité + fiche primaire en `review`; exporte causes de rejet et 40 sondes localité anonymisées.
  - `scripts/data/mubawab-location-dom-probe-v2.ts` + tests : capture ciblée de la structure et des labels de localisation (pas d'emails/numéros/titres libres).
  - `scripts/data/mubawab-strict-surface-v2.ts` : inspecte **toutes** les superficies explicites dans un élément, rejette conflit interne ou DOM/slug ; aucun secours `write_safe` via slug en cas de contradiction.
  - Certification CI : assertion qu'aucune page non primaire ne conserve de candidats `write_safe`; artifact `mubawab-five-field-300-location-dom-probe.json`.
- Dernier commit produit à tester `299848d5ae9189afe698f0090263d5dd4b628a5f`, run `37957990923` **queued** au dernier constat. Commits intermédiaires ont déclenché d'autres runs queued ; ne pas interpréter comme résultats.
- **Next exact :** lire le run 37957990923, vérifier tests et artifact localité 40 fiches ; corriger par des **preuves DOM de la fiche primaire** ; ré-échantillonnage 300 strict V3 ; quantifier freshness/dedup séparément. Ne pas écrire en DB, ne pas déployer Vercel, ne pas merger sans gate.


## Reprise — 2026-10-09 / quartier description+slug, validation EN COURS

- Source vérifiée : `37954471765` (CI succès V3) et artifact `11628306392`. Le 5/5 strict sur la V3 de base était **0/300** : 92 réponses avec identité maintenue + bloc primaire, quartier 0, surface 81, prix 59, ville 92, 3 conflits.
- Recherche offline **sur les 92 vraies fiches du JSONL artifact** : 11 quartiers nommés explicitement après le mot « quartier » dans la description **et simultanément présents dans le slug canonique** (matching accent/espaces normalisé). 6 de ces 11 annonces présentent déjà city+price+surface `write_safe`. C'est **un rendement potentiel (6), pas un résultat CI** et encore moins un label fraîcheur.
- `scripts/data/mubawab-description-district-v2.ts` : nouveau parser **double corroboration description primaire + slug**, noms propres explicites seulement, exclusion de « quartier calme », conflits entre plusieurs candidats concordants refusés ; uniquement lorsque `rec.primary_detail_verified===true`.
- `scripts/data/__tests__/mubawab-description-district-v2.test.ts` : cas positifs Hay Targa, Mhamid, Aïn Sebaâ, Californie + négatifs quartier adjectif, slug seul, description seule, ville seule, double district, page catalogue.
- `github-freeze-full-field-recovery.ts` intégré, et workflow Mubawab poussé sur HEAD `11e268cd9de9d52310cd8898fe78971289aca8aa`.
- **Nouvelle CI** : `37959672836`, dernier état observé `queued`. Run précédent `37957990923` en cours ; sa métrique n'inclut pas le nouveau parser quartier.
- Contraintes maintenues : pas d'accès ou écriture DB, pas de merge, pas de déploiement Vercel.

**Next exact :** vérifier le run `37959672836` **une fois** : si rouge, diagnostiquer les tests et corriger ; si vert, récupérer `mubawab-five-field-coverage.json` V3 et la sonde de localisation (40 fiches), comparer au V3 0/300 ; rechercher faux positifs, certifier la fraîcheur et la déduplication séparément avant scale.


## Certification V3 du 9 octobre 2026 — confirmé

**Run** [37959672836](https://github.com/hraaaaf/Akarfinder/actions/runs/37959672836) : `completed/success` sur HEAD `11e268cd9de9d52310cd8898fe78971289aca8aa`, artifact **11630009636**. Réanalyse des JSONL de l'artifact indépendamment des logs.

- 300 lignes ; identité source finale préservée **92** ; bloc principal reconnu **92**.
- `write_safe` primaire seulement : ville **92**, quartier **11**, prix **59**, surface **73** ; **6/300 = 2 %** possèdent les quatre champs + URL canonique. **19 conflits de surface**, au lieu de 3 dans une version plus permissive ; les contrôles ont été durcis entre les runs.
- Assertion corroborée en inspectant le JSONL : **0** champ `write_safe` provenant des **208** pages non primaires.
- Six identités 5/5 : `a:8385844` Aïn Mezouar/Marrakech, `a:8374278` Mhamid/Marrakech, `a:7792433` Casa Nearshore/Casablanca, `a:8327548` Californie/Casablanca, `a:8380850` Al Qods/Casablanca, `a:8367278` Place Mozart/Tanger. Les prix/surfaces exacts sont dans l'artifact ; **ne constituent pas validation de fraîcheur**.
- Diagnostic source `mubawab-five-field-300-location-dom-probe.json`: **40/40** fiches primaires sondées ont **0** occurrence dans les sélecteurs ciblés pour localisation et **0 JSON-LD adressé**. Donc une extraction DOM directe du quartier **n'est pas démontrée** dans ces 40 pages. Le parser de quartier **description explicitement nommée + slug** permet seulement 11 candidats ; ne pas les multiplier au-delà sans preuve.
- Les **208/300** réponses non primaires suggèrent redirection/recherche ou dérive de canonisation, mais **l'URL finale exacte n'a pas été collectée dans l'artifact** : ne pas affirmer plus précisément la cause.
- **Goal 200k non atteint**. Pas de DB, pas de Vercel, pas de merge.

**Next exact** : distinguer dans l'échantillon `source_identity_preserved=false` les redirections HTTP et les routes finales sans préserver le contenu HTML sensible, pour savoir si 208 fiches sont archivées/non disponibles ou des erreurs de routage ; ensuite augmenter le rendement de quartier uniquement avec une source primaire vérifiable (métadonnées de localisation ou publication propre, pas texte aléatoire ni cartes reliées) ; certifier de nouveau 300 ; tests freshness + dédup.


## Navigation finale Mubawab — diagnostic V4 / 2026-10-09

Goal de ce sous-lot : classer les **208/300 URL HTTP 200 sans identité source préservée** sans supposer qu'elles représentent 208 annonces définitivement retirées.

**Preuves acquises hors ligne sur l'artifact exact** V3 (11630009636) :
- 92/300 URLs vers fiches principales avec identité stable, 208/300 ne passent pas le gate d'identité. Cette absence est un **résultat de navigation, pas une preuve de retrait**.
- Répartition par tranche d'ID Mubawab parmi les 300 : moins de 7 800 000 = **7/51** fiches reconnues ; 7 800 000–8 199 999 = **19/129** ; 8 200 000–8 299 999 = **30/75** ; 8 300 000 ou plus = **36/45**. Forte corrélation entre identifiants élevés et fiche retrouvable **dans l'échantillon**, mais un ID plus élevé ne constitue pas une date de publication certifiée.
- Jointure locale du gel clean-corpus-v4.11-core.jsonl.gz avec les **300/300 URLs** : toutes ont deep_observation_count=0, deep_http_statuses=[], approved_for_import=false. Le corpus gelé reste un réservoir d'URLs, non un stock d'annonces fraîches/servables démontré.

**Implémentation engagée / non encore certifiée** : commit unique 721fe07569add49d107db1158871e34dab6d07f4 :
- Module scripts/data/mubawab-navigation-v2.mjs : classe la destination finale de fetch (même identité / autre fiche / accueil / recherche / route inconnue / hors domaine), distingue HTTP redirect et classe les ID par tranche de 100k. Ne persiste **jamais** l'URL finale brute, ses paramètres, le texte HTML ou les identifiants tiers.
- Tests scripts/data/__tests__/mubawab-navigation-v2.test.mjs : redirection de slug même identité, destination autre identité, page catalogue/accueil, domaine extérieur, confidentialité des paramètres, fausse route détail.
- github-freeze-full-field-recovery.ts et .github/workflows/mubawab-200k-certify-one-shot.yml : diagnostic agrégé mubawab-five-field-300-navigation-diagnostics.json et assertion zéro divergence entre identité classée et gate d'identité dans les réponses 200.
- Push commit unique, CI Mubawab ciblée : run 37966914495 (https://github.com/hraaaaf/Akarfinder/actions/runs/37966914495), **in_progress** au contrôle initial. Aucun résultat de redirection anticipé.

**Next exact** : consulter la CI une fois quand un résultat est disponible ; si succès, lire artifact navigation V4 et distinguer les 208 par catégories. Si échec, corriger la cause exacte et relancer une fois ; ensuite analyser l'éventuel vrai signal de disponibilité et la preuve quartier source. Aucun accès DB, écriture, merge ni déploiement Vercel.
