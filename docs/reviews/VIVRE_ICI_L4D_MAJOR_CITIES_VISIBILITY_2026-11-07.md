# Vivre Ici — L4-D : carte nationale épurée, grandes villes uniquement

**07/11/2026 — candidat en CI, non certifié.** Branch `feat/vivre-ici-l4d-national-major-cities-20261107` sur L4-C PR #1190. Pas de merge / DB / Vercel.

## GOAL / SUCCESS / PROOF

- **Goal :** sur la carte nationale, ne plus montrer 341 villes en même temps. Visibilité hiérarchisée : **huit grands pôles immobiliers** à l'échelle du Maroc, villes secondaires uniquement au zoom local, et accès conservé aux **341 entrées source V5** via recherche/sélection. Ne pas retirer la couverture des autres villes.
- **Sélection explicite (présentation, non classement démographique) :** Casablanca, Rabat, Marrakech, Tanger, Fès, Agadir, Meknès, Oujda. Les huit **existent et ont un centre dans le V5 décompressé** ; les graphies `meknes` et `oujda` sont source-exactes. Kénitra/Mohammedia restent couvertes. Un utilisateur ayant explicitement choisi une ville secondaire peut toujours la mettre en valeur : elle prend la huitième place du panneau de comparaison, au lieu de devenir invisible.
- **Succès :** couche MapLibre nationale `akarfinder-national-city-labels`, clics `city-hits`, remplissages et limites à l'échelle nationale sont filtrés sur **huit villes**. Les couches secondaires ne deviennent visibles/interactives qu'à `zoom >= 8.25` (réglage UX, pas une assertion géographique). **Source V5 conservée intégralement** pour recherche, zoom et navigation, aucun nouveau repère.
- **Preuve cible :** audit `scripts/audits/vivre-ici-l4d-major-cities.mjs` dans N2, 390/430/768/1280 : réponse V5, huit villes + Kénitra/Mohammedia existantes, filtres de couches présents, 341 V5 source conservés, secondaire `minzoom=8.25`, absence d'overflow/JS, quatre captures carte nationale + quatre après zoom local. N2 existant L4-A/B/C et N3 conservés.

## BEFORE → maquette/référence → implémentation → AFTER

- **BEFORE observé** : L4-C [N2 #42411974435](https://github.com/hraaaaf/Akarfinder/actions/runs/42411974435) GREEN au SHA `9544ff35`, mais son `NationalTerritoryExperience` construisait les **341 villes V5 dans un même GeoJSON point source sans aucun filtre de labellisation national** ; `CITY_LABELS`, `CITY_HITS` et limites rendaient les entités indiscriminément à faible zoom. Les captures L4-C nationales/de ville à 390/430/768/1280 sont la référence visuelle à confronter.
- **Référence UX** : vue Maroc épurée, huit grands pôles sourcés lisibles, même fond cartographique, sans faire croire à des frontières de quartier. Au zoom local seulement, d'autres villes sourcées peuvent apparaître. La sélection d'une ville garde le halo/bordure/badge L4-C au milieu des autres grandes villes.
- **Implémentation candidate** : deux ensembles de couches MapLibre partagent **les mêmes sources V5** (même carte/canvas) ; `CITY_LABELS/CITY_HITS/BOUNDARY_FILL/BOUNDARY_LINE` filtrés sur les huit grands pôles ; couches secondaires équivalentes à partir du zoom 8.25. Le titre du panneau reflète les « 8 grandes villes ». Si une ville secondaire est sélectionnée explicitement, son bouton remplace temporairement la dernière option principale et reste `aria-pressed`. Les limites ville sont issues des sources V5 ; aucun polygone quartier créé.
- **AFTER** : **EN ATTENTE** d'un run N2/N3 vert sur le code exact, extraction et inspection de 8 captures, comparaison BEFORE aux mêmes viewports, score visuel borné.

## Précautions

- **Ne pas confondre** « grandes villes » (choix éditorial/immobilier) avec un classement exact par population. La couverture de Rabat inclut des communes proches ; ne pas remplacer l'affichage national par un top 8 strict démographique.
- Le fond vectoriel tiers peut encore contenir ses **propres** toponymes à certains zooms ; l'audit certifie les **couches AkarFinder**, pas la disparition absolue de toute étiquette dans la tuile source. Toute suppression des crédits fournisseur est interdite.
- L3 POI/limites quartier ; L5 données réelles/prix SQL ; L6 droits fournisseurs, attribution et a11y/qualité visuelle globale restent hors du lot.
- Aucune fusion ni déploiement Vercel avant approbation explicite.

**Next exact :** CI N2 et N3 -> vérifier rapport L4-D, 8 captures et ancien L4-C, corriger si rouge, score mobile/desktop, closeout canonique/Notion. Le projet complet n'est pas certifié.


## Incident N2 — vrai décalage entre route nationale et carte MapLibre (07/11/2026)

- **Avant fix :** [N2 #42421864061](https://github.com/hraaaaf/Akarfinder/actions/runs/42421864061) **FAIL**, [N3 #42421864100](https://github.com/hraaaaf/Akarfinder/actions/runs/42421864100) **SUCCESS**, SHA `621655d42b029a1a5cac8abd63efc8f24e9099db`. Artefact [#13593583931](https://github.com/hraaaaf/Akarfinder/actions/runs/42421864061/artifacts/13593583931) inspecté : `report.json`, `l4b/report.json`, `l4b-eightcity/report.json`, `l4c-focus/report.json` **tous ok=true** ; L4-B 32/32 & 17/17, L4-C 4/4 et source 341 villes. `l4d-major/report.json` **ok=false 4/4**, timeout d'ouverture de l'attribut `data-akarfinder-national-view=morocco` sur `/map?layer=explore`, aucune erreur JavaScript. Quatre screenshots d'échec capturés au même 390/430/768/1280, montrant **l'ancienne carte SVG des régions**, sans MapLibre.
- **Cause prouvée dans `app/map/page.tsx` :** `usePremiumNationalExplore = !city && !district && layer === "explore"` remplaçait la carte progressive par `PremiumInteractiveMapBridge` sur le trajet public national. **Les nouveaux contrôles zoom/visibilité MapLibre n'étaient pas accessibles à l'utilisateur depuis `/map?layer=explore` sans sélection de ville.** Modifier uniquement le script aurait falsifié le résultat.
- **Fix produit [`f60fe9a2`](https://github.com/hraaaaf/Akarfinder/commit/f60fe9a2003481612d0f8fddf5d5051fe807ca06)** : l'entrée publique nationale Explore `/map?layer=explore` utilise désormais réellement `NationalMapRouter`/MapLibre sourcé V5, le même trajet progressif que les vues villes. L'ancien atlas SVG reste accessible **explicitement** via `/map?layer=premium` pour comparaison/retour possible, mais n'est plus la valeur par défaut. **C'est un changement UI significatif** à comparer aux captures avant sur quatre viewports ; N2 et N3 doivent rester verts sans faux centres.
- **Statut au changement : candidat, PAS certifié.** [N2 #42422631595](https://github.com/hraaaaf/Akarfinder/actions/runs/42422631595) revalidation automatique du commit ; N3 se déclenche aussi automatiquement au push GitHub, **pas besoin de le relancer manuellement**. Preuve AFTER attendue : rapport L4-D ok=true (4 tailles, paliers et étiquettes), 16 captures avec mise en correspondance des vues avant, N2 L4-B/C verts, puis score visuel local. Conserver PR Draft, aucun merge ni déploiement Vercel.

**Risque UX distinct à regarder** : la carte nationale source V5 MapLibre remplace la présentation SVG « 12 régions » sur la route Explore ; préserver les fonctions de navigation utiles de l'ancien parcours ou fournir un accès explicite, ne pas prétendre à l'équivalence UX sans comparer les captures et interactions.


## 07/11/2026 — Correction ciblée N2 + N3 après raccord public national

- **Code contrôlé `035dfc8795812d0fe98236779d7aee1e2c37def8` :** [N2 #42422730957](https://github.com/hraaaaf/Akarfinder/actions/runs/42422730957) **FAIL** et [N3 #42422730826](https://github.com/hraaaaf/Akarfinder/actions/runs/42422730826) **FAIL**. Le lancement N3 est AUTOMATIQUE sur push GitHub ; aucun déclenchement manuel demandé.
- **N2 artefact #13594104229 inspecté :** quatre autres JSON **verts** (`report.json` legacy 4/4, `l4b/report.json` 4/4, `l4b-eightcity/report.json` 32/32 + 17/17, `l4c-focus/report.json` 4/4). `l4d-major/report.json` échoue sur 390/430/768/1280 au contrôle de la couche fond : `unfiltered basemap town label akarfinder-national-city-labels: undefined`. **Cause : audit** prenait une couche **Akarfinder** (`akarfinder-national-city-labels`) pour une étiquette **tiers** car son regex contenait `city` sans exclure les IDs `akarfinder-`. Correction : exclure explicitement les couches internes avant contrôle du fond ; les assertions sur nos filtres 8 villes restent indépendantes et strictes.
- **N3 log vérifié :** `locator.click: Timeout 10000ms exceeded` sur `[data-akarfinder-city-preview="casablanca"] button Explorer Casablanca`, un bouton d'aperçu survol qui se **détache pendant la navigation**. Cause produit : carte desktop gardait son aperçu uniquement tant que le pointeur restait au-dessus du repère ; en traversant la carte pour cliquer le volet, `mousemove` pouvait démonter celui-ci. Fix UX : épingler l'aperçu sur survol desktop jusqu'au prochain choix/fermeture explicite, ajouter bouton `Fermer l’aperçu de la ville` accessible au clavier. Préserver **premier tap mobile = aperçu**, puis bouton d'entrée.
- **Correction N3 sans faux vert :** l'audit teste distinctement le contrat desktop (clic sur ville → navigation directe) et mobile coarse pointer (premier tap → aperçu persistant, puis `Explorer` → navigation) ; il ne lance plus une course mal synchronisée entre un état hover transitoire et un changement de route. L'entrée ville et le quartier Maârif restent vérifiés dans la suite du parcours.
- **Prochaine preuve indispensable :** CI N2 doit inspecter les cinq rapports et **16 screenshots** aux 390/430/768/1280 ; N3, déclenché automatiquement par push, doit revenir vert sur le **même SHA**. Si un nouveau défaut apparaît, corriger plutôt que diminuer les assertions.
- **État : candidats non certifiés** jusqu'aux nouveaux rapports ; aucune modification du registre V5, aucune DB, aucun merge, aucun déploiement Vercel.

## CLOSEOUT TECHNIQUE L4-D — N2/N3 GREEN confirmé

**Code réellement testé** : `59c263953081886c62db83c4b9bf0f7fa033b074`. Sur ce **même SHA**, [N2 #42423728463](https://github.com/hraaaaf/Akarfinder/actions/runs/42423728463) **SUCCESS** et [N3 #42423728405](https://github.com/hraaaaf/Akarfinder/actions/runs/42423728405) **SUCCESS**. Aucun rerun manuel N3 : les deux workflows sont démarrés automatiquement après le push groupé.

### SUCCESS / PROOF — artefact N2 inspecté

[Artefact N2 #13594501766](https://github.com/hraaaaf/Akarfinder/actions/runs/42423728463/artifacts/13594501766), archive téléchargée, **134 fichiers**, **129 PNG**, **cinq rapports JSON**, tous avec `ok=true` et `failure=null`.

| Contrôle | Preuve dans l'artefact |
| --- | --- |
| Ancien N2 Casablanca | `report.json` 4/4 viewports (390, 430, 768, 1280) ; pas de faux points à zoom ville ; points source au zoom 9.8 ; sélection Maârif et fallback postal sans centre |
| L4-B1 Mohammedia | `l4b/report.json` 4/4 |
| L4-B huit villes | `l4b-eightcity/report.json` **32/32** et **17/17** sélections API V5 réelles |
| L4-C focus | `l4c-focus/report.json` **4/4**, Mohammedia→Casablanca, une seule carte et 341 sources conservées |
| **L4-D zoom progressif** | `l4d-major/report.json` **4/4 PASS**, une seule canvas, **341 villes source**, **8 villes majeures présentées au niveau national** ; couche secondaire `minzoom=8.25`, quartier `minzoom=9.5`, stade quartier testé à zoom 9.8, stade rue testé à zoom 12.2 ; **overflow=0** pour chaque format |
| Basemap | couches tiers `label_village`, `label_town`, `label_city`, `label_city_capital` contrôlées (pas de suppression d'attribution de source) |
| N3 parcours utilisateur | [N3 #42423728405](https://github.com/hraaaaf/Akarfinder/actions/runs/42423728405) succès : navigation Maroc→Casablanca→Maârif→Search aux formats 390 et 1280 |

Les **16 captures L4-D réelles** ont été extraites et examinées : `l4d-major/{national-major,regional-secondary,city-neighborhood,city-street}-{390,430,768,1280}.png`. Montages 4 paliers x 4 formats créés et affichés au client. Un premier rendu BEFORE de l'ancienne route nationale SVG est conservé dans l'archive [N2 #42421864061](https://github.com/hraaaaf/Akarfinder/actions/runs/42421864061), avant raccord de la carte MapLibre à la route `/map?layer=explore`. Les 4 captures de l'échec antérieur ont également été montrées au client.

### Lecture visuelle et limites du score

**L4-D : GREEN technique, pas certification visuelle finale.** Évaluation **indicative ~7/10** d'après les captures : la vue nationale à 8 pôles est moins encombrée, et les étapes de zoom sont distinctes, mais l'image `regional-secondary` peut être **quasi vide** car le test réalise un `jumpTo({zoom:8.6})` en gardant le centre national ; il démontre l'existence et l'éligibilité des couches, **pas** qu'une ville secondaire apparaît lisiblement dans le viewport. En vue Mohammedia, les contours municipaux source OSM deviennent visuellement dominants au niveau rue ; ne jamais les appeler limites de quartiers. Les micro-étiquettes et la densité des cartes mobiles restent à améliorer. **Score global 9.5/10 non atteint ni prouvé.**

### Décisions et suite

- L4-D **validé techniquement** pour « contrôler ce qui apparaît et comment selon le niveau de zoom » sur la source V5 ; **révision de la lisibilité et du recentrage régional** à ouvrir dans le lot visuel L6, avec test réellement visible de villes secondaires dans un viewport approprié (pas seulement test de filtre).
- Toujours ouverts : L3 frontières réelles des quartiers / fraîcheur POI ; L5 SQL annonces et prix live ; L6 droit d'utilisation des tuiles/fournisseurs, attribution, accessibilité clavier/touch et score visuel final.
- **PR [#1191](https://github.com/hraaaaf/Akarfinder/pull/1191) Draft, non fusionnée. Aucun déploiement Vercel, aucune DB modifiée.**
- **Next exact** : documenter le closeout dans la roadmap et Notion, puis attaquer l'audit/itération L6 du cadrage régional à 390/430/768/1280 et le gate légal/fournisseurs. Le SHA docs-only de clôture peut être postérieur au SHA code testé ; ne pas faire passer cette documentation pour une nouvelle certification du code.
