# AkarFinder — B2B Partner Landing Productization Closeout

**Date :** 2026-08-15  
**Scope :** `/pro/agences` + `/promoteurs` uniquement, avec réutilisation des démos existantes `/demo/agence` et `/demo/promoteur`.  
**PR :** #650  
**Branche :** `agent/b2b-partner-landing-proof`

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

## Preuves techniques exact-head

Head applicatif certifié : `0cb53e589be45bff61449e56a08004dbb3e0ec03`.

- 11/11 workflows exact-head : **SUCCESS** ;
- `Phase 1 P1 B2B Productization Gate` : SUCCESS ;
- contrats B2B : SUCCESS ;
- TypeScript : SUCCESS ;
- production build : SUCCESS ;
- `UI All Pages Certification` run `31890674154` : SUCCESS ;
- inventaire : 64 pages ;
- 52 routes rendables ;
- 12 blockers explicitement gouvernés ;
- 208/208 captures produites ;
- 0 finding ;
- 0 route en défaut ;
- artefact `9248515094` ;
- digest `sha256:c62174a05664ad0695fa02971a9757e99c5e24a691b306aebffd9718f2c7f11f`.

## Dettes séparées

- **#641** : supprimer la double source de vérité du profil promoteur avant le premier vrai partenaire.
- **#643** : durcir validation téléphone + anti-abus côté `/api/leads`.

## Statut

Le lot fonctionnel est techniquement certifié sur le head applicatif ci-dessus. Le présent closeout documentaire doit lui-même être recertifié sur son head final avant merge de #650.
