# AkarFinder — Carte intelligence marché — N2 Ville → Quartiers — HANDOVER CANONIQUE

Dernière mise à jour vérifiée : 2026-08-24

## Titre cible

AkarFinder — Carte intelligence marché — N2 Ville → Quartiers

## Avancement conversation

**60 % = 3/5 gates fermés**

1. BEFORE / audit N1 comme baseline : CLOSED
2. Target visuel + Human Gate Achraf : CLOSED
3. Implémentation N2 : CLOSED
4. AFTER certification 390/430/768/1280 : OPEN
5. Comparatif final + score + merge + closeout : OPEN

Ne pas monter le pourcentage sans preuve observable.

---

## Goal

Étendre la hiérarchie certifiée **Maroc → Ville** vers **Ville → Quartier** sans inventer de frontières territoriales ni de métriques marché.

Le produit doit conserver la vraie carte MapLibre/OpenFreeMap comme support principal, puis ajouter uniquement des labels/repères quartiers sourcés par-dessus.

## Succès

- vraie basemap MapLibre/OpenFreeMap visible sous les repères ;
- Casablanca >= 1 500 labels quartiers sourcés ;
- Casablanca >= 100 repères cartographiques ;
- Maârif sélectionnable sur le canvas réel ;
- un quartier Barid sans coordonnées reste trouvable par recherche ;
- 0 contour de quartier publié tant qu’aucune géométrie n’est certifiée ;
- CTA Search préserve `city + district` ;
- 390 / 430 / 768 / 1280 sans overflow ni erreur browser critique ;
- score visuel final cible >= 9,3/10.

## Preuve attendue

- TypeScript + build production ;
- interaction Playwright réelle sur MapLibre ;
- validation basemap réelle sous overlay ;
- AFTER aux 4 viewports ;
- comparaison BEFORE / target / AFTER ;
- score visuel ;
- merge exact-head + closeout canonique.

---

## Décisions produit verrouillées

### 1. La carte réelle reste visible

N2 ne doit jamais devenir une vue « points seuls ».

Le fond cartographique MapLibre/OpenFreeMap doit continuer à montrer routes, côte, localités et contexte urbain.

### 2. Vérité géographique

- point/label = quartier sourcé ;
- contour = uniquement après qualification géométrique séparée ;
- métriques Prix / Densité / Annonces = hors scope N2 ;
- aucun faux polygone ;
- aucun prix/densité/listings national inventé.

### 3. Interaction

- desktop : hover + click ;
- mobile : tap ;
- sélection quartier → fiche compacte ;
- CTA → Search avec `city` + `district` ;
- quartiers sans coordonnées restent recherchables mais ne reçoivent pas de faux point.

### 4. UI target

Canonical target : `docs/CARTE_NATIONAL_N2_TARGET.md`.

La V2 visuelle décidée garde la carte dominante, réduit le chrome, utilise des labels/points anti-collision et une fiche compacte.

---

## Source truth N2

Source validée : artifact V5 de la registry nationale.

- Source run : `32634250993`
- Artifact : `carte-national-territory-registry-v5-32634250993`
- runtime parent groups : **93**
- labels quartiers/localités conservés après mapping : **11 413**
- Casablanca : **1 617 labels**
- Casablanca : **134 repères cartographiques**
- Maârif OSM : repère présent
- `QUARTIER MAARIF` Barid : présent sans coordonnées, fallback Search requis
- géométries quartier publiées : **0**

Les données sont transportées dans 8 fragments `lib/map/national-territory-data/neighborhoods-n2-0.ts` à `-7.ts` et décodées côté serveur.

---

## Repo / Git

- Repo : `hraaaaf/Akarfinder`
- Branche : `map/national-neighborhoods-n2`
- PR : **#888**
- URL PR : https://github.com/hraaaaf/Akarfinder/pull/888
- Base observée lors du dernier check PR : `main` à `5a66e7c8312253794f474bf73ddd7a5aff6b515b`
- Head produit avant ce handover doc : `3de1d9942ba33114898174bc22f14f6a804adf26`
- PR mergeable : true au dernier check
- Aucun Vercel autorisé / effectué.

Le commit N2 initial :
- `768e1b7ec60e474a7de6e0b1dfb1e8a186cf14e7`

Correctif TypeScript :
- `3de1d9942ba33114898174bc22f14f6a804adf26`
- cause corrigée : `Map.isStyleLoaded()` typé `boolean | void`
- normalisation en booléen explicite.

Des commits vides accidentels générés pendant une tentative de mise à jour documentaire ont été retirés en réalignant la branche sur `3de1d994...`.

---

## Fichiers N2 principaux

- `.github/workflows/carte-national-neighborhoods-n2.yml`
- `app/api/geo/national-territories/route.ts`
- `components/map/NationalMapRouter.tsx`
- `components/map/NationalNeighborhoodOverlay.tsx`
- `components/map/NationalNeighborhoodOverlayBridge.tsx`
- `docs/CARTE_NATIONAL_N2_TARGET.md`
- `lib/map/national-territory-runtime.server.ts`
- `lib/map/national-territory-data/neighborhoods-n2-0.ts` … `-7.ts`
- `scripts/audits/carte-national-neighborhoods-n2.mjs`

Architecture choisie : **overlay N2 indépendant branché sur la même instance MapLibre N1**, pas réécriture du gros composant national.

---

## CI / runs importants

### Run N2 #1

- Run : `32665854441`
- Conclusion : FAILURE
- TypeScript : FAILURE
- Cause exacte :
  `NationalNeighborhoodOverlayBridge.tsx(58,46): Argument of type 'boolean | void' is not assignable to SetStateAction<boolean>`
- Build/UI non exécutés.

### Run N2 exact-head après correctif

- Run : `32668299719`
- Head : `3de1d9942ba33114898174bc22f14f6a804adf26`
- Conclusion : FAILURE
- TypeScript : SUCCESS
- Production build : SUCCESS
- Chromium install : SUCCESS
- Server : SUCCESS
- Four viewport certification : FAILURE
- Artifact : `9500703368`
- Artifact digest : `sha256:010e2e65b47113ed3142d64d4c4ed33b439a4232043d07fd073b02fa282375bf`
- Artifact très petit (247 B), donc aucune preuve visuelle exploitable encore.

### Échec actuel exact

Le harness échoue avant la première capture sur :

```js
await page.waitForFunction(() => {
  const map = window.__AKARFINDER_NATIONAL_MAP__;
  return Boolean(map?.getLayer("akarfinder-national-neighborhood-labels")) &&
    (map?.querySourceFeatures("akarfinder-national-neighborhood-points").length ?? 0) >= 100;
}, null, { timeout: 20000 });
```

Erreur : `page.waitForFunction: Timeout 20000ms exceeded`.

Donc :
- TypeScript/build/server sont désormais prouvés verts ;
- la basemap N1 existe, mais le harness ne voit pas encore l’overlay N2 prêt avec >=100 source features dans les 20 s ;
- aucun verdict AFTER visuel ne peut être affirmé ;
- ne pas augmenter le timeout aveuglément sans diagnostiquer pourquoi l’overlay/source n’est pas prêt.

### Autres preuves exact-head utiles

Sur `3de1d994...`, plusieurs gates de base ont passé :
- Canonical Baseline Compile Validation : SUCCESS (`32668299916`)
- Carte National Zillow UI Certification N1 : SUCCESS (`32668299843`)
- UX Gate 0 Contracts : SUCCESS (`32668299797`)
- Casablanca Geometry Canary : SUCCESS (`32668299749`)
- Neighborhood Geometry Registry Shadow Gate : SUCCESS (`32668299458`)
- UI Polish P5 Global Certification : SUCCESS (`32668299710`)

Certains workflows historiques/adjacents restent rouges ; ne pas les confondre automatiquement avec N2.

---

## Diagnostic à reprendre

Le prochain diagnostic doit déterminer pourquoi, en vue `?city=casablanca&layer=explore`, le source/layer N2 n’est pas observé comme prêt par le test.

Ordre recommandé :

1. Inspecter `NationalNeighborhoodOverlayBridge` et son signal `mapReady` après le correctif booléen.
2. Vérifier si `window.__AKARFINDER_NATIONAL_MAP__` est publié avant que le bridge cherche la map.
3. Vérifier le timing `style.load` / `styledata` : un `setStyle()` de thème peut supprimer les layers ajoutés puis les recréer.
4. Vérifier que l’API `?city=casablanca` renvoie réellement `neighborhoods` avec >=100 items ayant `center`.
5. Vérifier que `NationalMapRouter` monte bien le bridge uniquement en vue ville nationale et ne passe pas par le provider premium Rabat.
6. Instrumenter le harness/report si nécessaire pour capturer :
   - présence du bridge DOM ;
   - payload API counts ;
   - map style loaded ;
   - source exists ;
   - layer exists ;
   - `querySourceFeatures` count ;
   - `queryRenderedFeatures` count.
7. Corriger le produit si l’overlay ne se monte pas ; corriger le harness uniquement si le produit est prouvé sain.
8. Après correction : un seul run N2 dédié, pas une rafale de micro-pushes.

Après 2 tentatives similaires infructueuses, changer de stratégie, ne pas simplement augmenter les timeouts.

---

## Goal visuel obligatoire pour la reprise

La certification finale doit prouver sur 390 / 430 / 768 / 1280 :

- vraie carte visible ;
- routes/contexte cartographique présents ;
- points/labels quartiers au-dessus ;
- Maârif sélectionné ;
- fiche quartier lisible ;
- recherche fallback sans coordonnées ;
- CTA Search correct ;
- aucun overflow ;
- aucun faux contour.

À la fin du lot UI : fournir une capture/comparatif et un score visuel.

---

## Next exact

**Diagnostiquer le timeout du harness N2 sur le layer/source `akarfinder-national-neighborhood-*`, corriger sans masquer le problème, lancer un seul run dédié, récupérer l’artifact AFTER, inspecter 390/430/768/1280, scorer, puis merge + closeout si score >=9,3 et gates verts.**

Pas de Vercel sans autorisation explicite.

---

## Prompt de reprise prêt à coller

> Reprends AkarFinder — Carte intelligence marché — N2 Ville → Quartiers depuis `docs/CARTE_NATIONAL_N2_HANDOVER.md`. Vérifie d’abord l’état exact de la PR #888 et son HEAD courant. Le dernier produit prouvé était `3de1d9942ba33114898174bc22f14f6a804adf26`; TypeScript/build/server sont verts mais le run N2 `32668299719` échoue dans Playwright car le harness ne voit pas `akarfinder-national-neighborhood-labels` + >=100 features dans `akarfinder-national-neighborhood-points` sous 20 s. Diagnostique le bridge/mapReady/style lifecycle/API avant de changer le timeout. Continue automatiquement jusqu’à AFTER 4 viewports, score >=9,3, merge et closeout si toutes les preuves passent. Aucun Vercel.