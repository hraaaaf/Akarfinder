# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET PREMIUM FREEZÉ / LOT 2a SHELL PREMIUM EN CERTIFICATION**  
**Dernière mise à jour : 2026-09-06**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**Fondation produit : `/map`**  
**Référence UX : mécanisme Bien’ici 3D + mockups AkarFinder premium validés en session, sans clone pixel-perfect**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

---

## 0. RÈGLE DE REPRISE

À toute reprise :

1. lire ce fichier ;
2. vérifier `main`, branche, PR, HEAD et CI ;
3. vérifier l’état réel LIVE de `/map` avant toute déclaration LIVE ;
4. ne jamais utiliser `/search` comme baseline de ce chantier ;
5. pour tout changement UI/UX : `BEFORE → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel` ;
6. aucune déclaration 3D sans layer bâtiment réellement rendu + caméra inclinée + captures inspectées ;
7. le mockup fixe la qualité perçue, la hiérarchie et les mécanismes UX, pas des données métier fictives ;
8. tout chiffre, photo, prix, temps, distance, POI ou position montré dans un mockup reste un placeholder tant qu’il n’est pas relié à une source prouvée.

---

## 1. GOAL PREMIUM OFFICIEL

Transformer **uniquement Vivre ici**, fondé sur `/map`, en une expérience immersive premium de découverte territoriale adaptée au Maroc.

Doctrine produit :

> **Territoire → Marché → Vie locale → Biens**

Cible d’expérience :

> **Maroc 2D premium → ville 3D dominante → quartier / vie locale → biens exacts intégrés dans la scène.**

Cible qualitative validée :

> **Ville 3D immédiatement perceptible + carte dominante + chrome léger + panneau de contexte premium + biens intégrés honnêtement + mobile cohérent.**

`/search` reste la recherche classique de biens.

---

## 2. TARGET PREMIUM CANONIQUE — FREEZE 2026-09-06

Trois vues servent de **Goal visuel officiel** :

1. **Desktop Maroc** : vue nationale 2D premium, villes mises en avant, panneau droit contextuel ;
2. **Desktop Casablanca → Maârif 3D** : ville 3D dominante, POI intégrés, quelques biens exacts en callouts, panneau droit `Vivre à Maârif` ;
3. **Mobile Casablanca → Maârif 3D** : 3D lisible, recherche compacte, POI limités, 1–2 biens maximum, bottom sheet premium.

### Standards figés

- carte = surface héro ;
- 3D évidente à l’œil ;
- header / nav légers ;
- recherche flottante compacte ;
- filtres POI en pills ;
- toggle 2D / 3D visible ;
- panneau droit desktop contextuel ;
- bottom sheet mobile contextuel ;
- cartes biens peu nombreuses et ancrées dans la scène ;
- verre / overlays sobres, ombres légères, hiérarchie typographique nette ;
- aucune densité d’UI qui masque la ville.

### Garde-fous

- target = référence de qualité perçue, pas promesse de photoréalisme exact ;
- aucune géométrie, hauteur, photo, chiffre ou donnée de quartier inventés pour ressembler au mockup ;
- donnée absente = composant masqué, remplacé par une information prouvée ou une agrégation explicitement non exacte ;
- valeurs marketing du mockup interdites en produit sans source.

---

## 3. SUCCÈS GLOBAL

Le Goal premium est atteint uniquement si :

1. Casablanca/Maârif lit immédiatement comme une ville en volume sur 390 / 430 / 768 / 1280 ;
2. la carte domine l’interface ;
3. seuls les biens `EXACT` peuvent devenir des pins/callouts ponctuels ;
4. panneau droit desktop et bottom sheet mobile suivent la hiérarchie du target ;
5. vie locale uniquement sourcée ;
6. zéro collision / overflow aux 4 viewports ;
7. Desktop Maroc / Desktop Maârif / Mobile Maârif appartiennent au même système ;
8. inspection `BEFORE / TARGET / AFTER` avec score global ≥ **9/10** sans violation du contrat de vérité ;
9. build + TypeScript + tests UI/contrats verts ;
10. aucune mutation DB ni déploiement Vercel sans gate explicite.

### Preuves obligatoires

- captures 390 / 430 / 768 / 1280 ;
- scénario Maroc ;
- scénario Casablanca → Maârif ;
- scénario Casablanca → Maârif + biens exacts si des biens éligibles existent réellement ;
- build + TypeScript + tests UI ;
- comparaison BEFORE / TARGET / AFTER ;
- inspection humaine profondeur 3D, densité d’UI, collisions et callouts.

---

## 4. ÉTAT PROUVÉ AVANT TARGET PREMIUM

### P0 2D

- BEFORE LIVE `/map` : run `33987108479` — SUCCESS, artifact `9975502810` ;
- AFTER P0 2D : run `33990212630` — SUCCESS, artifact `9976424591` ;
- score visuel **9,0/10 pour le Goal P0 2D uniquement**.

### 3D-L1

- run `33991033589` — SUCCESS ;
- code HEAD `b4a9d2bd0911840a641cd3f20ab678631424dc64` ;
- artifact `9976706376` ;
- pitch `56°`, bearing `-18°`, zoom `14.2` ;
- bâtiments rendus `64 / 68 / 113 / 120` ;
- fidélité perçue réévaluée ~`5/10`.

### 3D-L2b — immersion visible certifiée

- run `33992903877` — SUCCESS ;
- code HEAD `e5e0727dd107ecd00c6106d0286c3a78ef090841` ;
- artifact `9977221838` ;
- pitch `60°`, bearing `-28°`, zoom `15.5` ;
- bâtiments rendus `43 / 46 / 65 / 70` ;
- Maroc maintenu 2D ;
- POI Maârif préservés ;
- fidélité au mécanisme cible ~`7,5/10`.

3D-L2b est prouvé branch-local, pas LIVE.

---

## 5. CONTRAT DE VÉRITÉ GÉOGRAPHIQUE

- `EXACT` : pin / callout ponctuel autorisé ;
- `DISTRICT` : agrégation ou zone seulement ;
- `CITY` : agrégation ville seulement ;
- `UNKNOWN` : aucun pin ;
- aucun jitter ;
- aucun temps, distance, frontière, POI ou hauteur inventé ;
- CTA bien/source uniquement pour une entité réellement indexée et reliée à une provenance valide.

État actuel : le modèle connaît la précision géographique, mais persistance + provenance + mapping DB des biens restent à prouver avant activation des pins exacts.

---

## 6. PLAN D’EXÉCUTION — 4 LOTS

### Lot 1 — Target premium canonique

**Statut : ✅ FREEZÉ**

- 3 vues officielles Desktop Maroc / Desktop Maârif 3D / Mobile Maârif 3D ;
- hiérarchie, chrome, 2D/3D, POI, panneau droit, bottom sheet et cartes biens figés ;
- placeholders métier explicitement hors contrat produit.

### Lot 2 — Convergence 3D + shell premium

**Statut : 🟡 LOT 2a IMPLÉMENTÉ, EN CERTIFICATION**

**Code sous certification : `022c04cd37081fa8b3231bd0f824ef4ee8516478`**  
**Workflow : `Vivre Ici AFTER Certification` — run `34008751570` — dernier état vérifié : `queued`.**

Lot 2a implémenté :

- desktop recentré vers une géométrie carte/panneau de type `72/28` ;
- carte arrondie et mise en avant ;
- panneau droit `Vivre à Maârif` refondu en contexte premium ;
- onglets `Aperçu / Vie locale / Prix si disponible / Biens` ;
- signaux contextuels uniquement descriptifs ou sourcés ;
- état marché `Fail closed` quand aucune donnée validée n’est disponible ;
- toggle 2D / 3D segmenté ;
- recherche quartier + navigation territoriale + toggle alignés dans le top chrome ;
- mobile/tablette : fiche quartier transformée en vrai bottom sheet ;
- aucune métrique métier ajoutée pour remplir le design.

Gate premium renforcé sur le même HEAD :

- marqueur target `freeze-2026-09-06` ;
- 8 captures Maroc + Maârif ;
- desktop : part de carte ≥ `68 %` ;
- mobile/tablette Maârif : bottom sheet visible ;
- aucun chevauchement navigation / recherche / toggle ;
- 3D Maârif : pitch ≥ `58°`, zoom ≥ `15`, source + layer + bâtiments rendus ;
- Maroc reste 2D ;
- zéro écriture DB / zéro action de déploiement par le gate.

**Lot 2a n’est PAS certifié tant que l’artifact et les captures du run ne sont pas inspectés.**

### Lot 3 — Vérité data + biens exacts + vie locale

**Goal :** intégrer le contenu réel dans le shell premium.

- auditer coordonnées + `geo_precision` + provenance ;
- mapper DB correctement ;
- pins/callouts uniquement `EXACT` ;
- agrégations `DISTRICT/CITY` ;
- POI et métriques locales uniquement sourcés ;
- si aucun bien exact n’est disponible, fail closed et preuve explicite.

### Lot 4 — Polish + certification finale

- typographie, espacements, animations légères ;
- densité mobile, cohérence icônes ;
- collisions / labels / callouts ;
- captures 390 / 430 / 768 / 1280 ;
- comparaison BEFORE / TARGET / AFTER ;
- score final ;
- closeout canonical / PR ;
- human gate merge/Vercel.

---

## 7. ROADMAP

- [x] L0 BEFORE `/map`
- [x] P0 2D architecture + responsive + certification
- [x] 3D-L1 technique
- [x] 3D-L2b immersion visible
- [x] **Lot 1 Target premium canonique**
- [ ] **Lot 2 Convergence 3D + shell premium** — 2a en certification
- [ ] **Lot 3 Vérité data + biens exacts + vie locale**
- [ ] **Lot 4 Polish + certification premium**
- [ ] P2 terrain / soleil / modèles neufs si données + ROI prouvés

---

## 8. SÉCURITÉ / PRODUCTION

- aucune mutation DB liée au chantier ;
- aucun déploiement de cette branche autorisé ;
- pas de merge sans human gate explicite ;
- PR `#1025` reste ouverte ;
- une CI pending/in-progress n’arrête pas le travail indépendant.

---

## 9. NEXT EXACT

1. terminer tout travail indépendant du Lot 2a ;
2. vérifier une fois le run `34008751570` ;
3. si vert : récupérer artifact → inspecter + montrer les 8 captures → comparer TARGET / AFTER → score ;
4. corriger les écarts Lot 2b tant que le shell n’atteint pas le niveau attendu ;
5. ensuite Lot 3 data / biens exacts ;
6. Lot 4 polish / certification ;
7. closeout PR/canonical ;
8. arrêt au human gate merge/Vercel.
