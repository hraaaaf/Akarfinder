# Carte des quartiers premium — Lot 8 extension aux cinq autres villes

Statut : **EN COURS — CERTIFICATION VISUELLE STRICTE**  
Date : 2026-08-18  
Branche : `agent/carte-quartiers-premium-lot8-rollout-multivilles`

## Goal

Étendre l’expérience premium validée sur Rabat à Casablanca, Marrakech, Tanger, Agadir et Fès sans inventer de géométrie, de métriques ou de provider, tout en conservant une page finale réellement fidèle au mockup V2 validé.

## Succès

- les cinq villes utilisent les contrats communs du Lot 7 ;
- chaque activation data-rich reste conditionnée à une source réellement admissible ;
- les villes sans provider restent fail-closed sans régression de navigation `city + district` ;
- la carte reste l’élément visuel dominant ;
- desktop : sélecteur compact des six villes phares, surfaces blanches, bleu marine/électrique, hiérarchie d’overlay unique et fiche quartier premium ;
- mobile/tablette : une fiche quartier ouverte devient l’overlay primaire et libère la bottom navigation ;
- chaque changement UI suit baseline → référence V2 validée → implémentation → captures après aux mêmes viewports → score explicite ;
- aucune capture n’est acceptée si le canvas existe mais que les vraies tuiles de fond ne sont pas rendues ;
- build, Geo/Search/Map, responsive et a11y restent verts.

## Preuve

- baseline pré-Lot-8 reconstruite depuis le commit exact `9b753afd9260891b82fd1ccbdb2d6d1b49b48816` sur 390×844, 430×932, 768×900, 1280×900 ;
- captures after aux mêmes viewports via `Carte Lot 8 Casablanca Visual After` ;
- audit navigateur multi-villes : Casablanca, Marrakech, Tanger, Agadir, Fès en 390×844 et 1280×900 ;
- chaque audit visuel exige désormais au moins deux réponses HTTP réussies de vraies tuiles OpenFreeMap à zoom >= 9 avant screenshot ;
- audit readiness par ville ;
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

## Référence visuelle et corrections

La référence reste le mockup V2 Rabat validé : grande carte dominante, sélecteur des six villes, surfaces blanches, bleu marine/électrique, bordures fines, ombres légères, contrôles compacts et une seule couche d’interaction primaire.

La première correction Lot 8 a supprimé l’empilement mobile/tablette : lorsqu’un quartier générique est sélectionné, cockpit secondaire, explorer territorial et légende disparaissent et la fiche remonte au-dessus de la bottom navigation.

Une première série de captures after a été rejetée parce qu’elle contenait encore `Chargement de la carte…`. Une seconde série a également été rejetée après inspection humaine : le canvas MapLibre était visible mais le fond de carte restait vide. Le score visuel associé à ces captures a été retiré.

Le diagnostic a montré que l’ancien gate confondait `style.load`/canvas visible avec rendu cartographique réel. Les audits Casablanca, multi-villes et before-reference exigent désormais de vraies réponses de tuiles OpenFreeMap à fort zoom avant toute capture. Une capture de toile vide ne peut donc plus passer silencieusement.

Le shell générique desktop est en outre rapproché du shell premium Rabat : en-tête `Carte des quartiers`, sélecteur des six villes phares, carte dominante, toolbar compacte et fiche quartier premium, sans inventer de données ni de nouvelles capacités métier.

## Gate Lot 8

Le lot peut être fermé lorsque :

1. Rabat reste l’unique provider `rabat-market-intelligence` ;
2. Casablanca conserve explicitement son statut shadow/canary ;
3. Marrakech/Tanger/Agadir/Fès ne sont pas faussement activées ;
4. la baseline before et les captures after réellement cartographiées sont disponibles aux mêmes viewports ;
5. les 10 captures multi-villes montrent réellement les fonds de carte, pas uniquement les overlays ;
6. le finding d’overlap mobile/tablette est absent ;
7. la comparaison before / mockup V2 / after atteint au minimum 9,8/10 ;
8. l’audit readiness Lot 8, TypeScript et les gates Map/Search/Geo/UX passent sur le HEAD exact ;
9. la roadmap canonique est mise à jour avec l’état réellement validé.

Aucun déploiement Vercel sans autorisation explicite.
