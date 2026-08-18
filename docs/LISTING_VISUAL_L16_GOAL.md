# LISTING-VISUAL L16 — Profondeur visuelle globale

## Goal
Retirer l’effet fade du corps de `/listings/[id]` en renforçant profondeur, rythme, contraste et respiration, sans changer l’architecture fonctionnelle ni inventer de contenu.

## Baseline
Baseline L16 = état mergé L15 (`eb46a5067d9bd0548b77089d6f07cdc98387e835`).

## Target visuel
Référence canonique = visuel premium fourni par l’utilisateur et déjà verrouillé au chantier : composition plus éditoriale, surfaces de niveaux différents, sections moins uniformes, hiérarchie plus forte.

Le target est une référence de composition et de profondeur visuelle uniquement. Données, scores, preuves, comparables, routes, médias et permissions restent exclusivement issus des modèles réels existants.

## Scope
- Akar Intelligence ;
- sections d’informations et caractéristiques ;
- Vivre ici / contexte ;
- Marché & comparables ;
- Finance Maroc ;
- fin de page / transitions vers le footer.

## Succès observable
- disparition de l’effet longue colonne plate ;
- au moins 3 niveaux visuels cohérents : surface principale, surface secondaire teintée, accent premium ponctuel ;
- sections mieux groupées et respirées sans ajouter de contenu ;
- aucune régression fonctionnelle ou truth-contract ;
- aucun overflow sur 390 / 430 / 768 / 1280 ;
- score humain full-page L16 >= 9,4/10.

## Preuve
- baseline L15 ;
- target utilisateur ;
- captures after exact-head 390 / 430 / 768 / 1280 ;
- L13 certification + a11y + TypeScript/build ;
- comparaison baseline / target / after ;
- aucun déploiement Vercel.
