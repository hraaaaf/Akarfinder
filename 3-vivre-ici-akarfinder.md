# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET PREMIUM FREEZÉ / LOT 2d EN CERTIFICATION**  
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

Preuves : captures 390 / 430 / 768 / 1280, Maroc, Casablanca → Maârif, Maârif + biens exacts uniquement si réellement éligibles, build/TS/tests, inspection humaine et comparaison TARGET/AFTER.

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

### Lot 2a — shell premium
- run `34030333919` — SUCCESS ;
- artifact `9988409177` ;
- 8/8 captures OK ;
- Maârif : pitch `60°`, bearing `-28°`, zoom `15.5`, bâtiments `49 / 52 / 74 / 82` ;
- carte desktop ≈ `69,8 %` ;
- Maroc strictement 2D ;
- zéro collision top chrome ;
- score visuel humain ~`6,5/10`.

### Lot 2b — convergence perceptuelle
- code `7aabe8f247408e643eb56069e82dc91ce323afe9` ;
- run `34030849447` — SUCCESS ;
- artifact `9988593627` ;
- inspection 8 captures ;
- score visuel humain ~`7,4/10` ;
- target premium non atteint.

### Candidat premium intermédiaire
- code `0d92fccdfbeab346fdad0935d539c52868026e13` ;
- run `34032104891` — SUCCESS ;
- artifact `9988982037` ;
- carte desktop Maârif ≈ `71,9 %` ;
- score visuel humain ~`7,6/10` ;
- target premium non atteint.

### Lot 2c
- code `a884021cf35e6471fdb0b092083d20eeb4ff4d98` ;
- run `34033038551` — SUCCESS ;
- artifact `9989287797`, digest `sha256:0bbe22385f68270dd8e9eececfaa3d4c2ecd05feba074ac5854997bb93b52a30` ;
- navigation contracts, TypeScript, production build, Chromium, 8 captures et proof gate : SUCCESS ;
- Maroc : 2D sur les 4 viewports ;
- Maârif : pitch `60°`, bearing `-28°`, zoom `15.5`, bâtiments `43 / 46 / 65 / 70` ;
- POI Maârif : `2` ;
- carte desktop Maârif ≈ `72,19 %` ;
- bottom sheet mobile visible, hauteur mesurée ≈ `235 px` ;
- zéro collision top chrome ;
- gate : `zeroDbWritesByScript=true`, `zeroDeploymentActionsByScript=true` ;
- inspection visuelle humaine : progression nette mais encore trop technique / dashboard ; **score ~`8,1/10`** ;
- target ≥9 non atteint.

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
- lignes `property_listings` avec sémantique latitude / longitude / coordonnées / précision : **0** ;
- `geo_entities` : **45**, coordonnée exploitable : **0** ;
- `geo_resolution_events` : **102**, coordonnée exploitable : **0** ;
- corpus `mubawab_listing_corpus_v1` : **37 420**, coordonnée exploitable : **0** ;
- le code `isExactMapListing` reste fail-closed et exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + latitude/longitude valides au Maroc ;
- les enrichissements ville/quartier ne produisent pas `exact`.

**Conclusion prouvée : `0` bien est actuellement éligible à un pin/callout `EXACT`.**

Comportement produit requis tant que cet état ne change pas :
- aucun pin bien ponctuel ;
- recherche de biens accessible par CTA ;
- repères de quartier / POI uniquement selon leur propre provenance ;
- aucune fausse précision pour remplir visuellement la carte.

---

## 6. PLAN D’EXÉCUTION

### Lot 1 — Target premium canonique
**✅ FREEZÉ**

### Lot 2 — Convergence 3D + shell premium

#### Lot 2a
**✅ TECHNIQUEMENT CERTIFIÉ / ❌ TARGET VISUEL NON ATTEINT — ~6,5/10**

#### Lot 2b
**✅ TECHNIQUEMENT CERTIFIÉ / ❌ TARGET VISUEL NON ATTEINT — ~7,4/10**

#### Lot 2c
**✅ TECHNIQUEMENT CERTIFIÉ / ❌ TARGET VISUEL NON ATTEINT — ~8,1/10**

#### Lot 2d — convergence éditoriale
**🟡 IMPLÉMENTÉ / EN CERTIFICATION**

Code visuel : `22547e02986ca89fdc998a832c03d48a9477911d`.

Goal :
- desktop carte encore plus dominante ;
- rail droit moins dashboard et plus éditorial ;
- traitement 3D plus chaud / moins bleuté ;
- mobile bottom sheet plus compact et hiérarchisé ;
- aucun changement de donnée ni activation de faux pins.

Run `Vivre Ici AFTER Certification` : `34036441560`, dernier état vérifié après lancement : **in_progress**.

**2d n’est pas certifié avant run vert + artifact + inspection humaine des 8 captures.**

### Lot 3 — Vérité data + biens exacts + vie locale
**✅ TRUTH GATE CERTIFIÉ / MODE FAIL-CLOSED REQUIS**

- audit coordonnées + provenance terminé ;
- `0 EXACT` aujourd’hui ;
- aucun pin bien autorisé ;
- POI/métriques uniquement sourcés ;
- une future activation de pins exige persistance + provenance exacte réellement alimentées, puis nouveau gate.

### Lot 4 — Polish + certification finale
- convergence visuelle restante après 2d si score <9 ;
- typographie, spacing, collisions et labels uniquement si nécessaire ;
- captures mêmes 4 viewports ;
- BEFORE/TARGET/AFTER ;
- score final ≥9 ;
- closeout PR/canonical ;
- human gate merge/Vercel.

---

## 7. ROADMAP

- [x] L0 BEFORE `/map`
- [x] P0 2D
- [x] 3D-L1 technique
- [x] 3D-L2b immersion visible
- [x] Lot 1 Target premium
- [ ] **Lot 2 Convergence 3D + shell premium** — 2c certifié à ~8,1 ; 2d en certification
- [x] Lot 3 Vérité data — truth gate `0 EXACT`, fail-closed
- [ ] Lot 4 Polish + certification premium ≥9
- [ ] P2 terrain / soleil / modèles neufs si données + ROI prouvés

---

## 8. SÉCURITÉ / PRODUCTION

- aucune mutation DB liée au chantier ;
- audit Lot 3 réalisé en lecture seule ;
- aucun déploiement de cette branche autorisé ;
- pas de merge sans human gate explicite ;
- PR `#1025` reste ouverte ;
- CI pending/in-progress n’arrête pas le travail indépendant.

---

## 9. NEXT EXACT

1. run 2d `34036441560` → artifact ;
2. montrer et inspecter les 8 captures ;
3. comparer TARGET / 2c / 2d ;
4. si score <9 : correction visuelle suivante sans modifier le truth gate ;
5. si score ≥9 : Lot 4 certification finale + cohérence canonical ;
6. vérifier PR / CI / HEAD ;
7. human gate merge ;
8. **Vercel uniquement après autorisation explicite d’Achraf**.
