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


## Canari DOMIO en direct — 2026-10-10

**Run** [38015856380](https://github.com/hraaaaf/Akarfinder/actions/runs/38015856380) **completed/success** sur HEAD `53b2c3fa77bf0c6d0653a0d0fb7cf9971b72afa1`; artifact **11656755461** inspecté.
- Robots.txt lu avec succès ; **2/2 pages catégories HTTP 200**, **48/48 IDs Domio distincts** ; 0 page détail et 0 DB.
- **46/48 surfaces détectées** ; **34/48 prix détectés**. Casablanca **24 cartes / 23 prix / 24 surfaces** ; Marrakech **24 cartes / 11 prix / 22 surfaces**. Quartier **non certifié** au moment de ce premier run.
- Le canari prouve qu'il existe une seconde source de cartes publiques techniquement accessible. La possibilité de réutiliser ces données en production, la fraîcheur et l'unicité inter-source restent **non certifiées**.
- Nouveau parseur DOM conservateur proposé : localisation uniquement si texte explicite `Casablanca, Ain Diab 57.0 m²` ou `Marrakech, X n m²` trouvé **dans le même lien de carte** ; conflits quartier refusés ; aucun quartier hérité de la catégorie seule. Tests positifs/négatifs ajoutés ; pas de promotion automatique.
- **Next exact** : certifier cette extraction géographique sur les 2 mêmes pages avec le nouveau parseur, puis auditer quelques vraies fiches Domio seulement si lien/identité source le permettent, en respectant robots. En parallèle développer le graphe de catégories Mubawab via des chemins observés plutôt que devinés.


## Deuxième passe Domio — preuve complète au niveau des cartes

Run `38016037724` **success** sur HEAD `f59a7984477e30202c8f7b3482fc8489163cebec` ; artifact `11656231723` lu et JSONL recompté :
- **2/2 catégories HTTP 200**, robots autorisé, **48 IDs distincts** ; prix **34**, superficie **46**, localité explicite `ville, quartier n m²` **22**, **15/48 cartes avec cinq champs présents**, aucun appel détail.
- Casablanca 24 cartes, 9/24 avec cinq champs ; Marrakech 24 cartes, 6/24 avec cinq champs.
- **Jointure offline au même gel** `10910779576` / `clean-corpus-v4.11-core.jsonl.gz` en extrayant la clé stable `domio:<id>` des URLs de l'archive : **34/48 IDs déjà présents, 14/48 IDs absents**, dont **5/15 cartes cinq champs absentes du gel**.
- Les critères `five_field_present` désignent **la présence cohérente de champs dans une seule ancre HTML**, et non une certification d'activité/qualité commerciale/date. Les 15 restent `unverified_dom_card_only`.
- Avito demeure sitemap 403/0, aucune évasion.
- Poursuite rentable : passer Domio à un lot borné par villes/transactions **dont la route HTTP200 et robots est démontrée**, puis un audit de 10-20 vraies fiches sources ; ne compter comme fraîches que les vérifiées.

**Repères preuve** : Mubawab run `38014920725` ✅ 1316 IDs/1140 cartes cinq champs/806 IDs nouveaux gel, détail run `38015494577` ✅ 30/30 ID primaire et 26/26 surfaces confirmées. Aucun merge, Vercel ni DB.


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

## Closeout vérifié — Domio pages 2 et candidats dédup inter-sites (10 octobre 2026)

- **CI 38042621783 ✅ / artifact 11665849216** : 7/7 pages numéro 2 Domio HTTP 200, URL page=2 préservée, robots OK, 167 IDs distincts dont 56 cartes 5 champs ; zéro recoupement avec les 168 IDs des pages 1. Les 14 pages réunies donnent **335 IDs distincts et 126 cartes 5 champs observés**.
- **Gel canonique 10910779576, SHA256 e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953** : page 2 = **0 ID inédit au gel** ; page 1 = 34 IDs absents du gel (14 cartes 5 champs). L'extension profonde ne crée pas ici de nouvelles identités vs l'archive ; mesurer le rendement avant de poursuivre.
- **CI 38042808384 ✅ / artifact 11665424718** : dédup candidat offline sur 1 140 cartes Mubawab 5 champs + 70 Domio 5 champs ; une seule paire exacte ville/quartier/prix/surface **a:8431161 vs domio:12374** (Rabat Agdal 8 000 DH 80 m²), **0 doublon physique certifié, 0 fusion**, autre preuve obligatoire.
- **Total observé, pas comptage production** : 1 316 IDs Mubawab + 335 IDs Domio = **1 651 identifiants propres aux sources** ; 1 140 + 126 = **1 266 cartes 5 champs présentes**. Ce ne sont pas nécessairement 1 651 biens physiquement uniques, frais ou disponibles. DB 0 lecture/écriture, Vercel aucun, merge aucun.
- **Nouvel effort parallèle** introduit au commit d0ff59b8676ad3e172d81b2ec20069fad60f9d04 : Frontier100 sur des catégories nationales Mubawab publiquement liées, run 38042868091 en cours au contrôle. Aucun rendement anticipé.
- **Next exact** : lire artifact Frontier100, comparer nouveaux IDs par catégorie/requête, arrêter les catégories à rendement nul ; qualifier disponibilité réelle + dédup physique + droits avant publication et avant tout objectif 200k.
