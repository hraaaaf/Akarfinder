# AkarFinder Experience — C2 Zillow-like Search Shell

Date : 2026-08-20
Base : `main@d921316e53c0eca14c2646721de6e739c905b275`
Statut : **CORRECTION MAPLIBRE IMPLEMENTED — AFTER/CI/HUMAN GATE À RE-CERTIFIER**

## Goal

Faire converger le shell Search existant vers la cible P0-5B validée, avec une vraie expérience cartographique AkarFinder plutôt qu'une silhouette SVG décorative.

## Succès

1. desktop Mixte : carte dominante autour de 60 %, résultats autour de 40 % ;
2. résultats desktop dans un rail à scroll indépendant ;
3. cartes du rail en lignes horizontales compactes, une par rangée ;
4. tablette/mobile Mixte : carte avant les résultats ;
5. résultats tablette/mobile présentés comme un panneau docké ;
6. filtres avancés inline ≥640 px ne verrouillent plus le scroll de la page ;
7. le vrai modal filtres téléphone conserve son verrouillage du body ;
8. Search utilise MapLibre + OpenFreeMap, comme le socle `/map` ;
9. seuls les biens avec `geo_precision=exact`, source géographique certifiée et coordonnées Maroc valides reçoivent un pin individuel ;
10. les autres annonces restent visibles dans les résultats mais ne reçoivent aucune position précise inventée ;
11. aucun changement de ranking, source rights ou données ;
12. aucune mutation DB et aucun déploiement Vercel.

## Baseline et cible

Baseline Search réelle validée humainement avant implémentation :

- 390 ;
- 430 ;
- 768 ;
- 1280.

La cible P0-5B Search + Carte a été explicitement validée par le propriétaire produit le 20/08/2026.

## Première implémentation C2 refusée

Le premier AFTER a passé la CI mais a été refusé visuellement : le panneau Search utilisait encore `MOROCCO_PATH` / `MOROCCO_VIEWBOX`, donc une silhouette SVG du Maroc au lieu du moteur cartographique réel.

Verdict humain : **C2 non validé** malgré la CI verte.

## Correction

La correction conserve le shell validé :

- ratio responsive du shell ;
- ordre Map/List ;
- rail résultats ;
- cartes compactes en mode Mixte ;
- panneau docké mobile/tablette ;
- correction du lock body desktop/tablette.

Elle remplace seulement le renderer cartographique Search :

- suppression de la silhouette SVG ;
- MapLibre réel ;
- style OpenFreeMap Liberty ;
- traitement visuel AkarFinder identique au socle `/map` ;
- navigation zoom/pan réelle ;
- agrégats villes uniquement à l'échelle Maroc ;
- pins individuels uniquement pour les coordonnées exactes certifiées ;
- sélection Search ↔ pin conservée.

## Preuve machine requise

`Experience C2 Zillow Shell` doit vérifier sur 390 / 430 / 768 / 1280 :

- ratio desktop ;
- map-first sous 1024 ;
- dock résultats ;
- rail scrollable ;
- cartes horizontales ;
- absence d'overflow horizontal ;
- comportement du lock filtres ;
- présence réelle d'un canvas MapLibre ;
- présence de pins exacts certifiés dans la fixture ;
- absence du renderer SVG historique dans `SearchMapPanel`.

L'artifact `experience-c2-zillow-shell-after` doit contenir les quatre captures AFTER et les métriques.

## Human gate obligatoire

Même si la CI est verte, C2 **ne peut pas être fermé ni mergé** avant :

1. présentation des nouvelles captures AFTER aux mêmes viewports ;
2. comparaison BEFORE / cible validée / AFTER ;
3. score UX/UI ;
4. validation explicite du propriétaire produit.
