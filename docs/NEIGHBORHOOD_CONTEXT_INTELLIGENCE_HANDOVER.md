# HANDOVER — AkarFinder / Neighborhood Context Intelligence

Date : 2026-08-26
Titre cible : **AkarFinder — Neighborhood Context Intelligence**
Statut vérifié : **ACTIVE — 6/7 lots fermés = 85,7 %**
Base vérifiée : `main@dcf690de81abf1d8b14fff0fbe9f89201ff13e6d`

## Goal

Nationaliser et unifier les repères utiles de quartier afin que Carte, page quartier, homepage et `Vivre ici` utilisent une même vérité POI, avec provenance, fraîcheur et précision territoriale explicites.

## État vérifié

### Fondations antérieures conservées
- ANN-L5 Geo Foundation — PR #739 — merge `b44bd5d04299a18e778f7e42251cdcb07b364a77` ;
- ANN-L6 Vivre ici — PR #743 — merge `2c1cb0650189397c3c350d6bad30b8f8e1d3cecd` ;
- P6 Ville / Quartier — PR #839 — merge `e7f7ac753b1fbb41303cd19f0cb0377bff070512` ;
- HVR-4 homepage quartier — PR #859 — merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd` ;
- Carte nationale N2 — PR #888 — run `32704717514` SUCCESS ;
- Partner → Neighborhood → Market Intelligence V2 — PR #896 — merge `cbfd80af575c0eafc58ae0dc4a2273565a2e46d6`.

### Lots NCI fermés

1. **Réconciliation + contrat** ✅
   - PR #902
   - merge `58de80ff29bf128a3881bfc5951be6380baaecab`

2. **National POI Source + Registry Foundation** ✅
   - PR #904, nommé `L1` pendant l’exécution
   - merge `b2a899eaf11f945e980a3c39f4e195c51270b859`
   - `NeighborhoodPoiV1`, identité OSM stable, provenance/licence/fraîcheur, snapshot read-only, aucun réseau dans le render path

3. **Neighborhood Assignment + Anchor Selection** ✅
   - PR #906, nommé `L2` pendant l’exécution
   - merge `fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5`
   - relations territoriales explicites, ranking déterministe/diversifié, max 8 anchors, 0 truth finding sur la certification publiée

4. **Neighborhood Context Read Model + API** ✅
   - PR #907, nommé `L3` pendant l’exécution
   - merge `c304e4bd0ae0b23334fe3a6c510459ecedf7c77f`
   - `NeighborhoodContextReadModelV1`, freshness fail-closed, `coverage_status`, API read-only, aucun provider dans le render path

5. **Carte Repères + Semantic Zoom** ✅
   - PR #913, nommé `L4` pendant l’exécution
   - merge `ff7ab0e9ba5acd59dd143084dc8cbb593eb62923`
   - overlay map-first, semantic zoom, filtres canoniques, provenance visible, aucune durée inventée
   - BEFORE run `32911680354`, artifact `9586788602`
   - recouvrement mobile détecté humainement puis corrigé avant merge

6. **Convergence page quartier + Vivre ici** ✅
   - PR #918, nommé `L5` pendant l’exécution
   - human gate utilisateur : validé
   - merge `dcf690de81abf1d8b14fff0fbe9f89201ff13e6d`
   - exact-head candidat `cac01d9b542641adf0bea955dbe85376a84512ee`
   - run `32965282547` SUCCESS
   - artifact `9605551739`
   - digest `sha256:6691947ae925c72946f9c13dc24c8b724d3a114181a56945bf350c6520ae696a`
   - contrat 5/5, TypeScript, build, Chromium : PASS
   - 16/16 captures 390 / 430 / 768 / 1280
   - `report.json ok=true`, 0 finding, 0 overflow, 0 page error
   - même `district_rabat_agdal` et même signature de 5 `poi_id` sur homepage / SEO quartier / page quartier / listing
   - listing exact : contexte NCI sans minute + section séparée `Depuis ce bien exact`
   - centroid quartier : 0 provider réseau, 0 minute
   - score visuel : **9,5/10**

## Numérotation à ne plus confondre

La roadmap canonique compte la réconciliation comme Lot 1. Les PR d’exécution #904/#906/#907/#913/#918 ont été nommées L1–L5. Le chantier est donc désormais **6/7**, et non 5/6.

## Décisions verrouillées

- ne pas refaire ANN-L5/L6 ;
- une seule taxonomie POI ;
- même `poi_id` / `canonical_neighborhood_id` sur toutes les surfaces ;
- 5–8 anchors quand la donnée le permet, max 2 par catégorie par défaut ;
- aucune appartenance `dans le quartier` sans preuve territoriale ;
- aucune minute depuis un centroïde quartier ;
- mesures de route uniquement depuis un bien exact avec preuve fraîche ;
- acquisition POI hors render path ;
- fail-closed stale/rejected/indisponible ;
- semantic zoom plutôt que surcharge de pins ;
- aucun Vercel sans autorisation explicite.

## Lot 7 — National Scale + Quality / Freshness Certification ← NEXT

### Goal

Passer du pilote à une couverture nationale réellement mesurable, fraîche et maintenable, puis fermer le chantier sur preuves.

### Next exact

1. inventorier tous les quartiers canoniques éligibles au produit ;
2. calculer leur `coverage_status` actuel depuis le read-model existant ;
3. produire un baseline read-only par ville / quartier / catégorie / fraîcheur ;
4. ne figer aucun seuil `covered` avant cette mesure ;
5. concevoir ensuite le job de refresh reproductible ;
6. auditer stale/rejected/provenance/licence ;
7. ajouter canaries et métriques coût/latence/read-model ;
8. certifier régression NCI L1–L6 + API/build + surfaces représentatives ;
9. human gate final ;
10. closeout docs / roadmap → 7/7 uniquement si toutes les preuves sont suffisantes.

## Blocage réel

Aucun blocage connu pour démarrer le baseline L7.

## Vercel

Aucun déploiement Vercel autorisé ou requis pour ce closeout.

## Prompt de reprise

« Reprends AkarFinder — Neighborhood Context Intelligence depuis `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_HANDOVER.md`. Vérifie `main`, considère Lots 1–6 CLOSED à 85,7 %, puis démarre Lot 7 par le baseline national read-only des quartiers canoniques et de leur `coverage_status`. N’invente aucun seuil de couverture avant mesure réelle. Aucun Vercel. »
