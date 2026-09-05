# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — P0 2D PROUVÉ / PIVOT 3D EN CERTIFICATION**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**HEAD code 3D : `b4a9d2bd0911840a641cd3f20ab678631424dc64`**  
**HEAD branche après closeout docs : `5874f19f45c99f06f32165443082a9b4a6a8d84b`**  
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

Le lot P0 2D a établi la base fonctionnelle :

- `/map` devient la rubrique **Vivre ici** ;
- carte nationale Maroc utilisable en 390 / 430 / 768 / 1280 ;
- décision rail territoire / marché / vie locale / biens ;
- navigation ville / quartier ;
- Casablanca → Maârif prouvé ;
- couche POI existante utilisée sans inventer de disponibilité ;
- accès aux biens via `/search` préservé ;
- responsive corrigé, y compris le défaut tablette 768 ;
- collisions Maârif mobile/tablette corrigées.

### BEFORE LIVE `/map`

- run `33987108479` — SUCCESS ;
- artifact `9975502810` ;
- 4 captures LIVE : `390×844`, `430×932`, `768×900`, `1280×900` ;
- 0 écriture DB par le script ;
- 0 action de déploiement par le script.

### AFTER P0 2D branch-local

- run `33990212630` — SUCCESS ;
- artifact `9976424591` ;
- digest `sha256:a95b2c59e5ed6007f02b5b285f6e4190aecbf764e82b35e9ef003f92fe5ccdf9` ;
- 8 captures : Maroc + Casablanca/Maârif sur les 4 viewports ;
- POI controls présents ;
- 2 marqueurs POI observés sur Maârif dans la preuve finale ;
- score visuel P0 2D : **9,0/10** pour le Goal P0 2D uniquement.

### Important

Ce score ne signifie pas fidélité Bien’ici 3D. Sur le nouveau Goal immersif, le P0 2D n’est qu’une fondation.

---

## 3. PIVOT 3D — GOAL ACTIF

Le critère produit a été recalibré après inspection visuelle : une bonne carte 2D enrichie reste trop éloignée du différenciateur Bien’ici.

### Goal exact

À Casablanca, fournir un premier slice réel et prouvable :

- bâtiments extrudés 3D issus d’une source vectorielle publique compatible MapLibre ;
- aucune hauteur maison inventée ;
- caméra `pitch / bearing` ;
- transition depuis la carte nationale 2D ;
- centrage sur le quartier sélectionné quand son repère réel est disponible ;
- toggle 2D / 3D ;
- POI et contexte quartier conservés ;
- aucun déploiement Vercel ;
- aucune mutation DB.

### Implémentation actuelle

- nouveau composant `components/map/National3DBuildingsLayer.tsx` ;
- source vectorielle OpenFreeMap `https://tiles.openfreemap.org/planet` ;
- source-layer `building` ;
- hauteur utilisée : propriété source `render_height` uniquement ;
- layer `fill-extrusion` : `akarfinder-vivre-ici-3d-buildings` ;
- caméra cible Casablanca : zoom `14.2`, pitch `56°`, bearing `-18°` ;
- centrage Maârif via la source existante `akarfinder-national-neighborhood-points` quand le repère est disponible ;
- vue nationale reste 2D ;
- intégration montée depuis `NationalMapRouter`.

### Succès observable 3D

Pour chacun des viewports Maârif `390 / 430 / 768 / 1280` :

1. toggle 3D présent ;
2. source 3D présente ;
3. layer 3D présent ;
4. pitch ≥ 45° ;
5. zoom ≥ 13 ;
6. au moins 1 bâtiment 3D réellement rendu ;
7. contexte Maârif et POI encore présents ;
8. capture inspectée sans collision critique.

Pour les 4 viewports Maroc :

- aucun toggle 3D ;
- aucun layer bâtiment 3D ;
- vue nationale inchangée en 2D.

### Gate actuel

- workflow : `Vivre Ici AFTER Certification` ;
- run : `33991033589` ;
- HEAD code : `b4a9d2bd0911840a641cd3f20ab678631424dc64` ;
- état au dernier contrôle : `queued` ;
- le workflow exige désormais explicitement source + layer + pitch + zoom + bâtiment rendu.

**Le lot 3D n’est pas certifié tant que ce gate et les nouvelles captures ne sont pas inspectés.**

---

## 4. CONTRAT DE VÉRITÉ GÉOGRAPHIQUE

Toujours préserver :

- coordonnées exactes certifiées → pin exact autorisé ;
- quartier seulement → zone / repère explicitement limité ;
- ville seulement → agrégation ville ;
- précision inconnue → aucun faux pin ;
- aucune frontière, POI, distance, temps de trajet ou hauteur 3D inventés.

---

## 5. ROADMAP

- [x] **L0 — BEFORE `/map`** : LIVE 390/430/768/1280.
- [x] **L1 — Référence** : mécanismes Bien’ici identifiés, sans clone pixel-perfect.
- [x] **L2 — Architecture P0 2D** : territoire → marché → vie locale → biens.
- [x] **L3 — Implémentation P0 2D**.
- [x] **L4 — Responsive P0 2D**.
- [x] **L5 — Certification P0 2D** : run `33990212630`, artifact `9976424591`, score 9,0/10 pour le scope 2D.
- [ ] **3D-L1 — Casablanca buildings** : certification exacte en cours, run `33991033589`.
- [ ] **3D-L2 — Convergence visuelle Bien’ici** : lumière, profondeur, hiérarchie overlays, interactions caméra.
- [ ] **3D-L3 — Biens dans le monde 3D** : uniquement selon vérité de géolocalisation.
- [ ] **P1 — Vie locale enrichie** : transports, écoles, santé, commerces, parcs/plages selon sources certifiées.
- [ ] **P2 — Immersion avancée** : terrain, soleil/ombres, modèles de programmes neufs uniquement avec données et ROI prouvés.

---

## 6. SÉCURITÉ / PRODUCTION

- DB : aucune mutation liée au chantier Vivre ici / 3D ;
- Vercel : aucun déploiement de la branche observé au dernier contrôle ;
- dernier déploiement visible reste `main`, pas cette branche ;
- merge interdit sans human gate explicite, car le merge sur `main` peut déclencher la production.

---

## 7. NEXT EXACT

1. attendre uniquement le résultat nécessaire du run `33991033589` sans modifier le code 3D ;
2. si échec : diagnostiquer TypeScript / build / source / rendu bâtiment, corriger puis recertifier ;
3. si succès : récupérer l’artifact `vivre-ici-after` ;
4. montrer les 8 nouvelles captures ;
5. comparer au P0 2D et à la référence 3D ;
6. attribuer un score de fidélité 3D basé sur preuve ;
7. mettre à jour ce canonical avec run/artifact/digest et état réel ;
8. mettre à jour la PR ;
9. poursuivre 3D-L2 si un écart visuel immédiatement corrigeable reste ;
10. ne s’arrêter au gate merge/Vercel qu’une fois le lot branch-local réellement certifié.
