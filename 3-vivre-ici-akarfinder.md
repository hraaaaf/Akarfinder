# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — 3D-L1 CERTIFIÉ / 3D-L2 EN CERTIFICATION**  
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

## 3. 3D-L1 CASABLANCA — CERTIFIÉ

### Implémentation

- `components/map/National3DBuildingsLayer.tsx` ;
- OpenFreeMap `https://tiles.openfreemap.org/planet` ;
- source-layer `building` ;
- hauteur source `render_height` uniquement ;
- aucune hauteur bâtiment inventée ;
- layer `akarfinder-vivre-ici-3d-buildings` ;
- zoom `14.2`, pitch `56°`, bearing `-18°` ;
- centrage Maârif via `akarfinder-national-neighborhood-points` ;
- toggle 2D / 3D ;
- vue Maroc maintenue 2D ;
- POI et contexte quartier conservés.

### Preuve exacte

Workflow `Vivre Ici AFTER Certification` :

- run `33991033589` — **SUCCESS** ;
- code HEAD `b4a9d2bd0911840a641cd3f20ab678631424dc64` ;
- artifact `9976706376` ;
- digest `sha256:67f416481841e99836fa93f50d517167c9f1f8c321c94853d5ab610187561a80` ;
- 8/8 HTTP 200 ;
- Maroc 390/430/768/1280 : pitch `0`, aucun layer/source/toggle 3D ;
- Maârif 390/430/768/1280 : source + layer + toggle 3D présents ;
- pitch `56°`, bearing `-18°`, zoom `14.2` sur les 4 viewports ;
- bâtiments réellement rendus : `64 / 68 / 113 / 120` ;
- POI controls présents ;
- 2 marqueurs POI observés sur chaque viewport Maârif ;
- aucune écriture DB / aucune action de déploiement par le gate.

### Inspection visuelle

- 3D réelle, lisible et centrée sur Maârif ;
- mobile 390/430 : beaucoup de chrome masque encore la carte ;
- tablette : 3D convaincante mais panneau bas trop dominant ;
- desktop : vraie profondeur, mais duplication du contexte entre carte et rail latéral ;
- fidélité actuelle au mécanisme Bien’ici : **6,5/10**.

**3D-L1 est certifié. La fidélité finale Bien’ici ne l’est pas.**

---

## 4. 3D-L2 — CONVERGENCE VISUELLE ACTIVE

### Goal

Rendre la ville 3D dominante :

1. réduire le chrome redondant ;
2. supprimer la duplication des CTAs/panneaux ;
3. libérer l’espace mobile/tablette ;
4. garder recherche quartier, POI et CTA biens accessibles ;
5. renforcer le contraste des volumes sans modifier leur géométrie ni leurs hauteurs.

### Implémentation actuelle

Code HEAD `30fc76a3a045545e030f85e52219c2b4252d023c` :

- carte territoire compacte en vue 3D ;
- CTA dupliqué masqué ;
- rail bas Vivre ici masqué sur mobile/tablette en vue Casablanca 3D ;
- recherche quartier remontée ;
- fiche quartier repositionnée au-dessus de la bottom-nav ;
- toggle 3D repositionné ;
- bâtiments légèrement plus contrastés (`#C5CFD8`, opacity `0.96`) sans changement de hauteur/source.

### Gate courant

- workflow `Vivre Ici AFTER Certification` ;
- run `33992302013` ;
- HEAD code `30fc76a3a045545e030f85e52219c2b4252d023c` ;
- dernier état vérifié : `queued`.

**3D-L2 non certifié tant que les nouvelles captures ne sont pas inspectées.**

---

## 5. CONTRAT DE VÉRITÉ

- pin exact seulement si exact certifié ;
- quartier seulement → zone/repère limité ;
- ville seulement → agrégation ville ;
- inconnu → aucun faux pin ;
- aucune frontière, POI, distance, temps de trajet ou hauteur 3D inventés.

---

## 6. ROADMAP

- [x] L0 BEFORE `/map`
- [x] P0 2D architecture + implémentation + responsive
- [x] P0 2D certification : run `33990212630`, artifact `9976424591`
- [x] **3D-L1 Casablanca buildings** : run `33991033589`, artifact `9976706376`
- [ ] **3D-L2 Convergence Bien’ici** : run `33992302013` en cours
- [ ] **3D-L3 Biens en 3D** : seulement selon vérité géographique
- [ ] P1 Vie locale enrichie
- [ ] P2 terrain / soleil / modèles neufs si données + ROI prouvés

---

## 7. SÉCURITÉ / PRODUCTION

- aucune mutation DB liée au chantier ;
- aucun déploiement de la branche observé au dernier contrôle ;
- Vercel visible reste sur `main` ;
- pas de merge sans human gate explicite.

---

## 8. NEXT EXACT

1. vérifier le run `33992302013` une fois utilement ;
2. si échec : diagnostiquer et corriger ;
3. si succès : récupérer l’artifact ;
4. montrer les 8 nouvelles captures ;
5. comparer 3D-L1 → 3D-L2 → Bien’ici ;
6. score 3D-L2 fondé sur preuve ;
7. poursuivre 3D-L3 si la convergence visuelle est suffisante ;
8. arrêt uniquement au gate merge/Vercel une fois le lot branch-local certifié.
