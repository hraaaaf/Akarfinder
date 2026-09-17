# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — INTÉGRATION CURRENT MAIN CERTIFIÉE / UX L9 PROUVÉE / N3 PROUVÉ / LIVE DATA BLOQUÉ PAR SUPABASE / HUMAN MERGE GATE**  
**Dernière mise à jour : 2026-09-17**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `integration/vivre-ici-main-2026-09-17`**  
**PR d’intégration : `#1037` DRAFT / `mergeable=true` / NON MERGÉE**  
**PR historique source : `#1025` OPEN / `mergeable=false` / `72` fichiers / `247` commits — ne pas merger directement**  
**Main de base vérifié : `8578f7a492980dcac35e7a094383c70411ca44c5`**  
**HEAD source historique : `75d28ef7652bda9a59b0ed1ac5a0a81d418d0aee`**  
**HEAD produit source L9 certifié : `f1f4d35ecdd0a5a6b83df1dc945e2d291e9b2533`**  
**Commit transplant produit : `0c84954d1c2ce53938677e9cb2b89e9241c52260`**  
**HEAD exact de certification intégration : `f5d5bce0edac47021953cd7cb091fc60fde52cdd`**  
**Commit restauration triggers / arbre produit final : `33e30f72b6c26e02a60f460d6fad73856c717599`**  
**Arbre produit final : `b04bc649746b5b2a3733e058af0ca59df8dc2930`**  
**Avancement canonique : `92 %` — conservé tant que Supabase live + merge gate restent ouverts.**  
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
**Intégration/UI : PROUVÉE. PR #1037 : DRAFT, merge non autorisé. Live data : NON CERTIFIABLE tant que Supabase reste restreint.**

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

1. **PR #1037 DRAFT / human merge gate** — merge explicitement non autorisé à ce stade.
2. **Supabase egress** — live data non certifiable.
3. **Provider imagerie** — licence/support/attribution prod à verrouiller.
4. **Sécurité npm/Next** — lot séparé ; pas de `npm audit fix --force` aveugle.
5. **Vercel** — aucun deployment sans autorisation explicite.

PR #1025 reste historique/source, dirty et non mergeable ; ne pas l’utiliser comme véhicule de merge.

---

## 10. ROADMAP / CLOSEOUT

- [x] TARGET LOCK + SHA revérifié
- [x] truth gate fail-closed
- [x] MapLibre national / multi-ville
- [x] N2 + N3 certifiés
- [x] Synthetic Market séparé et certifié
- [x] UX L9 source certifiée
- [x] main re-vérifié
- [x] intersection PR/main recalculée live
- [x] transplant ciblé sur branche sûre
- [x] shell/navigation main préservé
- [x] TypeScript + build intégration verts
- [x] AFTER 4 viewports + N3 exact-HEAD verts
- [x] BEFORE ↔ AFTER ↔ TARGET inspectés
- [x] triggers CI temporaires restaurés
- [x] PR #1037 DRAFT créée, mergeable, non mergée
- [x] canonique + handovers cohérents
- [ ] **human merge gate PR #1037**
- [ ] merge autorisé + post-merge checks
- [ ] restaurer Supabase + rerun live ciblé
- [ ] sécurité Next/npm
- [ ] provider/licence/attribution
- [ ] Vercel uniquement avec autorisation explicite

---

## 11. NEXT EXACT

**STOP AU HUMAN MERGE GATE.**

Prochaine action uniquement après autorisation explicite : merger **PR #1037** dans `main`, puis exécuter les checks post-merge et mettre à jour ce canonique.

Supabase et Vercel restent deux gates séparés : restauration/reruns live pour Supabase ; aucun Vercel sans autorisation spécifique.

---

## 12. REPRISE

Lire ce fichier puis `docs/handovers/2026-09-17-vivre-ici-pr1025-main-integration-handover.md`, puis re-vérifier `main`, PR #1037 HEAD/CI et Supabase avant toute écriture.

`3-vivre-ici-akarfinder.md — Vivre Ici AkarFinder — 92 %`
