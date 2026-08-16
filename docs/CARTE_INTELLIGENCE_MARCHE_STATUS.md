# Carte intelligence marché — statut canonique

Date : 2026-08-16

Référentiel cible : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.
Contrat métriques : `docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md`.
Closeout C1 : `docs/MARKET_ZONES_C1_CLOSEOUT.md`.
Closeout C2 : `docs/CARTE_C2_CLOSEOUT.md`.

## Progression stricte

Lots CLOSED / 8 : **3 / 8 = 37,5 %**.

- C0 — Référentiel + audit de récupération : ✅ CLOSED
- C1 — Géométrie quartier certifiée : ✅ CLOSED
- C2 — Dataset métriques quartier v2 : ✅ CLOSED
- C3 — API publique fail-closed + échelles : 🟠 CURRENT
- C4 — Heat map interactive conforme au mockup : ⏭️
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
- aucune zone Shadow présentée comme frontière administrative officielle.

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
- 2/32 avec prix/m² dans le snapshot C2B = 6,25 % ;
- 26/32 avec surface mais prix absent ;
- Price reste donc largement `insufficient` et devra être neutre lorsque la preuve manque.

Preuves :
- C2A PR #690 mergée `6e5bf85984392938ed0bd8c70474cd8a25c64956` ;
- C2B PR #691 mergée `501f6dbbce3904a0358df00f1938d2f66f0ce7ab`, run `31918145727` SUCCESS, artefact `9255534356` ;
- C2C PR #693 mergée `61ff4ce71ab86808eb9dffa173328d553eefa6b9`, run `31918552226` SUCCESS : 3 prix fiables supplémentaires prouvés en canary live Mubawab, aucun write automatique ;
- C2D PR #695 mergée `9c20c1b86055222880010a3cf6b6c6a06d266f8f`, run `31918737456` SUCCESS : 0/7 Mouldar offline ;
- C2E PR #696 fermée non mergée après drift, run `31918780371` SUCCESS : 0/19 Mubawab offline.

Les seuils exploratoires utilisés dans C2B/C2C ne sont pas des critères de fermeture produit. Le gate canonique C2 exige la vérité des métriques, le maintien des NULL et la reliability explicite, pas un nombre arbitraire de prix. C2 est donc CLOSED sans prétendre à une couverture prix représentative.

## C3 — CURRENT

Objectif : GeoJSON public read-only consommable par la Carte avec trois modes :
- `price` ;
- `density` ;
- `listings`.

Livrables requis :
- classification de couleurs déterministe ;
- zones Price insuffisantes = neutres ;
- légende issue exactement de la même échelle que les fills ;
- palette Prix conforme au mockup ;
- palette Densité bleue ;
- palette Annonces verte ;
- cache/fraîcheur explicites ;
- aucun chiffre ou seuil de couleur inventé pour imiter le mockup.

Gate C3 : la couleur de chaque polygone doit être reproductible depuis le payload API et sa légende.
