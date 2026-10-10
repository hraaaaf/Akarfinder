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


## Mubawab V4 — redirections classées / 2026-10-09

**Run** [37966914495](https://github.com/hraaaaf/Akarfinder/actions/runs/37966914495) : `completed/success` sur commit `721fe07569add49d107db1158871e34dab6d07f4`, artifact **11634397470**. `mubawab-five-field-300-navigation-diagnostics.json` et le JSONL ont été inspectés en local.

- **300/300** HTTP 200 et `response.redirected=true`; la redirection HTTP n'est donc pas un signal de disparition en soi.
- Destination `same_detail_identity` **92** ; `locale_other_path` **206** ; `error_or_auth_page` **2** ; le décompte est exhaustif **300**.
- Les 206 cas `locale_other_path` pointent vers un chemin officiel de Mubawab commençant par une locale, mais **sa structure exacte n'était pas capturée en V4**. Ne pas les classer comme définitivement supprimés.
- Certification inchangée : identité + fiche principale **92**, ville **92**, quartier **11**, prix **59**, surface **73**, 5/5 **6/300 = 2 %**, conflits surface **19**.
- Parmi les 300 URL, identifiants ≥8 300 000 : **45** échantillons, **36** fiches principales conservées, **5** complètes 5 champs ; sélection potentiellement utile mais **non représentative de la population** et **non équivalente à fraîcheur**.
- Les URL archivées n'avaient aucune observation détaillée dans le corpus gelé ; **200k fraîcheur/non-duplication toujours non certifiés**. DB 0/0, pas de Vercel, pas de merge.

**Correctif diagnostic V4.1 poussé** : `scripts/data/mubawab-navigation-v2.mjs` retourne exclusivement une empreinte structurelle de chemin (classe des segments, préfixe de route sur liste fixe) et booléen `requested_id_in_final_path` ; jamais d'URL cible ni de query. Tests pour ID d'origine sur route alternative, ID erroné, route inconnue, confidentialité. `github-freeze-full-field-recovery.ts` agrège les statistiques de classes et présence d'ID, sans modifier le gate de certification. Dernier HEAD produit `839c452662b1dc6a2912a4b17d153c646c5155e5` ; run V4.1 ciblé [37970628173](https://github.com/hraaaaf/Akarfinder/actions/runs/37970628173) vu **queued** initialement ; verdict non encore constaté.

**Next exact** : lire une fois le run **37970628173** ; si vert, interpréter l'artifact `mubawab-five-field-300-navigation-diagnostics.json` (shape, présence de l'ID, route allowlistée). Si la destination possède l'ID et une véritable fiche primaire, ajouter un parseur de route précis après preuve ; sinon mettre ces URLs en quarantine jusqu'à observation directe. Ne pas les compter comme disponibles ni comme supprimées. Puis diagnostic freshness et dedup sur un échantillon réellement récent avant montée en volume.


## Proposition stratégique — 2026-10-09 : pivot freshness-first (NON ADOPTÉ)

Audit direct du gel canonique `10910779576` : 222 359 URLs éligibles, mais seulement 8 487 observées HTTP 200 en profondeur et 1 191 avec tous les champs présents, sans certification actuelle de fraîcheur. **89,94 %** du gel devrait être frais et complet pour atteindre 200k sans nouvelle acquisition, ce qui n'est pas établi.

Indications comparatives non équivalentes aux certifications strictes : **Domio 1 176/3 495** observations HTTP 200 avec les cinq champs (dont seulement **2** publiées dans les 30 derniers jours) ; MarocImmo **15/4 499**, prix seulement 19, quartier 4 499 ; Sarout **0/493**, quartier 0, prix 427, surface 364 ; Mubawab V3 strict **6/300**, sans validation de fraîcheur. Voir le rapport et la méthode dans `docs/data/AKARFINDER_200K_FRESHNESS_FIRST_PIVOT_PROPOSAL_2026-10-09.md` (créé à `45c1f09a492db0331e0b451b9c08d8df42d097e6`).

**Recommandation, non exécution d'une nouvelle acquisition :** arrêter les itérations chronophages sur anciennes URLs Mubawab ; mesurer le rendement frais+5/5+unique de petits lots récents multi-sources autorisés, puis étendre seulement les sources efficaces. En parallèle négocier un flux permanent d'annonces directes autorisées (agences/CRM/portails). Les anciennes dates `published_at` ne prouvent pas seules l'inactivité ; recontrôler à la source.

**Gate stratégique :** adopter explicitement la feuille de route B avant remplacement des campagnes actuelles. Aucune DB, Vercel, merge, campagne massive ou assouplissement 5/5. Dernière V4.1 déjà déclenchée `37970628173` : elle peut fournir son résultat indépendamment.

**Next exact si adoption :** inventaire des workflows multi-sources existants, contrôle robots/conditions, benchmarking léger et comparable sur annonces réellement récentes, avec stricte provenance, déduplication et preuve d'activité.

## Pivot utilisateur confirmé — scraping des pages de résultats, 2026-10-09

Correction stratégique explicite : **l'utilisateur souhaite scrapper directement des sites immobiliers, pas acheter des données, signer des partenariats ou importer des CRM**. La proposition commerciale précédente est abandonnée comme priorité. Notre piste majeure est **RESULT-CARD-FIRST** : lire les pages de recherche/catégories et collecter l'URL canonique, la ville, le quartier, le prix et la superficie **dans le même bloc de résultat**, puis certifier activité et dédup séparément. L'objectif reste 200k uniques, frais, exploitables ; la présence de 5 champs sur une carte n'en est pas encore une preuve.

**Faits externes vérifiés :** Mubawab expose, par exemple sur `https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre`, des cartes individuelles avec prix DH, « Californie, Casablanca », 146 m² et lien source, ainsi que d'autres biens. Des blocs programmes neufs contiennent plusieurs unités et doivent être exclus du pipeline d'annonces individuelles. Le public robots `https://www.mubawab.ma/robots.txt` n'exclut pas globalement `/fr/st/` à la date d'inspection ; chaque requête du pilote revérifie robots et s'arrête en cas d'accès refusé.

**Spike technique read-only :**
- `scripts/data/mubawab-result-cards-v1.mjs` : extraire blocs d'annonces indépendants via Cheerio, ID `a:<id>`, champs sourcés à la même carte, valeurs contradictoires rejetées, programmes `pa:` exclus ; état `observed_review` uniquement.
- `scripts/data/__tests__/mubawab-result-cards-v1.test.mjs` : 9 tests de structure, conflits, fausse identité, robot exclusions, spécificité Allow.
- `scripts/data/mubawab-result-cards-pilot-v1.mjs` : 3 catégories seulement (vente Casablanca, vente Rabat, location Casablanca), robots fail-closed, pas d'accès aux pages de détail ni DB, pacing 1250 ms.
- `.github/workflows/mubawab-result-cards-first-pilot.yml` : CI dédiée, output `mubawab-card-first-pilot.json[ l]`.
- Premier run `37973276661` **failure** : 7/8 tests réussis, échec d'une fixture robots avec Allow plus spécifique que Disallow (le comportement du parser respecte la priorité du plus spécifique) ; **aucun fetch n'a eu lieu sur ce run**. Fixture corrigée au commit `c714a5e3eeeeebfbae09aaff5228e98a4d23e39f`, nouveau run `37973454376` observé **in_progress**. Ne pas affirmer le rendement avant cet artifact.
- Documentation du nouveau contrat : `docs/data/AKARFINDER_200K_INDEX_CARD_FIRST_2026-10-09.md`.

**Next exact :** lire le run `37973454376` et son artifact, séparer succès des tests et rendement réel des pages HTML. Si extraction zéro, auditer le DOM réel d'une page de résultats et corriger le sélecteur ; si rendement positif, étendre prudemment par nouvelles catégories/villes puis multi-portails. Mesurer nouveaux IDs / requêtes, recency, faux positifs, uniques 5/5 certifiés avant toute montée en volume. Ne pas toucher DB, merger ni déployer Vercel.


## Résultat du pivot demandé — CARD-FIRST 8 pages validé en CI

Le **scraping des pages de résultats** est la priorité produit demandée, et non l'achat de données ou le partenariat CRM.

**Preuve principale** : workflow `Mubawab Result Cards First — bounded pilot`, run `37974096161` **success**, artifact `11638287776`, HEAD produit `6c0c00aaea7e25b9c11370d06e2c05fa42e53cf7`.
- **8 pages** de résultats / **215 IDs uniques** d'annonces individuelles `a:<id>` / **187/215 avec 5 champs présents** dans leurs cartes / **0 page de détail**.
- Jointure à la freeze canonique `10910779576` par source ID : **161 IDs nouveaux**, **54 déjà présents**. Les URLs/slugs seuls ne permettent pas cette mesure.
- **5 champs présents ≠ certified fresh**. Les 187 sont des `observed_review`, non validées pour DB ; disponibilité source actuelle, cohérence du prix et déduplication entre portails manquent.
- Script `scripts/data/mubawab-result-cards-v1.mjs` (DOM Cheerio), runner 8 catégories, tests anti-mélange et robots. Rapports `docs/data/AKARFINDER_200K_INDEX_CARD_FIRST_2026-10-09.md`.
- DB access/write **0/0** ; pas de Vercel ni merge. Pas de contournement des exclusions robots.

**Next exact** : inventorier les branches de résultats/paginations **robots-permises** (ville, type, quartier, vente/location) en réutilisant l'énumérateur historique de shards Mubawab ; ouvrir une validation de **petit échantillon** d'URLs de détail nouvelles pour démontrer l'identité active/les 5 champs ; puis adapter à d'autres portails et calculer les uniques réellement servables. Les anciens runs V4 de correction d'URLs ne sont plus le chemin critique.


## Lot Mass Acquisition V1 — 50 pages (2026-10-10)

**Goal** : industrialiser le scraping des pages de résultats publiques, puis mesurer les identités distinctes / 5 champs / nouveautés source avant qualification de fraîcheur. Objectif intermédiaire **1000 cartes distinctes** (non encore atteint).

**Dernière preuve certifiée** : run `37974096161` ✅, 8 pages, 215 identités `a:id`, 187 cartes à cinq champs présents, 161 IDs nouveaux face au gel; 0 page détail. Tous `observed_review`, non frais/actifs certifiés.

**Implémentation** : HEAD produit `41d28d2e6c56789c2e3089e23cbd540a8deb4e6d`, fichiers `scripts/data/mubawab-card-scale-v1.mjs`, `scripts/data/__tests__/mubawab-card-scale-v1.test.mjs` et `.github/workflows/mubawab-card-scale-50.yml`. 5 villes × 5 types × vente/location = 50 routes candidates strictement bornées ; robots fail-closed, 1750ms entre requêtes, arrêt 403/429, pas de fiche détail, route finale vérifiée, dédup par ID et rejet des contradictions inter-cartes. La ville est requise dans le bloc de localisation source, et aucune ligne ne peut être promue `freshness_certified`/DB. Le benchmark 50 n'a pas encore de résultat démontré.

**Run** : `38014431380`, état observé initialement `in_progress`. Des workflows historiques de la branche se sont également déclenchés sur le push ; ils sont indépendants du nouveau lot. Aucun déploiement ni DB.

**Document technique** : `docs/data/AKARFINDER_MASS_ACQUISITION_V1.md`. Préparation deuxième portail : des adaptateurs MarocAnnonces et Avito existent dans le repo ; vérifier les accès publics et robots avant tout fetch, ne pas contourner une page de vérification.

**Next exact** : inspecter les tests et les résultats exact-HEAD `38014431380`, corriger tout échec et relancer seulement si sûr ; si vert, télécharger artifact, mesurer unique/5 champs et joindre par ID au gel; décider extension catégories/scans et test 20-30 fiches ciblées, puis véritable fraîcheur/dédup inter-sites. Aucun merge/deploy Vercel sans autorisation.


## État vérifié — 2026-10-10 / MASS ACQUISITION V1

**Succès intermédiaire prouvé : >=1 000 cartes uniques observées.** CI exact-HEAD `38014920725` ✅, artifact `11655684897` :
- **50/50 catégories HTTP 200**, 0 fiche détail ; 1 316 identités `a:id` distinctes ; 1 140 cartes avec 5 champs visibles ; 806 IDs absents du gel, dont 700 avec 5 champs (jointure `10910779576` toutes locales).
- 14 signatures identiques ville/quartier/prix/surface = 31 IDs potentiellement liés ; **pas de fusion automatique**. Champs et identité source vus en carte ne prouvent ni publication récente, ni activité réelle, ni unicité inter-portails.
- 20 erreurs 404 du pilote initial corrigées par vrais slugs `villas-et-maisons-de-luxe` et `bureaux-et-commerces`. Code testé à `77f701458eda686ab343efa3bdd0c4628f37ee22`.
- Avito canari `38014920766` CI techniquement verte mais sitemap HTTP 403 / 0 annonce : **source bloquée**, pas d'évasion de protection. Domio prochaine source à qualifier après accès robots.
- Aucune lecture/écriture DB, aucun merge, aucun déploiement Vercel.

**Next exact** : audit de détail read-only sur 30 fiches issues de l'artifact `11655684897` pour mesurer l'identité et la présence des champs, classer les redirections ; tout reste `review` sans preuve fraîcheur. Préparer ensuite le scan national par catégories/shards autorisés et le deuxième portail. Suite détaillée : `docs/data/AKARFINDER_MASS_ACQUISITION_V1.md`.

## Vérification de fiches après acquisition 50 pages — 2026-10-10

**Preuve** : run `38015494577` ✅, artifact `11654889923` : audit read-only de **30 annonces** échantillonnées depuis l'artifact `11655684897` ; **30/30 pages détail réelles avec même ID source et bloc primaire** ; **26/26 surfaces présentes dans la fiche correspondant exactement à la carte** ; 4/30 surfaces sans preuve principale, pas classées fausses ; aucun blocage réseau ni DB. Le run initial `38015425292` avait échoué **avant crawl** sur top-level await CJS `tsx`, corrigé dans HEAD `4b7c5cb73cc59d13237e78e8eac81dce87237068`.

**Périmètre certifié** : exactitude d'ID et surface sur cet **échantillon sélectionné**. Une annonce peut conserver une fiche HTML et ne plus être disponible commercialement ; publication récente, disponibilité vendeur, déduplication inter-sources et autorisation de republication restent **non validées**.

**Lot suivant indépendant en préparation** : tester deux pages catégories Domio par canari robots fail-closed, sans recourir aux pages individuelles ni prétendre 5/5. Avito reste en état sitemap 403, non contourné.

**Next exact** : lire le run Domio et son artifact ; si source productive, demander une preuve DOM du quartier et des cinq champs ; sinon classer la source bloquée et adapter une autre source. Pour Mubawab, continuer un audit de disponibilité/horodatage + doublons physiques sans déclarer les 1 140 cartes comme 1 140 annonces fraîches.


## Deuxième source — Domio public card canary vérifié (2026-10-10)

Run `38015856380` ✅, artifact `11656755461`, HEAD `53b2c3fa77bf0c6d0653a0d0fb7cf9971b72afa1` : robots autorise les 2 pages de catégories, **48 IDs source Domio distincts**, **46 surfaces**, **34 prix**, 0 détail, 0 DB. **Ne pas déclarer 5/5 ni fraîcheur** sans corroboration du quartier et de l'activité.

Suite immédiate préparée : extraction du quartier exclusivement depuis l'étiquette explicite `ville, quartier, n m²` dans le lien du bien (pas de déduction du slug de la ville ni des cartes voisines), avec tests de refus des lieux absents ou contradictoires. Nouveau canari à mesurer, puis sourcing multi-portails et contrôle des duplications.

Mubawab reste au dernier certificat 50 pages `38014920725` : 1 316 IDs uniques, 1 140 cartes 5 champs observés, 806 nouveaux ID par rapport au gel, et audit indépendant de 30/30 identités `38015494577` avec 26/26 superficies corroborées. Aucune certification de fraîcheur commerciale.


## Clôture partielle du lot multi-portails — 2026-10-10

**Mubawab pilote** `38014920725` ✅ : **50 pages**, **1 316 annonces identifiables**, **1 140 cartes cinq champs**, **806 IDs inconnus du gel**, **700 de ces derniers avec cinq champs**. Audit indépendant `38015494577` ✅ : **30/30 pages d'origine avec identité conservée**, **26/26 surfaces vérifiables concordantes**.

**Domio source #2** `38016037724` ✅, artifact `11656231723`: robots vérifié, **2/2 catégories**, **48 IDs**, 34 prix, 46 surfaces, 22 quartiers explicites, **15 cartes 5/5** ; comparaison gel : **14 nouveaux IDs**, dont 5 cinq champs. Chiffres de **cartes observées** seulement, aucune nouvelle annonce fraîche certifiée. Avito sitemap 403/0 source non exploitable sans nouveau canal autorisé.

**Prochaine action** : étendre Domio prudemment via routes robots vérifiées ; contrôles de détail ciblés, disponibilité réelle/horodatage, déduplication physique intra/inter-portails, revue conformité avant toute activation. Aucun accès/écriture DB, aucun merge ni déploiement Vercel.


## Contrôle anti-faux-quartier Domio du 10 octobre 2026 (09h)

- Run `38041999664` ✅, artifact `11665937766` analysé : **48 IDs**, 34 prix, 46 superficies, **20 quartiers explicitement acceptés** et **13/48 cinq champs présents**. L'ancien 15/48 incluait 2 fausses localisations : la carte `domio:12351` contenait « QUARTIER GAUTHIER Casablanca » et `domio:11156` attribuait Bouskoura à Casablanca. Le filtre conservateur les a rétrogradées. Aucun scraping de détail ni DB sur ce run.
- Audit de détail Domio `38041999729` ❌ **tests seulement**, zéro requête détail : le texte de balises HTML adjacentes était concaténé par Cheerio, empêchant la preuve `Référence DOM-n`. Correction : joindre les nœuds texte avec une séparation explicite ; workflow pointe désormais vers l'artifact corrigé `11665937766` (run `38041999664`).
- Ce sont des **champs observés**, ni fraîcheur commerciale ni déduplication physique ni droits de publication prouvés.
- Next exact : retester le contrat DOM, si vert inspecter le nouvel artifact 12 détails, puis avancer le graphe de catégories Domio accessibles.


## Contrôles vérifiés — 10 octobre 2026, lot Domio expansion

**Domio** :
- Run `38042128852` **completed/success**, artifact `11666162567` : audit de **12/12** pages détail avec identifiant conservé et référence `DOM-id` source, **12/12 prix** identiques aux cartes, **12/12 superficies** identiques. Chaque page affiche une date `Publié le` explicite : dans cet échantillon les anciennetés vont de **14 à 98 jours** au 10 octobre. Ce sont des dates publiées par le portail, **pas la preuve que le bien est toujours disponible**.
- Run `38042386411` **completed/success**, artifact `11666337893` : **7/7** pages catégories (Casablanca, Marrakech, Rabat, Tanger, Agadir, vente/location), **168 identifiants Domio uniques**, **150 prix**, **154 surfaces**, **79 quartiers**, **70 cartes 5/5** conservatrices. Agadir 24 fiches/0 quartier prouvé ; ne pas en inventer.
- Jointure hors ligne par identité numérique au gel `10910779576`, SHA contrôlé `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953` : **34/168 IDs inconnus du gel**, dont **14 cartes 5/5**. Pas de « publications récentes » revendiquées.
- Comparaison exacte ville + quartier + prix + superficie entre les **1 140 cartes Mubawab complètes** et **13 anciennes cartes Domio cinq champs** : **0 collision exacte de signature**. Cela ne constitue **pas** une déduplication physique exhaustive ni une certification d'unicité entre portails.
- Le run 7 pages conserve une correction du parseur (rejet des prix aberrants et localisation contaminée). Toutes les données restent `review`, aucun compte 200k atteint.

**Pagination Domio** : sur le portail public, la page 2 d'une catégorie est accessible via le format `?page=2` (lien de pagination constaté sur Casablanca). Un canari **7 pages numéro 2 maximum**, robots fail-closed, cadence 1,8 s et arrêt 403/429 est préparé, avec déduplication contre le lot sept premières pages. Il ne prétend pas que toutes les catégories disposent d'une page 2 valide ; la réponse/finale seront vérifiées. Pas de fiche individuelle et pas de DB.

**Next exact** : lire le run du canari pagination, analyser chaque page 2 et la croissance marginale unique; si productive, généraliser la pagination uniquement autorisée et découverte depuis les liens publics, avec plafonds de requêtes et contrôle d'identité. Actualité commerciale/dédup physique/inter-portails/droits toujours non validés.


## SPRINT 24 H — reconnaissance publique nationale, 2026-10-10

**Demande utilisateur** : 200 000 annonces fraîches, uniques et exploitables sous 24 h via scraping de l'immobilier marocain. **Goal non atteint ni garanti.** La collecte doit rester publique, sans bypass de CAPTCHA/robots/403/429 et sans dissimulation de l'identité du crawler.

**Faisabilité vérifiée** : 200k/24 h = 2,315 annonces valides chaque seconde ; avec 25 cartes par page = au moins 8 000 pages réellement distinctes, davantage avec doublons et champs absents. Les affichages publics Mubawab ≈110k annonces et Domio ≈10,4k ne suffisent pas à prouver un stock de 200k disponibles. Source de preuve du marché et limites : `docs/data/AKARFINDER_200K_24H_SPRINT_2026-10-10.md`.

**Preuves produit** : Mubawab 50 pages `38014920725` ✅ : 1316 IDs, 1140 5-champs, 806 nouveaux ID gel ; audit 30/30 identités `38015494577` ✅. Domio 7 pages `38042386411` ✅ : 168 ID, 70 5-champs observés ; audit détail `38042128852` ✅ : 12/12 prix/surface/ID concordants et dates publiées. Non certification d'activité commerciale ni de dédup physique.

**Nouvel effort immédiatement exécutable** : `scripts/data/mubawab-national-frontier-v1.mjs` + tests + workflow `.github/workflows/mubawab-national-frontier-100.yml`. Départ de 2 pages `cc` nationales (découverte uniquement, sans ville inventée) et 50 catégories prouvées, expansion à 100 requêtes max depuis liens de ville/type réellement présents dans le HTML. Chemins colon/paramètres exclus ; robots fail-closed, UA transparent et cadence >1,75 s; IDs source dédupliqués, delta contre 50 pages immuables. Pas de détail, pas d'accès DB, pas de Vercel ni merge.

**Next exact** : lire CI exact HEAD et artifact Frontier100 ; si échoue, corriger ; si vert mesurer net-nouveaux ID par requête et couverture réelle vs total affiché ; puis adapter la stratégie nationale aux autres portails autorisés et à la pagination source vérifiée, audit de disponibilité et dédup avant promotion. Ne pas appeler 200k 'atteint' sans preuve.

## Closeout vérifié — Domio pages 2 et candidats dédup inter-sites (10 octobre 2026)

- **CI 38042621783 ✅ / artifact 11665849216** : 7/7 pages numéro 2 Domio HTTP 200, URL page=2 préservée, robots OK, 167 IDs distincts dont 56 cartes 5 champs ; zéro recoupement avec les 168 IDs des pages 1. Les 14 pages réunies donnent **335 IDs distincts et 126 cartes 5 champs observés**.
- **Gel canonique 10910779576, SHA256 e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953** : page 2 = **0 ID inédit au gel** ; page 1 = 34 IDs absents du gel (14 cartes 5 champs). L'extension profonde ne crée pas ici de nouvelles identités vs l'archive ; mesurer le rendement avant de poursuivre.
- **CI 38042808384 ✅ / artifact 11665424718** : dédup candidat offline sur 1 140 cartes Mubawab 5 champs + 70 Domio 5 champs ; une seule paire exacte ville/quartier/prix/surface **a:8431161 vs domio:12374** (Rabat Agdal 8 000 DH 80 m²), **0 doublon physique certifié, 0 fusion**, autre preuve obligatoire.
- **Total observé, pas comptage production** : 1 316 IDs Mubawab + 335 IDs Domio = **1 651 identifiants propres aux sources** ; 1 140 + 126 = **1 266 cartes 5 champs présentes**. Ce ne sont pas nécessairement 1 651 biens physiquement uniques, frais ou disponibles. DB 0 lecture/écriture, Vercel aucun, merge aucun.
- **Nouvel effort parallèle** introduit au commit d0ff59b8676ad3e172d81b2ec20069fad60f9d04 : Frontier100 sur des catégories nationales Mubawab publiquement liées, run 38042868091 en cours au contrôle. Aucun rendement anticipé.
- **Next exact** : lire artifact Frontier100, comparer nouveaux IDs par catégorie/requête, arrêter les catégories à rendement nul ; qualifier disponibilité réelle + dédup physique + droits avant publication et avant tout objectif 200k.


## Sprint 24 h — Frontier Mubawab + Domio 70 pages + reprises (10 octobre 2026)

**Preuves vérifiées** :
- Mubawab national `38042868091` ✅ (artifact `11665954208`) : 62 pages réellement observées, **1 320 IDs**, **199 IDs absents du pilote 50**, **169 nouveaux avec 5 champs**. Reconnaissance supplémentaire `38043182237` ✅ (artifact `11666264583`) : 62 pages, 1 321 IDs, **200** absents du pilote, **169** cinq champs. L'exploration de catégories `cd/sd` liées n'a pas accru sensiblement la couverture.
- Domio pagination source `38043204045` ✅ (artifact `11666149822`) : **70 pages publiques**, **1 663 IDs distincts**, **745 cartes avec 5 champs observés**, **1 328 IDs non vus dans les 14 premières pages**, dont **619** avec 5 champs. 0 erreurs robots, 0 DB, aucune fiche individuelle pendant le crawl. Quatre catégories affichent une suite au-delà de la page 12 ; les autres s'arrêtent à page 10, 10 et 2. Les chiffres **ne démontrent pas l'activité commerciale**.
- Dédup candidat offline `38042808384` ✅ : une paire **a:8431161 vs domio:12374** partage ville/quartier/prix/surface (Rabat Agdal 8 000 DH, 80 m²), **suspect seulement**, non fusionnée. Ne pas prétendre aucun doublon inter-sites.
- Mubawab pages quartiers candidates dérivées des libellés présents dans les vraies cartes, puis **contrôle exact de H1 + URL + quartier dans chaque carte** : `scripts/data/mubawab-district-derived-shards-v1.mjs`, run `38043539778` en cours au dernier contrôle (pas de volume anticipé).
- Domio **prochain sous-lot** `scripts/data/domio-pagination-resume-v1.mjs` : source immuable 70 pages, relire la page12 des 4 catégories avec lien Next déjà prouvé, puis suivre uniquement les liens de pages suivantes, max 64 requêtes et 12 pages supplémentaires par catégorie, zéro DB, filtres doublons. Workflow `.github/workflows/domio-pagination-resume-after-12.yml` en cours de lancement.

**Définition du Goal** : 200 000 **biens physiquement uniques, frais, encore disponibles et 5/5** ne sont PAS atteints ; une nouvelle identité relative à notre archive n'est PAS une preuve de fraîcheur. Les 1 321 et 1 663 IDs sont des identités distinctes **dans leurs portails respectifs**, pas un nombre national net certifié.

**Next exact** : lire les runs exacts des quartiers Mubawab et de la reprise Domio ; mesurer l'incrément marginal versus artifacts, corriger erreurs ; élargir uniquement routes publiquement déclarées et permises ; tester activité/âge/date et doublons physiques par échantillons ; verrouiller un classement frais+unique+5 champs avant toute insertion production.


## Reconciliation acquisition multi-sources — 2026-10-10 / Ledger V1

**Goal / résultat intermédiaire prouvé localement** : cinq artifacts GitHub Actions gelés et vérifiés par SHA256 sont réconciliés par clé `source+ID` sans inventer de fraîcheur : Mubawab50 `38014920725`, Frontier100 `38043182237`, District120 `38043539778`, Domio 70 pages `38043204045`, reprise Domio pages 13+ `38043986522`.

- **7 768 cartes observées** dans les artifacts, **6 107 IDs distincts propres à leur source** : 3 517 Mubawab, 2 590 Domio ; **4 385 IDs avec les quatre champs + URL réunis dans une même carte, sans conflit entre observations**.
- **4 IDs contradictoires en quarantaine** (3 prix, 1 superficie), **165 groupes de signatures ville/quartier/prix/surface identiques** (361 identifiants concernés), dont **19 groupes potentiellement inter-portails** ; **aucun doublon physique fusionné sans preuve**.
- **0 certifié frais / commercialement actif / physiquement unique / prêt DB**. Attention : le rapport `5 champs observés` ne certifie pas la qualité de diffusion ou les droits de réutilisation.
- Module `scripts/data/card-acquisition-ledger-v1.mjs`, 6 tests offline, workflow dédié `.github/workflows/card-acquisition-ledger-v1.yml` qui télécharge les cinq artifacts **immuables**, vérifie les empreintes SHA256 JSONL, rejette les contradictions et certifie l'intégrité, sortie `card-acquisition-ledger-v1`. Document `docs/data/AKARFINDER_CARD_ACQUISITION_LEDGER_V1.md`.
- Preuve locale `akarfinder-acquisition-ledger-v1-evidence.zip` (rapport, ledger complet, sources code, tests). **CI du nouveau workflow à vérifier sur HEAD exact avant d'affirmer certifié GitHub**.

**Next exact** : lire le workflow Ledger V1 et son artifact ; puis mesurer le rendement net des 217 shards Mubawab restants et de Domio après page 12, sans visiter de pages disallow ni contourner les contrôles du site. Mettre en quarantaine prix/localisation contradictoires ; échantillonner disponibilité commerciale/date/dup physique avant toute écriture et toute affirmation des 200K. Pas de Vercel, pas de merge, pas de DB.


## Actualisation 6 artifacts — 10 octobre 2026

Le run GitHub cinq artifacts `38044450856` est **vert** ; son artifact `11666931539` confirme 6 107 IDs par source, 4 385 cinq champs cohérents et 4 conflits. L'ajout du **sixième artifact** `11667246884` (run `38044090021`, **217 catégories Mubawab**, 189 pages valides, 3 082 annonces, 2 790 cartes 5 champs) porte la réconciliation **validée offline** à :

- **10 850 observations**, **8 993 IDs source distincts** (Mubawab 6 403, Domio 2 590).
- **6 995 cartes 5 champs présentes dans un même bloc et sans contradiction inter-lots** : Mubawab 5 761, Domio 1 234.
- **5 contradictions** entre observations (4 prix, 1 superficie) rétrogradées en `review`.
- **249 groupes de signatures** ville/quartier/prix/surface identiques, **543 IDs candidats doublons**, dont **21 groupes inter-portails**. Aucun doublon physique fusionné ni certifié.

Workflow Ledger élargi aux **six artifacts et SHA256 JSONL épinglés**. **Gate : attendre sa CI exact-HEAD** avant de déclarer cette version certifiée GitHub. **0 annonce certifiée fraîche/active/publiable, 0 écriture DB**, aucun merge ni déploiement Vercel. Next exact : lire la CI Ledger six lots et l'artifact ; comparer nouveau stock au goal 200K, prioriser extension source vérifiable et vraie fraîcheur.

**Canari troisième portail :** Sarouty, code `scripts/data/sarouty-card-canary-v1.mjs`; premier test `38044741386` échoué **avant toute requête HTTP** (regex unité m²), correctif dans prochain commit. robots du portail annonce Crawl-delay 10 s, respecté. Ne pas affirmer de production Sarouty sans artifact. 


## Certification six artifacts et ouverture Sarouty — 2026-10-10 à 10h43

**Certifié GitHub** : [run 38044964671](https://github.com/hraaaaf/Akarfinder/actions/runs/38044964671) `completed/success` sur HEAD `bf4804ab9e4e87f0345e843fac06feb86eb120d7`. Artifact immuable **11667367558** inspecté : **10 850 cartes source**, **8 993 IDs propres aux deux sources** (Mubawab 6 403, Domio 2 590), **6 995 avec cinq champs cohérents**, **5 conflits**, **249 groupes de signatures identiques dont 21 groupes inter-portails**. Aucun doublon physique ni fraîcheur certifiés. Le gate CI du ledger six lots est donc **levé**, pas celui du Goal 200K.

**Troisième portail Sarouty — preuve limitée :**
- Run [38045232381](https://github.com/hraaaaf/Akarfinder/actions/runs/38045232381) `completed/success`, artifact **11667732538** : deux pages catégories réelles, **42 liens de carte candidats** (30 Casablanca, 12 Rabat), **0 ID accepté dans le registre et 0 annonce cinq champs certifiée**. Robots vérifié, pause minimale **10 secondes** entre requêtes malgré `crawl_delay_seconds=1` enregistré dans l'artifact.
- Le point productif suivant est une extraction DOM **à provenance par carte isolée**, sans associer des champs de cartes voisines. Nouveau module `scripts/data/sarouty-result-cards-v1.mjs` + 7 régressions, runner `scripts/data/sarouty-card-fields-pilot-v1.mjs` + régressions robots/429/dédup et workflow `.github/workflows/sarouty-card-fields-pilot.yml`.
- Cible : **six catégories publiques maximum** (Casablanca, Rabat, Marrakech, Tanger, Agadir, Kenitra) issues de liens de ville sur la page publique ; robots fail-closed, pause min 10s, arrêt immédiat 403/429, zéro requête détail, aucun bypass/masquage d'UA, aucune DB/Vercel/merge.
- Le champ `five_field_observed` ne représente que URL+ville+quartier+prix+surface observés dans **la même carte**. On ne promet **ni statut commercial actif, ni fraîcheur, ni droits de republication**.

**Next exact :** lire la CI GitHub exact-HEAD du pilote Sarouty, corriger toute régression, analyser artifact (sources fiables vs liens seulement), puis sélectionner les portails/chemins au meilleur rendement nouveaux IDs fiables par requête. Pour atteindre 200K actifs et distincts en 24 h, l'accès à un inventaire public suffisant et autorisé demeure une incertitude majeure.


## Sprint public national — état exact 10 octobre 2026, après sept artifacts

**CI de réconciliation sept inputs** [38046725132](https://github.com/hraaaaf/Akarfinder/actions/runs/38046725132) ✅, artifact **11668090501** (JSON inspecté + empreintes source épinglées) : **10 913 cartes observées**, **9 056 IDs source distincts**, **7 042 cartes avec cinq champs cohérents** ; Mubawab **6 466 IDs / 5 808 cinq champs**, Domio **2 590 / 1 234** ; cinq conflits de valeurs, 21 groupes de signatures suspectes inter-portails, aucune fusion physique. **0 fraîcheur commerciale / actifs / uniques physiques certifiés et 0 publication DB**.

**Expansion de Meknès et Oujda** [38046549259](https://github.com/hraaaaf/Akarfinder/actions/runs/38046549259) ✅, artifact **11666594461**, 2/2 pages catégorie HTTP200, **63 IDs** tous absents du ledger six-artifacts, **47 cinq champs**. La découverte automatique de liens inter-villes par ces deux catégories est **0** ; ne pas en inventer. Ce lot a été intégré au ledger sept-artifacts.

**Sarouty V1** [38046267620](https://github.com/hraaaaf/Akarfinder/actions/runs/38046267620) ✅ en exécution de CI, artifact **11667599714** : 6/6 catégories publiques HTTP200, robots vérifié, minimum 10 secondes entre les requêtes, **1 fiche correctement isolée par le parseur**, **0 cinq champs**, parmi de nombreux liens candidats. **Le rendement n'est pas encore productif**. Correction à préparer après sonde structurelle DOM ; ne pas mélanger des cartes ni compter les liens comme des annonces.

**Lot indépendant en lancement** : `scripts/data/mubawab-regional-categories-v1.mjs`, 8 pages catégories exactes publiées par Mubawab : **Fès, Kénitra, Tétouan, Nador**, appartements à vendre et à louer. Les slugs Fès/Kénitra/Tétouan sont accentués (`%C3%`) ; les anciens essais de noms ASCII avaient pu échouer. Robots fail-closed, aucun détail individuel, max 8 pages, comparaison IDs source avec artifact ledger sept-inputs `11668090501` et SHA256 `f36cb89a26399ded9f640b4072f83037b8a9c4911b3c8978cfe5269a3ccbe4f0`. **Ne pas anticiper les IDs nouveaux avant la CI.**

**Next exact** : lire les tests et artifact du run régional huit catégories ; intégrer seulement ses IDs prouvés au ledger ; puis qualifier fraîcheur et disponibilité et dédup physique sur échantillons, et tester de nouvelles routes de ville/type réellement publiées. Aucun contournement de protection, DB, merge ou déploiement Vercel.


## Huitième artifact — expansion Fès / Kénitra / Tétouan / Nador (2026-10-10)

**Source indépendante vérifiée** : workflow Mubawab régions [38046976281](https://github.com/hraaaaf/Akarfinder/actions/runs/38046976281) ✅, artifact `11666629941`, SHA256 du JSONL `87f527e036bb2428b70e7092582e083b461c639f2c7af6dede50aaf22bb27742`.
- **8/8 pages catégorie HTTP200**, vente/location pour les quatre villes ; **226 IDs nouveaux relativement au registre sept-inputs**, **196 cinq champs présents**, aucun fetch détail, robots vérifié et respecté.
- Les huit pages affichaient correctement les villes accentuées Fès/Kénitra/Tétouan grâce aux routes officielles encodées ; zéro conflit inter-catégories observé dans ce lot.
- Réconciliation **huit inputs calculée offline** sur les fichiers immuables : **11 139 cartes source**, **9 282 IDs propres aux sources** (Mubawab 6 692, Domio 2 590), **7 238 cinq champs cohérents sans contradictions**, **5 conflits multi-lots**, 254 groupes de signatures possibles et 21 groupes inter-portails ; 0 doublon physique fusionné, 0 disponibilité/fraîcheur certifiée.
- Workflow du ledger mis à jour pour télécharger le huitième artifact avec SHA256 épinglé et **assertions exactes 11 139 / 9 282 / 7 238 / 5 conflits**. **La valeur est recalculée offline ; attendre le run CI GitHub exact avant déclaration de certification GitHub huit lots**.
- Sarouty : le canari six villes `38046267620` a vu six pages mais uniquement **1 carte correctement isolée, 0 cinq champs** ; le diagnostic DOM `38047091171` s'est arrêté **sans accès catégories** parce que robots.txt n'était pas disponible. Pas de bypass ni nouvelle tentative identique.

**Next exact** : lire CI huit artifacts, puis prioriser la découverte de nouveaux types de biens et villes via les liens publics existants. En parallèle, définir la preuve de disponibilité commerciale, fraîcheur et dédup physique avant publication. **Les 200K actifs et uniques ne sont pas atteints.**


## Huit artifacts certifiés et matrice régionale (2026-10-10)

**Validation exacte** : CI `38047261522` ✅, artifact `11668296196`, SHA256 du JSONL `10edd629babc1364b3925b314170e17d0c416dd8c5943eb2d540b662705e5113`.
- **11 139 cartes observées**, **9 282 IDs source distincts** : Mubawab 6 692 + Domio 2 590.
- **7 238 IDs avec les cinq champs présents et cohérents** : Mubawab 6 004, Domio 1 234 ; cinq lignes en conflit de preuves, aucune promotion.
- **254 groupes suspects de mêmes signatures** (ville/quartier/prix/surface), dont 21 inter-portails. Ce ne sont PAS des biens physiquement dédupliqués.
- **0 annonces certifiées commercialement disponibles, fraîches ou publiables**, zéro lecture/écriture DB, zéro Vercel, aucun merge.

**Pivot géographique productif confirmé** : huit catégories Fès/Kénitra/Tétouan/Nador (vente/location appartements) `38046976281` ✅, 226 ID tous inconnus du ledger sept-lots, 196 avec cinq champs.

**Prochaine expérience indépendante** : `scripts/data/mubawab-regional-types-40-v1.mjs`, tests et workflow `.github/workflows/mubawab-regional-types-40.yml` : 4 nouvelles villes × 5 types de biens utilisés sur les 50 catégories déjà testées × vente/location = **40 URLs candidates** ; chaque 404/route invalide est rejeté, pas annoncé productif sans HTTP200 ; robots et pacing, arrêt 403/429, zéro détail. Comparaison par ID exact avec ledger huit-lots immuable, checksum ci-dessus.

**Sarouty** : première extraction six catégories `38046267620` ✅ mais **1 seule carte source réellement isolée, 0 cinq champs** ; sonde de DOM `38047091171` fail-closed sur robots non disponible, 0 catégorie interrogée. Pause de la source tant que robots/access ne répondent pas correctement ; pas de contournement.

**Next exact** : lire run régional 40 et son artifact, mesurer l'incrément net face aux 9 282 IDs, corriger uniquement les défauts prouvés, intégrer au ledger si vert ; ensuite réduire les inconnues de disponibilité commerciale/fraîcheur par audit ciblé et dédup physique conforme. **Objectif 200K en 24h non certifié et non garanti.**


## Neuf artifacts — matrice régionale 40 intégrée (10 octobre 2026)

**Preuve source** : [run 38047432831](https://github.com/hraaaaf/Akarfinder/actions/runs/38047432831) `completed/success`, artifact `11667857197` ; SHA256 exact du JSONL `5f4cfc9a21511cf039bc7c0e366d30afe74a2e8dbd927b7e1d5d2d6b61bbb929`. 40/40 pages catégories Mubawab HTTP 200, 689 observations/IDs propres au lot, 568 cartes cinq champs, **463 nouveaux IDs source** et **372 nouveaux cinq champs** face au registre huit lots ; DB access/write 0.

**Recalcul offline exact sur les neuf ZIPs immuables** (réconciliation Python de contrôle, chiffres huit-lots d'abord reproduits à l'identique) : **11 828 observations**, **9 745 IDs source** (Mubawab 7 155 ; Domio 2 590), **7 610 cinq champs cohérents** (Mubawab 6 376 ; Domio 1 234), **5 conflits**, **256 groupes de signatures potentiellement similaires**, **21 inter-portails**. Ces nombres **ne certifient pas** de biens physiquement uniques, frais, disponibles, ni réutilisables ; compteur certifié actif/frais/physiquement unique = **0**.

Workflow ledger neuf entrées : nouvelle source `mubawab_regional_40` + checksum épinglé + assertions sur les totaux exacts et les marqueurs de non-promotion. **Ne déclarer le ledger neuf lots certifié GitHub qu'après run de CI sur le commit intégrateur et inspection de son artifact.** Aucune écriture DB, aucun déploiement ni merge par ce lot.

**Next exact** : lire la CI du ledger neuf artifacts ; si rouge corriger avant tout nouveau run ; si verte contrôler artifact, puis lancer un protocole read-only d'audit de disponibilité datée (signal vendeur/portail explicite, dates, échantillon par source, et refus en cas de preuve absente), avec dédup inter-portails sans fusion automatique ; prioriser nouvelles pages liées et autorisées par IDs nets 5/5 par requête.


## Neuf inputs certifiés et protocole de preuve (10 octobre 2026)

Run 38069957917 ✅ success, HEAD ef30f7c347cb58a260cee7b31f1e5518ce161940, artifact 11675834864 contrôlé : 11 828 observations, 9 745 identifiants source, 7 610 cinq champs cohérents, 5 contradictions, 256 signatures suspectes dont 21 inter-portails. Zéro DB et 0 annonce certifiée fraîche/disponible/unique/publiable. Protocole shadow : scripts/data/fresh-active-unique-shadow-v1.mjs, tests, workflow .github/workflows/active-unique-shadow-v1.yml, documentation docs/data/AKARFINDER_FRESH_ACTIVE_UNIQUE_SHADOW_V1.md. Gate suivant : vérifier sa CI/artifact, puis collecter preuves réelles de disponibilité, dédup physique et droits, sans promotion anticipée.


## Shadow V1 : corriger biais de sélection (2026-10-10)

Workflow shadow `38070451726` ✅ (commit 3a584b9c…, artifact 11676178521) : 9 745 lignes, 7 610 cinq champs, 60 dossiers sélectionnés, mais **les 60 sont suspects de doublons**. Ne pas extrapoler un taux actif à cette population biaisée. Modification source/test/workflow en cours pour quotas 10 suspects + 20 contrôles par portail ; liens de preuve d'unicité physique et de droits soumis à même ID. Nouveau run CI à vérifier avant clôture. Actif/frais/unique certifiés 0, DB 0, sans merge/Vercel.


## Shadow V1 certifié + découverte pagination contrôlée — 10 octobre 2026

Shadow corrigé CI [38070760057](https://github.com/hraaaaf/Akarfinder/actions/runs/38070760057) ✅, HEAD `01237c3d9552d102f018b05ba6ed98eecad02b28`, artifact `11676836332` inspecté : échantillon **30 Mubawab + 30 Domio**, chacun 10 signatures suspectes + 20 témoins non suspects, 0 ID répété, 0 frais/actif/physiquement unique/licencié certifié. Ne pas extrapoler un taux brut de ces strates enrichies. DB et publication 0.

Découverte de pagination : `scripts/data/mubawab-linked-pagination-canary-v1.mjs` (max 4 pages catégorie déjà observées), tests, workflow `.github/workflows/mubawab-linked-pagination-canary-v1.yml`, doc `docs/data/AKARFINDER_LINKED_PAGINATION_CANARY_V1.md`. **CI/artifact à vérifier avant de compter un lien candidat** ; aucun lien paginé suivi ni aucune annonce attribuée au canari. Next : auditer run et décider expansion légale source-liée, puis mesurer rendement / frais actifs / dédup physique / droits.


## Pagination HTML : 0 route admissible ; type-linked canary (2026-10-10)

Run [38071017861](https://github.com/hraaaaf/Akarfinder/actions/runs/38071017861) ✅, artifact 11676876747 inspecté : 4/4 catégories publiques HTTP200, **0 lien de pagination admissible** (pas de lien suivi), robots sans blocage, zéro DB. Les quatre pages n'autorisent pas l'invention de /page-2 ou :p:2. Prolongement du même canari : découvrir uniquement les liens de catégories `/fr/st/` réellement présents dans ces HTML et vérifiés robots, puis tester selon rendement si des sources nouvelles sont observées. CI exacte en attente; aucun ID listing nouveau attribué à cette découverte.
