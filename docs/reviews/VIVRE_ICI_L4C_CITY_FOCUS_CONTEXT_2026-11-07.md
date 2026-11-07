# Vivre Ici — L4-C : ville cible en contexte (UI réelle)

**07/11/2026 — CANDIDAT, non certifié avant artefacts CI.** Branche `feat/vivre-ici-l4c-city-focus-context-20261107`, base L4-B PR #1187. Aucune fusion, DB ou Vercel.

## GOAL / SUCCESS / PROOF

- **Goal validé par l'utilisateur :** ne plus isoler la carte d'une ville. Garder les huit villes principales visibles/choisissables ensemble, toutes sur le même plan, et mettre uniquement la ville cible en valeur par **contour bleu, halo discret et indication « Ville cible »**, sans agrandissement de sa carte ni suppression des autres.
- **Mockup BEFORE :** montages de preuve N2 8 villes (captures réelles) `VivreIci_L4B_8villes_FOCUS_Mohammedia_CI-5e2e826e_{390,430,768,1280}px.png`. **Important : montage seul, jamais preuve d'implémentation UI.** L'ancien `NationalTerritoryExperience` chargeait uniquement la géométrie de la ville ciblée (response `view=city`) puis `fitBounds` jusqu'à 10.5, isolant ses environs.
- **Implémentation candidate :** charger la réponse ville ET le catalogue V5 national, conserver les 341 villes et toutes les géométries de villes sources sous MapLibre ; afficher la ville sélectionnée avec la couche `akarfinder-national-city-focus-halo`, frontière/point accentués à partir du même slug source. Caméra régionale modérée 6.15 mobile / 6.65 desktop, pas de `fitBounds` qui isole la ville. Afficher huit choix de villes sourcées **dans un même panneau compact 4 colonnes × 2 rangées** ; une seule carte/bouton avec bordure, halo et badge, boutons `aria-pressed`/focus visible. Le panneau disparaît lors d'une sélection de quartier pour ne pas obstruer l'aperçu.
- **Honesty :** frontières **de ville OSM candidates**, non contours de quartier certifiés ; aucun nouveau point/limite/annonce, aucune seconde carte MapLibre. L'alias d'affichage `Mohammedia` reste distinct du slug source `mohammadia`.

## QA attendue

- Audit `scripts/audits/vivre-ici-l4c-city-focus.mjs` dans N2 existant, 390/430/768/1280 : deux screenshots par viewport (Mohammedia ciblée, clic Casablanca et nouvelle cible), 8 boutons visibles sourcés, exactement un `aria-pressed=true`, présence des 8 slugs dans la source MapLibre (contexte conservé), halo et bordure même filtre, une seule canvas MapLibre, zoom régional ≤7.1, zéro débordement JS.
- **BEFORE → AFTER** sur les mêmes quatre viewports ; vérifier également non-régression des N2 L4-A/L4-B, N3 Maârif et attribution OpenMapTiles/OSM. Ne pas déclarer `success` sans analyse des logs, `report.json`, captures, comportement click et score visuel.
- Contrôler performance/focalisation mobile ; si le panel masque les fonctionnalités quartier, réviser plutôt que cacher les échecs.
- Les licences Esri, POI frais, contours de quartiers certifiés, inventaire/SQL prix réels et score global ≥9.5/10 restent gates L3/L5/L6.

## Next

Récupérer N2/N3 au code SHA de la PR, inspecter `l4c-focus/report.json` et les 8 PNG, corriger tout problème de build, UI ou a11y ; effectuer closeout docs+roadmap+Notion, conserver Draft/non déployée.

## Closeout technique — 07/11/2026 : L4-C GREEN vérifié

**Code testé exactement** : `9544ff358a998991e9fd73ff4ef9041381e08fee`. [CI N2 #42411974435](https://github.com/hraaaaf/Akarfinder/actions/runs/42411974435) **SUCCESS** ; [CI N3 #42411974524](https://github.com/hraaaaf/Akarfinder/actions/runs/42411974524) **SUCCESS**. Artefact N2 [#13590450078](https://github.com/hraaaaf/Akarfinder/actions/runs/42411974435/artifacts/13590450078) **téléchargé, extrait et inspecté** : 113 fichiers dont **109 PNG + 4 rapports JSON** distincts, **tous `ok=true`, `failure=null`**.

| Preuve | Résultat constaté |
| --- | --- |
| `report.json` | N2 historique Casablanca **4/4**, `overflow=0` et Search handoff |
| `l4b/report.json` | Mohammedia L4-B1 **4/4**, `pageErrors=[]`, `overflow=0` |
| `l4b-eightcity/report.json` | **32/32** trajets, **17/17** sélections, **8/8** catalogues V5 |
| `l4c-focus/report.json` | **4/4 viewports** (390, 430, 768, 1280), **2 villes par viewport** (Mohammedia→Casablanca), `citySwitch=true`, `errors=[]`, `overflow=0` |
| Source et choix réels | **341** villes V5 présentes dans la source MapLibre avant/après, 8 boutons de comparaison, exactement 1 bouton actif, **1 seule canvas** |
| Camera | zoom **6.15** (390/430) et **6.65** (768/1280), pas de `fitBounds` isolant la ville |
| Cartographie / UX | le test vérifie la présence du contour + halo sur le **même slug**, aucun chevauchement du panneau 8 villes avec la fiche responsive, pas d'activation 3D automatique en vue Casablanca |

**Incident avant certification :** [N2 #42411008896](https://github.com/hraaaaf/Akarfinder/actions/runs/42411008896) **FAIL** alors que trois autres rapports étaient verts, car l'audit L4-C interrogeait `map.getFilter()` **avant création des couches** et déclenchait `TypeError ... reading 'filter'`. Correctif limité à l'audit : attendre `isStyleLoaded()`, les deux couches, la fin des mouvements puis vérifier strictement leurs filtres. Commit `9544ff35` confirmé vert sur N2/N3.

### BEFORE → référence → AFTER : comparaison de captures

- **BEFORE** : vue Mohammedia seule et carte zoomée, écran source au format 390/1280, comparaison possible via les captures précédentes conservées dans la conversation.
- **Référence approuvée** : grille de huit cartes de villes, toutes de même dimension, Mohammedia distinguée par bordure/halo/badge. Ce montage était une **maquette**, pas une preuve de son intégration.
- **AFTER réel** : **une carte nationale continue** dont la caméra garde des villes voisines, plus un **sélecteur de huit villes 4×2**. Une seule sélection soulignée en bleu et badge « Ville cible » ; halo lié au contour de la ville source. Huit captures originales `l4c-focus/focus-{mohammedia,casablanca}-{390,430,768,1280}.png` issues du même run N2, vérifiées sur les quatre formats ; montages BEFORE/AFTER 390 et 1280 créés et montrés à l'utilisateur.
- **Évaluation visuelle locale indicative : 8/10**, non ≥9,5/10 : hiérarchie et contexte plus cohérents, mais boutons compacts et légendes cartographiques petites sur téléphone. La carte de quartier, les licences de tuiles et la certification produit globale restent indépendantes.

### Limites, suite, release

La preuve atteste **L4-C technique GREEN**, **pas** une qualité finale ≥9,5/10 ni la disponibilité SQL réelle d'annonces/prix. Les frontières source sont **des contours candidats OSM de villes**, pas des polygones de quartiers certifiés. Sont encore ouverts : L3 contours/POI, L5 sources live, L6 licences/attributions cartographiques, accessibilité et qualité visuelle. PR [#1190](https://github.com/hraaaaf/Akarfinder/pull/1190) reste Draft/unmerged, aucune DB modifiée et **aucun déploiement Vercel**. Le commit documentaire de closeout peut être postérieur au SHA de code réellement certifié.

**Next exact :** synchroniser la roadmap/Notion et préparer un audit L6 sur accessibilité mobile, attributions et droits fournisseurs. Ne jamais fusionner/déployer sans approbation explicite.
