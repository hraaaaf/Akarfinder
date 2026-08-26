# AkarFinder — Neighborhood Context Intelligence — CANONICAL

Date : 2026-08-26
Statut : **ACTIVE — Lots 1–4 CLOSED, Lot 5 ACTIVE**
Autorité : ce fichier est le document maître du chantier. Les anciens CONTRACT / ROADMAP / HANDOVER restent des preuves historiques et de reprise, mais toute décision nouvelle doit être réconciliée ici.

---

# 1. Vision

AkarFinder doit aider à décider **où habiter ou investir**, pas seulement à localiser une annonce.

La couche Neighborhood Context Intelligence transforme chaque quartier canonique en contexte immobilier utile :

`Quartier canonique → POI vérifiés → repères utiles → Carte → page quartier → annonce → Search`

Le produit ne cherche pas à reproduire Google Maps. Il sélectionne les **repères qui structurent réellement la vie et la décision immobilière**.

La vue quartier par défaut reste courte, lisible et décisionnelle : **5 à 8 anchors maximum lorsque la donnée le permet**, puis catégories détaillées à la demande.

---

# 2. Doctrine produit

1. **Vérité avant richesse** : mieux vaut 4 repères prouvés que 8 inventés.
2. **Même identité partout** : un POI garde le même `poi_id` et le même `canonical_neighborhood_id` sur Carte, quartier, homepage et annonce.
3. **Pas de fausse frontière** : un POI proche d’un centroïde n’est jamais présenté comme « dans le quartier » sans preuve territoriale.
4. **Wording sûr** : sans frontière certifiée, utiliser `autour du repère quartier` ou équivalent.
5. **Pas de faux temps** : aucune durée de trajet depuis un centroïde quartier.
6. **Semantic zoom** : national = silence POI ; ville = anchors structurants ; quartier = anchors utiles ; bien exact = proximité + routing/isochrones si autorisés.
7. **Sélection, pas annuaire** : maximum 2 anchors d’une même catégorie dans la sélection par défaut.
8. **Pas de score subjectif** de sécurité, prestige, qualité de vie, rentabilité ou attractivité sans chantier séparé et preuve défendable.
9. **Acquisition hors render path** : aucun appel implicite à un service communautaire au chargement d’une page produit.
10. **Provenance obligatoire** : source, attribution, droits/licence, date d’observation, fraîcheur et confiance sont conservées.
11. **Fail-closed** : donnée invalide, stale ou ambiguë = masquée ou état `insufficient`, jamais reconstruite.
12. **Continuité certifiée** : live prioritaire. Un snapshot certifié peut servir de seed temporaire s’il reste frais, conserve sa provenance et est explicitement marqué `certified_seed`.
13. **Aucun déploiement Vercel sans autorisation explicite.**

---

# 3. Fondations mergées à réutiliser

- ANN-L5 Geo Foundation — PR #739, merge `b44bd5d04299a18e778f7e42251cdcb07b364a77`, runs `31943466077` / `31943502557`.
- ANN-L6 Vivre ici — PR #743, merge `2c1cb0650189397c3c350d6bad30b8f8e1d3cecd`, run `31947615421`.
- P6 Ville/Quartier — PR #839, merge `e7f7ac753b1fbb41303cd19f0cb0377bff070512`.
- HVR-4 — PR #859, merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd`.
- Carte nationale N2 — PR #888, run `32704717514`.
- Partner → Neighborhood → Market Intelligence V2 — PR #896, merge `cbfd80af575c0eafc58ae0dc4a2273565a2e46d6`.

---

# 4. Contrats cibles

## NeighborhoodPoiV1
Identité stable, source, source entity ID, nom normalisé, catégorie `LivingHereCategory`, coordonnées, URL source, attribution/licence, `observed_at`, fraîcheur, confiance et statut.

## NeighborhoodPoiRelationV1
`canonical_neighborhood_id + poi_id + relation + distance + méthode/preuve + confiance`.
Relations : `inside_certified_boundary | authority_linked | near_certified_reference | unresolved`.

## NeighborhoodAnchorV1
Projection produit déterministe : quartier, POI, rang, catégorie, rôle, raison de sélection et wording territorial truth-safe.

## NeighborhoodContextReadModelV1
Projection aval unique pour Carte, page quartier, homepage et listing : identité canonique, anchors, catégories disponibles, `coverage_status`, provenance, fraîcheur et snapshot/version.

---

# 5. Roadmap opérationnelle

## Lot 1 — National POI Source + Registry Foundation — CLOSED ✅
- PR #904
- HEAD certifié `44e33c74d9a625be07cf46d4d2020ee742353549`
- run `32758616578` SUCCESS
- artifact `9531912146`
- capture score 9,2/10, validation humaine reçue
- merge `b2a899eaf11f945e980a3c39f4e195c51270b859`

## Lot 2 — Neighborhood Assignment + Anchor Selection — CLOSED ✅
- PR #906
- HEAD certifié `ee1356a7442112b4fba0d2f93894222fdcc52dea`
- run `32772338668` SUCCESS
- artifact `9536743646`
- 12 anchors, 0 faux inside, 0 truth finding
- capture score 9,4/10, validation humaine reçue
- merge `fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5`

## Lot 3 — Neighborhood Context Read Model + API — CLOSED ✅
- PR #907
- HEAD certifié `a5660ba016d1525ea1fb6b8b3d1880af631fc963`
- run `32896269829` SUCCESS
- 27/27 tests + TypeScript + production build SUCCESS
- artifact `9581394884`
- digest `sha256:68e988877ff0123e24989d209b1196d85642c159b73ba208cc0f4297c5c1ef68`
- 6 read-models pilotes, 12 anchors uniques, 0 truth finding
- capture score 9,5/10, validation humaine reçue
- merge `c304e4bd0ae0b23334fe3a6c510459ecedf7c77f`

## Lot 4 — Carte Repères + Semantic Zoom — CLOSED ✅

### Goal atteint
Ajouter une couche `Repères` truth-safe sans dégrader la carte dominante.

### Résultat vérifié
- overlay `Repères` indépendant des modes Prix / Densité / Annonces ;
- national et ville sans quartier : 0 bruit POI ;
- quartier : anchors bornés du read-model L3 ;
- filtres contextuels déterministes ;
- popup POI compacte avec provenance, distance au repère et wording territorial ;
- aucune durée inventée ;
- aucun faux `Dans le quartier` ;
- hit targets ≥44 px ;
- raccords Rabat Market Intelligence, National Explore et carte générique ;
- sheet mobile Agdal compact pour préserver la carte ;
- popup mobile corrigée pour rester au-dessus des contrôles.

### Preuve finale
- PR **#913** ;
- HEAD exact certifié `3cf3ef6f3b2ce7ba6ac79870696485dc67507a67` ;
- run **`32947835434`** SUCCESS ;
- contrat présentation + TypeScript + production build + Chromium + AFTER gate SUCCESS ;
- 16/16 captures AFTER et preuves popup mobile/desktop ;
- artifact **`9599100679`** ;
- digest `sha256:e2a75f303ca1a90395231a9462eb5d3fd850df7be35e6faf5de4b463db1c91dd` ;
- score visuel **9,4/10** ;
- validation humaine explicite reçue le 2026-08-26 ;
- merge squash **`ff7ab0e9ba5acd59dd143084dc8cbb593eb62923`** ;
- aucun Vercel.

### Anomalie transverse consignée
Le smoke historique C5 attend encore une métrique visible dans le sheet mobile replié. L4 masque volontairement cette métrique jusqu'à `Détails` pour préserver la carte. Ce harnais devra être réaligné ; il ne constitue pas une preuve de régression produit L4.

---

## Lot 5 — Convergence Page quartier + Vivre ici + Homepage — ACTIVE

### Goal visuel
Faire converger page quartier, module `Vivre ici`, homepage et contexte listing vers **le même `NeighborhoodContextReadModelV1`**, sans source POI parallèle ni wording divergent.

### Succès
- mêmes `poi_id` / `canonical_neighborhood_id` sur les surfaces convergées ;
- suppression ou neutralisation progressive des `proximityHighlights` parallèles lorsqu'ils dupliquent Neighborhood Context ;
- états `covered / partial / insufficient / unavailable` visibles sans embellissement ;
- aucune donnée stale/rejected publiée ;
- mêmes règles de provenance et territorial wording que L3/L4 ;
- responsive 390/430/768/1280 ;
- score visuel cible ≥9,3/10 ;
- human gate explicite avant fermeture.

### Process obligatoire
1. auditer les surfaces et sources actuelles ;
2. captures BEFORE 390/430/768/1280 des surfaces touchées ;
3. Goal écrit + critères ;
4. mockup/wireframe avant implémentation ;
5. implémentation ;
6. AFTER mêmes viewports ;
7. comparaison BEFORE / target / AFTER + tests ;
8. score + validation humaine.

---

## Lot 6 — National Scale + Quality/Freshness Certification — OPEN
Couverture nationale mesurée, refresh reproductible, stale masqué, provenance complète, canaries et certification finale. Human gate final obligatoire.

---

# 6. Règle de fermeture des lots

`implémentation → tests → preuve → capture → validation utilisateur → merge/closeout → lot suivant`

**Aucun lot n’est CLOSED avant validation explicite de sa capture par l’utilisateur.**

---

# 7. Avancement

- Lot 1 : CLOSED ✅
- Lot 2 : CLOSED ✅
- Lot 3 : CLOSED ✅
- Lot 4 : CLOSED ✅
- Lot 5 : ACTIVE
- Lot 6 : OPEN

**Avancement global vérifié : 4/6 = 66,7 %.**

---

# 8. Git / gouvernance

Fichier maître : `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CANONICAL.md`.

PR roadmap : #902. Lots : #904, #906, #907, #913.

---

# 9. Next exact

**Lot 5 — Convergence Page quartier + Vivre ici + Homepage**

1. inventorier les surfaces et leurs sources POI/contextuelles actuelles ;
2. identifier les `proximityHighlights` ou autres vérités parallèles ;
3. capturer les BEFORE sur 390/430/768/1280 ;
4. figer un mockup cible de convergence ;
5. seulement ensuite implémenter la convergence sur `NeighborhoodContextReadModelV1` ;
6. aucun Vercel.