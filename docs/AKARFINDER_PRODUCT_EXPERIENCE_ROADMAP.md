# AkarFinder — Product Experience Roadmap

Date : 2026-08-20
Statut : **CANONIQUE — P0/P1/P2 CLOSED — P3 À RÉCONCILIER — P4 SEARCH + CARTE ENSUITE**
Dénominateur strict : **12 lots, P0 à P11**.

## Goal global

Construire une expérience AkarFinder premium, cohérente et truth-safe, où la recherche immobilière relie clairement territoire, marché, vie locale, biens et décision sur desktop comme sur mobile.

## Règles de gouvernance

- une seule roadmap globale active : ce document ;
- chaque lot annonce explicitement ce qu'il touche et ne touche pas ;
- chaque changement UI/UX : BEFORE → Goal → 2–3 références externes sérieuses → mockup haute fidélité → implémentation → AFTER mêmes viewports → tests → score → human gate ;
- viewports de certification : 390×844, 430×932, 768×900, 1280×900 ;
- aucune fausse précision géographique ;
- aucun changement de logo/branding sans autorisation explicite ;
- aucun déploiement Vercel sans autorisation explicite.

## P0 — Freeze / inventaire / baseline

Statut : **CLOSED**.

Goal : figer l'état vérifié du produit et les baselines avant réconciliation globale.

## P1 — Architecture produit + mockups canoniques

Statut : **CLOSED**.

Goal : verrouiller l'architecture, le langage visuel et les cibles canoniques avant réconciliation des pages.

Preuves principales : A1 Home/Vendre, A2 primitives partagées, B1 cibles canoniques, tous validés puis mergés.

## P2 — Navigation globale

Statut : **CLOSED**.

Goal : préserver le contexte Search ↔ Carte ↔ Listing, y compris filtres, tri, vue, Back/Forward et retour fiche.

Preuves : PR #831 ; run P2 `32417603234` SUCCESS ; C1 `32417603240` SUCCESS ; artifact `9424543505` ; 12/12 captures ; 0 finding ; merge `a1ba3ad002d94a9d9cbf1b71d9dddf1be16b8374`.

## P3 — Accueil

Statut : **À RÉCONCILIER AVEC LES PREUVES EXISTANTES**.

Goal : Accueil premium, query-first, hero compact et différenciation AkarFinder visible sans effet de faux plancher.

Scope : hero, moteur principal, hiérarchie initiale, preuves de valeur et responsive Accueil.

Règle : ne pas refaire un travail déjà certifié. Vérifier que l'Accueil courant correspond toujours à l'AFTER A1 validé, puis fermer P3 si les preuves suffisent.

## P4 — Search + Carte

Statut : **APRÈS P3**.

Goal : transformer Search + Carte en expérience immobilière territoriale AkarFinder, et non en simple carte générique de type Maps.

Scope :
- composition visuelle Search/Carte ;
- rendu cartographique et hiérarchie des informations territoriales ;
- dimensions et proportions responsive sur 390/430/768/1280 ;
- desktop : articulation map/list premium ;
- mobile : map-first + bottom sheet utile ;
- filtres sticky, compteur, panneau résultats ;
- lentilles Prix / Densité / Annonces / Confiance et contexte Vie locale lorsque les données sont prouvées ;
- non-régression de la session P2.

Exclus : ranking, données, DB/API métier, ingestion/scrapers, logo/branding, Vercel.

Gate visuel obligatoire : BEFORE actuel → références externes → mockup haute fidélité 390/430/768/1280 → human gate → implémentation → AFTER → score.

## P5 — Listings

Goal : réconcilier la fiche annonce autour de la décision : Bien → Confiance → Marché → Vie locale → Décision → Source, avec scan mobile plus efficace et provenance truth-safe.

## P6 — Quartier / Ville

Goal : faire des pages territoire des vues décisionnelles cohérentes avec la Carte et les mêmes métriques marché/locales prouvées.

## P7 — Mon Projet

Goal : rendre le parcours projet progressif, clair et contextuel, avec continuité vers Search/Carte/Listings.

## P8 — Publication

Goal : faire produire aux propriétaires, agences et promoteurs un dossier conforme au Listing Standard, avec champs conditionnels, localisation, droits médias et preview.

## P9 — Professionnels

Goal : clarifier identité professionnelle, publication structurée, portefeuille et intelligence marché sans sur-promesse.

## P10 — Pages secondaires

Goal : aligner les surfaces secondaires sur le système produit sans duplication ni chrome incohérent.

## P11 — QA global / responsive / accessibilité / performance / nettoyage

Goal : certifier l'expérience complète, fermer les régressions, supprimer les dettes de présentation et consolider la documentation canonique.

## Progression stricte

- P0 : CLOSED
- P1 : CLOSED
- P2 : CLOSED
- P3 : à réconcilier
- P4–P11 : non crédités

**Lots fermés : 3/12. Progression : 25 %.**

Le pourcentage n'augmente qu'après preuve et fermeture canonique du lot suivant.
