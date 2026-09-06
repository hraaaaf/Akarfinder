# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET PREMIUM FREEZÉ / POST-SYNC RECERTIFICATION EN COURS**  
**Dernière mise à jour : 2026-09-06**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**Fondation produit : `/map`**  
**Référence UX : mécanisme Bien’ici 3D + mockups AkarFinder premium validés en session, sans clone pixel-perfect**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

---

## 0. RÈGLE DE REPRISE

1. lire ce fichier ;
2. vérifier `main`, branche, PR, HEAD et CI ;
3. vérifier l’état réel LIVE de `/map` avant toute déclaration LIVE ;
4. ne jamais utiliser `/search` comme baseline de ce chantier ;
5. UI/UX : `BEFORE → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel` ;
6. aucune déclaration 3D sans layer bâtiment réellement rendu + caméra inclinée + captures inspectées ;
7. le mockup fixe qualité perçue, hiérarchie et mécanismes UX, pas des données métier fictives ;
8. prix, photo, temps, distance, POI, métrique ou position du mockup = placeholder tant qu’aucune source ne le prouve.

---

## 1. GOAL PREMIUM OFFICIEL

Transformer **Vivre ici** (`/map`) en expérience immersive premium adaptée au Maroc.

> **Territoire → Marché → Vie locale → Biens**

> **Maroc 2D premium → ville 3D dominante → quartier / vie locale → biens exacts intégrés dans la scène.**

Cible qualitative : **3D immédiatement perceptible + carte dominante + chrome léger + panneau contextuel premium + biens intégrés honnêtement + mobile cohérent.**

`/search` reste la recherche classique de biens.

---

## 2. TARGET PREMIUM CANONIQUE — FREEZE 2026-09-06

Trois vues servent de Goal visuel officiel :

1. **Desktop Maroc** : national 2D premium, villes mises en avant, panneau droit contextuel ;
2. **Desktop Casablanca → Maârif 3D** : ville 3D dominante, POI intégrés, biens exacts en callouts uniquement si réellement éligibles, panneau `Vivre à Maârif` ;
3. **Mobile Casablanca → Maârif 3D** : 3D lisible, recherche compacte, POI limités, biens exacts maximum 1–2 si disponibles, bottom sheet premium.

Standards : carte héro, 3D évidente, header/nav légers, recherche flottante compacte, filtres POI en pills, toggle 2D/3D, panneau droit desktop, bottom sheet mobile, verre/overlays sobres, cartes biens rares et ancrées dans la scène.

Garde-fous : aucune géométrie, hauteur, photo, prix, temps, métrique ou position inventés pour ressembler au mockup. Donnée absente = composant masqué, fail closed ou agrégation explicitement non exacte.

---

## 3. SUCCÈS GLOBAL

Le Goal premium est atteint uniquement si :

1. Maârif lit immédiatement comme une ville en volume sur 390 / 430 / 768 / 1280 ;
2. la carte domine l’interface ;
3. seuls les biens `EXACT` deviennent des pins/callouts ponctuels ;
4. panneau desktop et bottom sheet mobile suivent la hiérarchie du target ;
5. vie locale uniquement sourcée ;
6. zéro collision / overflow ;
7. Maroc / desktop Maârif / mobile Maârif appartiennent au même système ;
8. `BEFORE / TARGET / AFTER` atteint un score global ≥ **9/10** sans violation du contrat de vérité ;
9. build + TypeScript + tests UI verts ;
10. zéro mutation DB / zéro Vercel sans gate explicite.

Preuves : captures 390 / 430 / 768 / 1280, Maroc, Casablanca → Maârif, build/TS/tests, inspection humaine et comparaison TARGET/AFTER.

---

## 4. PREUVES ACQUISES

### P0 2D
- BEFORE LIVE : run `33987108479`, artifact `9975502810` ;
- AFTER : run `33990212630`, artifact `9976424591` ;
- score `9,0/10` valable uniquement pour l’ancien Goal P0 2D.

### 3D-L1
- run `33991033589` — SUCCESS ;
- artifact `9976706376` ;
- pitch `56°`, zoom `14.2` ; bâtiments `64 / 68 / 113 / 120` ;
- fidélité perçue réévaluée ~`5/10`.

### 3D-L2b
- run `33992903877` — SUCCESS ;
- code `e5e0727dd107ecd00c6106d0286c3a78ef090841` ;
- artifact `9977221838` ;
- pitch `60°`, bearing `-28°`, zoom `15.5` ; bâtiments `43 / 46 / 65 / 70` ;
- Maroc 2D, POI Maârif préservés ;
- fidélité ~`7,5/10`.

### Lot 2a — shell premium
- run `34030333919` — SUCCESS ; artifact `9988409177` ;
- 8/8 captures OK ; carte desktop ≈ `69,8 %` ;
- score visuel humain ~`6,5/10`.

### Lot 2b — convergence perceptuelle
- code `7aabe8f247408e643eb56069e82dc91ce323afe9` ;
- run `34030849447` — SUCCESS ; artifact `9988593627` ;
- score visuel humain ~`7,4/10`.

### Candidat premium intermédiaire
- code `0d92fccdfbeab346fdad0935d539c52868026e13` ;
- run `34032104891` — SUCCESS ; artifact `9988982037` ;
- carte desktop Maârif ≈ `71,9 %` ; score ~`7,6/10`.

### Lot 2c
- code `a884021cf35e6471fdb0b092083d20eeb4ff4d98` ;
- run `34033038551` — SUCCESS ;
- artifact `9989287797`, digest `sha256:0bbe22385f68270dd8e9eececfaa3d4c2ecd05feba074ac5854997bb93b52a30` ;
- navigation contracts, TypeScript, production build, Chromium, 8 captures et proof gate : SUCCESS ;
- Maârif : pitch `60°`, bearing `-28°`, zoom `15.5`, bâtiments `43 / 46 / 65 / 70` ;
- carte desktop ≈ `72,19 %` ; bottom sheet mobile ≈ `235 px` ;
- `zeroDbWritesByScript=true`, `zeroDeploymentActionsByScript=true` ;
- score visuel humain ~`8,1/10`.

### Lot 2d — convergence éditoriale
- code `22547e02986ca89fdc998a832c03d48a9477911d` ;
- run `34036441560` — SUCCESS ;
- artifact `9990349262`, digest `sha256:e3f6822c0f7f55bf0999fac6f1575c95425bd3f001f20161c4b2bec49e9f4971` ;
- navigation contracts, TypeScript, production build, Chromium, 8 captures et proof gate : SUCCESS ;
- carte desktop Maârif ≈ `73,9 %` ; bottom sheet mobile ≈ `202 px` ;
- vérité géographique inchangée, Maroc 2D, Maârif 3D ;
- score visuel humain ~`8,8/10`.

### Lot 2e — matérialité 3D / seuil premium
- code `88df506241d77fbe8d67718fd421f6ac9b7fd496` ;
- run `34039217117` — SUCCESS ;
- artifact `9991177033`, digest `sha256:96b8defdea1f4c06b8eca71f1aaa510b214c02afd3566577f7748389a4ff2d67` ;
- navigation contracts, TypeScript, production build, Chromium, 8 captures et proof gate : SUCCESS ;
- Maârif : pitch `60°`, bearing `-28°`, zoom `15.5`, bâtiments `43 / 46 / 65 / 70` ;
- carte desktop ≈ `73,9 %` ; bottom sheet mobile `202 px` ;
- aucun overlap ; Maroc strictement 2D ;
- `zeroDbWritesByScript=true`, `zeroDeploymentActionsByScript=true` ;
- inspection humaine : **~`9,0/10`**, seuil premium atteint sur le tree pré-sync.

### Synchronisation avec `main` — 2026-09-06
- ancien HEAD Vivre Ici : `88df506241d77fbe8d67718fd421f6ac9b7fd496` ;
- `main` verrouillé : `b8c89681358e93ec254016bcca9b78f4717ea8de` ;
- merge-base : `0c3e3ea3ea86b5cba97a72f67ba0af347215241d` ;
- avant sync : branche 62 commits devant et 69 derrière ;
- intersection des fichiers modifiés par `main` avec les 21 fichiers Vivre Ici : **0** ;
- merge commit construit sans conflit fonctionnel : `f7c28368ce2d9de54be42985e8c690fa3c6e080f` ;
- comparaison `main...f7c28368` : **ahead 63 / behind 0**, exactement les 21 fichiers Vivre Ici attendus ;
- commit d’ancrage de recertification : `45cd3174ca3a6dd10035eadd8755c03116ad1236` ;
- recertification post-sync : run `34042235527`, dernier état vérifié **queued**.

Le seuil ≥9 n’est considéré **finalement certifié sur le tree synchronisé** qu’après run `34042235527` vert + artifact + inspection des 8 captures post-sync.

---

## 5. CONTRAT DE VÉRITÉ GÉOGRAPHIQUE

- `EXACT` : pin/callout ponctuel autorisé ;
- `DISTRICT` : agrégation/zone seulement ;
- `CITY` : agrégation ville seulement ;
- `UNKNOWN` : aucun pin ;
- aucun jitter ;
- aucun temps, distance, frontière, POI, hauteur ou métrique inventé ;
- CTA bien/source uniquement pour une entité réellement indexée avec provenance valide.

### Truth gate Lot 3 — CERTIFIÉ EN LECTURE SEULE

Audit consolidé Supabase production, sans écriture :

- `property_listings` : **7 926** lignes ;
- colonnes géographiques structurées sur `property_listings` : **0** ;
- lignes avec sémantique latitude / longitude / coordonnées / précision : **0** ;
- `geo_entities` : **45**, coordonnée exploitable : **0** ;
- `geo_resolution_events` : **102**, coordonnée exploitable : **0** ;
- `mubawab_listing_corpus_v1` : **37 420**, coordonnée exploitable : **0** ;
- `isExactMapListing` exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + latitude/longitude valides au Maroc ;
- les enrichissements ville/quartier ne produisent pas `exact`.

**Conclusion prouvée : `0` bien est actuellement éligible à un pin/callout `EXACT`.**

Comportement requis : aucun pin bien ponctuel ; CTA vers recherche ; repères/POI uniquement selon provenance ; aucune fausse précision.

---

## 6. PLAN / ROADMAP

- [x] L0 BEFORE `/map`
- [x] P0 2D
- [x] 3D-L1 technique
- [x] 3D-L2b immersion visible
- [x] Lot 1 Target premium
- [x] Lot 2 convergence jusqu’à 2e — tree pré-sync ~`9,0/10`
- [x] Lot 3 vérité data — truth gate `0 EXACT`, fail-closed
- [ ] Lot 4 certification finale post-sync ≥9 — run `34042235527` en cours
- [ ] Closeout canonical + PR
- [ ] Human gate merge
- [ ] P2 terrain / soleil / modèles neufs uniquement si données + ROI prouvés

---

## 7. SÉCURITÉ / PRODUCTION

- aucune mutation DB liée au chantier ;
- audit Lot 3 en lecture seule ;
- aucun déploiement Vercel depuis cette branche ;
- pas de merge sans human gate explicite ;
- PR `#1025` ouverte ;
- CI pending/in-progress n’arrête pas le travail indépendant.

---

## 8. NEXT EXACT

1. run post-sync `34042235527` → résultat + artifact ;
2. montrer et inspecter les 8 captures post-sync ;
3. comparer 2e pré-sync / post-sync aux mêmes viewports ;
4. si régression ou score <9 : corriger puis recertifier ;
5. si ≥9 : marquer Lot 4 final, synchroniser canonical + body PR ;
6. vérifier PR / HEAD / CI / mergeability ;
7. **human gate merge** ;
8. **Vercel uniquement après autorisation explicite d’Achraf**.
