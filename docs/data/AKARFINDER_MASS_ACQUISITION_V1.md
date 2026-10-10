# AkarFinder — Mass Acquisition V1 / Scraping cards nationaux

Date: 2026-10-10
Statut: **PILOTE 50 CATÉGORIES DÉCLENCHÉ — VALIDATION CI EN COURS**

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
