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


## Checkpoint AFTER candidat (avant vérification finale)

- **Code soumis :** `c92edfe2adcc07a9e9c0a06dda169e4f0db37f89`. [N2 #42407340504](https://github.com/hraaaaf/Akarfinder/actions/runs/42407340504) **SUCCESS** et [N3 #42407340525](https://github.com/hraaaaf/Akarfinder/actions/runs/42407340525) **SUCCESS**. Artefact N2 #13587443998 téléchargé et captures contrôlées : **32 images city-before + 32 city-ready + 17 selected + 8 smoke Mohammedia + 12 N2 Casablanca = 101 PNG**. MapLibre source V5 évite le centre Kénitra hérité ; Rabat voit désormais une carte nationale sourcée et l'overlay quartier.
- **Défaut d'artefact découvert :** le script 8 villes et le smoke Mohammedia utilisaient tous deux `l4b/report.json` ; le smoke final écrasait le rapport 32/17 bien que la CI ait exécuté et réussi les deux audits. Aucune certification d'un rapport 8-city non conservé ne sera inventée.
- **Correctif candidat en staging :** le rapport huit villes est séparé sous `l4b-eightcity/report.json`, le smoke parent conserve `l4b/report.json`. L'alias d'affichage public `Mohammedia` est désormais distinct de la clé source V5 `mohammadia`, et les CTA Search sont testés sur `city=Mohammedia`. Aucun changement des blobs V5 ni invention de point.
- **Next :** exécuter une dernière N2/N3 sur le HEAD contenant ces corrections ; vérifier la présence de **trois rapports** (`report.json`, `l4b/report.json`, `l4b-eightcity/report.json`), les 32/17 entrées et les captures. Alors seulement déclarer la certification technique L4-B. L6 reste indépendant.


## Closeout L4-B — 07/11/2026 : GREEN technique, UI/montages de preuve

**Code exact testé :** `5e2e826eb4609df9cac08eb52a94ea23eac8d872`, [N2 #42408104639](https://github.com/hraaaaf/Akarfinder/actions/runs/42408104639) **SUCCESS**, [N3 #42408104568](https://github.com/hraaaaf/Akarfinder/actions/runs/42408104568) **SUCCESS**. Artefact N2 **#13588442456**, inspecté par extraction réelle du ZIP : **104 fichiers dont 101 PNG** et **3 rapports JSON** distincts.

- `report.json` N2 historique : `ok=true` ; scénario Casablanca conservé.
- `l4b/report.json` Mohammedia : `ok=true`, `failure=null`, quatre viewports, overlay/sélection sourcés, `overflow=0`, `pageErrors=[]`.
- `l4b-eightcity/report.json` : `ok=true`, `failure=null`, **32/32 cas `state=passed`** (8 villes × 390/430/768/1280), **17 sélections de quartiers issus de l'API V5**, **8 sources ville**, `overflow=0`. Les 17 clics ne prétendent pas valider la totalité des 4914 quartiers ; les positions non sourcées restent non cartographiées. Les tuiles cartographiques et limites de ville sont distinctes de tout contour de quartier certifié (**0**).
- Les comparaisons BEFORE et AFTER sont effectuées sur les mêmes viewports. Le baseline sur `0b5af317` était 23/32 cas et 12/17 choix ; l'artefact final au SHA testé atteint 32/32 et 17/17. Aucun changement de données V5, ni prix, ni annonce.
- La PR [#1187](https://github.com/hraaaaf/Akarfinder/pull/1187) est **Draft**, empilée sur la PR [#1186](https://github.com/hraaaaf/Akarfinder/pull/1186), pas de merge ni de Vercel. Le SHA de ce document peut être postérieur au SHA de code testé.

### Direction visuelle validée par l'utilisateur (montage de preuves uniquement)

**Décision approuvée :** conserver les **huit villes dans une même grille 2 × 4, toutes à taille identique** ; encadrer seulement la **ville cible Mohammedia** avec une **bordure bleue, un halo léger et un badge « VILLE CIBLE »**. Ne pas agrandir la ville cible ni effacer les autres.

Les quatre montages reposent sur les **PNG réels** du run N2 #42408104639 et ajoutent uniquement des éléments de présentation sur la carte Mohammedia, sans altérer les cartes ou résultats : `VivreIci_L4B_8villes_FOCUS_Mohammedia_CI-5e2e826e_{390,430,768,1280}px.png`. Ils sont enregistrés dans la conversation ; **ils ne prouvent pas qu'une grille de huit cartes a été implémentée dans l'application**. Une telle évolution de l'UI devra suivre BEFORE → maquette → implémentation → AFTER mêmes viewports → tests et score, sans déploiement Vercel non autorisé.

**Limites produit / next :** L3 contours et POI frais manquants, L5 inventaire/prix SQL réels indisponibles, L6 licences Esri/OpenMapTiles/OSM, a11y et score global ≥9,5/10 non certifiés. L4-B seul = GREEN technique, pas « produit complet ».
