# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET PREMIUM FREEZÉ / CONVERGENCE PREMIUM ACTIVE**  
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
3. vérifier l’état réel LIVE de `/map` ;
4. ne jamais utiliser `/search` comme baseline de ce chantier ;
5. pour tout changement UI/UX : `BEFORE → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel` ;
6. aucune déclaration LIVE sans preuve LIVE distincte ;
7. aucune déclaration 3D sans preuve d’un layer bâtiment réellement rendu, d’une caméra inclinée et de captures inspectées ;
8. le mockup fixe la **qualité perçue, la hiérarchie et les mécanismes UX**, pas des données métier fictives ni un pixel-perfect impossible avec les sources disponibles ;
9. tout chiffre, photo, prix, temps de trajet, distance, POI ou position de bien montré dans un mockup est un **placeholder de design** tant qu’il n’est pas relié à une source prouvée.

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

Les trois vues de référence produites et validées servent désormais de **Goal visuel officiel** :

1. **Desktop Maroc** : vue nationale 2D premium, villes mises en avant, panneau droit contextuel ;
2. **Desktop Casablanca → Maârif 3D** : ville 3D dominante, POI intégrés, quelques biens exacts en callouts, panneau droit `Vivre à Maârif` ;
3. **Mobile Casablanca → Maârif 3D** : 3D lisible, recherche compacte, POI limités, 1–2 biens maximum, bottom sheet premium.

### Standards visuels figés

- la carte est la surface héro ;
- la 3D doit être évidente à l’œil sans devoir expliquer qu’elle existe ;
- header / nav légers et cohérents avec AkarFinder ;
- recherche flottante compacte ;
- filtres POI en pills ;
- toggle 2D / 3D visible ;
- panneau droit desktop dédié au contexte quartier ;
- bottom sheet mobile dédié au contexte quartier ;
- cartes biens discrètes, peu nombreuses et ancrées dans la scène ;
- verre / overlays sobres, ombres légères, hiérarchie typographique nette ;
- aucune densité d’UI qui masque la lecture de la ville.

### Garde-fous de fidélité

- le target est une **référence de qualité perçue**, pas une promesse de photoréalisme exact ;
- aucune géométrie, hauteur, photo aérienne, chiffre ou donnée de quartier ne doit être inventé pour “ressembler” au mockup ;
- si une donnée manque, le composant correspondant est masqué, remplacé par une information prouvée ou présenté comme agrégation explicitement non exacte ;
- aucune valeur marketing du mockup (`26 000 DH/m²`, temps de trajet, nombres d’écoles, etc.) n’est autorisée en produit sans source.

---

## 3. SUCCÈS GLOBAL

Le Goal premium est atteint uniquement si :

1. **3D perceptible** : Casablanca/Maârif lit immédiatement comme une ville en volume sur 390 / 430 / 768 / 1280 ;
2. **carte dominante** : l’UI accompagne la scène sans l’étouffer ;
3. **biens honnêtes** : seuls les biens `EXACT` peuvent devenir des pins/callouts ponctuels ;
4. **contexte premium** : panneau droit desktop et bottom sheet mobile suivent la hiérarchie du target ;
5. **vie locale crédible** : écoles, santé, commerces, transports, parcs uniquement quand sourcés ;
6. **responsive cohérent** : zéro collision ou overflow sur 390 / 430 / 768 / 1280 ;
7. **cohérence visuelle** : desktop Maroc, desktop Maârif 3D et mobile Maârif 3D appartiennent au même système ;
8. **qualité finale** : inspection `BEFORE / TARGET / AFTER` avec score visuel global ≥ **9/10** sans violation du contrat de vérité ;
9. **qualité technique** : build, TypeScript et tests UI/contrats verts ;
10. **sécurité** : aucune mutation DB ni déploiement Vercel sans gate explicite.

### Preuves obligatoires

- captures 390 / 430 / 768 / 1280 ;
- scénario Maroc ;
- scénario Casablanca → Maârif ;
- scénario Casablanca → Maârif + biens exacts si des biens éligibles existent réellement ;
- build + TypeScript + tests UI ;
- comparaison BEFORE / TARGET / AFTER ;
- inspection humaine des collisions, profondeur 3D, densité d’UI et lisibilité des callouts.

---

## 4. ÉTAT PROUVÉ AVANT CONVERGENCE PREMIUM

### P0 2D — fondation prouvée

- BEFORE LIVE `/map` : run `33987108479` — SUCCESS, artifact `9975502810` ;
- AFTER P0 2D : run `33990212630` — SUCCESS, artifact `9976424591` ;
- 8 captures Maroc + Casablanca/Maârif ;
- score visuel **9,0/10 pour le Goal P0 2D uniquement**.

### 3D-L1 — techniquement certifié

- run `33991033589` — SUCCESS ;
- code HEAD `b4a9d2bd0911840a641cd3f20ab678631424dc64` ;
- artifact `9976706376` ;
- pitch `56°`, bearing `-18°`, zoom `14.2` ;
- bâtiments rendus `64 / 68 / 113 / 120` ;
- fidélité perçue réévaluée à ~`5/10`.

### 3D-L2b — immersion visible certifiée

- run `33992903877` — SUCCESS ;
- code HEAD `e5e0727dd107ecd00c6106d0286c3a78ef090841` ;
- artifact `9977221838` ;
- pitch `60°`, bearing `-28°`, zoom `15.5` ;
- bâtiments rendus `43 / 46 / 65 / 70` ;
- Maroc maintenu 2D ;
- POI Maârif préservés ;
- score de fidélité au mécanisme cible ~`7,5/10`.

3D-L2b est prouvé branch-local, pas LIVE.

---

## 5. CONTRAT DE VÉRITÉ GÉOGRAPHIQUE

- `EXACT` : pin / callout ponctuel autorisé ;
- `DISTRICT` : agrégation ou zone seulement ;
- `CITY` : agrégation ville seulement ;
- `UNKNOWN` : aucun pin ;
- aucun jitter ou déplacement artificiel ;
- aucun temps de trajet, distance, frontière, POI ou hauteur 3D inventé ;
- CTA bien/source uniquement pour une entité réellement indexée et reliée à une provenance valide.

État actuel : le modèle connaît la précision géographique, mais la persistance + provenance + mapping DB des biens doivent encore être prouvés avant activation des pins exacts.

---

## 6. PLAN D’EXÉCUTION — 4 LOTS

### Lot 1 — Target premium canonique

**Statut : ✅ FREEZÉ**

- 3 vues officielles : Desktop Maroc / Desktop Maârif 3D / Mobile Maârif 3D ;
- hiérarchie, chrome, 2D/3D, POI, panneau droit, bottom sheet et cartes biens figés ;
- placeholders métier explicitement exclus du contrat produit.

### Lot 2 — Convergence 3D + shell premium

**Goal :** rapprocher l’interface réelle du target sans dépendre encore des données de biens.

- carte plus dominante ;
- lumière / contraste / profondeur / caméra ;
- palette et extrusion mieux lisibles ;
- header, recherche et filtres plus légers ;
- panneau droit desktop + bottom sheet mobile structurés ;
- aucune donnée métier inventée pour remplir le design.

### Lot 3 — Vérité data + biens exacts + vie locale

**Goal :** intégrer le contenu réel dans le shell premium.

- auditer coordonnées + `geo_precision` + provenance ;
- mapper DB correctement ;
- pins/callouts uniquement `EXACT` ;
- agrégations pour `DISTRICT/CITY` ;
- POI et métriques locales uniquement sourcés ;
- si aucun bien exact n’est disponible sur le scénario, le produit doit fail closed et la preuve doit le montrer.

### Lot 4 — Polish + certification finale

- typographie ;
- espacements ;
- animations légères ;
- densité mobile ;
- cohérence des icônes ;
- collisions / labels / callouts ;
- captures 390 / 430 / 768 / 1280 ;
- comparaison BEFORE / TARGET / AFTER ;
- score final ;
- closeout canonical / PR ;
- arrêt au human gate merge/Vercel.

---

## 7. ROADMAP

- [x] L0 BEFORE `/map`
- [x] P0 2D architecture + responsive + certification
- [x] 3D-L1 technique
- [x] 3D-L2b immersion visible
- [x] **Lot 1 Target premium canonique**
- [ ] **Lot 2 Convergence 3D + shell premium**
- [ ] **Lot 3 Vérité data + biens exacts + vie locale**
- [ ] **Lot 4 Polish + certification premium**
- [ ] P2 terrain / soleil / modèles neufs si données + ROI prouvés

---

## 8. SÉCURITÉ / PRODUCTION

- aucune mutation DB liée au chantier ;
- aucun déploiement de la branche observé au dernier contrôle ;
- Vercel visible reste sur `main` au dernier contrôle connu ;
- pas de merge sans human gate explicite ;
- PR `#1025` reste ouverte ;
- l’état de mergeabilité doit être résolu avant tout merge, mais n’empêche pas le travail UI indépendant.

---

## 9. NEXT EXACT

1. auditer l’écart réel entre le shell Maârif actuel et le target premium ;
2. identifier le plus petit lot UI à fort impact sur la perception : carte dominante + chrome + panneau/bottom sheet ;
3. implémenter ce lot sans données fictives ;
4. build + TypeScript + tests ;
5. captures AFTER 390 / 430 / 768 / 1280 ;
6. comparer au target et corriger ;
7. ensuite seulement brancher le Lot 3 data/biens ;
8. closeout Lot 4 puis human gate merge/Vercel.
