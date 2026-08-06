# AkarFinder — Session courante

**Mise à jour : 2026-08-06**  
**Lot actif : DOC-CANONICAL-CLEANUP — consolidation documentaire**

Ce fichier est le handover opérationnel court du projet. L’historique détaillé reste dans Git, les PR, les rapports et les preuves techniques.

## Branche et PR actives

- branche UX consolidée : `ux/home-p1-hero-title-readability` ;
- PR UX consolidée vers `main` : **#299**, non encore mergée ;
- branche du présent lot : `chore/documentation-canonical-cleanup` ;
- base documentaire : commit `dfb9e7620aa933110be4b6f4bdb4e03c8a9adfc3`.

## État produit acquis

### Accueil P1 ✅

Hero, Market Pulse, Pourquoi AkarFinder, Preuves DATA, villes, intentions, carte quartier, Comment ça marche, MRE, CTA final, footer et responsive consolidés.

### Neuf P1 ✅

Hero spécialisé, moteur Neuf, villes, typologies, carte Programme fail-closed, promoteurs partenaires, styles de vie préparés, timeline, pédagogie et CTA final. Certification 390 / 768 / 1280 px réalisée. Score UX/UI : **9,1/10**.

## Gouvernance documentaire validée

Trois documents seulement pilotent le projet :

1. `README.md` — identité, doctrine et architecture canonique ;
2. `docs/ROADMAP.md` — priorités et ordre d’exécution ;
3. `docs/SESSION.md` — état courant et prochaine action.

Les autres Markdown restent des spécifications ou preuves historiques. Ils ne déterminent jamais seuls l’état courant.

## Audit documentaire

- 202 fichiers Markdown audités ;
- 36 614 lignes examinées ;
- 76 spécifications globalement alignées ;
- 92 preuves historiques utiles ;
- 21 documents à actualiser par familles ;
- 10 anciens fichiers de pilotage validés pour suppression dans le présent lot ;
- références internes à réparer vers les trois documents canoniques.

## Décisions verrouillées

- aucun nouveau Markdown de roadmap, session, statut ou handover sans décision explicite ;
- aucun document supprimé sans lecture préalable ;
- aucune preuve historique présentée comme état courant ;
- une responsabilité principale, une branche et une PR par lot ;
- aucune décision produit structurante prise automatiquement ;
- discussion UX avant modification de chaque page.

## Blocages

- la PR UX #299 reste à recertifier puis à merger dans `main` ;
- les 21 documents techniques à actualiser doivent être traités par familles cohérentes, sans recréer de roadmap parallèle.

## Prochaine action exacte

1. terminer le nettoyage documentaire validé ;
2. vérifier l’absence de référence active vers les anciens documents ;
3. ouvrir et valider la PR dédiée ;
4. merger cette PR dans la branche UX consolidée ;
5. recertifier puis merger la PR #299 vers `main`.
