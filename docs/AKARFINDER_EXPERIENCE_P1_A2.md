# AkarFinder Experience — P1-A2 Shared Components

Date : 2026-08-20
Base : `main@665ae331fb5c3f015ca84d51cd321eca383fcd15`
Statut : **IMPLEMENTATION PREPARED — CI/AFTER À CERTIFIER**

## Goal

Unifier les primitives UI partagées AkarFinder sans dépendre du P1-A1 différé : surfaces, CTA, champs, chips, états vides et hiérarchie légère.

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

Référence réutilisée : `UI All Pages Baseline`, run `32360158450`, artifact `9403363324`, 260/260 captures, 0 finding technique. Cette baseline précède P1-A1 et reste visuellement pertinente pour A2, qui part directement de `main`.

Surfaces représentatives observées : `/alerts`, `/favorites`, `/mon-projet`, `/onboarding` (redirection canonique), `/pro`, `/vendre/dossier`, en 390 et 1280.

## Référence visuelle

Golden Master existant : `/demo/visual-system`, Proposition 3.

Contrat repris : compositions géométriques douces, volumes simples, coins arrondis, profondeur légère et palette dérivée du vrai bleu AkarFinder ; aucun bronze dans le système partagé.

## Implémentation

- `components/ui/design-system.ts` devient le contrat central des primitives partagées ;
- ajout d'une QA gallery `/demo/ui-primitives` montrant surfaces, actions, chips et champs ;
- compatibilité conservée avec les noms historiques `primaryActionPill` / `secondaryActionPill`, mais leur géométrie rejoint désormais les CTA standards afin d'éviter deux langages concurrents ;
- Search/Map ne sont pas réécrits.

## Preuve machine requise

Workflow : `Experience P1 A2 Shared Components`.

Il doit produire :

- TypeScript vert ;
- build production vert ;
- 24/24 captures AFTER sur 6 routes x 4 viewports ;
- 0 finding HTTP/H1/overflow ;
- présence du contrat `data-ui-contract="p1-a2"` sur la QA gallery ;
- conservation du header C2 `exact-white` sur Search et Map ;
- artifact `experience-p1-a2-shared-components-after-*`.

## Contrat d'arrêt

P1-A2 ne peut être fermé ni mergé avant :

1. workflow P1-A2 vert ;
2. inspection visuelle des AFTER ;
3. comparaison BEFORE / Golden Master / AFTER ;
4. score UX/UI ;
5. validation explicite du propriétaire produit ;
6. merge et closeout canonique.

P1-A1 reste séparément ouvert et différé ; A2 ne le crédite ni ne l'absorbe.
