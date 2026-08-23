# DATA MASS-INDEX — M4 National MASS ingest

**Issue : #854**  
**Lot : M4**  
**Statut : 🟡 ACTIVE — M4-C batches**

## Goal
Matérialiser nationalement les fiches réellement validées des 7 sources M3 positives dans `source_offer_seeds`, en net-new seulement, sans écraser l’existant et sans activer Search.

## Réconciliation M3 obligatoire
Le delta M3 sépare strictement index externe minimal et ingestion/réutilisation de contenu.

Pour M4, la représentation persistable par défaut est limitée à :
- URL canonique ;
- domaine source ;
- provenance/provider + fenêtre d’observation technique.

Le payload persistant M4 met `metadata: null`. Les `title`, `snippet`, `discovery_query`, textes source, photos ou contenus éditoriaux peuvent être utilisés en mémoire pour classification mais ne sont pas recopiés dans le seed M4 par défaut.

## Wave 1
- marocannonces.com
- domio.ma
- sakane.ma
- 1000-annonces.com
- housing.place
- expat.com
- milkiya.ma

## M4-A — plan read-only ✅
Cohorte certifiée :
- 3 447 candidats canoniques ;
- 1 605 acceptés M1 ;
- 967 détails structurels M3 ;
- 2 URLs rejetées sécurité ;
- **965 fiches valides** ;
- providers projetés : `openserp` / `serper_mass_harvest` ;
- `metadata: null` ;
- 0 write DB ; 0 source fetch ; 0 activation publique.

## M4-B — canary ✅
Preuve exacte :
- PR #869 ;
- HEAD `b7017b1eb11ba4348e0dbd7560f3d3b2475eabfd` ;
- run `32609756948` SUCCESS ;
- artifact `9485169415` ;
- digest `sha256:71b147983d278f682e19c04548bfe2a776d51b6cfe89ccf4ab38693e2411e3c0` ;
- merge `ad43aadcd0c3be44c5fc67fca0fab4032fda8b98`.

Observation DB :
- `source_offer_seeds` : 56 871 → 56 881 (`+10`) ;
- `thin_index_search_documents` : 56 866 → 56 866 (`+0`) ;
- 10/10 `metadata:null` + `seed_only` ;
- 0 activation Search ;
- canary conservé après validation.

Le Thin Index `+0` est le comportement attendu : les seeds M4 minimalistes n’embarquent pas le metadata M2 riche requis par les triggers de projection Thin Index.

## M4-C — batches 🟡
Succès attendu :
- cohorte certifiée figée à 965 ; drift = abort ;
- net-new seulement, avec recheck de conflit par batch ;
- batch max 100 ;
- `metadata:null`, `seed_only`, provenance inchangée ;
- 0 ligne Thin Index créée pour les seeds M4 ;
- accounting before/after exact ;
- rollback compensatoire de tous les inserts du run si un batch échoue ;
- aucun écrasement de seed existant ;
- aucun provider relabel ;
- aucune activation Search.

Preuve attendue : workflow `MASS-INDEX M4 Batch Certification` + `m4-batch-receipt.json`.

## Invariants
- aucun contournement login/CAPTCHA/anti-bot/paywall ;
- aucune donnée riche source réutilisée implicitement ;
- aucun écrasement de seed existant ;
- aucune métrique de propriétés uniques avant M5 dedup ;
- aucun déploiement Vercel sans autorisation explicite.
