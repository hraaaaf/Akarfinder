# ANN-L13 — Certification 10/10 — Goal

## Statut

**ACTIVE — 0 % crédité.**

## Goal

Faire converger la fiche `/listings/[id]` entière vers `docs/ANNOUNCEMENT_PAGE_CANONICAL_VISUAL_TARGET.md`, en conservant tous les contrats vérité/permissions/fail-closed de ANN-L0→L12.

ANN-L13 n'ajoute pas une nouvelle fonctionnalité métier. Il certifie et, seulement si nécessaire, corrige la composition, la hiérarchie, la densité, les espacements et l'ergonomie responsive de la fiche existante.

## Succès observable

- baseline actuelle capturée avant toute mutation visuelle ;
- target canonique utilisé comme mockup/référence, sans divergence avec l'application existante ;
- captures après sur 390×844, 430×932, 768×900 et 1280×900 ;
- desktop conforme à la hiérarchie cible, notamment le rail `Pro / conversion → Mon Projet → Marché & comparables` lorsque les données sont admissibles ;
- mobile/tablette cohérents, sans collision avec le dock décisionnel ;
- H1 unique ;
- aucun overflow horizontal ;
- aucune erreur console ou ressource inattendue ;
- aucun finding critique ;
- aucune régression fonctionnelle ANN-L1→L12 ;
- score visuel humain final **≥ 9,5/10** sur mobile et desktop ;
- gate exact-head dédié SUCCESS ;
- merge + closeout canonique avant crédit des 6 %.

## Preuve

1. artefact baseline avant mutation ;
2. référence `ANNOUNCEMENT_PAGE_CANONICAL_VISUAL_TARGET.md` ;
3. audit Chromium après sur les mêmes viewports ;
4. comparaison baseline / target / après ;
5. tests ANN-L1→L12 + TypeScript + production build ;
6. revue humaine des captures ;
7. exact-head CI + SHA-lock merge ;
8. closeout roadmap à 100 / 100 seulement après preuves complètes.

## Contraintes

- aucune donnée ou fonctionnalité inventée pour embellir le rendu ;
- aucune modification des contrats vérité pour satisfaire un test visuel ;
- pas de second design system ;
- pas de Vercel sans autorisation explicite ;
- une ancienne baseline incompatible avec l'application actuelle ne devient pas autoritative par nostalgie de CI.
