# J10 — Secteur central Maârif : audit des sources SIG (09/11/2026)

## Goal / succès / preuve
- **Goal** : obtenir un contour géoréférencé **du secteur central Maârif**, non celui de l'arrondissement, utilisable après provenance et validation SIG.
- **Succès observable** : une source compétente avec polygone vectoriel, projection explicite, version/datation, identité du périmètre, droits de réutilisation et comparaison axes/aire/topologie ; test de non-confusion secteur ~103 ha / arrondissement ~1 240 ha.
- **État 09/11/2026 : NO-GO**. Aucune de ces recherches ne fournit aujourd'hui un polygone central **validé et exploitable**. La référence runtime `MAARIF_HISTORICAL_CENTRAL_SECTOR_REFERENCE.geometry=null` reste correcte et le shadow arrondissement est OFF en production.

## Sources inspectées et portée
| Source | Preuve vérifiée | Limitation / décision |
|---|---|---|
| [AUC — décret et e-documents 2026](https://www.auc.ma/e-services-2/e-documents/) | P.A Maârif homologué décret **2.26.658**, 16/09/2026, BO **7548**, 01/10/2026 | Plan d'urbanisme **de l'arrondissement** ; le décret n'est pas la géométrie vectorielle du secteur central |
| [AUC — fiche P.A Maârif](https://www.auc.ma/e-services-2/e-documents/?IdP=1085) | HTML officiel effectivement récupéré (200), visualiseur iframe `carto.auc.ma/portal/apps/webappviewer/index.html?id=21066cfa763441809c74efe4f136f8b7`, liens vers `PL-ENS.pdf` et `RAPPORT-JUSTIFICATIF-MAARIF-1.pdf` | L'iframe porte le titre technique **« CARTE PA HAY HASSANI »**, potentiellement générique. Les liens PDF sont archivés dans `/wp-content/uploads/2020/05/`. **Ne pas déduire la date, la carte ni le périmètre de ces chaînes**. Le portail ArcGIS n'a pas fourni de couche vérifiable lors de l'essai. |
| [AUC — rapport secteur Maârif historique](https://auc.ma/wp-content/uploads/2020/05/RAPPORT-JUSTIFICATIF-MAARIF.pdf) | « Le secteur Maarif » ~**103 ha**, axes N Abdelkrim Khattabi/Anfa, S Brahim Roudani, E Zerktouni, O Lybie/Bir Anzarane (page imprimée 10) | **Description historique**, sans géométrie validée en 2026. |
| [AUC — plan secteur Maârif 2014](https://auc.ma/wp-content/uploads/2020/05/Pa-MAARIF-006-5000-0.pdf) | Plan d'ensemble **19/2014**, échelle **1/5 000**, décret **2-14-380** | Ancien plan **2014**, pas limite actuelle homologuée 2026 |
| [CasablancaCity — Casa Maps](https://maarif.casablancacity.ma/fr/casa-maps) / [CasaSIG arrondissement](https://www.casasig.ma/arcgis/rest/services/ReseauRoutier/Arrondissements/MapServer/info/iteminfo) | Carte municipale et couche des **16 arrondissements** | Niveau administratif = arrondissement, pas le secteur central |
| [Médias24 carte des secteurs (09/2025)](https://medias24.com/2025/09/14/urbanisme-voici-ce-quil-faut-savoir-sur-le-nouveau-plan-damenagement-du-maarif/) | Illustration raster du découpage Maârif / Extension / Palmier / etc. | Projet **avant** homologation 2026, image **non géoréférencée** et hors autorité SIG ; **référence visuelle seulement**, pas fichier à publier |

**Preuve interne QA** : `C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261109\sig-review\AUC_EDOC_PA_MAARIF_2026_index.html`. Rendu ancien PDF 103 ha : `AUC_MAARIF_SECTEUR_PAGE10_103HA.png` (ancienne source), déjà inspecté. Aucun GeoJSON nouveau créé.

## Chemin restant (sans bricoler)
1. Obtenir via l'AUC ou un service municipal compétent le **fichier SIG du secteur central Maârif**, en précisant si celui-ci est un secteur réglementaire, quartier usuel ou unité administrative.
2. Exiger : date/version 2026, source officielle, méthode, système de coordonnées EPSG, métadonnées/ligne de provenance, statut de réutilisation et identifiant stable du périmètre.
3. Comparer géométrie, axes et superficie approximative ; analyser intersections avec les 24 POI sans affirmer « dans Maârif » avant clôture.
4. Si seule une image urbanistique est disponible : une **preview QA explicitement indicative** peut être étudiée mais **jamais** étiquetée « limite officielle du quartier ».
5. Avant changement UI : BEFORE → objectif → référence → implémentation → AFTER 390/430/768/1280 → tests → score. Aucune opération Vercel sans accord explicite.

## Découverte et validation complémentaire — plan AUC 01/2026 (09/11/2026)

Le PDF officiel `https://www.auc.ma/wp-content/uploads/2020/05/PL-ENS.pdf`, **effectivement ouvert** après téléchargement depuis la fiche AUC, est le plan d'ensemble **ARRONDISSEMENT DE MAARIF** (et non Hay Hassani). Il porte dans son propre cartouche :
- **PLAN N° AUC 01/2026**, établi **juillet 2026**, échelle **1/5000** ;
- décret approuvé **2.26.658** le 16/09/2026 et BO **7548** du 01/10/2026 ;
- signature et cachet de la direction de l'AUC.
- PDF **une page non réparée**, métadonnées de création **2026-10-09T14:49:42Z**, 59 646 409 octets, SHA256 **`07c4345f48ebc8943a5a256b1264190556f7b9d2cacf544fc1ab0bd718be3daa`** ; image raster intégrée (environ **7234×9083 pixels**), le texte de carte n'est pas un GeoJSON. Ces métadonnées et cartouche ont été vérifiés sur la source locale QA.
- La légende distingue **« périmètre de l'arrondissement »** et **« limite secteur réglementaire »**. Un *secteur réglementaire* désigne une unité de zonage d'urbanisme, **pas automatiquement** le *secteur central Maârif* de 103 ha décrit en 2014.
- Les graduations de coordonnées sont visibles sur le cadre cartographique ; le **CRS exact, la géoréférence et la topologie du secteur 103 ha ne sont pas encore validés**. Ne pas déduire une limite centrale du contour externe 1 240 ha.
- Captures QA inspectées et montrées à l'utilisateur : `C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261109\sig-review\AUC_2026_PA_TITLE_DETAIL.png`, `AUC_2026_PA_LEGEND_DETAIL.png`, `AUC_2026_PA_NORTH_MAP_DETAIL.png`. PDF local **non commité**.

**Rectification de la réserve sur les chemins** : le stockage sous `/wp-content/uploads/2020/05/` ne permettait pas à lui seul de dater le PDF ; **le contenu de la planche `PL-ENS.pdf` est désormais authentifié pour 2026** par son cartouche. La version du rapport distinct `RAPPORT-JUSTIFICATIF-MAARIF-1.pdf` demeure non vérifiée, et le titre HTML `CARTE PA HAY HASSANI` demeure une anomalie de libellé du viewer, non une preuve que le fichier PDF de Maârif est erroné.

**Next exact J10 :** comparer géométriquement le plan AUC 01/2026 aux axes officiels du secteur historique de 103 ha avec un géoréférencement CRS validé ; requérir séparément une frontière officielle actuelle du secteur ou du quartier pour certifier. Aucun vecteur de quartier central ni surface intérieure inventés.

**Contrôle de projection exploratoire QA, sans certification du CRS** : le repère de contexte Maârif `(lon=-7.644, lat=33.5898)` donne par `pyproj` **(E=291639, N=334660)** en `EPSG:26191` (Merchich / Nord Maroc), cohérent avec les graduations visibles autour de E=290000–292000 et N≈334000. Le candidat `EPSG:26192` conduit à N≈733769, non cohérent avec ce cadre. Cela justifie **d'étudier EPSG:26191**, mais ne vaut **pas une déclaration officielle du système de coordonnées**, faute de source WKT/CRS jointe et de recalage mesuré sur des intersections de grille. Aucun affine transform ni polygone de quartier n'est publié.

Source structurée ajoutée : `lib/map/maarif-auc-2026-plan-reference.ts`, **métadonnées uniquement** avec `publicationSourceGeometry:null`, `centralSectorBoundaryCertified:false`, `projectedCoordinateReferenceVerified:false` et SHA256 vérifié, pour éviter qu'un composant futur prenne la planche de l'arrondissement pour une couche GeoJSON du secteur central.

### J10 — Centre d'échantillonnage ≠ point de quartier (09/11/2026)

- L'échantillon OSM PBF du premier lot est circonscrit à **1,8 km du point QA arbitraire (33.5898, -7.644)**.
- L'objet OSM [`place=quarter` Maârif, `node/2186618782`](https://www.openstreetmap.org/node/2186618782) est localisé près de **(33.58363, -7.6367)**. C'est un point de nom de quartier **saisi dans OSM**, ni un centroïde officiel ni un contour.
- Différence calculée géodésiquement entre les deux références : **963,3 m**. Sur les seuls **415 candidats** de l'échantillon initial, **76** se retrouvent à plus de **1,8 km du point de quartier OSM**, **339** à 1,8 km au plus ; **197** à 1 km au plus. **Ce n'est PAS une estimation exhaustive** des POI d'un nouvel échantillon ou d'une frontière du secteur : le premier cercle exclut des points qui seraient dans le cercle alternatif.
- Métadonnées `lib/map/maarif-qa-reference-centers.ts` : point QA et point OSM distincts, `centralSectorPolygon:null`, `mapPublishingAllowed:false`, aucune certification administrative. Source QA privée `...\poi-pbf\qualification\maarif-qa-reference-vs-osm-quarter-point-private.json`.
- Le [site officiel municipal, histoire du Maârif](https://maarif.casablancacity.ma/fr/article/1143/le-maarif-dun-faubourg-europeen-a-un-pole-central) indique que l'appellation « quartier Maârif » est aujourd'hui employée pour **un espace plus étendu** que le noyau historique. Cela renforce la distinction nécessaire entre **secteur historique AUC 103 ha**, **quartier vécu/usuel sans polygone confirmé**, **arrondissement administratif 1 240 ha**.
- **Conséquence produit :** ni le cercle initial, ni le point OSM, ni le polygone arrondissement ne doivent déterminer le libellé « dans Maârif » ou l'appartenance centrale. Il faut obtenir une définition explicite et une géométrie réellement sourcée du périmètre exposé.
- Audit reproductible des **six axes de voirie historiques** : `scripts/neighborhood-context/maarif-historical-axis-osm-audit.py` compare des lignes de voirie du PBF, seulement en QA ; `fixtures/test_maarif_historical_axis_qa.py` contrôle le non-publication et les noms. Aucun polygone synthétique, aucune frontière reconnue.

### J10 — préqualification des six axes AUC avec OSM, sans polygone (09/11/2026)

- Analyse du PBF Maroc Geofabrik **épinglé MD5 `c2334c9499b4565a6a16cf2f45624912`**, en QA seulement. Le parseur initial trop lent à **34 millions de callbacks Python par nœud** a été remplacé par l'index de localisations **natif C++ Osmium `locations=True, idx=flex_mem`**. **2 754 090 ways parcourus, exit 0**. Smoke test XML synthétique puis scan national réussis.
- Résultat brut : 250 fragments potentiels de rues dans une bbox QA large. **22 noms trompeurs écartés**, notamment `Rue Abdeslam Khattabi`, `Rue Corniche d'Anfa`, `Rue Libya`, par un matcher de **boulevards historiques nommés**. Résultat strict : **228 segments de voirie** répartis sur les **6 axes** du texte AUC :
  - N : **Abdelkrim Khattabi 22**, **Anfa 42** ;
  - S : **Brahim Roudani 69** ;
  - E : **Mohamed Zerktouni 65** ;
  - O : **de Lybie 2** (couverture très faible), **Bir Anzarane 28**.
- Les tronçons sont des **axes OSM non homologués** ; nombre de ways ≠ continuité topologique ni frontière. La source **ne fournit aucun polygone central officiel**. Le lien `Boulevard de Lybie` n'a que deux fragments retenus, ce qui empêche de prétendre à une géométrie complète à ce stade.
- Scripts reproductibles `scripts/neighborhood-context/maarif-historical-axis-osm-audit.py`, test `fixtures/test_maarif_historical_axis_qa.py` sur noms faux/valides et sortie `derived_polygon:null`. Rapports privés `...\poi-pbf\qualification\maarif-historical-axes-road-lines-v2-private.json` et `maarif-historical-axes-summary-private.json` (v1 brute conservée pour provenance). **Aucune nouvelle capture UI ni frontière dérivée diffusée.**
- **Next J10** : demander ou trouver le contour vecteur officiel actuel du secteur central / bien définir le périmètre « quartier usuel ». Recaler les axes sur source primaire, CRS/versions vérifiés, puis test de cohérence et validation humaine avant toute preview de limite. **NO-GO contour.**

### 10/11/2026 — PBF historique : segmentation de voirie ≠ contour SIG

La comparaison QA des **six axes historiques** avec la totalité du PBF Geofabrik Maroc épinglé a été exécutée en lecture seule (Osmium `locations=True`, index natif). Les correspondances sont des **ways routiers OSM individuels**, coupés à la boîte de recherche QA ; nombre par motif :
- Abdelkrim Khattabi **25**, Anfa **60**, Brahim Roudani **69**, Mohamed Zerktouni **65**, de Lybie **3**, Bir Anzarane **28**.
- **250 associations nom/way**, sans garantie d'unicité inter-axes, continuité des rues, interprétation « côté de rue » ou topologie du secteur. Il est **interdit** de fermer ces lignes en polygone automatique et de les publier comme tracé central.
- Rapport complet privé `C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261109\poi-pbf\qualification\maarif-historical-axes-road-lines-private.json` : `derived_polygon:null`, `2026_central_sector_boundary_certified:false`, `publishable:false`. Fichier source `scripts/neighborhood-context/maarif-historical-axis-osm-audit.py`, test synthétique sans source externe `scripts/neighborhood-context/fixtures/test_maarif_historical_axis_qa.py`.
- Prochaine preuve nécessaire : couche vectorielle du **secteur central** avec autorité, version, EPSG, géométrie et réutilisation ; sans elle le shadow arrondissement et les rayons restent **non certificatifs**.
