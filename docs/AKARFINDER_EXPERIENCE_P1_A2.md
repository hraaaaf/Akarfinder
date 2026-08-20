# AkarFinder Experience — P1-A2 Shared Components

Date : 2026-08-20
Base : `main@665ae331fb5c3f015ca84d51cd321eca383fcd15`
Statut : **FERMÉ — VALIDÉ, CERTIFIÉ ET MERGÉ**

## Goal

Unifier les primitives UI partagées AkarFinder sans dépendre du premier A1 rejeté : surfaces, CTA, champs, chips, états vides et hiérarchie légère.

## Succès

1. les panneaux principaux partagent une géométrie et une profondeur communes ;
2. les CTA principaux et secondaires convergent vers 48 px de hauteur et 14 px de rayon ;
3. les champs partagent bordure, focus et rayon ;
4. les chips conservent leur forme pill car leur rôle sémantique est distinct ;
5. palette commune dérivée du bleu AkarFinder, sans bronze dans les primitives ;
6. Search et Map C2 conservent leur header `exact-white` ;
7. aucun overflow horizontal aux viewports certifiés ;
8. aucune mutation DB ;
9. aucun déploiement Vercel.

## BEFORE

Référence réutilisée : `UI All Pages Baseline`, run `32360158450`, artifact `9403363324`, 260/260 captures, 0 finding technique.

## Référence visuelle

Golden Master existant : `/demo/visual-system`, Proposition 3.

## Implémentation

- `components/ui/design-system.ts` devient le contrat central des primitives partagées ;
- QA gallery `/demo/ui-primitives` ;
- compatibilité conservée avec les noms historiques `primaryActionPill` / `secondaryActionPill` ;
- Search/Map non réécrits.

## Closeout vérifié

- correctif harness final `e0e090de572e00dad687feaccaccf966f9e15dc6` ;
- run final `32393990605` — **SUCCESS** ;
- artifact `9415995389` — **24/24 captures**, **0 finding**, **0 overflow** ;
- Search et Map C2 préservés ;
- score UX/UI : **8,5/10** ;
- validation humaine obtenue ;
- PR `#829` mergée ;
- merge `48893d882580d0524ef032b1976d8896255eb468` ;
- aucune mutation DB ;
- aucun Vercel.

P1-A2 est fermé. P1-A1 a ensuite été repris, validé et fermé via PR `#828`; les trois sous-lots A1/A2/B1 peuvent désormais contribuer ensemble au closeout P1.
