# AkarFinder Experience — P1-A1 Fidelity Shell

Date : 2026-08-20
Base reprise : `main@29c4192ae29b2992105ab460bba36f53850f35b6`
Statut : **FERMÉ — VALIDÉ, CERTIFIÉ ET MERGÉ**

## Reprise après human gate rejeté

La première implémentation A1 n'a pas été approuvée visuellement. Elle reste archivée sur `archive/p1-a1-rejected-20260820` et n'a pas été réutilisée dans la reprise finale.

Objections résolues :

1. contenu / hiérarchie de la page d'accueil ;
2. taille et cadrage du hero Home desktop ;
3. formulation et ordre d'entrée sur Vendre.

## Goal

Faire converger Home et l'entrée Vendre vers les cibles canoniques P1-B1 approuvées, sans réintroduire le CSS global rejeté et sans modifier Search/Carte, le branding, les données ou la logique métier.

## Ce que le lot touche

- `/` : hero et hiérarchie des premiers contenus ;
- `/vendre` : entrée par type de bien ;
- composants Home strictement nécessaires ;
- audit, workflow et documentation A1.

## Ce que le lot ne touche pas

- logo / branding ;
- Search et Carte, hors contrôle de non-régression ;
- Listing, Mon Projet et pages Pro ;
- ranking, données, DB, API et sources ;
- déploiement Vercel.

## BEFORE

Workflow `UI All Pages Baseline` :

- run `32406061201` — SUCCESS ;
- artifact `9420502742` ;
- digest `sha256:39fc446ad3a865e9a0bc58604c963c07adb9c7415891dbd823f2d5a2275bd2fc` ;
- HEAD `5f94a477bfca401eab4c250750bfdfd3a9355ef6` ;
- runtime Home/Vendre identique au `main` de reprise.

## Target approuvée avant implémentation

P1-B1 Canonical Page Targets :

- run `32406060774` — SUCCESS ;
- artifact `9420359227` ;
- digest `sha256:a023717e5e0d798725fbe1a0eb39f05e4f3027ff0c274cc02349e36aa426b381` ;
- cibles `home` et `publier` ;
- logo production verrouillé ;
- human gate B1 approuvé le 20/08/2026.

## Implémentation finale

### Home

- hero ramené à ~78 % du viewport utile au lieu d'occuper presque tout le premier écran ;
- phrase canonique `1er moteur de recherche immobilier au Maroc` conservée ;
- contexte `Immobilier · Maroc` ;
- sous-titre recentré sur territoire + marché + fiabilité ;
- remplacement des trois premiers blocs redondants par un strip `Marché observé / Confiance lisible / Territoire utile` ;
- exploration, carte, fonctionnement, MRE, CTA final et footer conservés.

### Vendre

- H1 `Commençons par le type de bien` ;
- six types de bien présentés immédiatement ;
- choix du type placé avant `Publier / Estimer / Être accompagné` ;
- formulation rejetée `Commencez directement par son type` absente ;
- parcours métier existants conservés après la sélection du type.

## Validation externe du choix Home

Le choix hero raccourci a été croisé avant validation finale avec :

1. Nielsen Norman Group — comportement de scan et nécessité de prioriser les informations importantes : https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
2. Zillow Summer Launch 2026 — logique immobilière orientée parcours, clarté et prochaine action plutôt que simple vitrine : https://www.zillow.com/news/zillow-launches-a-personalized-hub-that-guides-home-buyers-from-first-search-to-closing/
3. Rightmove Search — recherche responsive, filtres et carte visibles comme outils centraux de l'expérience immobilière : https://www.rightmove.co.uk/news/new-look-for-rightmove-search/

Implication retenue : préserver l'impact photo sans repousser les preuves de valeur AkarFinder sous un hero plein écran.

## Certification finale

- PR `#828` ;
- HEAD approuvé `0b9c28f28e6e1d5edb0d7d46bd1ff0edd91d2d95` ;
- workflow `Experience P1 A1 Fidelity Shell` ;
- run final `32411535248` — **SUCCESS** ;
- job `96562848442` — **SUCCESS** ;
- artifact final `9422367028` ;
- digest `sha256:33a7329fa7de92bb2ebfda96bb7391165f6e40ac06aff5a14dea6f9b12f864dc` ;
- 4 routes × 4 viewports = **16/16 captures** ;
- findings : **0** ;
- overflow : **0** ;
- Search/Map `exact-white` : préservé ;
- logos visibles : assets production canoniques ;
- comparaison BEFORE / B1 target / AFTER : inspectée desktop et mobile ;
- score UX/UI : **9,0/10** ;
- human gate : **approuvé le 20/08/2026** ;
- merge : `950afda458c3170ac031e4cdf527a4a5e77caea6` ;
- aucune mutation DB/API/source ;
- aucun déploiement Vercel.

P1-A1 est fermé.
