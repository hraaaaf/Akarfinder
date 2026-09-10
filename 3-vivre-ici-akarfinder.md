# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET LOCK CONSERVÉ / MAPLIBRE NATIONAL VALIDÉ / `/map` INTÉGRÉ / CONVERGENCE VISUELLE EN COURS**  
**Dernière mise à jour : 2026-09-10**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `spike/vivre-ici-maplibre-morocco`**  
**Dernier HEAD produit validé : `d4a71d8c75dfa947b5a31f1261f2666828751692`**  
**HEAD branche : toujours re-fetch à la reprise ; un commit documentaire peut être plus récent que le dernier HEAD produit validé.**  
**Main vérifié : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`**  
**PR #1025 : OPEN / mergeable / non mergée / branche `docs/3-vivre-ici-akarfinder` / HEAD `56fcf05b2bf8c3cedccc46f55a7ad2cd8dfb469a`**  
**Fondation produit : `/map`**  
**Avancement chantier : `88 %`**  
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

### Preuve requise pour clôture visuelle
TARGET ↔ AFTER aux mêmes viewports + inspection réelle + score expert. Ne jamais déclarer `≥9,8/10` sans cette preuve.

---

## 2. TARGET LOCK — AUTORITÉ VISUELLE DURABLE

Cible approuvée : mockup Desktop Maârif + Mobile Maârif.

- **fichier** : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- **stockage durable** : Google Drive
- **Drive ID** : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- **dimensions** : `1536 × 1024`
- **SHA-256** : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- **seuil historique de clôture visuelle** : `≥9,8/10`

Le TARGET est une autorité de **composition et qualité visuelle**. Il n’autorise pas à inventer photo, prix, météo, score, proximité, temps, distance, position ou données immobilières.

### Lecture visuelle du TARGET
Desktop :
- carte oblique héro dominante ;
- océan clair/cyan visible ;
- tissu urbain chaud et lumineux ;
- volumes 3D lisibles sans effet maquette artificielle ;
- Maârif reste le sujet ;
- labels de quartier/POI discrets ;
- rail droit éditorial avec hero photo forte, hiérarchie claire et densité maîtrisée.

Mobile :
- aérien oblique compact ;
- bottom sheet dédiée ;
- pas une réduction mécanique du desktop ;
- carte reste lisible sous les contrôles.

**Règle de reprise :** ne jamais utiliser un ancien fichier éphémère `/mnt/data/...` comme TARGET de référence. Reprendre le fichier Drive identifié ci-dessus et vérifier son SHA-256 si nécessaire.

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

**Conclusion de l’audit de référence : `0` bien éligible à un pin/callout EXACT.**  
Aucun faux pin immobilier n’est autorisé.

---

## 4. PIVOT ARCHITECTURE — MAPLIBRE NATIONAL

L’ancienne stratégie de reconstruction manuelle quartier par quartier est abandonnée.

### Architecture retenue
- `MapLibreNeighborhood3D.tsx` paramétré ville/quartier/centre ;
- MapLibre GL ;
- bâtiments vectoriels globaux OpenFreeMap ;
- imagerie Esri **uniquement comme provider de prototype tant que conformité/licence production non explicitement prouvée** ;
- données quartier via registre canonique ;
- pas d’asset bâtiments spécifique Maârif nécessaire ;
- aucun DB write ;
- aucun déploiement Vercel.

### Data policy 3D
- hauteur explicite : extrusion factuelle ;
- floors explicites : estimation déclarée si utilisée ;
- hauteur inconnue : éventuelle extrusion purement renderer, jamais persistée/exposée comme hauteur factuelle.

### Preuve scalabilité quartier → Maroc
Commit : `628947bb24bf247a73c5161b64a25fc47aafe33c`  
Run : `34513592437` — **SUCCESS**

- Casablanca / Maârif : `66` volumes desktop ;
- Rabat / Agdal : `96` volumes desktop ;
- Marrakech / Guéliz : `53` volumes desktop ;
- HTTP `200` ;
- render `ready` ;
- source `available` ;
- required failed requests `0` ;
- DB writes `0` ;
- deployment actions `0`.

**Conclusion : la scalabilité sur plusieurs villes est prouvée avec le même moteur.**

---

## 5. INTÉGRATION RÉELLE DANS `/map`

Le moteur MapLibre est branché dans `NationalMapRouter` pour les couples `ville + quartier` canoniques. La vue nationale ville seule reste indépendante.

Commit intégration : `11769c0c2e7a9abb262bd19614efb314f9d5b4b3`  
Run : `34526882196` — **SUCCESS**  
Artifact : `10171990999`  
Digest : `sha256:75c4223becbdb1bfe0f3342a8c64a88a14455b1d59ada3d121546f6fbd4327b0`

Maârif intégré :
- desktop : `68` volumes ;
- mobile : `45` volumes ;
- TypeScript : SUCCESS ;
- Build : SUCCESS ;
- Capture : SUCCESS ;
- DB writes `0` ;
- deploy `0`.

---

## 6. POLISH UI — ÉTAT PROUVÉ

### 6.1 Doublon outro
Premier essai `5917eaf3...` : CI verte mais BEFORE/AFTER visuellement identique. **Non retenu comme preuve.**

Correction effective :
- commit : `6185cfed2d70c371ff6f6c6390f65d1fe7c5fb54` ;
- run : `34531542541` — **SUCCESS** ;
- artifact : `10173769689` ;
- digest : `sha256:eb52a650a2dfb26f376fa6779ea31caaeae9600efbe2fd402d21272b1798fb0f` ;
- desktop : bande basse interne supprimée, hauteur carte récupérée ;
- mobile : stable ;
- `67` volumes desktop / `45` mobile ;
- HTTP `200`, render/source ready, required failures `0` ;
- DB `0`, deploy `0`.

### 6.2 Rail desktop premium
Le rail existait mais son CSS premium ne ciblait pas correctement la branche MapLibre. Le visual gate a été étendu pour couvrir le rail.

Baseline rail prouvée :
- HEAD testé : `e1c59a3f5e1428d20981122bfd8af7cf3966d813` ;
- run : `34534627318` — **SUCCESS** ;
- artifact : `10174979779` ;
- digest : `sha256:c703d350a2fc45d73aca1002bc1eb0c16db5051eb1e6adec7008e718cc1768b1` ;
- Maârif : `67` volumes desktop / `45` mobile ;
- HTTP `200`, render/source ready, failures `0` ;
- DB `0`, deploy `0`.

### 6.3 Hero photo du rail
Le dernier lot produit ajoute le hero rail Maârif et étend le gate visuel au decision rail.

- commit feature : `aebee4e2dd49d7340e9722876eadb3f53cc31975` ;
- **dernier HEAD produit validé / harness** : `d4a71d8c75dfa947b5a31f1261f2666828751692` ;
- run : `34536609567` — **SUCCESS** ;
- artifact : `10175712833` ;
- Maârif : `67` volumes desktop / `45` mobile ;
- HTTP `200` ;
- render/source ready ;
- required failed requests `0` ;
- DB `0` ;
- deploy `0`.

### Score expert actuel — capture réelle TARGET ↔ AFTER
- cadrage : `8,8` ;
- 3D/façades : `8,7` ;
- lumière : `8,6` ;
- mer/environnement : `8,4` ;
- rail/hierarchie : `9,3` ;
- **global : `8,9/10`**.

**Conclusion : moteur + rail sont solides. Le gap visuel dominant restant est le rendu du fond satellite / atmosphère générale par rapport au TARGET.**

---

## 7. CE QUI EST GELÉ POUR LA PROCHAINE PASSE

Pendant la prochaine passe, ne modifier qu’un défaut dominant à la fois.

**Gelé sauf preuve contraire :**
- architecture MapLibre ;
- centre/caméra Maârif validée ;
- zoom/pitch/bearing actuels ;
- bâtiments 3D ;
- logique context/POI ;
- rail desktop structurel ;
- hero rail ;
- bottom sheet mobile ;
- truth gate ;
- route `/map` ;
- aucune DB mutation.

**Variable suivante autorisée : uniquement le grade visuel du fond satellite / lumière / ambiance.**

---

## 8. ROADMAP FORWARD

- [x] TARGET LOCK durable + Drive ID + SHA-256
- [x] truth gate géographique fail-closed
- [x] baseline 2L.3 et inspection TARGET
- [x] pivot MapLibre national
- [x] benchmark réel Casablanca / Rabat / Marrakech
- [x] intégration MapLibre dans `/map`
- [x] suppression effective du doublon d’outro
- [x] rail desktop premium branché sur MapLibre
- [x] hero rail Maârif + visual gate
- [ ] **dernier pass fond satellite / ambiance uniquement**
- [ ] captures finales `390 / 430 / 768 / 1280`
- [ ] comparaison TARGET ↔ AFTER finale
- [ ] score final honnête ; ne pas forcer `9,8`
- [ ] vérifier régression Casablanca / Rabat / Marrakech après pass final
- [ ] closeout canonique avec état réellement prouvé
- [ ] intégrer proprement le spike dans la branche PR #1025
- [ ] mettre à jour le body PR #1025 avec architecture MapLibre + preuves actuelles
- [ ] re-fetch latest `main` + compare avant merge
- [ ] CI PR finale verte
- [ ] **human merge gate PR #1025**
- [ ] post-merge checks
- [ ] audit séparé dépendances npm / vulnérabilités signalées avant toute affirmation production-ready
- [ ] valider provider d’imagerie supporté/licencié pour production
- [ ] Vercel uniquement après autorisation explicite d’Achraf

---

## 9. RISQUES / NON CLOS

1. **Provider imagerie production** : le prototype utilise Esri imagery ; ne pas considérer ce choix production comme validé tant que support/licence n’est pas explicitement prouvé.
2. **Dépendances npm** : des logs `npm ci` antérieurs ont signalé `8 vulnerabilities` (`1 moderate / 5 high / 2 critical`). À traiter dans un lot sécurité séparé avant claim production-ready. Interdiction de `npm audit fix --force` sans diagnostic.
3. **Score final** : `8,9/10` actuellement. Aucun `≥9,8` certifié.
4. **PR #1025** : reste sur une branche distincte et ne contient pas encore proprement le pivot MapLibre actuel.
5. **Vercel** : aucun déploiement sans autorisation explicite.

---

## 10. HANDOVER — PROCÉDURE DE REPRISE

Dans une nouvelle conversation / fenêtre :

1. Lire **ce fichier en premier** : `3-vivre-ici-akarfinder.md`.
2. Vérifier immédiatement :
   - branche `spike/vivre-ici-maplibre-morocco` ;
   - **HEAD branche réel via GitHub** ; le dernier HEAD produit validé connu est `d4a71d8c75dfa947b5a31f1261f2666828751692`, mais des commits documentaires peuvent être plus récents ;
   - `main` ;
   - PR #1025 + head/base/mergeability ;
   - dernier run MapLibre pertinent.
3. Récupérer le TARGET depuis Google Drive ID `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL` si la copie locale n’existe plus.
4. Ne jamais reprendre un ancien `/mnt/data/*.png` comme autorité durable.
5. Reprendre **exactement au NEXT EXACT** ci-dessous.
6. Pour chaque changement visuel : BEFORE → TARGET → changement unique → AFTER mêmes viewports → comparaison → score → correction suivante.
7. Pas de Vercel sans permission.
8. Pas de faux pin / faux chiffre / faux score.

### Dernières preuves à connaître
- architecture 3 villes : run `34513592437` ✅
- intégration `/map` : run `34526882196` ✅
- outro effectif : run `34531542541` ✅
- rail premium : run `34534627318` ✅
- hero rail + harness : run `34536609567` ✅
- score actuel : **`8,9/10`**

---

## 11. NEXT EXACT

**Faire une seule passe sur le grade du fond satellite / ambiance de Maârif, avec caméra/3D/rail/mobile gelés → lancer une seule CI → récupérer artifact → montrer les captures réelles `390 / 430 / 768 / 1280` → construire TARGET ↔ AFTER → rescoring expert → si le résultat progresse sans régression, geler le visuel et passer au closeout/integration PR #1025.**

### Séquence restante connue
`grade satellite` → `captures finales` → `TARGET compare` → `score` → `3 villes sanity` → `canonique closeout` → `intégration PR #1025` → `PR body` → `sync main` → `CI PR` → `human merge gate` → `post-merge` → `sécurité npm + provider imagerie` → `Vercel seulement sur autorisation`.

---

## 12. REPÈRES DE REPRISE

- chantier/lot : `Vivre Ici / convergence finale MapLibre`
- Goal : `/map` premium 3D scalable quartier → Maroc
- repo : `hraaaaf/Akarfinder`
- branche : `spike/vivre-ici-maplibre-morocco`
- dernier HEAD produit validé : `d4a71d8c75dfa947b5a31f1261f2666828751692`
- HEAD branche : **à re-fetch à chaque reprise**
- main : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`
- PR : `#1025` OPEN / mergeable / non mergée / branche distincte
- dernière CI produit : `34536609567` SUCCESS
- deployment : aucun
- DB : 0 write
- dernière preuve : hero rail + capture TARGET réelle + score `8,9/10`
- blocage réel : aucun
- Next exact : pass fond satellite uniquement
- avancement global : `88 %`
- effort suivant : `🟡`

**Ce fichier est le single forward tracker de reprise du chantier Vivre Ici.**
