# AkarFinder — Neighborhood Context Intelligence — CANONICAL

Date : 2026-08-25
Statut : **ACTIVE — Lots 1–3 CLOSED, Lot 4 ACTIVE**
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

### Goal atteint
Créer une projection unique, bornée et fail-closed pour Carte, page quartier, homepage et listing.

### Résultat vérifié
- `NeighborhoodContextReadModelV1` ;
- runtime source versionnée `ann-l5-certified-seed` ;
- aucun provider réseau dans le render path ;
- freshness fail-closed ;
- `coverage_status = covered | partial | insufficient | unavailable` ;
- mêmes `poi_id` / `canonical_neighborhood_id` ;
- provenance/licence/observed_at conservés ;
- endpoint `GET /api/geo/neighborhood-context?city=&district=` ;
- cache borné ;
- 6 read-models pilotes, 12 anchors uniques ;
- Agdal covered, Malabata partial, Maârif/Guéliz insufficient, Founty/Fès unavailable ;
- 0 truth finding.

### Preuve finale
- PR **#907** ;
- HEAD exact certifié `a5660ba016d1525ea1fb6b8b3d1880af631fc963` ;
- run **`32896269829`** SUCCESS ;
- 27/27 tests + TypeScript + production build SUCCESS ;
- rapport + capture + final truth gate SUCCESS ;
- artifact **`9581394884`** ;
- digest `sha256:68e988877ff0123e24989d209b1196d85642c159b73ba208cc0f4297c5c1ef68` ;
- capture `l3-read-model-proof.png`, score **9,5/10** ;
- validation humaine explicite reçue le 2026-08-25 ;
- merge squash **`c304e4bd0ae0b23334fe3a6c510459ecedf7c77f`** ;
- aucun Vercel.

---

## Lot 4 — Carte Repères + Semantic Zoom — ACTIVE

### Goal visuel
Ajouter une couche `Repères` utile sans dégrader la carte dominante déjà certifiée.

### UX cible
- national : aucun bruit POI ;
- ville : anchors structurants seulement lorsque pertinent ;
- quartier : 5–8 anchors sélectionnés ;
- filtres contextuels Transport / Éducation / Santé / Courses / Parcs & sport / Services ;
- sélection POI = fiche compacte ;
- wording territorial sûr ;
- aucune durée inventée.

### Process obligatoire
1. captures BEFORE 390/430/768/1280 ;
2. Goal écrit + critères ;
3. mockup/wireframe avant implémentation ;
4. implémentation ;
5. AFTER mêmes viewports ;
6. comparaison BEFORE / target / AFTER ;
7. score cible ≥9,3/10 ;
8. validation humaine explicite avant fermeture.

---

## Lot 5 — Convergence Page quartier + Vivre ici + Homepage — OPEN
Même vérité POI/read-model sur les surfaces, suppression progressive des `proximityHighlights` parallèles. Human gate visuel obligatoire.

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
- Lot 4 : ACTIVE
- Lot 5 : OPEN
- Lot 6 : OPEN

**Avancement global vérifié : 3/6 = 50 %.**

---

# 8. Git / gouvernance

Fichier maître : `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CANONICAL.md`.

PR roadmap : #902. Lot 1 : #904. Lot 2 : #906. Lot 3 : #907.

---

# 9. Next exact

**Lot 4 — Carte Repères + Semantic Zoom**

1. capturer BEFORE sur les mêmes viewports 390/430/768/1280 et quartiers pilotes pertinents ;
2. auditer la Carte actuelle et ses contrôles/layers ;
3. figer Goal visuel + critères de densité/semantic zoom ;
4. produire un mockup/wireframe cible avant code ;
5. seulement après cette preuve visuelle, implémenter la couche `Repères` branchée sur `NeighborhoodContextReadModelV1` ;
6. aucun Vercel.