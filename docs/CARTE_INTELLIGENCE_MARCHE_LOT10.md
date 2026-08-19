# Carte intelligence marché — Lot 10

Statut : **EN CERTIFICATION**

## Goal

Transformer les métriques automatiques certifiées au Lot 9 en lecture cartographique sémantique par quartier, sans fabriquer de géométrie ni de valeur.

## Baseline

Lot 9 fermé et mergé :

- main Lot 9 : `7ad72d31e147b00a1b0dca8e59053c3e3c66270f` ;
- browser exact-head final : run `32199362324` ;
- artifact : `9347013725` ;
- digest : `sha256:56c304c69312811fbdc37937a9284518b97c9b298919677d4046f2da10a77bdf` ;
- viewports : 390 / 430 / 768 / 1280 ;
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

Il consomme le payload Lot 9 :

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

## État data attendu au démarrage du lot

Dernière preuve Lot 9 pour Casablanca :

- Prix : 0 quartier admissible ;
- Densité : 1 quartier admissible ;
- Annonces : 3 quartiers avec métrique observée.

Le nombre de polygones effectivement colorables peut être inférieur : seule l’intersection **métrique observée ∩ géométrie admissible** compte.

Le mode Prix doit donc actuellement rester neutre si aucun quartier ne passe le seuil. C’est un comportement attendu, pas une panne.

## Implémentation en cours

- `lib/map/city-market-heatmap.ts` : jointure pure métrique ↔ géométrie ;
- `lib/map/akarfinder-territorial-style.ts` : style sémantique, bridge des modes, fail-closed ;
- `components/map/MapLegend.tsx` : synchronisation du mode et remontée de sélection ;
- `scripts/scrapers/__tests__/carte-lot10-market-heatmap.test.ts` : contrats join / neutralité / bridge ;
- `scripts/audits/carte-lot10-heatmap-browser.mjs` : certification browser quatre viewports ;
- `.github/workflows/carte-lot10-heatmap-browser.yml` : CI exacte avec Supabase + canary preview.

## Preuve requise avant fermeture

- tests Lot 10 verts ;
- TypeScript vert ;
- production build vert ;
- Lot 9 regression gates verts ;
- P1B.1/P1B.2 verts ;
- C7 + accessibility verts ;
- browser Lot 10 vert sur 390/430/768/1280 ;
- 16 géométries Casablanca prouvées via canary ;
- au moins 2 vraies tuiles OpenFreeMap haut zoom par viewport ;
- screenshots AFTER exact-head inspectés ;
- sélection Maârif + handoff `/search?city=Casablanca&district=Maârif` prouvés ;
- comparaison baseline / référentiel / after ;
- score >= 9,8/10.

## Interdits

- aucun chiffre saisi manuellement ;
- aucune interpolation de prix ;
- aucune densité sans surface admissible ;
- aucun polygone inventé ;
- aucun déploiement Vercel sans autorisation explicite.

## Closeout

À compléter uniquement après certification :

- HEAD final ;
- runs exacts ;
- artifact + digest ;
- score ;
- merge commit ;
- progression roadmap.
