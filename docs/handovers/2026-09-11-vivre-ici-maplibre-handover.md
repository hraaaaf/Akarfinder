# AkarFinder — Vivre Ici / MapLibre — Handover 2026-09-11

## Goal
Faire converger `/map` vers le TARGET LOCK avec un moteur MapLibre 3D scalable du quartier au Maroc, sans faux pin ni fausse précision, puis intégrer proprement le résultat dans PR #1025.

## Autorité canonique
Lire d’abord : `3-vivre-ici-akarfinder.md`.

TARGET durable :
- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

## État vérifié après closeout visuel
- repo : `hraaaaf/Akarfinder`
- branche active : `spike/vivre-ici-maplibre-morocco`
- dernier HEAD produit validé : `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a`
- main vérifié avant closeout : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`
- PR #1025 : OPEN, branche distincte `docs/3-vivre-ici-akarfinder`, dernier HEAD vérifié `56fcf05b2bf8c3cedccc46f55a7ad2cd8dfb469a`
- Vercel : aucun déploiement
- DB : 0 write
- avancement canonique après closeout : `92 %`

## Architecture retenue
- `MapLibreNeighborhood3D.tsx` paramétré ville/quartier/centre ;
- bâtiments vectoriels globaux OpenFreeMap ;
- imagerie Esri seulement comme provider de prototype tant que conformité/licence production non prouvée ;
- données quartiers via registre canonique ;
- `/map` utilise MapLibre pour les couples ville + quartier ;
- aucun asset bâtiment spécifique à Maârif requis.

## Preuves majeures
### Scalabilité
`628947bb...` — run `34513592437` ✅  
Casablanca `66`, Rabat `96`, Marrakech `53` volumes desktop ; HTTP/render/source OK ; failures `0` ; DB `0` ; deploy `0`.

### Intégration `/map`
`11769c0c...` — run `34526882196` ✅ — artifact `10171990999`.

### Outro / rail / hero
- outro : `6185cfed...` — `34531542541` ✅
- rail : `e1c59a3f...` — `34534627318` ✅
- hero/harness : `d4a71d8c...` — `34536609567` ✅

## Grade satellite final
Baseline : brightness-min `0.20`, brightness-max `1`, contrast `-0.08`, saturation `-0.02`.

### Passe 1 retenue
- commit `5e3c1f8400cbc877193f44ba416d540674e3dc0a`
- saturation `-0.02 → 0.12`
- run `34571508754` ✅
- artifact `10187991385`
- digest `sha256:f1c0e470f9770e14e37d7a3acc8ad48d38971c760ea101fcd7c071f3f404b798`

### Passe 2 rejetée
- commit `13a8ccd8771e6ec3f93e2f49fb1f1a46f8766939`
- brightness-min `0.20 → 0.32`
- run `34571968762` ✅
- artifact `10188171016`
- digest `sha256:3ef8d662f9f00e9ee4cbab7bb56925bf2cb84abaa2e2825b71e33407ae130f90`
- résultat : mer plus claire mais ville délavée ; terrain ≈ `155,6` de luminance vs TARGET ≈ `140,6` ; rejet visuel.

### État final restauré
- commit `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a`
- brightness-min remis à `0.20`, saturation `0.12` conservée
- arbre produit identique à la passe 1 validée (`compare 5e3c1f8... → 5060ed1...` = aucun fichier différent)
- run final `34572349452` ✅ SUCCESS
- artifact `10188312451`
- digest `sha256:feeea303395bcbba1b4f8b67f154113634130084541c642138c205c4edb65212`

Régression finale :
- Maârif : `45 / 48 / 59 / 67` volumes sur `390 / 430 / 768 / 1280`
- Rabat / Agdal : `80`
- Marrakech / Guéliz : `48`
- HTTP `200`, render `ready`, source `available`
- required failed requests/responses `0`
- DB writes `0`
- deploy actions `0`

Grade final :
```ts
"raster-brightness-min": 0.20,
"raster-brightness-max": 1,
"raster-contrast": -0.08,
"raster-saturation": 0.12,
```

## Avis expert final
- cadrage : `8,8`
- 3D/façades : `8,7`
- lumière : `8,8`
- mer/environnement : `8,5`
- rail/hiérarchie : `9,3`
- **global : `9,0/10`**

Conclusion : lot visuel clos. Le gap restant est principalement le provider/imagerie. Ne pas rouvrir le grade global dans ce chantier ; une tentative plus lumineuse a déjà été testée et rejetée.

## Risques ouverts
- Esri : prototype seulement tant que licence/support production non explicitement prouvés.
- npm : logs antérieurs = 8 vulnérabilités (`1 moderate / 5 high / 2 critical`) ; lot sécurité séparé, jamais `npm audit fix --force` sans diagnostic.
- score `≥9,8` non certifié ; score final prouvé `9,0/10`.
- PR #1025 n’intègre pas encore le spike final.
- aucun Vercel sans autorisation explicite d’Achraf.

## Next exact
1. Re-fetch branche spike, PR #1025, latest `main` et mergeability.
2. Intégrer le spike final dans la branche PR **sans force-push**.
3. Préférer, si les refs sont inchangées, un merge commit avec la branche PR comme premier parent, le spike comme second parent et l’arbre exact du spike ; cela conserve l’historique et neutralise l’ancien grade CSS obsolète de `56fcf05b...`.
4. Mettre à jour le body PR avec architecture MapLibre, final run/artifact, 3 villes et score `9,0/10`.
5. Re-compare latest `main`.
6. Vérifier CI PR finale.
7. **S’arrêter au human merge gate.**

## Séquence restante
`intégration PR #1025` → `PR body` → `latest main compare` → `CI PR` → `human merge gate` → `post-merge` → `sécurité npm + provider imagerie` → `Vercel seulement avec autorisation explicite`.

## Règles de reprise
- toute capture réalisée doit être montrée ;
- ne jamais inventer run/artifact/capture/score/état PR ;
- pas de faux pin ni fausse précision ;
- pas de Vercel sans autorisation explicite.