# Carte des quartiers premium — Lot 8 rollout cinq villes

Statut : **EN COURS — READINESS VERROUILLÉE**  
Date : 2026-08-18  
Branche : `agent/carte-quartiers-premium-lot8-rollout`

## Goal

Étendre la Carte des quartiers premium de Rabat vers Casablanca, Marrakech, Tanger, Agadir et Fès sans inventer de géométrie, de métrique ou de provider d’intelligence marché.

## Succès

- les cinq villes restent accessibles via le contrat Map/Search canonique ;
- une capacité premium n’est activée que si son provider réel existe et est prouvé ;
- Casablanca peut conserver sa couche territoriale OSM en mode canary/shadow existant, sans la présenter comme donnée autoritative ou comme intelligence marché ;
- Marrakech, Tanger, Agadir et Fès restent sur l’expérience générique/fail-closed tant qu’aucun provider équivalent n’est présent ;
- Rabat reste l’unique provider `rabat-market-intelligence` tant qu’un autre provider n’est pas certifié ;
- aucune frontière, aucun prix de quartier et aucune interpolation ne sont fabriqués.

## Preuve runtime disponible dans le repo

### Casablanca

- endpoint existant : `/api/geo/casablanca-arrondissements` ;
- source : `data/geo/casablanca-arrondissements-osm.json` ;
- audit : 16/16 géométries valides ;
- publication : `shadow` ;
- endpoint protégé par canary et peut répondre `404 disabled` ;
- aucune route `/api/geo/casablanca-market-intelligence` n’existe ;
- donc : **territoires expérimentaux disponibles, intelligence marché premium non activable**.

### Marrakech

- les éléments d’autorité présents dans `p1b13-priority-authority-evidence.json` ne valident pas un modèle polygonal de quartier exploitable : Palmeraie reste sans preuve d’autorité dans le scope revu ; Targa est une zone dont le type d’entité reste à résoudre ;
- aucun endpoint dédié d’intelligence marché n’existe ;
- donc : **fail-closed**.

### Tanger, Agadir, Fès

- aucun endpoint dédié sous `app/api/geo/` n’est présent pour une expérience d’intelligence marché équivalente à Rabat ;
- aucune capacité premium n’est donc déclarée ;
- donc : **expérience générique/fail-closed**.

## Matrice de readiness

| Ville | Explore canonique | Géométrie dédiée prouvée | Intelligence marché dédiée | Décision Lot 8 |
|---|---:|---:|---:|---|
| Casablanca | Oui | Oui, OSM shadow/canary | Non | Conserver territorial expérimental + générique |
| Marrakech | Oui | Non certifiée | Non | Fail-closed |
| Tanger | Oui | Non certifiée | Non | Fail-closed |
| Agadir | Oui | Non certifiée | Non | Fail-closed |
| Fès | Oui | Non certifiée | Non | Fail-closed |

## Règle de rollout

Le rollout ne signifie pas cocher cinq villes en `true`. Il signifie que chaque ville entre dans le même contrat de capacité et que l’absence de preuve produit un comportement explicite et sûr. Toute activation future d’un provider devra ajouter son identifiant au registre, son endpoint/data contract, son audit et sa certification exacte-head.

## Gate Lot 8

Le lot peut être fermé lorsque :

1. le registre contient les six villes et Rabat reste l’unique provider d’intelligence marché ;
2. le contrat Casablanca shadow/canary est explicitement protégé ;
3. Marrakech/Tanger/Agadir/Fès ne sont pas faussement activées ;
4. l’audit statique Lot 8 passe ;
5. TypeScript et les gates Map/Search/Geo existantes passent sur le HEAD exact ;
6. la roadmap canonique est mise à jour avec l’état réellement validé.

Aucun changement visuel n’est introduit par ce sous-lot de certification de capacité ; la procédure capture avant/mockup/après n’est donc pas déclenchée ici.
