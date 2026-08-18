# Carte des quartiers premium — Lot 8 extension aux cinq autres villes

Statut : **EN COURS — CERTIFICATION EXACT-HEAD**  
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

- baseline Casablanca avant correction : run `32148290667`, artifact `9328820806`, quatre viewports 390×844, 430×932, 768×900, 1280×900 ;
- la baseline historique est figée : son workflow ne se relance plus sur le runtime modifié, car il décrit volontairement l’état avant correction ;
- captures après aux mêmes viewports via `Carte Lot 8 Casablanca Visual After` ;
- audit readiness par ville ;
- audit navigateur multi-villes ;
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

Une première capture dite « after » a ensuite été rejetée comme preuve parce qu’elle était prise pendant l’état `Chargement de la carte…`. Le harnais de certification a été durci : aucune capture after n’est désormais acceptée tant que le loading n’a pas disparu et que le canvas MapLibre n’est pas visible.

La référence visuelle reste le mockup V2 Rabat validé : carte dominante, surfaces blanches, bleu marine/électrique, contrôles compacts, bordures fines, ombres légères et hiérarchie d’overlay unique.

## État CI connu avant fermeture

Sur le HEAD `d5f51808833cfdabd2eb9ca20d45a722ef06af65`, les contrats P0, P2, Geo, Compile, UX, C4 Heatmap, C7 et Registry Lot 7 sont déjà verts. La certification visuelle after, le navigateur multi-villes et plusieurs gates UI sont encore en cours au moment de cette mise à jour.

Le run `Carte Lot 8 Casablanca Visual Baseline` qui échoue sur ce HEAD n’est pas un défaut produit : il attendait l’ancien cockpit visible alors que le correctif le masque volontairement quand une fiche quartier est ouverte. Le workflow baseline a donc été figé en `workflow_dispatch`, la preuve before restant l’artifact historique `9328820806`.

## Gate Lot 8

Le lot peut être fermé lorsque :

1. Rabat reste l’unique provider `rabat-market-intelligence` ;
2. Casablanca conserve explicitement son statut shadow/canary ;
3. Marrakech/Tanger/Agadir/Fès ne sont pas faussement activées ;
4. la baseline before et les captures after sont disponibles aux mêmes viewports ;
5. le finding d’overlap mobile/tablette est absent après correction ;
6. l’audit readiness Lot 8, TypeScript et les gates Map/Search/Geo/UX passent sur le HEAD exact ;
7. la roadmap canonique est mise à jour avec l’état réellement validé.

Aucun déploiement Vercel sans autorisation explicite.
