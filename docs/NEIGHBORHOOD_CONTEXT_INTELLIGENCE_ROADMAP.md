# AkarFinder — Neighborhood Context Intelligence — ROADMAP

Date : 2026-08-24
Base auditée : `main@8a049eef165e9d93ba673d9cbd37d0715d8a82a1`
Statut : **ACTIVE — 1/7 lots fermés = 14,3 %**

## Goal global

Construire une couche nationale de **repères utiles de quartier** qui transforme les fondations déjà présentes en une expérience cohérente :

`Quartier canonique → POI vérifiés → anchors utiles → Carte → page quartier → Vivre ici → Search`

La réussite n’est pas d’afficher le plus de POI possible. La réussite est d’afficher **les bons repères, au bon niveau de zoom, avec la bonne précision et la bonne provenance**.

## Succès global

Le chantier est fermé lorsque :
- une source POI nationale est ingérée hors render path ;
- chaque POI publié conserve source / licence / attribution / fraîcheur ;
- la relation POI ↔ quartier est explicite et fail-closed ;
- une sélection déterministe de 5–8 anchors utiles existe quand la donnée le permet ;
- les pages quartier, la Carte et `Vivre ici` utilisent le même read-model ;
- aucun temps de trajet n’est produit depuis un simple centroïde quartier ;
- aucun POI proche n’est présenté comme « dans le quartier » sans preuve territoriale ;
- la Carte reste map-first et ne devient pas un sapin de Noël de 200 pins ;
- la couverture nationale est mesurée, avec états explicites pour les quartiers insuffisamment couverts ;
- les changements UI sont certifiés 390 / 430 / 768 / 1280 avec BEFORE / target / AFTER + score ;
- aucune activation Vercel n’est effectuée sans autorisation explicite.

---

# Lot 1 — Réconciliation + contrat canonique ✅ CLOSED

## Goal

Inventorier tout le travail POI/quartier déjà mergé et figer un seul contrat avant nouvelle implémentation.

## Succès

- ANN-L5, ANN-L6, P6, HVR-4, N2 et Partner Market Intelligence réconciliés ;
- doublons et gaps identifiés ;
- contrat `NeighborhoodPoiV1 / NeighborhoodPoiRelationV1 / NeighborhoodAnchorV1` verrouillé ;
- doctrine précision / temps / provenance / semantic zoom verrouillée.

## Preuve

- `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CONTRACT.md` ;
- cette roadmap ;
- handover canonique associé ;
- relecture depuis le HEAD de la branche documentaire.

## Pourquoi ce lot est réellement fermé

Aucun runtime n’était nécessaire : le problème de Lot 1 était la fragmentation du design et des contrats. Les briques réelles ont été relues sur `main`, et les références mergées sont conservées dans le contrat.

---

# Lot 2 — National POI Source + Registry Foundation

## Goal

Créer une source de vérité POI AkarFinder nationale et reproductible, découplée du rendu web.

## À construire

- types `NeighborhoodPoiV1` + validation ;
- adaptateur(s) source vers le contrat canonique ;
- IDs stables et idempotence ;
- provenance / licence / attribution / fraîcheur ;
- normalisation des catégories vers `LivingHereCategory` ;
- déduplication source/name/distance ;
- snapshot/registry read-only pour runtime ;
- aucun appel réseau communautaire implicite au chargement d’une page ;
- migration éventuelle du petit dataset statique `proximityHighlights` vers fixtures de compatibilité, sans perte silencieuse.

## Pilote

Rabat/Agdal, Casablanca/Maârif, Marrakech/Guéliz, Tanger/Malabata, Agadir/Founty, Fès/Ville Nouvelle.

## Succès

Pour chacun des 6 pilotes :
- pipeline reproductible ;
- POI validés ou état explicite insuffisant ;
- au moins les catégories disponibles réellement dans la source, sans remplissage artificiel ;
- source/licence/observed_at présents ;
- 0 dépendance réseau dans le render path ;
- tests idempotence + malformed data + droits/provenance.

## Preuve

Tests ciblés + TypeScript + build + rapport de couverture pilote.

---

# Lot 3 — Neighborhood Assignment + Anchor Selection

## Goal

Relier les POI au bon quartier et sélectionner les repères réellement utiles à la décision immobilière.

## À construire

- `NeighborhoodPoiRelationV1` ;
- relation `inside_certified_boundary / authority_linked / near_certified_reference / unresolved` ;
- aucun faux `inside` depuis un rayon ;
- scoring déterministe de décision, sans score subjectif de qualité de quartier ;
- priorité anchors structurants / quotidien ;
- max 2 anchors par catégorie par défaut ;
- 5–8 anchors si la donnée le permet ;
- déduplication ;
- `insufficient_context` si la preuve manque ;
- possibilité de demander ensuite une catégorie complète sans surcharger la vue initiale.

## Succès

Sur les 6 pilotes :
- sélection stable entre deux runs sur même snapshot ;
- relation territoriale explicite pour 100 % des anchors publiés ;
- aucune assertion `dans le quartier` issue d’un simple centroïde ;
- diversité de catégories lorsque la source la permet ;
- revue humaine du top 5–8 par quartier.

## Preuve

Fixtures + tests + rapport de sélection + échantillon humain documenté.

---

# Lot 4 — Neighborhood Context Read Model + API

## Goal

Fournir une seule projection aval pour Carte / page quartier / homepage / listing.

## À construire

Read-model par `canonical_neighborhood_id` :
- anchors par défaut ;
- catégories disponibles ;
- relation territoriale ;
- provenance / fraîcheur ;
- `coverage_status` ;
- wording territorial sûr ;
- version de snapshot ;
- cache/read path borné ;
- aucune duplication de strings POI dans les composants React.

## Succès

- même `poi_id` et même `canonical_neighborhood_id` sur toutes les surfaces ;
- API/read-model fail-closed ;
- aucun POI stale/rejected publié ;
- compatibilité avec les pages sans géométrie quartier certifiée ;
- perf mesurée sur le dataset pilote puis national.

## Preuve

Tests contrat + API + build + benchmark read-only.

---

# Lot 5 — Carte « Repères » + Semantic Zoom

## Goal visuel

Ajouter une couche `Repères` utile sans dégrader la carte dominante déjà certifiée.

## UX cible

- National : aucun bruit POI ;
- Ville : anchors structurants seulement lorsque utile ;
- Quartier : 5–8 anchors sélectionnés ;
- filtres contextuels : Transport / Éducation / Santé / Courses / Parcs & sport / Services ;
- sélection d’un POI = fiche compacte, pas panneau géant ;
- `Voir autour du quartier` lorsque la frontière n’est pas certifiée ;
- aucune durée inventée.

## Process UI obligatoire

1. captures BEFORE mêmes viewports ;
2. Goal écrit ;
3. mockup/wireframe avant code ;
4. implémentation ;
5. captures AFTER 390 / 430 / 768 / 1280 ;
6. comparaison BEFORE / target / AFTER ;
7. score visuel cible >= 9,3/10.

## Succès

- map-first conservé ;
- aucun overflow ;
- 0 erreur navigateur ;
- POI collision-safe ;
- semantic zoom démontré ;
- navigation quartier/Search intacte ;
- aucune régression Market Intelligence.

---

# Lot 6 — Convergence Page quartier + « Vivre ici » annonce

## Goal

Supprimer la duplication entre contexte quartier statique et `LivingHereModel` listing-specific.

## À construire

### Page quartier

- anchors issus du read-model national ;
- catégories + provenance/fraîcheur ;
- pas de temps de trajet depuis centroïde ;
- CTA vers Carte/Search.

### Listing exact

- reprend les mêmes POI IDs comme candidats ;
- route/isochrone uniquement si origine listing exacte + preuve route fraîche ;
- conserve le contrat ANN-L6 ;
- si position du bien est approximative : contexte quartier uniquement.

### Homepage

- HVR-4 consomme le même read-model ;
- plus de `proximityHighlights` indépendants hardcodés pour les quartiers couverts.

## Succès

Un POI affiché sur homepage, page quartier, Carte et listing porte la même identité/provenance ; seule la précision de l’interaction change selon le contexte.

## Preuve

Contrats + régression ANN-L6 + captures UI + tests de non-divergence.

---

# Lot 7 — National Scale + Quality / Freshness Certification

## Goal

Passer du pilote à la couverture nationale réellement mesurable et maintenable.

## À construire

- job de refresh reproductible ;
- métriques de couverture par ville/quartier/catégorie ;
- stale/rejected/insufficient explicites ;
- détection de régressions de source ;
- provenance/licence auditables ;
- canaries quartiers ;
- monitoring coût/latence du read-model ;
- closeout docs + roadmap.

## Succès

Pour chaque quartier canonique éligible au produit :
- statut de contexte explicite `covered | partial | insufficient | unavailable` ;
- aucun quartier manquant silencieusement ;
- aucun anchor sans provenance ;
- aucune donnée stale publiée au-delà de sa policy ;
- couverture nationale publiée uniquement sous forme de métriques vérifiées ;
- certification finale UI + API + build + tests + revue humaine.

Le seuil chiffré de couverture `covered` sera figé après le baseline réel de Lot 2, pas inventé avant d’avoir mesuré la source.

---

# Dépendances

Chemin critique :

`L1 Contract → L2 Registry → L3 Assignment/Anchors → L4 Read-model → L5 Map UX → L6 Surface convergence → L7 National certification`

L5 et L6 ne doivent pas reconstruire des données localement : ils attendent L4.

## Ce qu’on ne refait pas

- `GeoTruth` ;
- provider contracts ;
- routing / isochrone truth rules ;
- MapLibre foundation ;
- Geo Entity Registry ;
- Neighborhood ID national ;
- Partner Market Intelligence ;
- Search handoff `city + district`.

## Avancement

- Lot 1 : CLOSED ✅
- Lots 2–7 : OPEN
- **Global : 1/7 = 14,3 %**

## Next exact

**Lot 2 — National POI Source + Registry Foundation** : partir de `lib/geo/living-here.ts`, `lib/geo/provider-contracts.ts`, `lib/geo/providers/overpass-nearby.ts` et du registre quartier canonique, puis créer le nouveau modèle/snapshot POI national sans toucher à l’UI.

Aucun déploiement Vercel sans autorisation explicite.
