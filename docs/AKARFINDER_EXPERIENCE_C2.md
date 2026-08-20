# AkarFinder Experience — C2 Zillow-like Search Shell

Date : 2026-08-20
Base : `main@d921316e53c0eca14c2646721de6e739c905b275`
Statut : **IMPLEMENTED — AFTER/CI/HUMAN GATE À CERTIFIER**

## Goal

Faire converger le shell Search existant vers la cible P0-5B validée sans reconstruire le moteur de recherche ni modifier la vérité des données.

## Succès

1. desktop Mixte : carte dominante autour de 60 %, résultats autour de 40 % ;
2. résultats desktop dans un rail à scroll indépendant ;
3. cartes du rail en lignes horizontales compactes, une par rangée ;
4. tablette/mobile Mixte : carte avant les résultats ;
5. résultats tablette/mobile présentés comme un panneau docké ;
6. filtres avancés inline ≥640 px ne verrouillent plus le scroll de la page ;
7. le vrai modal filtres téléphone conserve son verrouillage du body ;
8. aucun changement de ranking, source rights, précision géographique ou données ;
9. aucune mutation DB et aucun déploiement Vercel.

## Baseline et cible

Baseline Search réelle validée humainement avant implémentation :

- 390 ;
- 430 ;
- 768 ;
- 1280.

La cible P0-5B Search + Carte a été explicitement validée par le propriétaire produit le 20/08/2026.

## Implémentation

Le delta est volontairement concentré dans `app/search/mockup-convergence-l2.css` :

- ratio responsive du shell ;
- ordre Map/List ;
- rail résultats ;
- cartes compactes en mode Mixte ;
- panneau docké mobile/tablette ;
- correction du lock body desktop/tablette.

Les modes Liste et Carte existants restent hors de ces overrides lorsqu'ils ne sont pas en `view=split`.

## Preuve machine

`Experience C2 Zillow Shell` doit vérifier sur 390 / 430 / 768 / 1280 :

- ratio desktop ;
- map-first sous 1024 ;
- dock résultats ;
- rail scrollable ;
- cartes horizontales ;
- absence d'overflow horizontal ;
- comportement du lock filtres.

L'artifact attendu `experience-c2-zillow-shell-after` contient les quatre captures AFTER et les métriques.

## Human gate obligatoire

Même si la CI est verte, C2 **ne peut pas être fermé ni mergé** avant :

1. présentation des captures AFTER aux mêmes viewports ;
2. comparaison BEFORE / cible validée / AFTER ;
3. score UX/UI ;
4. validation explicite du propriétaire produit.
