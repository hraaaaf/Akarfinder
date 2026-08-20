# AkarFinder Experience — P1-A1 Fidelity Shell

Date : 2026-08-20
Base reprise : `main@29c4192ae29b2992105ab460bba36f53850f35b6`
Statut : **REBUILT FROM CURRENT MAIN — CI/AFTER À CERTIFIER**

## Reprise après human gate rejeté

La première implémentation A1 n'a pas été approuvée visuellement. Elle est conservée à titre d'archive sur `archive/p1-a1-rejected-20260820` et n'est pas réutilisée dans la reprise.

Les trois objections à résoudre sont les seules cibles de cette reprise :

1. contenu / hiérarchie de la page d'accueil ;
2. taille et cadrage du hero Home desktop ;
3. formulation `Commencez directement par son type` sur Vendre.

## Goal

Faire converger Home et l'entrée Vendre vers les cibles canoniques P1-B1 approuvées, sans réintroduire le CSS global rejeté et sans modifier Search/Carte, le branding, les données ou la logique métier.

## Ce que le lot touche

- `/` : hero et hiérarchie des premiers contenus ;
- `/vendre` : formulation et entrée par type de bien ;
- composants Home strictement nécessaires ;
- audit, workflow et documentation A1.

## Ce que le lot ne touche pas

- logo / branding ;
- Search et Carte, hors contrôle de non-régression ;
- Listing, Mon Projet et pages Pro ;
- ranking, données, DB, API et sources ;
- déploiement Vercel.

## BEFORE actuelle

Workflow `UI All Pages Baseline` :

- run : `32406061201` — SUCCESS ;
- artifact : `9420502742` ;
- digest : `sha256:39fc446ad3a865e9a0bc58604c963c07adb9c7415891dbd823f2d5a2275bd2fc` ;
- HEAD : `5f94a477bfca401eab4c250750bfdfd3a9355ef6` ;
- runtime Home/Vendre identique au `main` de reprise ;
- captures concernées disponibles en 390, 430, 768 et 1280.

## Target approuvée avant implémentation

P1-B1 Canonical Page Targets :

- run : `32406060774` — SUCCESS ;
- artifact : `9420359227` ;
- digest : `sha256:a023717e5e0d798725fbe1a0eb39f05e4f3027ff0c274cc02349e36aa426b381` ;
- cibles utilisées : `home` et `publier` ;
- logo canonique production verrouillé ;
- human gate B1 approuvé le 20/08/2026.

## Implémentation

### Home

- hero ramené vers la hauteur cible B1, au lieu d'occuper presque tout le premier viewport ;
- phrase canonique `1er moteur de recherche immobilier au Maroc` conservée ;
- ajout du contexte `Immobilier · Maroc` ;
- sous-titre recentré sur la décision : territoire + marché + fiabilité ;
- les trois premiers blocs redondants `WhySection`, `MarketPulse`, `DataProofBlock` sont remplacés par un seul strip `Marché observé / Confiance lisible / Territoire utile` ;
- les sections d'exploration, carte, fonctionnement, MRE, CTA final et footer restent intactes.

### Vendre

- `Commencez directement par son type` devient `Commençons par le type de bien` ;
- le texte associé explique que le dossier s'adapte au type choisi ;
- les liens existants par type de bien sont conservés.

## Certification requise

Workflow `Experience P1 A1 Fidelity Shell` :

- TypeScript + build production ;
- routes `/`, `/vendre`, `/search`, `/map?city=rabat&layer=explore` ;
- 4 viewports 390 / 430 / 768 / 1280 = 16/16 captures ;
- 0 overflow ;
- hero Home <= 90 % du viewport ;
- strip Home présent ;
- ancienne copie Home redondante absente ;
- ancienne formulation Vendre absente ;
- entrée par type de bien conservée ;
- Search/Map `exact-white` conservé ;
- logos visibles issus des assets production canoniques ;
- comparaison BEFORE / target B1 / AFTER ;
- score UX/UI humain ;
- human gate explicite avant merge.

## Contrat d'arrêt

Aucun merge A1 avant CI verte + artifact complet + inspection visuelle + validation explicite du propriétaire produit. Aucun Vercel.
