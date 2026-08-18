# Carte des quartiers premium — Lot 8 extension aux cinq autres villes

Statut : **EN COURS — READINESS VERROUILLÉE**  
Date : 2026-08-18  
Branche : `agent/carte-quartiers-premium-lot8-rollout-multivilles`

## Goal

Étendre l’expérience premium validée sur Rabat à Casablanca, Marrakech, Tanger, Agadir et Fès sans inventer de géométrie, de métriques ou de provider.

## Succès

- les cinq villes utilisent les contrats communs du Lot 7 ;
- chaque activation data-rich reste conditionnée à une source réellement admissible ;
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

## Readiness vérifiée dans le repo

### Casablanca

- endpoint existant : `/api/geo/casablanca-arrondissements` ;
- source : `data/geo/casablanca-arrondissements-osm.json` ;
- audit : 16/16 géométries valides ;
- `publicationStatus: shadow` ;
- dataset non promu comme géométrie officielle ;
- endpoint limité au canary preview existant et peut répondre `404 disabled` ;
- aucune route `/api/geo/casablanca-market-intelligence` ;
- décision : conserver le territorial expérimental et l’expérience générique, sans activer un faux provider d’intelligence marché.

### Marrakech

- `Palmeraie` reste sans preuve d’autorité de quartier dans le scope revu ;
- `Targa` est reconnue comme zone mais son type d’entité reste à résoudre avant écriture Registry ;
- aucune intelligence marché dédiée ;
- décision : fail-closed.

### Tanger, Agadir, Fès

- aucun endpoint dédié d’intelligence marché équivalent à Rabat sous `app/api/geo/` ;
- aucune capacité premium data-rich déclarée ;
- décision : expérience générique/fail-closed.

## Matrice de readiness

| Ville | Explore canonique | Géométrie dédiée prouvée | Intelligence marché dédiée | Décision Lot 8 |
|---|---:|---:|---:|---|
| Casablanca | Oui | Oui, OSM shadow/canary | Non | Territorial expérimental + générique |
| Marrakech | Oui | Non certifiée | Non | Fail-closed |
| Tanger | Oui | Non certifiée | Non | Fail-closed |
| Agadir | Oui | Non certifiée | Non | Fail-closed |
| Fès | Oui | Non certifiée | Non | Fail-closed |

## Baseline visuelle Casablanca

Baseline exacte-head capturée avant le changement UI sur quatre viewports : 390×844, 430×932, 768×900, 1280×900.

Finding principal vérifié sur mobile : la légende globale recouvrait la fiche quartier sélectionnée et la bottom navigation recouvrait la partie basse de la fiche. Le correctif Lot 8 applique le même principe que Rabat : lorsqu’un quartier générique est sélectionné sur mobile/tablette, l’UI secondaire disparaît et la fiche remonte au-dessus de la bottom navigation.

La référence visuelle reste le mockup V2 Rabat validé : carte dominante, surfaces blanches, bleu marine/électrique, contrôles compacts, bordures fines, ombres légères et hiérarchie d’overlay unique.

## Gate Lot 8

Le lot peut être fermé lorsque :

1. Rabat reste l’unique provider `rabat-market-intelligence` ;
2. Casablanca conserve explicitement son statut shadow/canary ;
3. Marrakech/Tanger/Agadir/Fès ne sont pas faussement activées ;
4. la baseline et les captures après sont disponibles aux mêmes viewports ;
5. le finding d’overlap mobile/tablette est absent après correction ;
6. l’audit readiness Lot 8, TypeScript et les gates Map/Search/Geo/UX passent sur le HEAD exact ;
7. la roadmap canonique est mise à jour avec l’état réellement validé.

Aucun déploiement Vercel sans autorisation explicite.
