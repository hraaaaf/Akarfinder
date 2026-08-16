# Carte intelligence marché — statut canonique

Date : 2026-08-16

Référentiel cible : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.
Contrat métriques : `docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md`.
Closeout C1 : `docs/MARKET_ZONES_C1_CLOSEOUT.md`.
Closeout C2 : `docs/CARTE_C2_CLOSEOUT.md`.
Closeout C3 : `docs/CARTE_C3_CLOSEOUT.md`.

## Progression stricte

Lots CLOSED / 8 : **4 / 8 = 50 %**.

- C0 — Référentiel + audit de récupération : ✅ CLOSED
- C1 — Géométrie quartier certifiée : ✅ CLOSED
- C2 — Dataset métriques quartier v2 : ✅ CLOSED
- C3 — API publique fail-closed + échelles : ✅ CLOSED
- C4 — Heat map interactive conforme au mockup : 🟠 CURRENT
- C5 — Fiche quartier riche : ⏭️
- C6 — Fondation « nos annonces » : ⏭️
- C7 — Certification 10/10 + closeout : ⏭️

## C0 — référentiel verrouillé

- source produit validée : 1448×1086 ; SHA-256 `4b6912480c5ce7dce6b04c5d0f8848b0be319955d220db84d8365a76ca66eac7` ;
- aperçu repo : `docs/assets/carte-intelligence-marche-reference.webp` ;
- PR #673 mergée ;
- gate cible `31903971043` : SUCCESS ;
- le résultat final doit reproduire structure, hiérarchie, modes, interactions, palettes et états du mockup sans hardcoder ses chiffres illustratifs.

## C1 — Market Zones Rabat certifiées

Décision produit : utiliser des **AkarFinder market zones** explicitement non administratives lorsque les limites officielles de quartier ne sont pas automatiquement exploitables.

Pilote Rabat :
- Agdal ≈ 7,51 km² ;
- Hay Riad ≈ 14,87 km² ;
- Souissi ≈ 56,49 km² ;
- Centre Rabat / Hassan ≈ 8,25 km².

Sources de conteneurs OSM :
- Agdal-Riyad relation `2799211` ;
- Souissi `2799203` ;
- Hassan `4743369`.

Contrôles :
- 0 m² d'overlap incohérent entre les quatre zones ;
- Agdal + Hay Riad partitionnent Agdal-Riyad à l'erreur numérique près ;
- Souissi et Centre restent confinés à leurs conteneurs sources ;
- `area_km2` calculée depuis Polygon/MultiPolygon ;
- API GeoJSON C1 fail-closed ;
- aucune market zone présentée comme frontière administrative officielle.

Preuves principales : PR #686 géométrie Shadow ; PR #689 API fail-closed, merge `165907bc2af02342e07a4ed57d1bce2a00062f94`.

## C2 — métriques réelles certifiées

Contrat :
- Prix = médiane observée DH/m², séparée par transaction ;
- Annonces = volume observé ;
- Densité = volume observé / `area_km2` certifiée ;
- absence de prix = `NULL`, jamais `0` ;
- fiabilité statistique distincte de la représentativité marché.

Snapshot pilote Rabat vérifié :
- 32 listings current-resolved ;
- 4/4 zones avec volume et densité calculables ;
- couverture prix faible et explicitement `insufficient` lorsqu'elle ne satisfait pas la policy de fiabilité ;
- aucun chiffre manquant n'est maquillé en valeur marché.

Preuves principales : PR #690, #691, #693, #695 ; closeout C2 PR #697 mergée `ef611357bc29a5d2210183a089bf576337fd805f`.

## C3 — API intelligence marché certifiée

Endpoint canary read-only :
`/api/geo/rabat-market-intelligence?mode=<price|density|listings>&transaction=<sale|rent>`.

Contrats certifiés :
- géométrie `market_zone` Canary, `reviewed=true`, `officialBoundary=false` ;
- `price`, `density`, `listings` réels et transaction-scopés ;
- lecture live bornée depuis les tables de base avec résolution Geo latest-event-first ;
- déduplication par URL canonique ;
- Reliability Prix réutilise la policy P1C.2 versionnée ;
- Price `insufficient` = fill neutre ;
- échelle `snapshot_quantiles_v1` dérivée du snapshot ;
- légende et fills issus du même calcul ;
- invalid request, géométrie non publiable ou métriques indisponibles restent fail-closed ;
- aucun seuil illustratif du mockup n'est utilisé comme seuil runtime.

Preuves :
- PR #698 mergée `bd8ffc2b28e70c4d44adfa6ecca9b6269bc35450` ;
- exact head certifié `a980c829ff37239c9a39c1927682453dcdcc3e35` ;
- C3 gate `31920864146` : SUCCESS ;
- C1C GeoJSON compatibility gate `31920864126` : SUCCESS ;
- artefact live `9256321998` ; digest `sha256:fe5a1dcc2de3ab17022fc2933b9cccb39724c38a0f4c62559a31b560adb438c0` ;
- tests, TypeScript, preuve live et production build : SUCCESS.

Limite conservée : la couverture Prix Rabat reste faible. Le mode Prix doit donc afficher des zones neutres lorsque la policy les classe `insufficient`; volume et densité ne doivent pas être confondus avec une preuve de représentativité nationale.

## C4 — CURRENT

Objectif : remplacer l'expérience par repères/markers par la heat map polygonale conforme au référentiel cible, sans casser les parcours Carte déjà utiles.

Livrables requis :
- trois tabs réels `Prix / Densité / Annonces` ;
- consommation de l'API C3 ;
- fills polygonaux issus du payload API ;
- légende visible et contextuelle ;
- état neutre explicite pour données insuffisantes ;
- clic/tap polygonal → sélection stable de zone ;
- CTA Search filtré sur la zone sélectionnée ;
- conservation du comportement fail-closed et des autres parcours Carte ;
- validation mobile + desktop + interaction MapLibre réelle avant fermeture C4.
