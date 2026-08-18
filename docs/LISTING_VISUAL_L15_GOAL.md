# LISTING-VISUAL L15 — Rail premium

## Goal
Faire converger la colonne droite desktop de `/listings/[id]` vers le target premium verrouillé par l’utilisateur, en conservant les mêmes vérités métier et les mêmes permissions.

## Baseline
Baseline L15 = état mergé L14 (`adc5d9428f5d15c1215ebe9ba485f45846b059e4`).

## Target
Référence visuelle utilisateur : colonne droite structurée et dense, dans l’ordre :
1. professionnel / conversion ;
2. Mon Projet ;
3. Marché & comparables.

Le target est une référence de composition et de profondeur visuelle. Les données, badges, scores, routes, comparables et CTA restent exclusivement issus des modèles réels existants.

## Succès observable
- rail desktop cohérent, compact et premium ;
- hiérarchie visuelle claire entre CTA, personnalisation et intelligence marché ;
- aucune duplication fonctionnelle décorative ;
- mobile inchangé fonctionnellement ;
- aucun overflow 390 / 430 / 768 / 1280 ;
- score humain L15 >= 9,4/10 sur le rail.

## Preuve
- captures after exact-head ;
- comparaison baseline L14 / target / after ;
- L11 Pro Conversion, L12 Mon Projet, L13 certification, a11y et TypeScript/build ;
- aucun déploiement Vercel.
