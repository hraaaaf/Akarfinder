# Carte des quartiers premium — Lot 8 Extension aux cinq autres villes

## Goal
Étendre l’expérience premium validée sur Rabat à Casablanca, Marrakech, Tanger, Agadir et Fès sans inventer de géométrie, de métriques ou de provider.

## Succès
- les cinq villes utilisent les contrats communs du Lot 7 ;
- chaque activation visuelle/data-rich reste conditionnée à une source réellement admissible ;
- les villes sans provider restent fail-closed sans régression de navigation `city + district` ;
- chaque changement UI suit baseline → référence V2 validée → implémentation → captures après aux mêmes viewports → score explicite ;
- build, Geo/Search/Map, responsive et a11y restent verts.

## Preuve
- captures avant/après aux mêmes viewports ;
- audit de readiness par ville ;
- CI exact-head ;
- aucun provider activé sans preuve de géométrie + métriques + mapping Search.

## Ordre
1. Casablanca
2. Marrakech
3. Tanger
4. Agadir
5. Fès

## Baseline Casablanca vérifiée avant changement visuel
- endpoint existant : `/api/geo/casablanca-arrondissements` ;
- source actuelle : `casablanca-arrondissements-osm.json` ;
- `publicationStatus: shadow` ;
- `reviewed: false` ;
- endpoint limité à un canary preview 1 % ;
- guard explicite `production_blocked` en production ;
- aucun provider d’intelligence marché Casablanca n’est actuellement déclaré dans le registre premium.

Conclusion : la géométrie Casablanca ne peut pas être promue en production à ce stade. Le rollout UI doit donc rester élégant en mode canonique/fail-closed, sans transformer la donnée shadow en vérité officielle.

## Référence visuelle
Le mockup V2 Rabat déjà validé reste la référence de direction : carte dominante, surfaces blanches, bleu marine/électrique, contrôles compacts, bordures fines, ombres légères, cohérence desktop/mobile.

Aucun déploiement Vercel sans autorisation explicite.
