# AkarFinder — Session courante

**Mise à jour : 2026-09-07**

> `docs/ROADMAP.md` est l’unique vérité canonique globale. Ce fichier est uniquement un handover opérationnel court.

## État de reprise

**M250K est CLOSED et FROZEN.**

- compteur canonique : **253 372 représentations candidates L0/L1** ;
- Mubawab : **76 816 IDs source exacts** ;
- Avito : **46 904 IDs source exacts** ;
- expansion datasets GitHub publics : **+85 536 exact-net-new** au-dessus des baselines déjà comptées ;
- `253 372 != biens physiques uniques` ;
- historique/public-dataset reste L0 tant qu’aucune preuve récente ne justifie `fresh`/`active`.

ROADMAP post-M250K : commit `0d1a91b4b49c75ccac34c16e950b91fe4262a6c8`.

## Dernières preuves à connaître

- M250K fermeture / Avito public batch : run `34040405000`, artifact `9991488198`, SHA256 `63906e15b14fc772ddd4d49f0c05bee236e95ab478ad989ba56bfe32208f6543`, **+4 784 Avito exact-net-new** ;
- Mubawab public batch : run `34040263021`, artifact `9991447841`, **+15 514 exact-net-new** ;
- Marwane Mubawab : run `34040109352`, artifact `9991403015`, **+4 089** ;
- Hicham public dumps : run `34039440480`, artifact `9991207598`, **+17 394 Mubawab +22 381 Avito** ;
- RealEstateBuddy : run `34038898808`, artifact `9991042950`, **+21 374 Mubawab** ;
- MASS-1 exact reconcile : run `34029546664`, artifact `9988296190`, **+1 613** ;
- Historical Gap Hunt : run `34030138761`, artifact `9988514932`, **1immo +3 471** ;
- Agenz exact delta : artifact `9989328673` vs baseline `9898224274`, **+3 819**.

## Lot 11 / Q1A Candidate Lake manifest freeze — CERTIFIED

- DB-backed export exact: **14 987 / 14 987**, run `34059828610`, artifact `9997114366`.
- 1immo freeze-time exact: **3 471 / 3 471**, run `34062181098`, artifact `9998238197`.
- MASS-X2 exact: **73 / 73**, run `34063582288`, artifact `9998233478`.
- DATA4.9B reste **2 326 aggregate-only** : aucune identité row-level récupérable, aucun placeholder autorisé.
- Plafond honnête : **251 046 matérialisables + 2 326 aggregate-only = 253 372 comptables gelées**.
- Manifest Q1A corrigé et recertifié : run `34125731609`, artifact `10020001261`, **251 046 rows / 251 046 unique representation keys / 0 cross-lane duplicate**, SHA256 `28d55d66a14e7d398db85183a65e07dcd019ef947dfbda2d4c10a6dc7cfadc1c`.
- Correction Q1A : `akaar.fr` restauré depuis son artifact exact et suppression des faux domaines `mixed`, sans changer le nombre de lignes ni créer de doublon.
- Le run antérieur `34118173681` / artifact `10017109800` est superseded.

## Lot 11 / Q1B provenance + temporal cohort — CERTIFIED

- Branche : `data/q1b-provenance-temporal-cohort`.
- Run : **`34126402435` SUCCESS**.
- Artifact : **`10020251605`**.
- Artifact ZIP digest : `sha256:60fc2a45a2441d47335f9b4b17fd3d71afb6498ef634fd86fde01eae22d8ab5b`.
- Manifest Q1B : **251 046 input -> 251 046 output**, **251 046 clés uniques**.
- SHA256 manifest : **`a11fa40efc083e1538d7df6485557c1a612957fc3f7a0f5bb91fa4da7e6a9fc5`**.
- `representationKeysPreserved=true` ; `sourceIdentitiesPreserved=true`.
- `dbBackedRowsMatched=14 987` avec sous-cohortes exactes **5 797 B3 / 6 270 canonical-link / 2 920 current seeds**.
- `normalizedSourceDomainCorrections=0` après la correction Q1A.
- Couverture temporelle : **14 987 exact_observed_at + 98 606 evidence_timestamp + 137 453 cohort_only = 251 046**, donc **0 ligne unknown**.
- Les timestamps `evidence_timestamp` datent la preuve/artifact, **pas la fraîcheur de l'annonce**.
- `freshnessInferred=false` ; `authorizationInferred=false`.
- `databaseWrites=0` ; `productionWrites=0` ; `sourceSiteFetches=0` ; `vercelDeployments=0`.

## État du live / policy — READ-ONLY CHECK

- `search_public_representations_v2` servait **2 153** représentations lors du contrôle du 2026-09-07.
- Le gateway actuel exige encore notamment `freshness_status='fresh_confirmed'` puis un gate strict via `source_policy_registry`.
- `source_policy_registry` a RLS ON.
- `source_public_index_owner_override_v1` et `mubawab_public_minimal_index_v1` ont toujours RLS OFF ; risque gardé ouvert, aucune modification à l'aveugle.
- Aucune policy `permission_required` / `prohibited` n'a été transformée en autorisée.

## Séquence active

1. ✅ **Q1A** Candidate Lake manifest materializable.
2. ✅ **Q1B** provenance + temporal cohort normalization.
3. 🔵 **Q1C** exact identity dedupe / canonical keys.
4. Puis **Q1D** normalized features + fingerprints.
5. Puis **Q2A/Q2B/Q2C** blocking + clustering conservateur + QA -> `probable_unique`.
6. Puis **Q3A/Q3B** freshness evidence + `live_confidence`.
7. Puis **Q4A/Q4B** search eligibility shadow + ranking rehearsal.
8. **Q4C production gate séparé** uniquement après preuves.

## Invariants

- `candidate != active` ;
- `URL != property unique` ;
- pas de suppression destructive pendant le clustering ;
- aucune donnée absente inventée ;
- aucune preuve de pipeline transformée en fraîcheur listing ;
- respect robots / surfaces publiques ;
- aucun bypass login/CAPTCHA/paywall/anti-bot/API privée ;
- aucune écriture Supabase/prod ou policy registry sans gate humain explicite ;
- aucun Vercel sans autorisation explicite ;
- CI pending n'arrête pas les lots indépendants.

## Reprise immédiate

**Continuer Q1C à partir de l'artifact Q1B `10020251605`.** Produire des clés canoniques exactes et mesurer les collisions sans fusion approximative. Si l'exact dedupe est déjà nul, le certifier au lieu de forcer artificiellement une réduction. DATA4.9B reste séparé et non matérialisé.

**Boussole : 253 372 FROZEN -> Candidate Lake -> probable_unique -> live_confidence -> search eligibility shadow.**
