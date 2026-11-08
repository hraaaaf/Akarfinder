# Vivre Ici — LOT01 Casablanca–Maârif : recentrage 2D (08/11/2026)

## Décision utilisateur et périmètre

**Validé** : prioriser carte **2D** + quartiers **réels/sourcés** + annonces **fiables** ; geler temporairement la 3D. **Aucun déploiement Vercel** sans autorisation explicite, aucune opération DB, aucune donnée de quartier inventée.

## Goal / Success / Proof

- **Goal lot 01 (tranche A)** : de Maroc à Casablanca, sélectionner Maârif, voir un fond vectoriel 2D lisible et un repère central V5/OSM, puis ouvrir la recherche immobilière pré-filtrée Casablanca/Maârif. Pas d'image satellite Esri.
- **Avant** : captures N2 `active-maarif-{390,430,768,1280}-after.png` du code L6-B `c0ea82f5`, montrant l'imagerie satellite Esri dominant la carte, malgré un composant déjà en angle zéro à Maârif.
- **Solution** : conserver DOM, interaction Quartier/Rue, source de centre MapLibre géolocalisée et rail Search. Remplacer le style raster/satellite + extrusion par `nationalBasemapConfiguration(theme)` : CARTO Voyager/Dark Matter si clé accessible au build, sinon OpenFreeMap Liberty. Carte `pitch=0`, `bearing=0` partout ; suppression du montage `National3DBuildingsLayer` dans le routeur national. Le code 3D historique reste dans le dépôt pour rollback, non monté dans Explore. Aucune requête Esri ne doit subsister dans le parcours Explore.
- **Truth contract** : `Maârif` a un **centre** sourcé V5/OSM, pas une limite administrative certifiée. L'API expose `certifiedNeighborhoodBoundaryCount: 0`; ne jamais prétendre montrer un polygone valide. Les annonces et prix réels restent à auditer ; les tests vérifient uniquement le passage vers Search, pas l'inventaire SQL.
- **Succès tranche A** : N2 sur 390/430/768/1280, N3 sur 390/1280, zéro satellite Esri intercepté, mode 2D déclaré, angle nul, au moins une entité de fond de carte réellement rendue, zéro débordement, lien Search contient exactement Casablanca/Maârif. Captures AFTER mêmes tailles issues de CI et comparées au BEFORE, note visuelle prudente.
- **Preuve non acquise avant CI** : pas de rendu CARTO avec vraie clé (GitHub CI sans variable Vercel), pas de géométrie certifiée de quartier, pas de certification de volume/qualité de listings, quatre CI annexes préexistantes rouges (C7, Zillow, Synthetic, Multi-city). Pas de score 9,5/10 déclaré sans observation.
- **Next** : CI et artefacts ; corriger si FAIL, comparer BEFORE/AFTER ; puis tranche B inventaire Search SQL et lacune géométrique/POI, avant toute release ou merge.
