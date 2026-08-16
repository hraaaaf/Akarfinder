# Carte intelligence marché — statut canonique

Date : 2026-08-16

Référentiel cible : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.
Contrat métriques : `docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md`.
Closeout C1 : `docs/MARKET_ZONES_C1_CLOSEOUT.md`.
Closeout C2 : `docs/CARTE_C2_CLOSEOUT.md`.
Closeout C3 : `docs/CARTE_C3_CLOSEOUT.md`.
Closeout C4 : `docs/CARTE_C4_CLOSEOUT.md`.
Closeout C5 : `docs/CARTE_C5_CLOSEOUT.md`.

## Progression stricte

Lots CLOSED / 8 : **6 / 8 = 75 %**.

- C0 — Référentiel + audit de récupération : ✅ CLOSED
- C1 — Géométrie quartier certifiée : ✅ CLOSED
- C2 — Dataset métriques quartier v2 : ✅ CLOSED
- C3 — API publique fail-closed + échelles : ✅ CLOSED
- C4 — Heat map interactive conforme au mockup : ✅ CLOSED
- C5 — Fiche quartier riche : ✅ CLOSED
- C6 — Fondation « nos annonces » : 🟠 CURRENT
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

## C4 — heat map interactive certifiée

La vue Rabat de `/map` utilise désormais la heat map polygonale MapLibre C4, tout en conservant l'expérience historique pour les autres villes.

Contrats certifiés :
- trois modes `Prix / Densité / Annonces` ;
- séparation Vente / Location ;
- fills et légende issus de C3 ;
- état neutre explicite pour données absentes ou `insufficient` ;
- aucun fallback chiffré ou coloré inventé ;
- clic/tap réel sur un polygone → district canonique → panneau zone ;
- CTA Search filtré sur la sélection et la transaction ;
- cockpit mobile sans overflow des tabs ;
- H1 sémantique présent ;
- audit Responsive compatible avec les expériences legacy et intelligence.

Preuves exact-head PR #703 `17a027bef93239355cb614251668e63fff05e71e` :
- C4 Heatmap Gate `31922357603` : SUCCESS ;
- P1A.6 Responsive Hardening `31922357579` : SUCCESS ;
- Final Design Accessibility `31922357533` : SUCCESS ;
- C4 Browser Smoke `31922357584` : SUCCESS ;
- artefact `9256782867` ; digest `sha256:f9fba92e71d1a75aa261f612f9cc0cda1421d330b5e06e465558416cbc5d827a` ;
- merge #703 : `97d1b070d4a8cd7eb9cce18de76d12b35b167b05`.

Inspection browser : mobile 390 px et desktop 1280 px certifiés avec interaction MapLibre réelle, panneau/CTA fonctionnels et 0 page error / 0 échec de requête C3 dans le rapport final.

## C5 — fiche zone riche certifiée

La fiche de zone Rabat est désormais enrichie sans modifier la vérité statistique C2/C3.

Contrats certifiés :
- métrique active issue exclusivement de la feature C3 sélectionnée ;
- contexte canonique visuellement séparé de la métrique ;
- Agdal / Hay Riad / Hassan réutilisent uniquement tags et repères déjà présents ;
- Souissi n'affiche aucun contexte ni lien quartier inventé ;
- Search CTA filtré sur ville, district et transaction ;
- disclaimer `market_zone` permanent ;
- fiche mobile scrollable et hors bottom-nav ;
- changement Prix → Densité conserve le contexte mais remplace la métrique via C3.

Preuves exact-head PR #708 `43f402031155873ff48abb2c279f341c53a5819b` :
- C5 runtime/build `31923996230` : SUCCESS ;
- C5 browser `31923996206` : SUCCESS ;
- artefact `9257273391` ; digest `sha256:809b78c251096551c5e9e456807069ece2988685ea05e2556fd5fb2ca2d1add7` ;
- 12 captures : 4 zones × 390 / 430 / 1280 ;
- report `ok: true`, 0 page error, 0 échec C3 ;
- merge #708 : `5b36197304bcb3c8c8cd94c5432ce6d3111c476c`.

La collision mobile a été corrigée à partir d'une mesure réelle : bas de fiche 772 px, haut de nav 768 px sur viewport 390 ; offset final `bottom-[90px]` et assertion stricte conservée.

## C6 — CURRENT

Objectif : poser la fondation « nos annonces » sans créer de second modèle d'ownership.

Direction verrouillée en préparation :
- réutiliser `professional_listing_ownership` et le cycle existant `claimed / verified / revoked` ;
- exposition Carte uniquement pour ownership explicitement `verified` ;
- `claimed`, absent ou inconnu reste fail-closed ;
- ajouter un reader borné read-only des annonces verified réelles ;
- réutiliser la résolution géographique certifiée pour toute projection vers `market_zone` ;
- garder l'inventaire propre séparé de Prix / `listing_count` / `listing_density_km2` C2/C3 ;
- aucun write, ranking mutation ou activation publique implicite.

PR de préparation : #712, gate contrat `31923952370` : SUCCESS. Elle reste à intégrer après le closeout C5.