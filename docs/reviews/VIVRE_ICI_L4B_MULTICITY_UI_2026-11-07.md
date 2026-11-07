# Vivre Ici — L4-B : parcours des huit villes et quartiers sourcés

**07/11/2026 — CANDIDAT EN REVALIDATION. Ne pas confondre avec certification L4-B.**

## GOAL / SUCCESS / PROOF

- **Goal :** permettre à un visiteur d'explorer 8 villes et sélectionner 17 quartiers issus du registre V5 sur la carte nationale, sans contour de quartier inventé, centre implicite provenant d'une ancienne fiche commerciale, ni résultat immobilier simulé.
- **Succès requis :** 32 vues villes (8 × 390/430/768/1280), 17 choix par clic réel parmi les libellés API source (8 avec centre, 8 sans centre, un 17e Casablanca), zéro carte fictive, zéro erreur JS ni dépassement horizontal. Pour les quartiers `center=null` dans V5, ne jamais remplacer l'absence de repère par une caméra positionnée avec une ancienne estimation.
- **Preuve :** `scripts/audits/vivre-ici-l4b-multicity-ui.mjs` inclus dans N2 existant (pas de workflow lourd ajouté) ; artefact contenant `l4b/report.json` et captures BEFORE/AFTER aux mêmes viewports. N2 Casablanca préexistant et smoke spécifique Mohammedia de la PR parente #1186 doivent rester verts, ainsi que N3.

## BEFORE : état exact prouvé

- **Branche testée avant changement** `test/vivre-ici-l4b-multicity-ui-20261107`, SHA `0b5af3175396802b8f8980793bdc5dea2a37a181`. [N2 BEFORE #42405523697](https://github.com/hraaaaf/Akarfinder/actions/runs/42405523697) **FAIL**, artefact #13587815476, `l4b/report.json` : `ok=false`, 32 cas, **23 cas réussis / 9 échoués**, 12 sélections au lieu de 17, 77 PNG recueillis. Captures mobile 390 et desktop 1280 regroupées, montrées dans la conversation.
- **Échec vérifié 1 : Rabat** 4/4 viewports. `NationalMapRouter` prenait la route du provider `rabat-market-intelligence` pour Explore au lieu du parcours national sourcé ; `[data-akarfinder-national-map][data-akarfinder-national-view=city]` absent.
- **Échec vérifié 2 : Mohammedia** 4/4 viewports. L'API résout correctement `mohammedia`→V5 `mohammadia`, mais le pont client rejetait la réponse ; **ce correctif est déjà validé dans PR parente [#1186](https://github.com/hraaaaf/Akarfinder/pull/1186)**, SHA code `a6ead3d46d3656e03bbb730f4ad709c80e8716e3`, [N2 #42399951940](https://github.com/hraaaaf/Akarfinder/actions/runs/42399951940) GREEN et [N3 #42399951842](https://github.com/hraaaaf/Akarfinder/actions/runs/42399951842) GREEN. Son rapport L4-B1 vérifie 214 quartiers, 5 centres, 4/4 screenshots/overlay et la sélection source `Lotissement Monica`. **Ne pas réimplémenter ce patch ailleurs.**
- **Échec vérifié 3 : Kénitra/Centre-ville** 1280 px. V5 dit `center=null`, mais `getNeighborhoodBySlug` trouvait une fiche historique `lib/map/neighborhood-data.ts` avec coordonnées codées en dur `34.261,-6.5802` et déclenchait MapLibre en revendiquant une caméra quartier. Ce centre n'est **pas** certifié par V5 ; la couche sourcée doit prendre priorité pour le rendu territorial.

## Référence / implémentation candidate

- **Référence UI :** parcours Casablanca déjà capturé dans L4-A N2, même champ recherche quartier et volet de sélection, sans polygoniser les libellés postaux.
- **Rabat :** utiliser le parcours national sourcé pour `layer=explore`; préserver le provider marché spécifique sur les couches hors Explore.
- **Source gate :** `NationalMapRouter` doit vérifier auprès de l'API V5 que le quartier sélectionné dispose d'un centre OSM valide avant de monter `MapLibreNeighborhood3D`. Si `center=null`, conserver le contexte ville, le label sélectionné et le message « repère indisponible ». Si la source ne répond pas, rester fail-closed.
- **Mohammedia :** réutiliser le patch #1186, sans changer le registre V5, sans créer de polygones/POI/annonces.

## Limites et gates

- **L4-A** est certifié sur 8/8 inventaires API : 4914 quartiers, 347 centres, 4567 sans centre, 0 frontière de quartier certifiée. Les 17 choix de L4-B sont **des interactions UI**, pas une validation exhaustive de ces 4914 labels, ni d'une offre immobilière réelle.
- Les POI et leurs dates, contours de quartiers, inventaire SQL réel, prix, licences fournisseurs (Esri/OpenMapTiles/OSM), et note visuelle finale ≥9,5/10 restent hors certification L4-B.
- Les PR restent en Draft, non fusionnées ; aucune mutation de DB ni déploiement Vercel.

## Next exact

Sur la PR enfant L4-B : lancer N2/N3 après le correctif candidat ; lire `l4b/report.json`, récupérer et montrer les 32 captures AFTER aux mêmes 4 formats et les captures de sélections ; corriger toute régression ; documenter le résultat et mettre à jour la roadmap/Notion. **GREEN seulement après preuve, sinon conserver ROUGE.**
