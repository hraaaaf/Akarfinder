# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — PR #1037 MERGÉE / TERRITORY DICTIONARY PHASE ACTIVE / UX L9 PROUVÉE / N3 PROUVÉ / LIVE DATA BLOQUÉ PAR SUPABASE**  
**Dernière mise à jour : 2026-09-18**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `feat/vivre-ici-territory-dictionary`**  
**PR d’intégration : `#1037` MERGÉE dans `main`**  
**PR historique source : `#1025` OPEN / `mergeable=false` / `72` fichiers / `247` commits — ne pas merger directement**  
**Main courant de reprise : `256fb9a00a22f240ba7684a99dff3a5619b6ad56` — merge commit PR #1037**  
**HEAD source historique : `75d28ef7652bda9a59b0ed1ac5a0a81d418d0aee`**  
**HEAD produit source L9 certifié : `f1f4d35ecdd0a5a6b83df1dc945e2d291e9b2533`**  
**Commit transplant produit : `0c84954d1c2ce53938677e9cb2b89e9241c52260`**  
**HEAD exact de certification intégration : `f5d5bce0edac47021953cd7cb091fc60fde52cdd`**  
**Commit restauration triggers / arbre produit final : `33e30f72b6c26e02a60f460d6fad73856c717599`**  
**Arbre produit final : `b04bc649746b5b2a3733e058af0ca59df8dc2930`**  
**Phase intégration historique : closeout merge atteint. Territory Dictionary : `53 / 53 pts` prouvés.**  
**Vercel : aucun déploiement sans autorisation explicite d’Achraf.**

---

## 1. GOAL / SUCCÈS / PREUVE

### Goal
Réintégrer Vivre Ici `/map` sur le `main` courant sans régresser le shell/navigation, tout en conservant national → ville → quartier → MapLibre 3D → Search, les truth gates fail-closed et aucune fausse précision immobilière.

### Succès observable
- delta produit basé directement sur le `main` courant ;
- shell/navigation récent préservé ;
- TypeScript + build + contrats navigation verts ;
- AFTER national + N3 vert sur `390×844 / 430×932 / 768×900 / 1280×900` ;
- N3 national → Casablanca → Maârif → Search vert ;
- 0 requête Supabase dans le harness AFTER, 0 write DB, 0 deployment action ;
- BEFORE ↔ AFTER ↔ TARGET inspectés ;
- arrêt au human merge gate.

### État
**Intégration/UI : PROUVÉE et mergée via PR #1037. Nouvelle phase active : lecture territoriale progressive Maroc → ville → quartier → repère. Live data : NON CERTIFIABLE tant que Supabase reste restreint.**

---

## 2. TARGET LOCK

- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions revérifiées : `1536 × 1024`
- SHA-256 revérifié : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- score visuel interne après intégration : **9,2/10** ; `≥9,8` non certifié.

Le TARGET n’autorise jamais à inventer photo, prix, météo, score, proximité, distance, position ou donnée immobilière.

---

## 3. ARCHITECTURE À PRÉSERVER

- `/map` = fondation Vivre Ici ;
- MapLibre 3D réutilisable par ville/quartier ;
- bâtiments vectoriels OpenFreeMap ;
- `city + district + layer=explore` → MapLibre local ;
- fallback national truth-safe ;
- C7 marché séparé, `layer=price|density|listings` ;
- truth gate géographique fail-closed ; aucun faux pin immobilier ;
- Esri imagery = prototype tant que licence/support/attribution prod ne sont pas verrouillés ;
- aucune donnée synthétique en DB.

---

## 4. PREUVES HISTORIQUES UTILES

- N2 fallback national : run `34585399296` ✅
- N3 historiques : `34619850294` ✅ / `34624935625` ✅
- Synthetic Market final : run `34624935672` ✅, artifact `10273807531`, digest `sha256:17a13f57cbb314e413dd873192c23c0a896400d4c94b186a563826ea5f5b64b4`
- UX L9 source AFTER : run `35271588119` ✅ sur `f1f4d35e…`, artifact `10519291559`, digest `sha256:4e280feee73a0881b2bcb565f98fdf031d44d637781b5722e2c90f93281fc5e8`
- UX L9 source N3 : run `35271588076` ✅
- BEFORE visuel durable : run `34977355451`, artifact `10399777496`

Piège : le BEFORE historique utilise lui-même des noms `map-after-*`. Toujours distinguer par run + artifact ID.

---

## 5. INTÉGRATION CURRENT MAIN — 2026-09-17

Base historique PR #1025 : `b8c89681358e93ec254016bcca9b78f4717ea8de`.

Main actuel vérifié avant et après intégration : `8578f7a492980dcac35e7a094383c70411ca44c5`.

### Intersection live réelle : 5 fichiers
1. `components/layout/MobileBottomNav.tsx`
2. `scripts/audits/ux-bottom-nav-10of10-1.mjs`
3. `scripts/audits/ux-premium-bottomnav-glass-1.mjs`
4. `scripts/scrapers/__tests__/ux-bottom-nav-10of10-1.test.ts`
5. `scripts/scrapers/__tests__/ux-premium-bottomnav-glass-1.test.ts`

**Décision : contrat `main` conservé sur ces 5 fichiers.** Navigation actuelle : `PRODUCT_MOBILE_BOTTOM_NAV`, `/map → Vivre ici`, cinq destinations approuvées, glass contract courant.

### Transplant
- PR source : `72` chemins ;
- overlaps conservés main : `5` ;
- docs différés au closeout : `3` ;
- produit/harness transplanté initialement : **64 chemins** ;
- commit : `0c84954d1c2ce53938677e9cb2b89e9241c52260` ;
- parent direct : `8578f7a492980dcac35e7a094383c70411ca44c5`.

Le diff `main → 0c84954d…` contient exactement ces 64 chemins et aucun overlap.

---

## 6. CERTIFICATION INTÉGRATION EXACT-HEAD

Le connecteur ne permettant pas `workflow_dispatch`, les deux workflows ont été temporairement autorisés sur la branche d’intégration uniquement. Aucun code produit n’a changé pour cela.

HEAD commun de certification : `f5d5bce0edac47021953cd7cb091fc60fde52cdd`.

### AFTER
Run `35282869300` — **SUCCESS**  
Artifact `10523630593`  
Digest `sha256:c4d0fe087d7194bb5554c109f87d5d9750ffd088d9f2edf94a4a0bc15822a4fb`

Preuves : navigation contracts, `npm ci`, TypeScript, production build, Chromium/capture et validator verts. 8/8 scénarios : HTTP 200, overflow 0, Supabase 0, page errors 0. National : 12 régions. N3 : MapLibre ready, OpenFreeMap vector, 52–77 bâtiments selon viewport, faux signal grid masqué si `anchorCount=0`, retour Maroc et CTA Search exacts. `zeroDbWritesByScript=true`, `zeroDeploymentActionsByScript=true`.

### N3
Run `35282869261` — **SUCCESS**  
Artifact `10523455762`  
Digest `sha256:700a62489b3943345ca505829e11e92801a4a0420cf232d9fe9a7e351432eb4b`

`report.json`: `ok=true`; 390 + 1280, Casablanca → Maârif, MapLibre ready, Search rendu, handoff `/search?city=Casablanca&district=Ma%C3%A2rif`, overflow 0.

### Triggers restaurés
Commit `33e30f72b6c26e02a60f460d6fad73856c717599` restaure l’arbre produit final `b04bc649746b5b2a3733e058af0ca59df8dc2930`.

Blobs workflows source rétablis :
- AFTER `32e06198cc44267c47628768d3b9fb17b754c369`
- N3 `62cf743d21457b30d61bcbf7354a615a6b7f2556`

Aucun code produit n’a changé après le HEAD certifié ; seulement les triggers puis les docs de closeout.

---

## 7. VISUEL

Comparaison réelle effectuée contre BEFORE `34977355451 / 10399777496` aux mêmes viewports et contre le TARGET LOCK SHA vérifié.

Constat :
- national : territoire nettement plus dominant aux 4 viewports ;
- N3 mobile : plus map-first ;
- faux `0 repères / 0 catégories / Exact` supprimés lorsqu’ils ne sont pas prouvés ;
- `← Maroc` visible ;
- shell `main` préservé (`Vendre` au lieu de l’ancien `Alertes`) ;
- desktop reste moins riche/contextuel que le TARGET.

**Score maintenu : 9,2/10.**

---

## 8. LIVE DATA — SUPABASE

Blocage externe connu : `exceed_egress_quota` → gates live fail-closed.

La lane synthétique et les preuves locales/intégration ne remplacent pas la vérité live. Ne pas rerun en boucle. Dès restauration : rerun uniquement les gates live échoués.

---

## 9. GATES OUVERTS

1. **Supabase egress** — live data non certifiable.
2. **Provider imagerie** — licence/support/attribution prod à verrouiller.
3. **Sécurité npm/Next** — lot séparé ; pas de `npm audit fix --force` aveugle.
4. **Vercel** — aucun deployment sans autorisation explicite.
5. **Territory Dictionary** — nouvelle phase active ; données de priorité éditoriale séparées de la vérité géographique canonique.

PR #1025 reste historique/source. PR #1037 est mergée ; merge commit `256fb9a00a22f240ba7684a99dff3a5619b6ad56`.

---

## 10. ROADMAP — TERRITORY DICTIONARY / PROGRESSIVE MAP EXPLORATION

### Goal global

Construire un moteur déterministe de lecture territoriale qui hiérarchise ce que la carte montre selon le niveau de zoom :

`Maroc → villes → quartiers → repères`.

Une entité plus importante apparaît plus tôt et garde la priorité d'affichage sur les entités moins importantes. À mesure que l'utilisateur zoome, la densité augmente progressivement sans perdre les villes/quartiers/repères phares.

### Règle d'architecture

La vérité d'identité reste dans les registres géographiques existants (`geo-entity-registry.ts`, dictionnaires/centroïdes validés). La nouvelle couche ajoute uniquement :

- importance éditoriale ;
- hiérarchie parent/enfant ;
- politique de visibilité par zoom ;
- catégorie de repère ;
- priorité de collision/rétention.

Elle ne doit pas créer une seconde source de vérité géographique ni transformer un centroïde approximatif en position exacte.

### Lots / effort

- [x] **LOT 1 — Canonical Territory Dictionary contract — 3 pts ✅**  
  Schéma unique `city | district | landmark`, importance, parentage, coordonnées/précision, zoom policy, validateurs et fixtures contractuelles Casablanca/Rabat/Marrakech.

- [x] **LOT 2 — National city dictionary + importance hierarchy — 5 pts ✅**  
  Hiérarchiser les villes marocaines : villes phares d'abord, puis grandes villes régionales, villes secondaires et locales. Les villes phares gardent la priorité pendant le zoom.

- [x] **LOT 3 — District dictionary by city — 8 pts ✅**  
  Dictionnaire des quartiers par ville avec `importanceScore` éditorial, aliases et rattachement aux entités canoniques existantes.

- [x] **LOT 4 — Landmark dictionary by district — 8 pts ✅**  
  Repères utiles à l'orientation par quartier : patrimoine, gare, parc, plage, centre commercial, université, hôpital, grand axe, etc. Importance hiérarchisée et source/validation explicites.

- [x] **LOT 5 — National zoom visibility engine — 8 pts ✅**  
  Zoom faible : villes phares. Zoom intermédiaire : villes régionales. Zoom supérieur : villes secondaires/locales. Priorité persistante aux villes phares + gestion de collision.

- [x] **LOT 6 — Local City → District → Landmark engine — 8 pts ✅**  
  Dans chaque ville : quartiers majeurs puis secondaires ; dans chaque quartier : repères majeurs puis secondaires. Aucun repère local ne doit masquer une entité phare.

- [x] **LOT 7 — Collision / density / visual stability — 5 pts ✅**  
  Limites de densité, hysteresis de zoom, stabilité des labels et priorité déterministe pour éviter chevauchement/clignotement.

- [x] **LOT 8 — Progressive data enrichment — 5 pts ✅**  
  Ajouter de nouvelles villes/quartiers/repères par données seulement, sans modifier le moteur.

- [x] **LOT 9 — Final map certification — 3 pts ✅**  
  BEFORE/AFTER mêmes viewports, parcours Maroc → ville → quartier → repère, retour national, tests MapLibre et score visuel.

**Effort total : 53 pts.**  
**Progression prouvée : 53 / 53 pts. Les 23/23 quartiers canoniques ont au moins un landmark vérifié.**

### Certification LOT9 — 2026-09-18

- HEAD produit certifié : `ad65a371a027ce2fe53c73cdf838d63c201dae25`
- Territory Dictionary Contract : run `35348279560` ✅
- Territory Dictionary Visual Certification : run `35348279557` ✅
- artifact : `10547579617`
- digest : `sha256:670ca0b80662816140df5ec608f87d9d4dc9ea94eb5d4f557a46b497a2fbcabc`
- 4 viewports : `390×844 / 430×932 / 768×900 / 1280×900`
- national initial : 6 flagship visibles — Tanger, Fès, Rabat, Casablanca, Marrakech, Agadir
- zoom national : 8/8 villes réellement visibles — + Kénitra + Mohammedia
- collision : 0 overlap sur les 4 viewports
- horizontal overflow : 0
- Supabase requests : 0
- page errors : 0
- régions visibles après zoom : 12/12 sur 390, 430 et 768 ; 11/12 sur 1280
- N3 Casablanca → Maârif reste vert dans le même artifact
- aucune écriture DB ; aucun déploiement Vercel

LOT9 est fermé sur preuve réelle et inspection visuelle. Le score visuel global antérieur reste `9,2/10` ; aucun score supérieur n’est revendiqué sans revue dédiée.

### Certification LOT4 finale — 2026-09-18

- HEAD produit certifié : `7251abf030eb5d08f96a899a4a8d3585657b411a`
- couverture : 23/23 quartiers canoniques avec au moins un landmark vérifié
- Territory Dictionary Contract : run `35353870995` ✅
- Territory Dictionary Visual Certification : run `35353871008` ✅
- file d’enrichissement : vide
- aucun déploiement Vercel ; aucune écriture Supabase



### Formule de départ

`visibilityScore = importance × zoomRelevance × collisionPriority`

Cette formule est une direction produit ; le contrat LOT 1 doit rester assez stable pour permettre d'ajuster le moteur sans réécrire les dictionnaires.

### Succès global

- hiérarchie compréhensible au premier regard ;
- villes phares visibles avant les villes secondaires ;
- densité croissante avec le zoom ;
- priorité conservée aux entités phares ;
- quartiers puis repères révélés progressivement ;
- aucune fausse précision géographique ;
- aucune dépendance obligatoire à Supabase pour le dictionnaire statique ;
- moteur extensible par données.

---

## 11. CLOSEOUT INTÉGRATION #1037

- [x] TARGET LOCK + SHA revérifié
- [x] truth gate fail-closed
- [x] MapLibre national / multi-ville
- [x] N2 + N3 certifiés
- [x] Synthetic Market séparé et certifié
- [x] UX L9 source certifiée
- [x] transplant ciblé sur current main
- [x] shell/navigation main préservé
- [x] TypeScript + build intégration verts
- [x] AFTER 4 viewports + N3 exact-HEAD verts
- [x] BEFORE ↔ AFTER ↔ TARGET inspectés
- [x] triggers CI temporaires restaurés
- [x] PR #1037 mergée
- [x] main post-merge = `256fb9a00a22f240ba7684a99dff3a5619b6ad56`
- [ ] restaurer Supabase + rerun live ciblé
- [ ] sécurité Next/npm
- [ ] provider/licence/attribution
- [ ] Vercel uniquement avec autorisation explicite

### Anomalie post-merge connue

`UI All Pages Baseline` run `35284093140` échoue sur le test statique `scripts/__tests__/mon-projet-naming-convergence.test.ts` : il cherche encore les labels directement dans `SiteHeader.tsx` / `MobileBottomNav.tsx` alors que la navigation courante est centralisée dans `lib/product-navigation.ts`. Aucun correctif direct sur `main` n'est autorisé dans cette phase sans branche dédiée.

---

## 12. NEXT EXACT

**Closeout PR #1038.**

LOT4 est certifié à 23/23 quartiers canoniques sur le HEAD produit `7251abf030eb5d08f96a899a4a8d3585657b411a`.

Preuves finales LOT4 :
- Territory Dictionary Contract : run `35353870995` ✅
- Territory Dictionary Visual Certification : run `35353871008` ✅
- couverture landmarks : 23/23 quartiers canoniques
- enrichment queue : vide
- aucune écriture Supabase
- aucun déploiement Vercel

Next : cohérence canonique + PR ready. Merge uniquement sur instruction explicite.

## 13. REPRISE

Lire d’abord `docs/handovers/2026-09-18-vivre-ici-territory-dictionary-handover.md` — handover canonique de la phase Territory Dictionary 53/53 — puis ce fichier. Re-vérifier `main`, la branche Territory Dictionary, PR #1038 et CI avant toute écriture.

Le handover historique `docs/handovers/2026-09-17-vivre-ici-pr1025-main-integration-handover.md` reste utile uniquement pour l’historique d’intégration #1037.

`3-vivre-ici-akarfinder.md — Vivre Ici AkarFinder — Territory Dictionary 53/53 pts`
