# Carte intelligence marché — Lot 10

Statut : **CERTIFIÉ — READY TO MERGE**

## Goal

Transformer les métriques automatiques certifiées au Lot 9 en lecture cartographique sémantique par quartier, sans fabriquer de géométrie ni de valeur.

## Baseline

Lot 9 fermé et mergé :

- main Lot 9 : `7ad72d31e147b00a1b0dca8e59053c3e3c66270f` ;
- score scope Lot 9 : 9,8/10.

Référentiel visuel : mockup canonique **Carte intelligence marché** validé par l’utilisateur.

## Succès observable

1. `Prix | Densité | Annonces` pilotent la coloration territoriale avec le même payload que la légende.
2. Une géométrie n’est colorée que si sa clé canonique correspond à une métrique observée admissible.
3. Une géométrie sans métrique reste neutre.
4. Une erreur de lecture marché remet la couche en état neutre, sans valeur inventée.
5. Casablanca réutilise uniquement les 16 géométries OSM shadow/canary déjà matérialisées.
6. Rabat conserve son provider polygonal dédié existant.
7. Marrakech, Tanger, Agadir et Fès ne reçoivent aucun faux polygone.
8. La sélection quartier conserve le contrat `city + district` et le handoff Search.
9. 390 / 430 / 768 / 1280 restent sans collision ni débordement.
10. Le rendu du scope Lot 10 atteint au moins 9,8/10 face au référentiel canonique.

## Architecture

### Source métier

Le Lot 10 ne crée aucun KPI.

`stock observé → résolution geo → dédoublonnage → agrégation city + district → payload marché → heatmap`

### Jointure

`neighborhoodCanonicalId` de la géométrie est joint à `districtSlug` du payload marché.

Propriétés décorées :

- `marketMode` ;
- `marketMetricValue` ;
- `marketFillColor` ;
- `marketNeutral` ;
- `marketSampleCount` ;
- `marketReliability`.

Aucune correspondance = `metricValue: null`, couleur neutre, `marketNeutral: true`.

### Géométrie

Casablanca : géométries OSM matérialisées en shadow/canary. Elles ne sont pas promues en frontières officielles.

Rabat : provider `rabat-market-intelligence` inchangé.

Autres villes phares : repères uniquement tant qu’aucune géométrie admissible n’est disponible.

### Lisibilité sémantique

- les trois modes intelligence possèdent la surface de carte ;
- le rail explorateur legacy est masqué dans ces modes pour éviter les collisions ;
- si une seule classe sémantique est disponible, un ton médian lisible est utilisé au lieu du ton le plus pâle ;
- le mode Prix reste neutre quand aucun quartier ne passe le seuil de preuve.

## Certification exacte

Code certifié : `e5433d286b9bcb1e254e5441817a356d2a696c1c`

### CI

Tous les workflows attachés au HEAD exact sont verts : **21/21**.

Preuves principales :

- Carte Lot 10 Heatmap Browser : run `32205604089` ✅ ;
- Carte Lot 9 Market Modes Browser : `32205604032` ✅ ;
- P1B.1 AkarFinder Map Visual Layer : `32205604035` ✅ ;
- P1B.2 Territorial Intelligence : `32205604185` ✅ ;
- Carte C7 Final Certification : `32205604073` ✅ ;
- Carte C3 Intelligence Scale Gate : `32205604227` ✅ ;
- Phase 1 Final Design Accessibility Gate : `32205604151` ✅ ;
- UI All Pages Baseline : `32205604094` ✅ ;
- UI All Pages Certification : `32205604051` ✅ ;
- UI Polish P3 / P5 : `32205604218` / `32205604124` ✅.

### Artifact browser exact-head

- artifact : `9349059842` ;
- digest : `sha256:bb7ac3843e9000c9cd59cdca8bd05b4402589c1f8af6432da493f9405f4c58cc` ;
- report : `ok: true` ;
- captures : 8 fichiers, overview + sélection Maârif sur 390 / 430 / 768 / 1280 ;
- géométries Casablanca : 16 ;
- vraies tuiles OpenFreeMap haut zoom : prouvées sur chaque viewport ;
- APIs Prix / Densité / Annonces : HTTP 200 ;
- état observé au snapshot : Prix 0 quartier admissible, Densité 1, Annonces 3 ;
- Maârif sélectionné : `1 annonce` ;
- handoff : `/search?city=Casablanca&district=Ma%C3%A2rif` ;
- panel mobile : 216 px ;
- aucun faux polygone, aucune interpolation.

### Audit visuel AFTER

Viewports inspectés : 390 / 430 / 768 / 1280.

Résultat :

- heatmap lisible et clairement distincte du fond ;
- légende cohérente avec la palette réellement appliquée ;
- Maârif et Casablanca Finance City identifiables ;
- sélection Maârif cohérente mobile/tablette/desktop ;
- pas de rail parasite en modes intelligence ;
- Search CTA, fiche quartier et attribution cartographique lisibles ;
- aucune collision bloquante.

**Score visuel scope Lot 10 : 9,8/10.**

## Interdits respectés

- aucun chiffre saisi manuellement ;
- aucune interpolation de prix ;
- aucune densité sans surface admissible ;
- aucun polygone inventé ;
- aucun déploiement Vercel.

## Closeout

- PR : `#819` ;
- code certification HEAD : `e5433d286b9bcb1e254e5441817a356d2a696c1c` ;
- browser final : `32205604089` ;
- artifact : `9349059842` ;
- score : `9,8/10` ;
- merge commit : à renseigner post-merge ;
- progression roadmap après merge : `10/11 = 90,9 %`.
