# Carte intelligence marché — statut canonique

Date : 2026-08-16
Statut global : **CLOSED**

Référentiel cible : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.
Contrat métriques : `docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md`.
Closeouts :
- C1 : `docs/MARKET_ZONES_C1_CLOSEOUT.md`
- C2 : `docs/CARTE_C2_CLOSEOUT.md`
- C3 : `docs/CARTE_C3_CLOSEOUT.md`
- C4 : `docs/CARTE_C4_CLOSEOUT.md`
- C5 : `docs/CARTE_C5_CLOSEOUT.md`
- C6 : `docs/CARTE_C6_CLOSEOUT.md`
- C7 : `docs/CARTE_C7_CLOSEOUT.md`

## Progression stricte

Lots CLOSED / 8 : **8 / 8 = 100 %**.

- C0 — Référentiel + audit de récupération : ✅ CLOSED
- C1 — Géométrie quartier certifiée : ✅ CLOSED
- C2 — Dataset métriques quartier v2 : ✅ CLOSED
- C3 — API publique fail-closed + échelles : ✅ CLOSED
- C4 — Heat map interactive conforme au contrat cible : ✅ CLOSED
- C5 — Fiche quartier riche : ✅ CLOSED
- C6 — Fondation « nos annonces » : ✅ CLOSED
- C7 — Certification finale + closeout : ✅ CLOSED

## C0 — référentiel verrouillé

- référence 1448×1086 ;
- SHA-256 `4b6912480c5ce7dce6b04c5d0f8848b0be319955d220db84d8365a76ca66eac7` ;
- aperçu repo : `docs/assets/carte-intelligence-marche-reference.webp` ;
- aucune valeur illustrative du mockup n'est autorisée comme donnée runtime.

## C1 — zones marché Rabat

Pilote certifié : Agdal, Hay Riad, Souissi, Centre Rabat / Hassan.

Invariants :
- `market_zone` explicitement non administrative ;
- géométrie et `area_km2` recomputables ;
- API fail-closed ;
- aucune frontière officielle inventée.

## C2 — métriques réelles

Contrat :
- Prix = médiane observée DH/m² par transaction ;
- Annonces = volume observé ;
- Densité = volume / surface certifiée ;
- absence de prix = `NULL`, jamais `0` ;
- fiabilité statistique distincte de la représentativité marché.

## C3 — API intelligence marché

Endpoint : `/api/geo/rabat-market-intelligence?mode=<price|density|listings>&transaction=<sale|rent>`.

Invariants :
- échelles dérivées du snapshot ;
- légende et fills issus du même calcul ;
- Prix `insufficient` = neutre ;
- invalid request / données indisponibles = fail-closed ;
- aucun seuil illustratif du mockup dans le runtime.

## C4 — heat map interactive

Certifié :
- trois modes Prix / Densité / Annonces ;
- Vente / Location séparés ;
- MapLibre polygonal ;
- clic/tap zone → district canonique → fiche ;
- CTA Search avec contexte ;
- états neutres explicites ;
- expérience legacy préservée hors Rabat.

## C5 — fiche zone riche

Certifié :
- contexte quartier uniquement depuis le référentiel canonique ;
- Search CTA filtré ;
- disclaimer `market_zone` permanent ;
- layout mobile borné et scrollable ;
- aucune métrique ou contexte inventé.

## C6 — fondation « nos annonces »

Certifié :
- ownership vérifié uniquement ;
- vraies `property_listings` ;
- projection market-zone via autorité géographique existante ;
- provenance `market / AkarFinder-owned / partner` ;
- partenaire uniquement avec validation + activation + autorisation source explicites ;
- 0 write DB, 0 ranking mutation, 0 activation implicite.

## C7 — certification finale

Dernière remédiation produit : PR #723, merge `c7b5b264e4e7980bb51609f04e3607fd56b02927`.

Certification finale :
- PR #726 ;
- exact head `6d6f98218eb34b720226b7d46813b27aa1352eff` ;
- merge `c6982af61c3694dbcc703808e0eaf0bbb81d22d7` ;
- run `31938793693` : **SUCCESS** ;
- artefact `9261452732` ;
- digest `sha256:6bffb4749dad4d27c02ba3047ee3a97443b3a5b35a753ddb9126bf3f549596a5`.

Le run final certifie :
- 56 tests critiques C0→C6 ;
- identité de la cible ;
- TypeScript ;
- production build ;
- MapLibre navigateur réel ;
- 390×844 / 430×932 / 768×900 / 1280×900 ;
- trois KPI Prix / Densité / Annonces ;
- confiance + taille d'échantillon Prix ;
- mini-polygone de zone ;
- CTA Search ;
- report final `ok: true` ;
- 0 erreur navigateur / 0 requête C3 en échec dans le rapport certifié.

Les gates Canonical Baseline, Compile, UX Gate 0, P0, P1 Final Sweep, P2 Residual et Final Design Accessibility sont également **SUCCESS** sur le même exact-head.

## Position visuelle finale

L'artefact final a été inspecté humainement sur les quatre viewports.

La certification porte sur le contrat canonique : structure, hiérarchie, interactions, données défendables, états fail-closed et accessibilité. Elle **ne prétend pas** une copie pixel-perfect du mockup illustratif.

## Conclusion

**Carte intelligence marché — CLOSED — 8/8 = 100 %.**

Toute extension nationale, historique 6 mois, catégories dominantes certifiées ou enrichissement de l'inventaire constitue un nouveau chantier séparé.
