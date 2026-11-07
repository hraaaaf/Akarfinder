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
