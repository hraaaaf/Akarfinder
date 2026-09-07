# AkarFinder — Session courante

**Mise à jour : 2026-09-06**

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

## Chantier actif — Lot 11 / Q1A Candidate Lake manifest freeze

### Recovery checkpoint — 2026-09-07

- DB-backed export is exact: **14,987 / 14,987**, run `34059828610`, artifact `9997114366`.
- 1immo freeze-time cohort is exact: **3,471 / 3,471**, run `34062181098`, artifact `9997824477`.
- MASS-X2 is exact: **73 / 73**, run `34063582288`, artifact `9998233478`.
- DATA4.9B remains **2,326 aggregate-only historical identities**: the original artifact is expired and bounded archive/metadata replays did not recover a unique row-level manifest.
- Honest row-level ceiling: **251,046 materializable + 2,326 aggregate-only = 253,372 frozen accounting total**. Never create placeholders.
- Live gateway baseline verified through `search_public_representations_v2`: **2,065** servable representations.
- Detailed proof: `docs/data/Q1A-CANDIDATE-LAKE-RECOVERY-STATUS.md`.
- Machine accounting contract: `scripts/audits/candidate-lake-q1a-materializable-contract.json`; 25 row-level lanes sum to **251,046**, and DATA4.9B remains a separate non-public, no-placeholder **2,326** aggregate.

### Goal

Produire un manifest unifié, déterministe et reproductible des **253 372 représentations**.

Chaque ligne doit au minimum porter :
- `source` ;
- `source_identity` (`source_id` ou URL canonique selon la lane) ;
- provenance/evidence (`run`, `artifact`, dataset ou snapshot) ;
- couche L0/L1 ;
- statut de cohorte temporelle disponible ou `unknown` explicite.

### Succès

- input exact = **253 372** ;
- aucune perte silencieuse ;
- aucune identité fabriquée ;
- incohérences/quarantaines comptées séparément ;
- manifest hashé et rejouable ;
- **0 Supabase/prod write** ;
- **0 source-site fetch** ;
- **0 Vercel**.

### Preuve attendue

Run GitHub déterministe + artifact contenant au minimum :
- `manifest.*` ;
- `summary.json` ;
- hashes ;
- compteurs par source/lane ;
- couverture provenance/layer/cohorte ;
- invariants read-only.

## Séquence après Q1A

1. **Q1B** provenance + temporal cohort normalization.
2. **Q1C** exact identity dedupe / canonical keys.
3. **Q1D** normalized features + fingerprints.
4. **Q2A** candidate-pair blocking.
5. **Q2B** clustering V1 conservateur → `probable_unique`.
6. **Q2C** cluster QA / false-merge control.
7. **Q3A** freshness evidence model.
8. **Q3B** `live_confidence`.
9. **Q4A** search eligibility shadow.
10. **Q4B** search/ranking rehearsal.
11. **Q4C** production gate séparé.

## Invariants

- `candidate != active` ;
- `URL != property unique` ;
- pas de suppression destructive pendant le clustering ;
- aucune donnée absente inventée ;
- respect robots / surfaces publiques ;
- aucun bypass login/CAPTCHA/paywall/anti-bot/API privée ;
- aucune écriture Supabase/prod ou policy registry sans gate humain explicite ;
- aucun Vercel sans autorisation explicite ;
- CI pending n’arrête pas les lots indépendants.

## Reprise immédiate

**Commencer par Lot 11 / Q1A.** Inspecter les manifests/artifacts déjà présents et réutiliser les preuves exactes du scoreboard pour reconstruire l’union **253 372**. Ne relancer aucun crawl source pour ce lot. Ne modifier le compteur canonique que si un futur lot fournit un manifest d’identités exactes + set-diff contre le freeze.

**Boussole : 253 372 FROZEN -> Candidate Lake -> probable_unique -> live_confidence -> search eligibility shadow.**
