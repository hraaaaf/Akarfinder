# AkarFinder — Vivre Ici / MapLibre — Handover 2026-09-11

## Goal
Faire converger `/map` vers le TARGET LOCK avec un moteur MapLibre 3D réellement scalable du quartier au Maroc, sans faux pin ni fausse précision, et fermer le chantier avec preuves visuelles + CI + closeout canonique.

## Autorité canonique
Lire d’abord : `3-vivre-ici-akarfinder.md`.

TARGET durable :
- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Google Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

## État vérifié à la création du handover
- repo : `hraaaaf/Akarfinder`
- branche active : `spike/vivre-ici-maplibre-morocco`
- HEAD produit/harness validé : `d4a71d8c75dfa947b5a31f1261f2666828751692`
- main connu : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`
- PR #1025 : distincte du spike, OPEN dans le dernier état canonique ; toujours re-fetch avant toute intégration/merge
- Vercel : aucun déploiement autorisé sans accord explicite d’Achraf
- DB : aucune écriture de ce chantier
- avancement canonique : `88 %`

## Architecture retenue
Abandon de la reconstruction manuelle quartier par quartier.

Architecture cible :
- `MapLibreNeighborhood3D.tsx` paramétré ville/quartier/centre ;
- bâtiments vectoriels globaux OpenFreeMap ;
- imagerie Esri uniquement comme provider de prototype tant que conformité/licence production n’est pas prouvée ;
- données quartiers via registre canonique ;
- `/map` utilise MapLibre pour les couples ville + quartier canoniques ;
- vue nationale ville seule conservée séparément ;
- aucune donnée bâtiment locale spécifique à Maârif requise.

## Preuves majeures déjà obtenues
### Scalabilité 3 villes
Commit `628947bb24bf247a73c5161b64a25fc47aafe33c`  
Run `34513592437` — SUCCESS

- Casablanca / Maârif : 66 volumes desktop
- Rabat / Agdal : 96 volumes desktop
- Marrakech / Guéliz : 53 volumes desktop
- HTTP 200 / render ready / source available
- required failed requests : 0
- DB writes : 0
- deployment actions : 0

### Intégration réelle dans `/map`
Commit `11769c0c2e7a9abb262bd19614efb314f9d5b4b3`  
Run `34526882196` — SUCCESS  
Artifact `10171990999`

### Suppression effective du doublon d’outro
Commit `6185cfed2d70c371ff6f6c6390f65d1fe7c5fb54`  
Run `34531542541` — SUCCESS  
Artifact `10173769689`

### Rail desktop premium
HEAD testé `e1c59a3f5e1428d20981122bfd8af7cf3966d813`  
Run `34534627318` — SUCCESS  
Artifact `10174979779`

### Hero photo rail + visual gate
Feature `aebee4e2dd49d7340e9722876eadb3f53cc31975`  
HEAD/harness validé `d4a71d8c75dfa947b5a31f1261f2666828751692`  
Run `34536609567` — SUCCESS  
Artifact `10175712833`

Maârif sur ce run :
- desktop : 67 volumes
- mobile : 45 volumes
- HTTP 200
- render/source ready
- required failed requests : 0
- DB writes : 0
- deploy : 0

## Score expert actuel, basé sur capture réelle TARGET ↔ AFTER
- cadrage : 8,8
- 3D/façades : 8,7
- lumière : 8,6
- mer/environnement : 8,4
- rail/hierarchie : 9,3
- global : 8,9/10

Le gap visuel dominant restant est le **fond satellite / ambiance générale**. Le moteur, le cadrage et le rail sont gelés sauf preuve contraire.

## Gel obligatoire pour la prochaine passe
Ne modifier qu’une variable dominante à la fois.

Gelés :
- architecture MapLibre
- caméra Maârif validée
- zoom / pitch / bearing
- bâtiments 3D
- contexte / POI
- structure rail desktop
- hero rail
- bottom sheet mobile
- truth gate
- route `/map`
- DB

Variable suivante autorisée : **grade visuel du fond satellite / lumière / ambiance uniquement**.

## Next exact
1. Re-fetch branche active, HEAD, `main`, PR #1025 et dernier run pertinent.
2. Récupérer le TARGET durable via Drive ID si nécessaire.
3. Faire UNE passe de grade satellite/ambiance sur Maârif, sans toucher caméra/3D/rail.
4. Lancer le visual gate.
5. Récupérer artifact et montrer captures réelles `390 / 430 / 768 / 1280`.
6. Comparer TARGET ↔ AFTER.
7. Donner avis expert : cadrage, 3D/façades, lumière, mer/environnement, rail, score global.
8. Si amélioration prouvée : garder. Sinon : revert ou nouvelle stratégie, sans empiler les tweaks.

## Séquence restante jusqu’au closeout
Grade satellite final → captures finales 390/430/768/1280 → comparaison TARGET → score final honnête → régression Casablanca/Rabat/Marrakech → mise à jour canonique → intégrer proprement le spike dans la branche PR #1025 → mettre à jour body PR → re-fetch main/compare → CI PR finale → human merge gate → post-merge checks → audit séparé vulnérabilités npm + validation provider imagerie production → Vercel uniquement avec autorisation explicite.

## Risques ouverts
- Provider Esri : prototype seulement tant que licence/support production non explicitement prouvés.
- Logs npm antérieurs : 8 vulnérabilités signalées (1 moderate / 5 high / 2 critical). Lot sécurité séparé avant toute affirmation production-ready. Ne jamais utiliser `npm audit fix --force` sans diagnostic.
- PR #1025 n’intègre pas encore proprement le pivot MapLibre actuel.
- Aucun score ≥9,8 n’est certifié. Score prouvé actuel : 8,9/10.

## Règles de reprise
- Toujours montrer toute capture réalisée.
- BEFORE → TARGET → changement unique → AFTER mêmes viewports → comparaison → score.
- Ne jamais inventer run, artifact, capture, résultat, score ou état PR.
- Ne jamais déployer Vercel sans autorisation explicite d’Achraf.
