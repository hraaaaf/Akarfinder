# AkarFinder — Page annonce — Target visuel canonique

**Programme : `ANNOUNCEMENT-PAGE-ULTRA-PREMIUM`**  
**Version : 2026-08-17**  
**Portée : convergence visuelle finale L12/L13**

## Goal visuel

Faire converger `/listings/[id]` vers une fiche immobilière premium AkarFinder qui combine portail immobilier haut de gamme et outil d’aide à la décision, sans dériver vers un dashboard analytique générique ni introduire d’informations non prouvées.

Le target doit rester strictement aligné sur les composants, données, couleurs et contrats déjà présents dans l’application. Il sert de référence de composition et de hiérarchie, pas d’autorisation à inventer des données ou des fonctionnalités.

## Composition desktop cible

### Colonne principale

1. Hero / galerie média ;
2. transaction, prix, titre, localisation ;
3. facts essentiels ;
4. Akar Intelligence ;
5. informations essentielles et caractéristiques ;
6. `Vivre ici / quartier` ;
7. comparables détaillés et contexte marché ;
8. Finance Maroc.

### Rail droit décisionnel

Ordre cible :

1. module Pro / source / conversion ;
2. module `Mon Projet` ;
3. résumé Marché & comparables.

Le rail ne répète pas inutilement prix ou localisation et ne concurrence pas le CTA principal.

## Mon Projet

Desktop : module compact dans le rail droit, immédiatement sous le module Pro / conversion.

Mobile/tablette : intégration compacte dans le flux de contenu, sans collision avec le dock décisionnel.

Le module peut afficher :

- nom du projet explicite ;
- Property Fit uniquement si calculable ;
- raisons match / mismatch / inconnu ;
- trajets vers anchors explicites uniquement lorsqu’ils sont mesurés ;
- CTA secondaire `Modifier Mon Projet`.

Sans projet explicite : module masqué.

## Design system

- fond global : `#F8FAFC` ;
- deep blue : `#0B1F3A` / `#0B2545` ;
- primary : `#0B63CE` ;
- surfaces : blanc / froid ;
- ombres : froides, légères ;
- bronze : confiance / badge uniquement ;
- vert : identité WhatsApp uniquement ;
- densité : premium, aérée mais efficace ;
- aucun empilement décoratif de badges.

## Critères L13 de convergence

La certification finale doit comparer **baseline / target / après** sur :

- 390×844 ;
- 430×932 ;
- 768×900 ;
- 1280×900.

Succès minimum :

- hiérarchie desktop conforme au target ;
- adaptation mobile cohérente ;
- aucune régression fonctionnelle L1→L12 ;
- H1 unique ;
- aucun overflow ;
- aucune erreur console ou ressource inattendue ;
- aucun finding critique ;
- vérité, permissions et fail-closed conservés ;
- score visuel final ≥ 9,5/10 avant attribution de la certification `10/10`.

## Poids roadmap

Aucun nouveau lot et aucun changement de poids :

- ANN-L12 = 5 % ;
- ANN-L13 = 6 % ;
- total programme = 100 %.

La roadmap principale sera consolidée avec ce target lors du closeout canonique L12, afin d’éviter toute divergence documentaire entre un lot en cours et son état finalement certifié.
