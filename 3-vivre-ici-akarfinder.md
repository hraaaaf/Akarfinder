# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — P0 2D PROUVÉ / PIVOT 3D EN CERTIFICATION**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**HEAD code 3D certifié par le gate courant : `b4a9d2bd0911840a641cd3f20ab678631424dc64`**  
**Fondation produit : `/map`**  
**Référence UX : Bien’ici 3D, adaptée au Maroc, sans clone pixel-perfect**  
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
7. aucune déclaration 3D sans preuve d’un layer bâtiment réellement rendu, d’une caméra inclinée et de captures inspectées.

---

## 1. GOAL

Transformer **uniquement Vivre ici**, fondé sur `/map`, en une expérience immersive de découverte territoriale inspirée du mécanisme Bien’ici et adaptée au Maroc.

Doctrine produit :

> **Territoire → Marché → Vie locale → Biens**

Nouvelle cible visuelle :

> **Maroc 2D → ville 3D → quartier / vie locale → biens.**

`/search` reste la recherche classique de biens.

---

## 2. P0 2D — FONDATION PROUVÉE

- `/map` devient la rubrique **Vivre ici** ;
- Maroc utilisable en 390 / 430 / 768 / 1280 ;
- décision rail territoire / marché / vie locale / biens ;
- navigation ville / quartier ;
- Casablanca → Maârif prouvé ;
- POI sourcés conservés ;
- accès aux biens via `/search` préservé ;
- responsive et collisions Maârif corrigés.

### BEFORE LIVE `/map`

- run `33987108479` — SUCCESS ;
- artifact `9975502810` ;
- 4 captures LIVE 390/430/768/1280.

### AFTER P0 2D branch-local

- run `33990212630` — SUCCESS ;
- artifact `9976424591` ;
- digest `sha256:a95b2c59e5ed6007f02b5b285f6e4190aecbf764e82b35e9ef003f92fe5ccdf9` ;
- 8 captures Maroc + Casablanca/Maârif ;
- 2 marqueurs POI observés sur Maârif ;
- score visuel **9,0/10 pour le Goal P0 2D uniquement**.

Ce score ne signifie pas fidélité Bien’ici 3D. Le P0 2D est désormais une fondation.

---

## 3. PIVOT 3D — GOAL ACTIF

### Goal exact

À Casablanca :

- bâtiments extrudés 3D issus d’une source vectorielle publique ;
- aucune hauteur maison inventée ;
- caméra `pitch / bearing` ;
- transition Maroc 2D → ville 3D ;
- centrage quartier sélectionné si son repère réel est disponible ;
- toggle 2D / 3D ;
- POI et contexte quartier conservés ;
- aucune DB / aucun Vercel.

### Implémentation code HEAD `b4a9d2b…`

- `components/map/National3DBuildingsLayer.tsx` ;
- OpenFreeMap `https://tiles.openfreemap.org/planet` ;
- source-layer `building` ;
- hauteur source `render_height` uniquement ;
- layer `akarfinder-vivre-ici-3d-buildings` ;
- zoom `14.2`, pitch `56°`, bearing `-18°` ;
- centrage Maârif via `akarfinder-national-neighborhood-points` ;
- montage via `NationalMapRouter` ;
- vue Maroc maintenue 2D.

### Succès observable

Maârif, chacun des viewports `390 / 430 / 768 / 1280` :

1. toggle 3D présent ;
2. source 3D présente ;
3. layer 3D présent ;
4. pitch ≥ 45° ;
5. zoom ≥ 13 ;
6. ≥1 bâtiment réellement rendu ;
7. contexte quartier / POI présents ;
8. aucune collision critique après inspection.

Maroc, 4 viewports : aucun toggle/layer 3D.

### Gate actuel

- workflow `Vivre Ici AFTER Certification` ;
- run `33991033589` ;
- HEAD code `b4a9d2bd0911840a641cd3f20ab678631424dc64` ;
- dernier état vérifié : TypeScript `SUCCESS`, build `in_progress` ;
- gate durci : source + layer + pitch + zoom + bâtiment rendu.

**3D-L1 non certifié tant que le run et les captures ne sont pas inspectés.**

---

## 4. CONTRAT DE VÉRITÉ

- pin exact seulement si exact certifié ;
- quartier seulement → zone/repère limité ;
- ville seulement → agrégation ville ;
- inconnu → aucun faux pin ;
- aucune frontière, POI, distance, temps de trajet ou hauteur 3D inventés.

---

## 5. ROADMAP

- [x] L0 BEFORE `/map`
- [x] P0 2D architecture + implémentation + responsive
- [x] P0 2D certification : run `33990212630`, artifact `9976424591`
- [ ] **3D-L1 Casablanca buildings** : run `33991033589` en cours
- [ ] **3D-L2 Convergence Bien’ici** : lumière, profondeur, overlays, caméra
- [ ] **3D-L3 Biens en 3D** : seulement selon vérité géographique
- [ ] P1 Vie locale enrichie
- [ ] P2 terrain / soleil / modèles neufs si données + ROI prouvés

---

## 6. SÉCURITÉ / PRODUCTION

- aucune mutation DB liée au chantier ;
- aucun déploiement de la branche observé au dernier contrôle ;
- Vercel visible reste sur `main` ;
- pas de merge sans human gate explicite.

---

## 7. NEXT EXACT

1. vérifier le run `33991033589` une fois utilement ;
2. si échec : diagnostiquer et corriger ;
3. si succès : récupérer l’artifact ;
4. montrer les 8 captures ;
5. comparer au P0 2D et à Bien’ici 3D ;
6. score 3D fondé sur preuve ;
7. closeout canonical + PR ;
8. poursuivre 3D-L2 si écart visuel corrigeable ;
9. arrêt uniquement au gate merge/Vercel une fois le lot branch-local certifié.
