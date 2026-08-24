# AkarFinder — Neighborhood Context Intelligence — CANONICAL

Date : 2026-08-24
Statut : **ACTIVE — Lots 1–2 CLOSED, Lot 3 ACTIVE**
Autorité : ce fichier est le document maître du chantier. Les anciens CONTRACT / ROADMAP / HANDOVER restent des preuves historiques et de reprise, mais toute décision nouvelle doit être réconciliée ici.

---

# 1. Vision

AkarFinder doit aider à décider **où habiter ou investir**, pas seulement à localiser une annonce.

La couche Neighborhood Context Intelligence transforme chaque quartier canonique en contexte immobilier utile :

`Quartier canonique → POI vérifiés → repères utiles → Carte → page quartier → annonce → Search`

Le produit ne cherche pas à reproduire Google Maps. Il sélectionne les **repères qui structurent réellement la vie et la décision immobilière**.

Exemples : transports structurants, écoles/universités, santé, courses/marchés, parcs/sport, centres commerciaux/services et landmarks structurants.

La vue quartier par défaut reste courte, lisible et décisionnelle : **5 à 8 anchors maximum lorsque la donnée le permet**, puis catégories détaillées à la demande.

---

# 2. Doctrine produit

1. **Vérité avant richesse** : mieux vaut 4 repères prouvés que 8 inventés.
2. **Même identité partout** : un POI garde le même `poi_id` et le même `canonical_neighborhood_id` sur Carte, quartier, homepage et annonce.
3. **Pas de fausse frontière** : un POI proche d’un centroïde n’est jamais présenté comme « dans le quartier » sans preuve territoriale.
4. **Wording sûr** : sans frontière certifiée, utiliser `autour du repère quartier` ou équivalent.
5. **Pas de faux temps** : aucune durée de trajet depuis un centroïde quartier. Les minutes restent réservées à une origine exacte + route réellement mesurée.
6. **Semantic zoom** : national = silence POI ; ville = anchors structurants ; quartier = anchors utiles ; bien exact = proximité + routing/isochrones si autorisés.
7. **Sélection, pas annuaire** : maximum 2 anchors d’une même catégorie dans la sélection par défaut.
8. **Pas de score subjectif** de sécurité, prestige, qualité de vie, rentabilité ou attractivité sans chantier séparé et preuve défendable.
9. **Acquisition hors render path** : aucun appel implicite à un service communautaire au chargement d’une page produit.
10. **Provenance obligatoire** : source, attribution, droits/licence, date d’observation, fraîcheur et confiance sont conservées.
11. **Fail-closed** : donnée invalide, stale ou ambiguë = masquée ou état `insufficient`, jamais reconstruite.
12. **Continuité certifiée** : live prioritaire. Un snapshot certifié peut servir de seed temporaire s’il reste frais, conserve sa provenance et est explicitement marqué `certified_seed`. Il n’est jamais présenté comme live ni comme preuve d’appartenance territoriale.
13. **Aucun déploiement Vercel sans autorisation explicite.**

---

# 3. Fondations mergées à réutiliser

- ANN-L5 Geo Foundation — PR #739, merge `b44bd5d04299a18e778f7e42251cdcb07b364a77`, runs `31943466077` / `31943502557`.
- ANN-L6 Vivre ici — PR #743, merge `2c1cb0650189397c3c350d6bad30b8f8e1d3cecd`, run `31947615421`.
- P6 Ville/Quartier — PR #839, merge `e7f7ac753b1fbb41303cd19f0cb0377bff070512`.
- HVR-4 — PR #859, merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd`.
- Carte nationale N2 — PR #888, run `32704717514`.
- Partner → Neighborhood → Market Intelligence V2 — PR #896, merge `cbfd80af575c0eafc58ae0dc4a2273565a2e46d6`.

Le chantier ne reconstruit aucune de ces briques.

---

# 4. Contrats cibles

## NeighborhoodPoiV1

Identité stable, source, source entity ID, nom normalisé, catégorie `LivingHereCategory`, coordonnées, URL source, attribution/licence, `observed_at`, fraîcheur, confiance et statut `active | stale | rejected`.

## NeighborhoodPoiRelationV1

`canonical_neighborhood_id + poi_id + relation + distance + méthode/preuve + confiance`.

Relations : `inside_certified_boundary | authority_linked | near_certified_reference | unresolved`.

`near_certified_reference` n’est jamais promu automatiquement en `inside_certified_boundary`.

## NeighborhoodAnchorV1

Projection produit déterministe : quartier, POI, rang, catégorie, rôle `structural | daily | contextual`, raison de sélection et wording territorial truth-safe.

---

# 5. Roadmap opérationnelle

## Lot 1 — National POI Source + Registry Foundation — CLOSED ✅

### Goal
Créer la source de vérité POI nationale AkarFinder, reproductible et hors render path.

### Preuve
- PR #904
- HEAD certifié `44e33c74d9a625be07cf46d4d2020ee742353549`
- run `32758616578` SUCCESS
- artifact `9531912146`
- 24/24 tests + ANN-L6, TypeScript et build SUCCESS
- 4/6 pilotes disponibles, 13 POI canoniques, 0 finding vérité
- capture `l1-pilot-registry-proof.png`, score 9,2/10
- validation humaine reçue le 2026-08-24
- merge `b2a899eaf11f945e980a3c39f4e195c51270b859`
- aucun Vercel

---

## Lot 2 — Neighborhood Assignment + Anchor Selection — CLOSED ✅

### Goal
Relier les POI au bon quartier et produire une sélection 5–8 anchors décisionnels sans transformer la proximité en fausse frontière.

### Résultat vérifié
- `NeighborhoodPoiRelationV1` implémenté ;
- `inside_certified_boundary` uniquement avec géométrie `published + reviewed` valide et matching le même quartier canonique ;
- géométrie Casablanca shadow explicitement non certifiante ;
- Polygon/MultiPolygon point-in-polygon ;
- ranking déterministe ;
- max 2 anchors/catégorie ;
- max 8 anchors ;
- états `ready | partial_context | insufficient_context` ;
- wording `Dans le quartier | Rattaché au quartier | Autour du repère quartier` truth-safe ;
- 6 pilotes ;
- 12 anchors ;
- Agdal ready, Malabata partial, Maârif/Guéliz/Founty/Fès insufficient selon données disponibles ;
- 0 faux `inside_certified_boundary` ;
- 0 relation unresolved publiée ;
- 0 truth finding.

### Preuve finale exact-head
- PR **#906** ;
- HEAD final certifié : `ee1356a7442112b4fba0d2f93894222fdcc52dea` ;
- run **`32772338668`** SUCCESS ;
- job `97575431372` SUCCESS ;
- tests L2 + L1 SUCCESS ;
- TypeScript SUCCESS ;
- production build SUCCESS ;
- génération snapshot L1 SUCCESS ;
- assignment + anchor report SUCCESS ;
- capture SUCCESS ;
- final truth gate SUCCESS ;
- artifact **`9536743646`** ;
- digest `sha256:35075c61dfd06c99f759829d000777166505d336a575fbd6001042aee5878901` ;
- capture `l2-anchor-selection-proof.png`, score **9,4/10** ;
- validation humaine explicite reçue le 2026-08-24 ;
- merge squash exact-head : **`fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5`** ;
- le rouge transverse Canonical Baseline observé sur ce HEAD provenait de 3 tests OpenSERP registry + 2 anciens tests CSV partenaire hors des 7 fichiers L2 ; le gate L2 dédié exact-head est entièrement vert ;
- aucun Vercel.

---

## Lot 3 — Neighborhood Context Read Model + API — ACTIVE

### Goal
Créer une projection unique, bornée et fail-closed pour Carte, page quartier, homepage et listing.

### Contrat de réalisation
- même `poi_id` / `canonical_neighborhood_id` partout ;
- projection unique à partir des snapshots L1/L2, sans seconde taxonomie ni DB marché parallèle ;
- `coverage_status` explicite ;
- aucun POI stale/rejected publié ;
- provenance/fraîcheur conservées ;
- API Node fail-closed ;
- paramètres canoniques explicites ;
- cache borné ;
- headers de scope AkarFinder ;
- aucun appel provider réseau dans le render path ;
- persistance/read source explicite et reproductible, jamais inventée.

### Succès
- read-model déterministe pour les 6 pilotes ;
- API retourne le même read-model que le moteur interne ;
- invalid request → 400 ; snapshot/read-model indisponible → 503 ;
- `coverage_status` cohérent avec L2 ;
- aucune identité divergente ;
- tests + TypeScript + build + benchmark read-only ;
- rapport + capture de preuve.

### Human gate
Capture du rapport/read-model pilote + validation utilisateur obligatoire avant fermeture.

---

## Lot 4 — Carte Repères + Semantic Zoom — OPEN

UI gate obligatoire : BEFORE 390/430/768/1280 → Goal → mockup → implémentation → AFTER mêmes viewports → comparaison → score cible ≥9,3/10 → validation utilisateur.

---

## Lot 5 — Convergence Page quartier + Vivre ici + Homepage — OPEN

Même vérité POI/read-model sur les surfaces, suppression progressive des `proximityHighlights` parallèles pour les quartiers couverts. Human gate visuel obligatoire.

---

## Lot 6 — National Scale + Quality/Freshness Certification — OPEN

Couverture `covered | partial | insufficient | unavailable`, refresh reproductible, stale masqué, provenance complète, canaries et certification finale. Human gate final obligatoire.

---

# 6. Règle de fermeture des lots

`implémentation → tests → preuve → capture → validation utilisateur → merge/closeout → lot suivant`

**Aucun lot n’est CLOSED avant validation explicite de sa capture par l’utilisateur.**

Si la CI est verte mais la capture n’est pas validée : `TECH CERTIFIED — HUMAN GATE PENDING`.

---

# 7. Avancement

- Lot 1 : CLOSED ✅
- Lot 2 : CLOSED ✅
- Lot 3 : ACTIVE
- Lot 4 : OPEN
- Lot 5 : OPEN
- Lot 6 : OPEN

**Avancement global vérifié : 2/6 = 33,3 %.**

---

# 8. Git / gouvernance

Fichier maître : `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CANONICAL.md`.

Historique utile :
- `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CONTRACT.md`
- `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_ROADMAP.md`
- `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_HANDOVER.md`

PR roadmap : #902. Lot 1 : #904. Lot 2 : #906.

---

# 9. Next exact

**Lot 3 — Neighborhood Context Read Model + API**

1. auditer le pattern de snapshots/read-models versionnés déjà présent dans le repo ;
2. figer `NeighborhoodContextReadModelV1` ;
3. connecter L1 POI + L2 relations/anchors sans réseau dans le render path ;
4. produire `coverage_status` + provenance + fraîcheur ;
5. exposer `app/api/geo/neighborhood-context/route.ts` fail-closed avec cache borné ;
6. tests identité/coverage/stale/invalid/unavailable ;
7. TypeScript + build + benchmark read-only ;
8. générer rapport + capture des 6 pilotes ;
9. soumettre la capture à validation utilisateur ;
10. aucun Vercel.