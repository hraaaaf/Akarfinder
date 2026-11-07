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
