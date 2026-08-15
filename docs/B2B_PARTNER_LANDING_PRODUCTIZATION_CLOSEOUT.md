# AkarFinder — B2B Partner Landing Productization Closeout

**Date :** 2026-08-15  
**Scope :** `/pro/agences` + `/promoteurs` uniquement, avec réutilisation des démos existantes `/demo/agence` et `/demo/promoteur`.  
**PR fonctionnelle :** #650 ✅ MERGED  
**Merge :** `32c0b3635f9f8aec2fe92722eef09f0484dfec1b`

## Objectif

Rendre les landing pages Agence partenaire et Promoteur partenaire commercialement concrètes sans modifier les contrats d’activation, de publication, de classement ou de partenariat déjà certifiés.

## Changements

- aperçu concret du rendu final via les composants visuels des démos existantes ;
- CTA directs vers les démos Agence / Promoteur ;
- onboarding pilote en trois étapes ;
- formats d’intégration explicités ;
- livrables du pilote explicités ;
- reporting opérationnel présenté sans promesse de volume ;
- FAQ commerciale courte ;
- différenciation métier plus nette Agence vs Promoteur ;
- aucune marque, agence ou promoteur fictif créé pour remplir les sections ;
- garde de régression B2B enrichie.

## Safety / invariants conservés

- aucune activation automatique de partenaire réel ;
- aucun badge, statut partenaire, classement, volume de leads ou vente promis ;
- aucune modification DATA, ranking, Registry ou mécanisme de publication ;
- les données absentes restent explicitement absentes ;
- les droits médias restent une condition d’intégration ;
- les dettes #641 et #643 restent hors scope et ouvertes.

## Preuves exact-head finales

Head final PR #650 : `8c149a73e3e4b0c4da0c09326b34f10be6dc7699`.

- `Phase 1 P1 B2B Productization Gate` run `31891405851` : **SUCCESS** ;
- contrats B2B : **SUCCESS** ;
- TypeScript : **SUCCESS** ;
- production build rehearsal : **SUCCESS** ;
- `UI All Pages Certification` run `31891405842` : **SUCCESS** ;
- production build + serveur : **SUCCESS** ;
- capture exhaustive + zero unexpected findings : **SUCCESS** ;
- artefact final-head `9248716663` ;
- digest `sha256:5b9223953cbfab597923601be2e88b49f1c1589ad662aa6e2da3fbeeb2cb4a3c` ;
- `Phase 1 Final Design Accessibility Gate` : **SUCCESS** ;
- `Canonical Baseline Validation` + compile : **SUCCESS**.

Incidents CI orthogonaux observés sur ce head :
- `Phase 1 P0 Closure Gate` : contrats **16/16** + TypeScript SUCCESS, build échoué uniquement sur téléchargement externe `Plus Jakarta Sans` depuis Google Fonts ;
- `DATA MASS-1 Reservoir Qualification` : contrat/tests/build SUCCESS, live-audit échoué sur `HTTP 500 / statement timeout` Supabase ;
- `DATA MASS-2A` a initialement subi le même incident Google Fonts puis son rerun a terminé **SUCCESS**.

Aucun de ces incidents n’est causé par le diff B2B de #650.

## Dettes séparées

- **#641** : supprimer la double source de vérité du profil promoteur avant le premier vrai partenaire.
- **#643** : durcir validation téléphone + anti-abus côté `/api/leads`.

## Statut

**B2B Partner Landing Productization ✅ CLOSED.** PR #650 fusionnée sur `main` au merge `32c0b3635f9f8aec2fe92722eef09f0484dfec1b`, avec certification B2B et UI exhaustive exact-head réussies avant merge.
