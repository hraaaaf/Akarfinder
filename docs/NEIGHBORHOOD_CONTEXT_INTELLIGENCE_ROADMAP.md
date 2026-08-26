# AkarFinder — Neighborhood Context Intelligence — ROADMAP

Date : 2026-08-26
Base vérifiée : `main@dcf690de81abf1d8b14fff0fbe9f89201ff13e6d`
Statut : **ACTIVE — 6/7 lots fermés = 85,7 %**

## Goal global

Construire une couche nationale de **repères utiles de quartier** où Carte, page quartier, homepage et `Vivre ici` utilisent une même vérité POI, avec provenance, fraîcheur et précision territoriale explicites.

Chaîne cible :

`Quartier canonique → POI vérifiés → anchors utiles → read-model → Carte → page quartier → homepage → listing → certification nationale`

## Succès global

Le chantier est CLOSED uniquement lorsque :
- la source POI nationale est reproductible et hors render path ;
- chaque POI publié conserve source / licence / attribution / fraîcheur ;
- la relation POI ↔ quartier est explicite et fail-closed ;
- la sélection d’anchors est déterministe et diversifiée ;
- Carte, page quartier, homepage et listing consomment le même read-model ;
- aucun temps de trajet n’est produit depuis un simple centroïde quartier ;
- aucun POI proche n’est présenté comme « dans le quartier » sans preuve territoriale ;
- la Carte reste map-first ;
- la couverture nationale est mesurée avec `covered | partial | insufficient | unavailable` ;
- les données stale/rejected ne sont pas publiées ;
- la certification finale UI + API + build + tests + revue humaine est verte ;
- aucun Vercel n’est effectué sans autorisation explicite.

## Correspondance de numérotation

Le contrat initial compte la réconciliation comme **Lot 1**. Les PR d’exécution ont ensuite utilisé L1–L5 pour les cinq lots d’implémentation suivants. Pour éviter toute ambiguïté :

| Roadmap canonique | PR d’exécution |
|---|---|
| Lot 1 — Réconciliation + contrat | #902 |
| Lot 2 — National POI Source + Registry | #904 (`L1`) |
| Lot 3 — Assignment + Anchor Selection | #906 (`L2`) |
| Lot 4 — Read Model + API | #907 (`L3`) |
| Lot 5 — Carte Repères + Semantic Zoom | #913 (`L4`) |
| Lot 6 — Surface Convergence | #918 (`L5`) |
| Lot 7 — National Scale + Quality/Freshness | NEXT |

---

# Lot 1 — Réconciliation + contrat canonique ✅ CLOSED

**Goal** : figer une architecture unique avant nouvelle implémentation.

**Preuve** : PR #902, merge `58de80ff29bf128a3881bfc5951be6380baaecab`, contrat + roadmap + handover canoniques.

Décisions verrouillées : réutiliser ANN-L5/L6, une seule taxonomie POI, mêmes `poi_id` / `canonical_neighborhood_id`, aucune minute depuis centroïde quartier, aucune appartenance territoriale inventée, semantic zoom, aucun Vercel sans autorisation.

---

# Lot 2 — National POI Source + Registry Foundation ✅ CLOSED

**Goal** : créer une source de vérité POI nationale reproductible, traçable et hors render path.

**Livré** : `NeighborhoodPoiV1`, identité OSM stable, provenance/licence/attribution/fraîcheur, normalisation FR/AR, catégories `LivingHereCategory`, déduplication, snapshot read-only, acquisition live hors render path avec fallback uniquement vers seed ANN-L5 certifié.

**Preuve** : PR #904, merge `b2a899eaf11f945e980a3c39f4e195c51270b859`, 6 pilotes, 0 remplissage artificiel Agadir/Fès, aucune relation « dans le quartier » affirmée à ce stade.

---

# Lot 3 — Neighborhood Assignment + Anchor Selection ✅ CLOSED

**Goal** : relier chaque POI candidat au quartier avec une relation territoriale explicite et sélectionner les anchors utiles sans transformer un rayon en frontière.

**Livré** : `inside_certified_boundary | authority_linked | near_certified_reference | unresolved`, point-in-polygon sur géométrie certifiée uniquement, ranking déterministe/diversifié, max 2 anchors/catégorie, max 8 anchors, wording truth-safe.

**Preuve** : PR #906, merge `fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5`. Certification publiée : 6 pilotes, 12 anchors, 0 `inside_certified_boundary` non prouvé, 0 unresolved publié, 0 truth finding.

---

# Lot 4 — Neighborhood Context Read Model + API ✅ CLOSED

**Goal** : fournir une seule projection aval pour Carte / page quartier / homepage / listing.

**Livré** : `NeighborhoodContextReadModelV1`, source runtime versionnée, freshness fail-closed, `coverage_status`, provenance/licence/observed_at, endpoint `GET /api/geo/neighborhood-context`, cache borné, aucune requête provider dans le render path.

**Preuve** : PR #907, merge `c304e4bd0ae0b23334fe3a6c510459ecedf7c77f`, exact-head final `a5660ba016d1525ea1fb6b8b3d1880af631fc963`.

---

# Lot 5 — Carte « Repères » + Semantic Zoom ✅ CLOSED

**Goal visuel** : ajouter un overlay `Repères` utile sans dégrader la Carte dominante.

**Livré** : overlay MapLibre partagé, national silencieux, ville sans faux POI faute de quartier canonique, quartier borné aux anchors du read-model, filtres canoniques, popup provenance/wording, sheet mobile compact, aucune durée inventée.

**Preuve** : PR #913, merge `ff7ab0e9ba5acd59dd143084dc8cbb593eb62923`. BEFORE `32911680354` / artifact `9586788602`. L’inspection humaine a détecté puis fait corriger le chevauchement mobile avant merge.

---

# Lot 6 — Convergence Page quartier + « Vivre ici » annonce ✅ CLOSED

**Goal** : supprimer les vérités POI parallèles et séparer clairement contexte territorial et mesures depuis un bien exact.

**Livré** :
- homepage, SEO quartier, page quartier canonique et listing convergent vers `NeighborhoodContextReadModelV1` ;
- même signature de `poi_id` sur les quatre surfaces ;
- listing `neighborhood_centroid` : NCI uniquement, 0 provider réseau, 0 minute ;
- listing exact : contexte NCI identique + mesures ANN-L6 dans une section distincte `Depuis ce bien exact` ;
- aucun temps ANN-L6 ne fuit dans la surface NCI ;
- agrégation ville et panneau SEO réalignés sur NCI ;
- anciens `proximityHighlights/lifestyleTags` retirés comme vérité quartier publiée ;
- provenance/fraîcheur et fail-closed conservés.

**Preuve** : PR #918, human gate validé, merge `dcf690de81abf1d8b14fff0fbe9f89201ff13e6d`.

Certification exact-head :
- HEAD candidat `cac01d9b542641adf0bea955dbe85376a84512ee` ;
- run `32965282547` SUCCESS ;
- artifact `9605551739` ;
- digest `sha256:6691947ae925c72946f9c13dc24c8b724d3a114181a56945bf350c6520ae696a` ;
- contrat 5/5, TypeScript, build, Chromium : PASS ;
- 16/16 captures 390 / 430 / 768 / 1280 ;
- `report.json ok=true`, 0 finding, 0 overflow, 0 page error ;
- score visuel : **9,5/10**.

---

# Lot 7 — National Scale + Quality / Freshness Certification 🟡 NEXT

## Goal

Passer du pilote à une couverture nationale réellement mesurable, fraîche et maintenable, puis fermer le chantier sur preuves.

## À construire

1. baseline réel de tous les quartiers canoniques éligibles ;
2. job de refresh reproductible hors render path ;
3. métriques de couverture par ville / quartier / catégorie ;
4. états explicites `covered | partial | insufficient | unavailable` ;
5. stale/rejected et régressions de source détectés ;
6. audit provenance / licence / attribution / fraîcheur ;
7. canaries quartiers représentatifs ;
8. coût / latence / taille du read-model mesurés ;
9. certification nationale API + tests + build + UI ciblée ;
10. closeout final docs / roadmap.

## Succès

Pour chaque quartier canonique éligible :
- aucun statut silencieusement absent ;
- aucun anchor sans provenance ;
- aucune donnée stale publiée au-delà de sa policy ;
- métriques de couverture calculées depuis les données réelles, jamais inventées ;
- seuil final `covered` figé seulement après baseline ;
- régression NCI L1–L6 verte ;
- certification finale humaine sur les surfaces représentatives.

## Avancement

- Lots 1–6 : CLOSED ✅
- Lot 7 : NEXT
- **Global : 6/7 = 85,7 %**

## Next exact

Démarrer L7 par un **baseline national read-only** : inventorier tous les quartiers canoniques éligibles, calculer leur `coverage_status` actuel depuis le read-model existant et produire les distributions ville/quartier/catégorie/fraîcheur. Aucun seuil de réussite ne doit être inventé avant cette mesure.

Aucun déploiement Vercel sans autorisation explicite.
