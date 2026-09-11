# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET LOCK CONSERVÉ / MAPLIBRE NATIONAL VALIDÉ / CLOSEOUT VISUEL PROUVÉ / INTÉGRATION PR #1025 RESTANTE**  
**Dernière mise à jour : 2026-09-11**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `spike/vivre-ici-maplibre-morocco`**  
**Dernier HEAD produit validé : `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a`**  
**Main vérifié avant closeout : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2` — toujours re-fetch avant intégration/merge**  
**PR #1025 : OPEN / branche `docs/3-vivre-ici-akarfinder` / dernier HEAD vérifié `56fcf05b2bf8c3cedccc46f55a7ad2cd8dfb469a` — re-fetch obligatoire avant écriture**  
**Fondation produit : `/map`**  
**Avancement chantier : `92 %`**  
**Vercel : aucun déploiement sans autorisation explicite d’Achraf.**

---

## 1. GOAL / SUCCÈS / PREUVE

### Goal
Transformer `/map` en expérience territoriale premium AkarFinder : carte héro 3D dominante, quartier lisible, rail desktop éditorial, bottom sheet mobile premium, aucune fausse précision et moteur scalable du quartier au Maroc.

### Succès observable
- moteur MapLibre réutilisable sur plusieurs villes/quartiers ;
- composition proche du TARGET LOCK ;
- captures réelles `390 / 430 / 768 / 1280` ;
- TypeScript + build + visual gate verts ;
- truth gate géographique fail-closed ;
- aucun faux pin immobilier ;
- aucun DB write pour ce chantier ;
- aucun Vercel sans human gate ;
- score final honnête contre TARGET.

### État du Goal
Le **lot visuel MapLibre est clos avec preuve**. Le chantier global reste ACTIVE car l’intégration dans PR #1025, la CI PR, le human merge gate, le post-merge et les audits provider/sécurité restent à faire.

---

## 2. TARGET LOCK — AUTORITÉ VISUELLE DURABLE

- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- stockage durable : Google Drive
- Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions : `1536 × 1024`
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- seuil historique souhaité : `≥9,8/10`

Le TARGET est une autorité de composition et de qualité visuelle. Il n’autorise pas à inventer photo, prix, météo, score, proximité, temps, distance, position ou données immobilières.

**Conclusion finale de ce lot :** le seuil `≥9,8` n’est pas certifié avec le raster Esri actuel. Une poursuite par simple grade global dégrade le tissu urbain avant d’atteindre la mer/lumière du TARGET. Toute ambition `≥9,8` exige désormais un lot distinct sur le provider/imagerie ou une autre stratégie de rendu, pas une nouvelle série de micro-tweaks.

---

## 3. TRUTH GATE GÉOGRAPHIQUE

Audit production read-only historique :
- `property_listings` : `7 926`, aucune coordonnée exploitable ;
- `geo_entities` : `45`, géométrie exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige :
- `geo_precision="exact"` ;
- provenance `scraped_coordinates|manual_import` ;
- coordonnées valides au Maroc.

**Conclusion de l’audit de référence : `0` bien éligible à un pin/callout EXACT.** Aucun faux pin immobilier n’est autorisé.

---

## 4. ARCHITECTURE RETENUE — MAPLIBRE NATIONAL

L’ancienne reconstruction manuelle quartier par quartier est abandonnée.

- `MapLibreNeighborhood3D.tsx` paramétré ville/quartier/centre ;
- MapLibre GL ;
- bâtiments vectoriels globaux OpenFreeMap ;
- imagerie Esri comme provider de prototype tant que conformité/licence production non explicitement prouvée ;
- données quartier via registre canonique ;
- `/map` utilise MapLibre pour les couples ville + quartier canoniques ;
- vue nationale ville seule indépendante ;
- aucun asset bâtiment spécifique Maârif requis ;
- aucun DB write ;
- aucun déploiement Vercel.

Data policy 3D : hauteur explicite = factuelle ; floors explicites = estimation déclarée si utilisée ; hauteur inconnue = éventuel rendu visuel jamais persisté/exposé comme hauteur factuelle.

### Scalabilité prouvée
Commit `628947bb24bf247a73c5161b64a25fc47aafe33c` — run `34513592437` ✅

- Casablanca / Maârif : `66` volumes desktop ;
- Rabat / Agdal : `96` ;
- Marrakech / Guéliz : `53` ;
- HTTP `200`, render `ready`, source `available` ;
- required failed requests `0` ;
- DB writes `0`, deployment actions `0`.

---

## 5. INTÉGRATION RÉELLE DANS `/map`

Commit `11769c0c2e7a9abb262bd19614efb314f9d5b4b3` — run `34526882196` ✅  
Artifact `10171990999` — digest `sha256:75c4223becbdb1bfe0f3342a8c64a88a14455b1d59ada3d121546f6fbd4327b0`

Maârif intégré : desktop `68` volumes, mobile `45`, TypeScript/build/capture SUCCESS, DB `0`, deploy `0`.

---

## 6. POLISH UI — PREUVES

### 6.1 Doublon outro
- premier essai `5917eaf3...` : CI verte mais BEFORE/AFTER identique, non retenu ;
- correction effective `6185cfed2d70c371ff6f6c6390f65d1fe7c5fb54` ;
- run `34531542541` ✅ ; artifact `10173769689` ;
- desktop `67` / mobile `45`, HTTP/render/source OK, DB `0`, deploy `0`.

### 6.2 Rail desktop premium
HEAD `e1c59a3f5e1428d20981122bfd8af7cf3966d813` — run `34534627318` ✅ — artifact `10174979779`.

### 6.3 Hero photo rail + harness
Feature `aebee4e2dd49d7340e9722876eadb3f53cc31975`  
HEAD produit précédent `d4a71d8c75dfa947b5a31f1261f2666828751692`  
Run `34536609567` ✅ — artifact `10175712833`.

Score BEFORE final grade : cadrage `8,8`, 3D/façades `8,7`, lumière `8,6`, mer/environnement `8,4`, rail/hiérarchie `9,3`, global `8,9/10`.

### 6.4 Grade satellite final — décision prouvée
Variables gelées pendant ce lot : caméra, zoom, pitch, bearing, bâtiments 3D, labels/POI, rail, bottom sheet, truth gate et logique nationale.

Baseline raster :
```ts
"raster-brightness-min": 0.20,
"raster-brightness-max": 1,
"raster-contrast": -0.08,
"raster-saturation": -0.02,
```

#### Passe 1 — retenue
Commit `5e3c1f8400cbc877193f44ba416d540674e3dc0a`  
Changement unique : `raster-saturation -0.02 → 0.12`  
Run `34571508754` ✅  
Artifact `10187991385`  
Digest `sha256:f1c0e470f9770e14e37d7a3acc8ad48d38971c760ea101fcd7c071f3f404b798`

Effet : tissu urbain légèrement plus vivant sans casser le moteur national.

#### Passe 2 — rejetée
Commit `13a8ccd8771e6ec3f93e2f49fb1f1a46f8766939`  
Changement unique supplémentaire : `raster-brightness-min 0.20 → 0.32`  
Run `34571968762` ✅  
Artifact `10188171016`  
Digest `sha256:3ef8d662f9f00e9ee4cbab7bb56925bf2cb84abaa2e2825b71e33407ae130f90`

Mesure diagnostique Maârif : mer ≈ `75,9 → 102,9` de luminance, terrain ≈ `143,0 → 155,6`, alors que le terrain du TARGET est ≈ `140,6`. La passe éclaircit donc la mer mais délave le sujet urbain. **Rejet visuel.**

#### État final retenu
Commit `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a`  
Revert ciblé : `brightness-min 0.32 → 0.20`, saturation `0.12` conservée.  
Le compare `5e3c1f8... → 5060ed1...` retourne **aucun fichier différent**, donc le produit final est bit-pour-bit équivalent à la passe 1 déjà validée.

Run final : `34572349452` — **SUCCESS**  
Artifact : `10188312451`  
Digest : `sha256:feeea303395bcbba1b4f8b67f154113634130084541c642138c205c4edb65212`

Régression finale :
- Casablanca / Maârif : `45` volumes à `390`, `48` à `430`, `59` à `768`, `67` à `1280` ;
- Rabat / Agdal desktop : `80` ;
- Marrakech / Guéliz desktop : `48` ;
- tous HTTP `200` ;
- render `ready` ; source `available` ;
- required failed requests/responses `0` ;
- DB writes par harness `0` ;
- deployment actions par harness `0`.

Grade final :
```ts
"raster-brightness-min": 0.20,
"raster-brightness-max": 1,
"raster-contrast": -0.08,
"raster-saturation": 0.12,
```

### Score expert final TARGET ↔ AFTER
- cadrage : `8,8` ;
- 3D/façades : `8,7` ;
- lumière : `8,8` ;
- mer/environnement : `8,5` ;
- rail/hiérarchie : `9,3` ;
- **global : `9,0/10`**.

**Conclusion :** le lot grade est clos. Le plafond restant vient principalement de l’imagerie satellite/atmosphère du provider, pas de l’architecture MapLibre. Ne pas poursuivre les tweaks globaux sur ce lot.

---

## 7. VARIABLES GELÉES APRÈS CLOSEOUT VISUEL

Gelées jusqu’à nouveau lot explicitement motivé :
- architecture MapLibre ;
- caméra Maârif ;
- zoom/pitch/bearing ;
- bâtiments 3D ;
- logique context/POI ;
- rail desktop + hero ;
- bottom sheet mobile ;
- truth gate ;
- route `/map` ;
- grade final ci-dessus ;
- aucune DB mutation.

---

## 8. ROADMAP FORWARD

- [x] TARGET LOCK durable + Drive ID + SHA-256
- [x] truth gate géographique fail-closed
- [x] baseline + inspection TARGET
- [x] pivot MapLibre national
- [x] benchmark Casablanca / Rabat / Marrakech
- [x] intégration MapLibre dans `/map`
- [x] suppression effective doublon outro
- [x] rail desktop premium
- [x] hero rail Maârif + visual gate
- [x] grade satellite final
- [x] captures finales `390 / 430 / 768 / 1280`
- [x] comparaison TARGET ↔ AFTER finale
- [x] score final honnête `9,0/10`
- [x] régression Casablanca / Rabat / Marrakech
- [x] closeout visuel canonique
- [ ] intégrer proprement le spike dans la branche PR #1025 sans force-push
- [ ] mettre à jour le body PR #1025 avec architecture MapLibre + preuves finales
- [ ] re-fetch latest `main` + compare avant merge
- [ ] CI PR finale verte
- [ ] **human merge gate PR #1025**
- [ ] post-merge checks
- [ ] audit séparé dépendances npm / vulnérabilités avant claim production-ready
- [ ] valider provider d’imagerie supporté/licencié pour production
- [ ] Vercel uniquement après autorisation explicite d’Achraf

---

## 9. RISQUES / NON CLOS

1. **Provider imagerie production** : Esri imagery reste un choix de prototype tant que support/licence production ne sont pas explicitement prouvés.
2. **Dépendances npm** : logs antérieurs = `8 vulnerabilities` (`1 moderate / 5 high / 2 critical`). Lot sécurité séparé ; pas de `npm audit fix --force` sans diagnostic.
3. **Gap TARGET** : score final `9,0/10`, pas `≥9,8`. Nouveau progrès majeur exige un autre provider/traitement d’imagerie, pas un micro-grade supplémentaire.
4. **PR #1025** : ne contient pas encore le pivot MapLibre final.
5. **Vercel** : aucun déploiement sans autorisation explicite.

---

## 10. PROCÉDURE DE REPRISE

1. Lire ce fichier en premier.
2. Re-fetch branche active, HEAD, `main`, PR #1025 et CI avant toute écriture Git.
3. TARGET durable via Drive ID `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL` ; ne jamais prendre un ancien `/mnt/data/*.png` comme autorité.
4. Ne pas rouvrir le grade satellite sans nouveau lot/provider : le test `brightness-min 0.32` a déjà été exécuté et rejeté.
5. Pas de Vercel sans permission ; pas de faux pin/chiffre/score.

### Dernières preuves
- architecture 3 villes : `34513592437` ✅
- intégration `/map` : `34526882196` ✅
- outro : `34531542541` ✅
- rail : `34534627318` ✅
- hero rail : `34536609567` ✅
- grade passe 1 retenue : `34571508754` ✅
- grade passe 2 rejetée : `34571968762` ✅
- **final restauré : `34572349452` ✅**
- score final : **`9,0/10`**

---

## 11. NEXT EXACT

**Re-fetch PR #1025 + latest `main` → intégrer le spike final dans la branche PR sans force-push, en préservant l’arbre du spike et en neutralisant l’ancien grade CSS obsolète → mettre à jour le body PR → comparer à latest main → lancer/observer la CI PR → s’arrêter au human merge gate.**

Stratégie d’intégration préférée si les refs n’ont pas bougé : merge commit avec la branche PR actuelle comme premier parent, le spike final comme second parent et l’arbre exact du spike comme contenu. Cela conserve l’historique sans réintroduire le filtre CSS obsolète de `56fcf05b...` et sans réécriture forcée.

### Séquence restante
`intégration PR #1025` → `PR body` → `latest main compare` → `CI PR` → `human merge gate` → `post-merge` → `sécurité npm + provider imagerie` → `Vercel seulement sur autorisation`.

---

## 12. REPÈRES DE REPRISE

- chantier/lot : `Vivre Ici / intégration PR après closeout visuel`
- Goal : `/map` premium 3D scalable quartier → Maroc
- repo : `hraaaaf/Akarfinder`
- branche : `spike/vivre-ici-maplibre-morocco`
- dernier HEAD produit validé : `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a`
- HEAD branche : re-fetch requis après commits documentaires
- main vérifié avant closeout : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`
- PR : `#1025` OPEN / branche distincte / re-fetch requis
- dernière CI produit : `34572349452` ✅ SUCCESS
- artifact : `10188312451`
- deployment : aucun
- DB : `0 write`
- dernière preuve : final grade restauré + 6 viewports/3 villes + score `9,0/10`
- blocage réel : aucun
- Next exact : intégration PR #1025 sans force-push
- avancement global : `92 %`
- effort suivant : `🟡`

**Ce fichier est le single forward tracker de reprise du chantier Vivre Ici.**