# AkarFinder — Mass Acquisition V1 / Scraping cards nationaux

Date: 2026-10-10
Statut: **PILOTE 50 CATÉGORIES CERTIFIÉ CÔTÉ EXTRACTION — QUALIFICATION DES FICHES EN COURS**

## Goal
Atteindre progressivement 200 000 annonces fraîches, uniques, réellement servables, avec URL canonique, ville, quartier, prix MAD et surface. La méthode privilégiée est le **scraping direct de pages de résultats publiques**, non l'acquisition par contrats ni la réparation de l'archive d'URLs.

## Dernier benchmark certifié
Run `37974096161` ✅, artifact `11638287776` : 8 pages Mubawab, 215 identifiants distincts, 187 cartes avec les 5 champs observés, 161 IDs absents du corpus gelé. Aucune n'est encore certifiée fraîche/active/uniquement inter-portails.

## Implémentation du pilote de 50 pages
HEAD produit `41d28d2e6c56789c2e3089e23cbd540a8deb4e6d`, branche `data/200k-fresh-parser-v2`.
- `scripts/data/mubawab-card-scale-v1.mjs` : 5 villes × 5 types de biens × vente/location = **50 chemins candidats**, validés uniquement par HTTP 200 sur URL de catégorie identique ; aucun statut implicite si la route n'existe pas.
- Une requête à la fois, délai 1750ms, robot.txt fail-closed, arrêt immédiat sur HTTP 403/429 ou trois erreurs réseau, pas de login, contournement ni pages détails.
- Extraire les cartes individuelles (identité `a:<id>`) avec `scripts/data/mubawab-result-cards-v1.mjs`, exclure les projets `pa:`.
- Dédupliquer par identifiant source, **rétrograder toute contradiction inter-cartes** (ville, quartier, prix, surface) ; ville prouvée par la paire de localisation « quartier, ville », pas une simple supposition fondée sur le nom de la page.
- Aucune `freshness_certified`, `active_detail_verified` ou `cross_source_deduplicated` n'est déclarée vraie ; extraction = `observed_review` et pas un actif DB.
- Tests `scripts/data/__tests__/mubawab-card-scale-v1.test.mjs` : borne 50, dédup, collisions, robots, 429, redirections, nouveauté relative au gel.
- CI `.github/workflows/mubawab-card-scale-50.yml`, run initial **38014431380** (`in_progress` au premier contrôle), artifact attendu `mubawab-mass-acquisition-50`. Assert read-only et 50 requêtes catégorie maximum.

## Succès / Preuve
- K requêtes catégorie vraiment 200 ; N identifiants uniques, L 5 champs observés sans conflits ; M identifiants nouveaux par source ID comparés au gel **hors ligne** (`10910779576`, SHA256 `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`).
- Objectif intermédiaire : **1 000 cartes distinctes observées** ; ne pas dire atteint avant preuve.
- Contrôle de disponibilité, date et dédup inter-portails obligatoire avant toute publication, chiffre 200k ou écriture DB.

## Deuxième portail : préparation
Le repo possède déjà `scripts/acquisition/mubawab-marocannonces-public-adapter.mjs`, son test, ainsi que `scripts/acquisition/avito-sitemap-enumerator.mjs`. Le portail MarocAnnonces offre des pages publiques de catégories, mais une de celles-ci a présenté une page de vérification automatisée et le robots.txt n'a pas pu être récupéré via le web au premier examen : **pas de collecte lancée, pas de contournement**. Auditer d'autres sources accessibles et choisir un adaptateur avec règles robots/conditions compatibles et rendement mesurable.

## Next exact
Lire la CI `38014431380` et son artifact, diagnostiquer toute erreur, comparer à 8 pages, établir le nombre d'IDs nouveaux via le gel, puis préparer une deuxième source admissible ; après vérification de 20-30 fiches ciblées et dédup fiable, dérouler par incréments prudents. Aucun merge ni Vercel sans gate explicite, DB = 0.


## Résultat vérifié du 50/50 corrigé — 10 octobre 2026

**Run** [38014920725](https://github.com/hraaaaf/Akarfinder/actions/runs/38014920725) ✅ success, HEAD `77f701458eda686ab343efa3bdd0c4628f37ee22`, artifact `11655684897` inspecté en local.

- 50/50 pages de résultats HTTP 200, URL catégorie finale conservée, 0 redirection problématique et 0 détail demandé.
- **1 316 identités individuelles `a:<id>` uniques** (`observed_cards=1316`), **1 140/1 316 = 86,63 %** avec URL+ville+quartier+prix MAD+surface visibles dans leur carte.
- Jointure contre `clean-corpus-v4.11-core.jsonl.gz` artifact `10910779576` par identifiant `a:<id>` en incluant toutes les locales : **806 IDs absents du gel**, dont **700** avec les 5 champs présents. 510 identités historiques.
- Sur les 1 316 cartes : ville et quartier manquants sur 43, prix sur 126, surface sur 16. Le parser ignore les valeurs incompatibles.
- Dédup par ID : 0 observation dupliquée entre ces 50 pages, 0 conflit entre les 50 catégories. Attention **14 groupes de signatures ville/quartier/prix/surface identiques réunissant 31 IDs distincts** : doublons physiques potentiels, **pas dédupliqués sans preuve**.
- Les 1 140 lignes sont `observed_review_not_freshness_certified`, **pas 1 140 annonces servables ni certifiées actives**, même si le jalon **1 000 cartes** est atteint.
- Correction de route : `villas-et-maisons-de-luxe` et `bureaux-et-commerces` remplacent les anciens préfixes 404. Tests et workflow exact-HEAD verts. Base DB et Vercel intacts.

## Seconde source : état réel
Avito : run canari [38014920766](https://github.com/hraaaaf/Akarfinder/actions/runs/38014920766) terminé avec exécution technique success, artifact `11655504774` : robots public accessible, **sitemap déclaré HTTP 403**, **0 URL**, source **non productive/bloquée**. Ne pas contourner ce refus ni appeler ce résultat « acquisition réussie ».
MarocAnnonces a présenté un écran de vérification sur une catégorie ; pas de contournement. Domio présente des cartes publiques prix/surface mais robots non confirmé via le premier accès web ; aucune collecte initiée.

## Prochaine validation ciblée
Un audit de **30 fiches maximum**, choisies de façon déterministe et équilibrées par ville dans l'artifact 50 pages, contrôlera HTTP 200 + identité de la page source + vrai bloc primaire et superficie, sans déclarer la date/fraîcheur. Code sous `scripts/data/mubawab-card-detail-audit-v1.ts`. Chaque échec reste `review`, 403/429 arrêt. Ensuite audit de duplication physique et extension nationale multi-portails.

## Preuve supplémentaire : audit de 30 vraies fiches — 2026-10-10

Run `38015494577` **completed/success**, HEAD `4b7c5cb73cc59d13237e78e8eac81dce87237068`, artifact `11654889923` lu.
- **30/30 détails HTTP 200**, même identifiant `a:<id>` préservé après redirection et vrai bloc primaire `.blockProp h1.searchTitle` reconnu.
- **26/30 superficies détaillées détectées avec preuve stricte** ; **26/26 correspondent** à la carte. Les 4 autres restent `unverified`, pas `conflict`.
- Aucun 403/429 ; lecture DB 0/écriture DB 0. L'échantillonnage est déterministe, réparti par ville, excluant les doublons suspects par signature et les cartes incomplètes.
- Une page HTTP 200 avec ID stable **ne prouve ni encore disponible commercialement, ni fraîche, ni non doublonnée à travers les portails**. Ces 1 140 cartes demeurent `observed_review`.

**Second portail, lot borné distinct** : adaptateur canari Domio prêt, deux pages publiques Casablanca/Marrakech maximum, récupération préalable de `robots.txt` avec arrêt fail-closed ; analyse strictement de la carte source et aucun visite de fiche ni promotion. La démonstration du flux dépendra d'une CI source réelle, pas d'une supposition depuis une page visible par navigateur.

**Next exact** : inspecter CI Domio ; si permise et productive, certifier le parsing du quartier et les liens réels avant expansion. Si robots ou anti-bot refusent, mettre la source en quarantaine et explorer les autres portails explicitement accessibles. En parallèle, qualification datation/activité, dédup inter-ID/inter-sources et validation de droits avant activation.
