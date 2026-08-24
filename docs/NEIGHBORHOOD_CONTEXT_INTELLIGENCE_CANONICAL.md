# AkarFinder — Neighborhood Context Intelligence — CANONICAL

Date : 2026-08-24
Statut : **ACTIVE — Lot 1 CLOSED, Lot 2 ACTIVE**
Autorité : ce fichier est le document maître du chantier. Les anciens CONTRACT / ROADMAP / HANDOVER restent des preuves historiques et de reprise, mais toute décision nouvelle doit être réconciliée ici.

---

# 1. Vision

AkarFinder doit aider à décider **où habiter ou investir**, pas seulement à localiser une annonce.

La couche Neighborhood Context Intelligence transforme chaque quartier canonique en contexte immobilier utile :

`Quartier canonique → POI vérifiés → repères utiles → Carte → page quartier → annonce → Search`

Le produit ne cherche pas à reproduire Google Maps. Il sélectionne les **repères qui structurent réellement la vie et la décision immobilière**.

Exemples :
- transports structurants ;
- écoles / universités ;
- santé ;
- courses / marchés ;
- parcs / sport ;
- centres commerciaux / services ;
- landmarks structurants.

La vue quartier par défaut doit rester courte, lisible et décisionnelle : **5 à 8 anchors maximum lorsque la donnée le permet**, puis catégories détaillées à la demande.

---

# 2. Doctrine produit

1. **Vérité avant richesse** : mieux vaut 4 repères prouvés que 8 inventés.
2. **Même identité partout** : un POI garde le même `poi_id` et le même `canonical_neighborhood_id` sur Carte, quartier, homepage et annonce.
3. **Pas de fausse frontière** : un POI proche d’un centroïde n’est jamais présenté comme « dans le quartier » sans preuve territoriale.
4. **Wording sûr** : sans frontière certifiée, utiliser `autour du repère quartier` ou équivalent.
5. **Pas de faux temps** : aucune durée de trajet depuis un centroïde quartier. Les minutes restent réservées à une origine exacte + route réellement mesurée.
6. **Semantic zoom** : aucun nuage national de POI. National = silence ; ville = anchors structurants ; quartier = anchors utiles ; bien exact = proximité + routing/isochrones si autorisés.
7. **Sélection, pas annuaire** : maximum 2 anchors d’une même catégorie dans la sélection par défaut.
8. **Pas de score subjectif** de sécurité, prestige, qualité de vie, rentabilité ou attractivité sans chantier séparé et preuve défendable.
9. **Acquisition hors render path** : aucun appel implicite à un service communautaire au chargement d’une page produit.
10. **Provenance obligatoire** : source, attribution, droits/licence, date d’observation, fraîcheur et confiance sont conservées.
11. **Fail-closed** : donnée invalide, stale ou ambiguë = masquée ou état `insufficient`, jamais reconstruite.
12. **Continuité certifiée** : l'acquisition live est prioritaire. En cas d'indisponibilité externe, un snapshot antérieurement certifié peut servir de seed temporaire uniquement s'il reste frais selon la policy, conserve sa provenance exacte et est explicitement marqué `certified_seed`. Il n'est jamais présenté comme live ni comme preuve d'appartenance territoriale.
13. **Aucun déploiement Vercel sans autorisation explicite.**

---

# 3. Fondations déjà mergées — à réutiliser

## ANN-L5 — Geo Foundation

PR #739, merge `b44bd5d04299a18e778f7e42251cdcb07b364a77`.

Déjà présent : `GeoTruth`, providers Nearby/Routing/Isochrone, provenance/fraîcheur, failover, règles exact/context/unavailable, benchmark réel Rabat/Casablanca/Marrakech/Tanger.

Preuves : runs `31943466077` et `31943502557`, 32/32 POI réels, 8 catégories/ville, 224/224 routes benchmark.

## ANN-L6 — Vivre ici

PR #743, merge `2c1cb0650189397c3c350d6bad30b8f8e1d3cecd`.

Déjà présent : `LivingHereModel`, taxonomie POI, déduplication, MapLibre, marche/voiture mesurées, isochrones 5/10/15, aucun temps depuis une origine non exacte.

Preuve : run `31947615421` SUCCESS, 8/8 captures, 0 overflow.

## P6 Ville / Quartier

PR #839, merge `e7f7ac753b1fbb41303cd19f0cb0377bff070512`.

Déjà présent : `Territoire → Marché → Vie locale → Biens → Décision`, mini-carte quartier, états truth-safe.

## HVR-4

PR #859, merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd`.

Déjà présent : cards quartier Agdal / Maârif / Guéliz, repères locaux compacts.

## Carte nationale N2

PR #888, run `32704717514` SUCCESS.

Déjà présent : Ville → Quartier, Search `city + district`, Casablanca 1 617 labels, 134 repères cartographiques valides, 0 contour inventé.

## Partner → Neighborhood → Market Intelligence V2

PR #896, merge `cbfd80af575c0eafc58ae0dc4a2273565a2e46d6`.

Déjà présent : identité partenaire stable, Geo Resolver national, même identité quartier aval Search / Carte / fiche quartier.

---

# 4. Problème exact restant

Le repo possède déjà un moteur POI robuste autour d’une annonce, mais les surfaces quartier utilisent encore partiellement un petit dataset curaté (`proximityHighlights`, `lifestyleTags`).

Il manque un chemin national unique :

`Source POI → Registry POI → Relation quartier → Anchor selection → Read-model → Carte / Quartier / Homepage / Vivre ici`

Le nouveau chantier **ne reconstruit pas ANN-L5/L6**. Il nationalise, unifie et industrialise ces fondations.

---

# 5. Contrats cibles

## NeighborhoodPoiV1

- `poi_id` stable ;
- `source_id` ;
- `source_entity_id` ;
- `name` + nom normalisé ;
- catégorie compatible `LivingHereCategory` ;
- coordonnées valides ;
- `source_url` si disponible ;
- attribution ;
- licence / usage policy ;
- `observed_at` ;
- fraîcheur ;
- confiance ;
- `status = active | stale | rejected`.

## NeighborhoodPoiRelationV1

- `canonical_neighborhood_id` ;
- `poi_id` ;
- `inside_certified_boundary | authority_linked | near_certified_reference | unresolved` ;
- distance au repère si applicable ;
- méthode/preuve ;
- confiance.

`near_certified_reference` n’est jamais promu automatiquement en `inside_certified_boundary`.

## NeighborhoodAnchorV1

Projection produit, pas nouvelle vérité :
- quartier ;
- POI ;
- rang ;
- catégorie ;
- rôle `structural | daily | contextual` ;
- raison de sélection déterministe ;
- wording territorial truth-safe.

---

# 6. Roadmap opérationnelle

La phase documentaire de réconciliation est terminée. Les **lots opérationnels commencent ici**.

## Lot 1 — National POI Source + Registry Foundation — CLOSED ✅

### Goal
Créer la source de vérité POI nationale AkarFinder, reproductible et hors render path.

### Résultat vérifié
- `NeighborhoodPoiV1` + validation stricte ;
- identité OSM stable `osm:{node|way|relation}:{id}` ;
- provenance, attribution ODbL, URL source et fraîcheur 30 jours ;
- normalisation Unicode FR/AR ;
- taxonomie ANN-L6 réutilisée ;
- déduplication ;
- snapshot read-only sans réseau ;
- 6 pilotes : Agdal, Maârif, Guéliz, Malabata, Founty, Ville Nouvelle Fès ;
- live prioritaire avec continuité `certified_seed` ANN-L5 uniquement quand prouvée et encore fraîche ;
- Agadir/Fès restent non remplis artificiellement lorsque le live est indisponible ;
- aucune appartenance territoriale `dans le quartier` affirmée au Lot 1.

### Preuve
- PR **#904** ;
- HEAD exact certifié : `44e33c74d9a625be07cf46d4d2020ee742353549` ;
- run **`32758616578`** SUCCESS ;
- job `97531870201` SUCCESS ;
- artifact **`9531912146`** ;
- digest `sha256:377cf1d992a39044e32cbe2b7592edd5f51586f301eeac0158ef053f0f2cd988` ;
- 24/24 tests L1 + ANN-L6 ;
- TypeScript SUCCESS ;
- production build SUCCESS ;
- truth + availability gate SUCCESS ;
- 4/6 pilotes disponibles, 13 POI canoniques, 0 finding vérité ;
- capture `l1-pilot-registry-proof.png` inspectée ;
- score capture : **9,2/10** ;
- validation humaine explicite reçue le 2026-08-24 ;
- merge exact-head : `b2a899eaf11f945e980a3c39f4e195c51270b859` ;
- aucun Vercel.

---

## Lot 2 — Neighborhood Assignment + Anchor Selection — ACTIVE

### Goal
Relier les POI au bon quartier et produire la sélection 5–8 anchors décisionnels.

### Succès
- relation territoriale explicite pour 100 % des anchors publiés ;
- jamais de `dans le quartier` depuis un simple rayon ;
- max 2 anchors/catégorie par défaut ;
- sélection stable entre deux runs sur même snapshot ;
- état `insufficient_context` si couverture insuffisante ;
- revue humaine des 6 quartiers pilotes.

### Preuve technique + human gate
- HEAD technique initial certifié : `83cecc6930f0e2a533f38f882219d94873f6a871` ;
- run `32765709736` SUCCESS ;
- 20/20 tests L2 + L1 ;
- TypeScript SUCCESS ;
- production build SUCCESS ;
- 6 pilotes ;
- 12 anchors ;
- 1 ready / 1 partial / 4 insufficient ;
- 0 faux `inside_certified_boundary` ;
- 0 unresolved publié ;
- 0 truth finding ;
- artifact `9534420232` ;
- capture `l2-anchor-selection-proof.png` ;
- score capture : **9,4/10** ;
- **validation humaine explicite reçue le 2026-08-24**.

`main` ayant avancé indépendamment, le lot a été réaligné sans changement fonctionnel sur `main@677c10efe170a5093ffc5ab80c7d9e097570b1fc`. Nouveau HEAD candidat : `110592b92ef96e4f0cdfff0e9ba339073806e4a2` avant ce commit documentaire.

L2 ne ferme qu’après re-certification exact-head post-réalignement, merge et closeout.

---

## Lot 3 — Neighborhood Context Read Model + API

### Goal
Créer une projection unique pour Carte, page quartier, homepage et listing.

### Succès
- même `poi_id` / `canonical_neighborhood_id` partout ;
- `coverage_status` explicite ;
- aucun stale/rejected publié ;
- read path performant et borné ;
- API fail-closed.

### Human gate
Capture du rapport/read-model pilote + validation utilisateur.

---

## Lot 4 — Carte Repères + Semantic Zoom

### Goal visuel
Ajouter les repères sans dégrader la carte dominante.

### UX
- national : aucun POI ;
- ville : anchors structurants ;
- quartier : 5–8 anchors ;
- filtres Transport / Éducation / Santé / Courses / Parcs-Sport / Services ;
- fiche POI compacte ;
- aucun temps inventé.

### UI gate obligatoire
1. BEFORE 390/430/768/1280 ;
2. Goal + critères ;
3. mockup/wireframe ;
4. implémentation ;
5. AFTER mêmes viewports ;
6. comparaison BEFORE / target / AFTER ;
7. score visuel cible >= 9,3/10 ;
8. **capture soumise à validation utilisateur avant fermeture**.

---

## Lot 5 — Convergence Page quartier + Vivre ici + Homepage

### Goal
Supprimer les POI hardcodés parallèles et réutiliser le read-model national sur toutes les surfaces.

### Succès
- page quartier : anchors nationaux ;
- homepage : mêmes IDs/provenance ;
- listing exact : mêmes POI candidats + routing/isochrone uniquement si position exacte ;
- listing approximatif : contexte quartier sans faux temps ;
- plus de `proximityHighlights` comme source produit principale pour les quartiers couverts.

### Human gate
BEFORE / target / AFTER + score >= 9,3 + validation utilisateur.

---

## Lot 6 — National Scale + Quality/Freshness Certification

### Goal
Passer du pilote à une couverture nationale mesurée et maintenable.

### Succès
- chaque quartier éligible expose `covered | partial | insufficient | unavailable` ;
- aucun quartier manquant silencieusement ;
- aucun anchor sans provenance ;
- stale non publié ;
- refresh reproductible ;
- canaries et métriques de couverture ;
- certification finale API/build/UI/humaine.

### Human gate final
Capture nationale de couverture + captures produit + score + validation utilisateur avant closeout global.

---

# 7. Règle de fermeture des lots

Un lot suit :

`implémentation → tests → preuve → capture → validation utilisateur → merge/closeout → lot suivant`

**Aucun lot n’est CLOSED avant validation explicite de sa capture par l’utilisateur.**

Si la CI est verte mais la capture n’est pas encore validée : statut `TECH CERTIFIED — HUMAN GATE PENDING`.

---

# 8. Avancement

Les anciens lots historiques sont des fondations et ne sont pas recomptés.

- Lot 1 : CLOSED ✅
- Lot 2 : ACTIVE — capture validée, re-certification post-réalignement en attente
- Lot 3 : OPEN
- Lot 4 : OPEN
- Lot 5 : OPEN
- Lot 6 : OPEN

**Avancement global vérifié : 1/6 = 16,7 %.**

Le pourcentage monte uniquement après human gate + fermeture réelle du lot.

---

# 9. Git / gouvernance

Fichiers historiques utiles :
- `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CONTRACT.md`
- `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_ROADMAP.md`
- `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_HANDOVER.md`

Fichier maître :
- `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CANONICAL.md`

PR historique de verrouillage : #902.
Lot 1 : PR #904, merge `b2a899eaf11f945e980a3c39f4e195c51270b859`.
Lot 2 : PR #906.

---

# 10. Next exact

1. re-certifier le HEAD final L2 post-réalignement ;
2. si vert : merge #906 ;
3. closeout canonique L2 ;
4. passer automatiquement à **Lot 3 — Neighborhood Context Read Model + API** ;
5. aucun Vercel.
