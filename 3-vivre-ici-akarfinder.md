# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — 3D-L2b CERTIFIÉ / 3D-L3 BIENS EN 3D ACTIF**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
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

Cible visuelle :

> **Maroc 2D → ville 3D → quartier / vie locale → biens.**

`/search` reste la recherche classique de biens.

---

## 2. P0 2D — FONDATION PROUVÉE

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

Le P0 2D est la fondation, pas la cible finale Bien’ici 3D.

---

## 3. 3D-L1 CASABLANCA — TECHNIQUEMENT CERTIFIÉ

### Preuve exacte

- run `33991033589` — SUCCESS ;
- code HEAD `b4a9d2bd0911840a641cd3f20ab678631424dc64` ;
- artifact `9976706376` ;
- digest `sha256:67f416481841e99836fa93f50d517167c9f1f8c321c94853d5ab610187561a80` ;
- pitch `56°`, bearing `-18°`, zoom `14.2` ;
- bâtiments réellement rendus : `64 / 68 / 113 / 120` ;
- POI Maârif : 2 ;
- Maroc maintenu 2D ;
- aucune écriture DB / aucune action de déploiement par le gate.

### Réévaluation visuelle

La preuve technique était correcte, mais l’impression perçue restait trop proche d’une carte inclinée 2,5D. Le score initial `6,5/10` a été retiré après inspection humaine et retour utilisateur.

**Fidélité perçue L1 réévaluée : ~5/10.**

---

## 4. 3D-L2b — IMMERSION VISIBLE CERTIFIÉE

### Goal

La 3D doit être immédiatement visible à l’œil, pas seulement validée par des métriques MapLibre.

### Implémentation

- zoom cible `15.5` ;
- pitch `60°` ;
- bearing `-28°` ;
- lumière 3D dédiée ;
- contraste / gradient vertical des façades basé sur les hauteurs sourcées ;
- aucun changement de géométrie ni de hauteur inventée ;
- chrome mobile/tablette allégé ;
- rail bas masqué en 3D mobile/tablette ;
- recherche / toggle / fiche quartier repositionnés ;
- Maroc reste 2D ;
- POI Maârif préservés.

### Preuve exacte

Workflow `Vivre Ici AFTER Certification` :

- run `33992903877` — **SUCCESS** ;
- code HEAD `e5e0727dd107ecd00c6106d0286c3a78ef090841` ;
- artifact `9977221838` ;
- digest `sha256:78cb01d6a7c0c014f10f2584a620e53dd0d1fc270e2f5d822301a333d5057e0b` ;
- 8/8 HTTP 200 ;
- Maroc 390/430/768/1280 : pitch `0`, aucun layer/source/toggle 3D ;
- Maârif 390/430/768/1280 : source + layer + toggle 3D présents ;
- pitch `60°`, bearing `-28°`, zoom `15.5` sur les 4 viewports ;
- bâtiments réellement rendus : `43 / 46 / 65 / 70` ;
- POI controls présents ;
- 2 marqueurs POI observés sur chaque viewport Maârif ;
- aucune écriture DB / aucune action de déploiement par le gate.

### Inspection visuelle

- 390/430 : volumes clairement perceptibles, carte dominante et lisible malgré la fiche quartier ;
- 768 : effet urbain 3D net, bonne profondeur ;
- 1280 : ville 3D clairement lisible avec rail décisionnel séparé ;
- limite principale restante : palette encore monochrome / technique et absence de biens intégrés dans la scène.

**Score de fidélité au mécanisme Bien’ici : ~7,5/10.**

3D-L2b est certifié branch-local. Ce n’est pas une preuve LIVE.

---

## 5. 3D-L3 — BIENS EN 3D ACTIF

### Goal

Afficher les biens dans la scène 3D **uniquement lorsque leur vérité géographique permet un positionnement honnête**.

### Contrat

- `EXACT` : pin bien autorisé ;
- `DISTRICT` : agrégation / zone seulement, aucun faux pin exact ;
- `CITY` : agrégation ville seulement ;
- `UNKNOWN` : aucun pin ;
- aucun jitter ou déplacement artificiel pour donner l’illusion de précision ;
- CTA vers la fiche / source seulement sur entité réellement indexée.

### Succès attendu

1. source de biens branchée en lecture seule ;
2. pins 3D visibles uniquement pour coordonnées certifiées ;
3. district/city/unknown exclus des pins exacts ;
4. interaction pin → bien / source cohérente ;
5. captures 390/430/768/1280 ;
6. aucune DB / aucun Vercel.

---

## 6. CONTRAT DE VÉRITÉ GLOBAL

- pin exact seulement si exact certifié ;
- quartier seulement → zone/repère limité ;
- ville seulement → agrégation ville ;
- inconnu → aucun faux pin ;
- aucune frontière, POI, distance, temps de trajet ou hauteur 3D inventés.

---

## 7. ROADMAP

- [x] L0 BEFORE `/map`
- [x] P0 2D architecture + implémentation + responsive
- [x] P0 2D certification : run `33990212630`, artifact `9976424591`
- [x] 3D-L1 Casablanca buildings : run `33991033589`, artifact `9976706376`
- [x] **3D-L2b immersion visible** : run `33992903877`, artifact `9977221838`
- [ ] **3D-L3 Biens en 3D** : vérité géographique stricte
- [ ] P1 Vie locale enrichie
- [ ] P2 terrain / soleil / modèles neufs si données + ROI prouvés

---

## 8. SÉCURITÉ / PRODUCTION

- aucune mutation DB liée au chantier ;
- aucun déploiement de la branche observé au dernier contrôle ;
- Vercel visible reste sur `main` ;
- pas de merge sans human gate explicite.

---

## 9. NEXT EXACT

1. inventorier le provider / modèle actuel des biens cartographiques ;
2. identifier la précision géographique réellement disponible ;
3. brancher uniquement les biens `EXACT` dans la scène 3D ;
4. tester les exclusions `DISTRICT/CITY/UNKNOWN` ;
5. capturer les 4 viewports Maârif + contrôles nationaux nécessaires ;
6. score visuel 3D-L3 ;
7. closeout PR/canonical ;
8. arrêt au human gate merge/Vercel.
