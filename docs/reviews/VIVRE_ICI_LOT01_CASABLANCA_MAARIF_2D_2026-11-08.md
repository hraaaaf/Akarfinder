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


## Closeout technique LOT01-A — AFTER comparé à BEFORE (08/11/2026)

**Code certifié** : commit `97b2d342d9cdc85ab834cd39adb7a741db486391`, issu du correctif d'attribution et de halo sur le candidat `712dc84e`. Documentation postérieure sans effet sur le code.

- [N2 #42468439242 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42468439242), [artefact #13611774500](https://github.com/hraaaaf/Akarfinder/actions/runs/42468439242/artifacts/13611774500) téléchargé et inspecté : **147 fichiers (141 PNG + 6 JSON)** ; les six rapports `ok:true`, `failure:null` ; 4 cas Maârif sur **390/430/768/1280**, tous `mappedSelection:maplibre-2d`, `imageryRequests:0`, `overflow:0`, handoff Search réussi ; 32 cas de huit villes L4-B préservés.
- [N3 #42468439274 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42468439274), [artefact #13611684629](https://github.com/hraaaaf/Akarfinder/actions/runs/42468439274/artifacts/13611684629) téléchargé et inspecté : rapport `ok:true`, `failure:null`, cas **390 + 1280** en `presentation:2d-vector`, `imageryRequests:0`, `overflow:0`, `/search?city=Casablanca&district=Ma%C3%A2rif` exact, page de recherche rendue.
- **Avant/Après même viewport** : montage BEFORE `AKARFINDER_L0_BEFORE_MAARIF.png` (captures L6-B N2 satellite) et montage final AFTER `AKARFINDER_LOT01_AFTER_MAARIF_FINAL.png` (captures N2 vectoriel) constitués et visualisés depuis les artefacts GitHub. AVANT : satellite dominant et dense. APRÈS : rues, toponymes et POI lisibles ; aucun appel Esri ; fallback OpenFreeMap avec attribution source, halo de position réduit pour **ne pas suggérer une frontière inexistante** ; rail Maârif/Search conservé.
- **Score visuel interne indicatif** : AVANT ~6/10 (bruit satellite, faible hiérarchie) → AFTER ~8/10 (2D lisible mais densité de labels, bande de contrôles et fiche encore perfectibles) sur ces quatre captures. Score **subjectif**, pas une mesure instrumentée ni validation utilisateur ; cible projet ≥9,5/10 toujours non atteinte.
- **Truth contract** : Maârif centre OSM seulement, `certifiedNeighborhoodBoundaryCount=0`; la 3D n'est plus chargée sur `layer=explore`, mais le code historique est conservé. **CARTO avec la vraie clé n'a pas été rendu dans N2/N3** (CI en repli OpenFreeMap). Restrictions Referer CARTO et licence commerciale Esri sur autres surfaces encore ouvertes.
- **Annonces** : N3 ne vérifie que le handoff Search, pas le nombre ni la fiabilité des offres. La tranche suivante a trouvé un incident PROD : API Search `total:5` alors que `listings:[]` pour Casablanca/Maârif ; ce défaut est isolé pour LOT01-B [PR #1195 Draft](https://github.com/hraaaaf/Akarfinder/pull/1195). **Ne pas dire que 5 biens sont disponibles.**
- **Quatre CI annexes rouges** sur le même SHA (C7, Zillow, Market Synthetic hérités et autres) ne sont pas masquées. N2/N3 GREEN technique **n'autorisent ni merge, ni release**.

**Tranche A statut : GREEN technique et visuel plus lisible, non déployé.** LOT01 global OUVERT (annonces/SQL et limites de quartiers à certifier). Aucun merge, aucune mutation DB, aucun déploiement Vercel. **Next exact :** certification LOT01-B + contrat de précision / inventaire réel, puis vérification des limites de Maârif et attribution CARTO en environnement autorisé.
