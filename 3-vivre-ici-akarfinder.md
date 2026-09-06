# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET PREMIUM FREEZÉ / LOT 2b EN CERTIFICATION**  
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
2. **Desktop Casablanca → Maârif 3D** : ville 3D dominante, POI intégrés, quelques biens exacts en callouts, panneau `Vivre à Maârif` ;
3. **Mobile Casablanca → Maârif 3D** : 3D lisible, recherche compacte, POI limités, 1–2 biens maximum, bottom sheet premium.

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

Preuves : captures 390 / 430 / 768 / 1280, Maroc, Casablanca → Maârif, Maârif + biens exacts si réellement éligibles, build/TS/tests, inspection humaine et comparaison TARGET/AFTER.

---

## 4. PREUVES ACQUISES

### P0 2D
- BEFORE LIVE : run `33987108479`, artifact `9975502810` ;
- AFTER : run `33990212630`, artifact `9976424591` ;
- score `9,0/10` valable uniquement pour l’ancien Goal P0 2D.

### 3D-L1
- run `33991033589` — SUCCESS ;
- code `b4a9d2bd0911840a641cd3f20ab678631424dc64` ;
- artifact `9976706376` ;
- pitch `56°`, zoom `14.2` ; bâtiments `64 / 68 / 113 / 120` ;
- fidélité perçue réévaluée ~`5/10`.

### 3D-L2b — immersion visible
- run `33992903877` — SUCCESS ;
- code `e5e0727dd107ecd00c6106d0286c3a78ef090841` ;
- artifact `9977221838` ;
- pitch `60°`, bearing `-28°`, zoom `15.5` ; bâtiments `43 / 46 / 65 / 70` ;
- Maroc 2D, POI Maârif préservés ;
- fidélité ~`7,5/10` au mécanisme 3D, avant target premium.

---

## 5. CONTRAT DE VÉRITÉ GÉOGRAPHIQUE

- `EXACT` : pin/callout ponctuel autorisé ;
- `DISTRICT` : agrégation/zone seulement ;
- `CITY` : agrégation ville seulement ;
- `UNKNOWN` : aucun pin ;
- aucun jitter ;
- aucun temps, distance, frontière, POI, hauteur ou métrique inventé ;
- CTA bien/source uniquement pour une entité réellement indexée avec provenance valide.

Persistance + provenance + mapping DB des biens restent à prouver avant activation des pins exacts.

---

## 6. PLAN D’EXÉCUTION

### Lot 1 — Target premium canonique
**✅ FREEZÉ**

### Lot 2 — Convergence 3D + shell premium

#### Lot 2a — Shell premium
**✅ TECHNIQUEMENT CERTIFIÉ / ❌ TARGET VISUEL NON ATTEINT**

Implémenté : géométrie desktop proche `72/28`, carte dominante, panneau premium, onglets, fail-closed marché, toggle segmenté, top chrome aligné, bottom sheet mobile/tablette, aucune donnée fictive.

Historique :
- `022c04cd37081fa8b3231bd0f824ef4ee8516478` → run `34030080046` FAILURE sur `TS2367` uniquement ;
- correctif `782c124090f994d559eda9938b1f22edc5990d65` ;
- recertification `34030333919` → **SUCCESS** ;
- artifact `9988409177` ;
- 8/8 HTTP 200 ;
- Maroc strictement 2D ;
- Maârif 3D : pitch `60°`, bearing `-28°`, zoom `15.5`, bâtiments `49 / 52 / 74 / 82` ;
- POI : 2 ;
- desktop map share ≈ `69,8 %` ;
- bottom sheet visible sous 1024 ;
- aucun overlap top chrome ;
- zéro écriture DB / zéro action de déploiement par le gate.

Inspection humaine des 8 captures : structure améliorée mais scène encore trop technique/monochrome, top chrome mobile trop lourd, bottom sheet trop pauvre. **Score visuel 2a vs target : ~6,5/10.**

#### Lot 2b — Convergence perceptuelle
**🟡 IMPLÉMENTÉ / EN CERTIFICATION**

Code HEAD visuel : `7aabe8f247408e643eb56069e82dc91ce323afe9`.

Implémenté :
- bottom sheet `Vivre à Maârif` enrichi avec uniquement des états vrais ;
- tabs `Aperçu / Vie locale / Biens` ;
- repère sourcé / vie locale via filtres / pin exact requis ;
- palette des volumes 3D réchauffée et contraste par hauteur sourcée ;
- lumière 3D plus chaude et plus forte ;
- chrome mobile fortement compacté ;
- aucune donnée métier fictive.

Gate `Vivre Ici AFTER Certification` : run `34030849447`, dernier état vérifié avant closeout docs : **queued**.

**2b n’est pas certifié avant run vert + artifact + inspection des 8 captures.**

### Lot 3 — Vérité data + biens exacts + vie locale
- auditer coordonnées + `geo_precision` + provenance ;
- mapper DB ;
- pins/callouts uniquement `EXACT` ;
- `DISTRICT/CITY` agrégés ; `UNKNOWN` sans pin ;
- POI/métriques uniquement sourcés.

### Lot 4 — Polish + certification finale
- typographie, espacements, animations légères ;
- densité mobile, icônes, collisions, labels, callouts ;
- captures 4 viewports ;
- BEFORE/TARGET/AFTER ;
- score final ;
- closeout PR/canonical ;
- human gate merge/Vercel.

---

## 7. ROADMAP

- [x] L0 BEFORE `/map`
- [x] P0 2D
- [x] 3D-L1 technique
- [x] 3D-L2b immersion visible
- [x] Lot 1 Target premium
- [ ] **Lot 2 Convergence 3D + shell premium** — 2a prouvé, 2b en certification
- [ ] Lot 3 Vérité data + biens exacts + vie locale
- [ ] Lot 4 Polish + certification premium
- [ ] P2 terrain / soleil / modèles neufs si données + ROI prouvés

---

## 8. SÉCURITÉ / PRODUCTION

- aucune mutation DB liée au chantier ;
- aucun déploiement de cette branche autorisé ;
- pas de merge sans human gate explicite ;
- PR `#1025` reste ouverte ;
- CI pending/in-progress n’arrête pas le travail indépendant.

---

## 9. NEXT EXACT

1. vérifier une fois le run 2b `34030849447` ;
2. si vert : récupérer artifact → inspecter + montrer 8 captures → comparer 2a / TARGET / 2b → score ;
3. si rouge : logs → correction → nouveau gate ;
4. continuer 2c tant que la perception reste sous le niveau cible ;
5. ensuite Lot 3 data/biens exacts ;
6. Lot 4 polish/certification ;
7. closeout PR/canonical ;
8. human gate merge/Vercel.
