# AkarFinder — Session courante

**Mise à jour : 2026-08-16**

Ce fichier est le handover opérationnel court. `README.md` porte l’identité/doctrine et `docs/ROADMAP.md` reste l’unique roadmap canonique.

## SEARCH Price Coverage v6 ✅ CLOSED

- Audit paginé read-only : **PR #699 ✅ MERGED** — merge `64c8facdcece5f7956ac709fcc43ddf95de84d89` ; run `31919440782` SUCCESS avec **8/8 shards**.
- Réservoir mesuré : **412 / 960 prix fiables = 42,92 %** ; Mubawab **137/480 = 28,54 %** ; Masaken **275/480 = 57,29 %** ; 58 HTTP 410 Masaken ; 0 write sur cet audit.
- Bounded-write v6 : **PR #701 ✅ MERGED** — merge `a7597bf29eb5ee521dce42407db80a7c983a7681`.
- Run manuel `31921208732` : canary read-only **100 fiables / 0 écrit** puis, malgré l'intention read-only, le job `production-bounded-write` a été exécuté et a écrit **100/100 prix Mubawab** ; aucun write Masaken.
- Les 100 écritures sont directement prouvées par le log, live-revalidées, identity-proven, bornées à `normalized_price_mad IS NULL`, seule colonne `normalized_price_mad` mutée ; aucun rollback appliqué car supprimer ces prix fiables créerait une régression.
- Incident de garde : l'ancien input booléen `execute_write` n'a pas empêché le job write dans ce scénario. Cause précise non affirmée faute de preuve suffisante.
- **Hotfix #704 ✅ MERGED** — merge `311e6088b491e7b4f83166d70a6a7dba45bc7de0` ; run `31922093413` certify SUCCESS, jobs production SKIPPED sur PR.
- Nouveau garde : phrase exacte `WRITE_100_RELIABLE_PRICES` exigée à la fois par la condition GitHub Actions et indépendamment par le script ; test fail-closed pour valeurs absentes / `READ_ONLY` / `true` / quasi-match.
- Snapshot Supabase après l'incident : **2 936 / 15 546 = 18,89 %** ; Mubawab **294/1 375 = 21,38 %** ; Masaken **210/754 = 27,85 %**. Le stock total ayant évolué en parallèle, aucune variation globale supplémentaire n'est attribuée aux 100 writes au-delà des 100 écritures loguées.
- Preuve détaillée : `docs/PRICE_COVERAGE_V6_CLOSEOUT.md`.

## SEARCH Price Extraction v5 ✅ CLOSED

- **PR #688 ✅ MERGED** — merge `615aaf57bea1288ead1a31d22fb187b95cb6b40b`.
- Head exact certifié : `4df4c53a5138e021352dbd048dcd034664709981`.
- Gate v5 finale : run `31917789799` — `certify` SUCCESS + `production-canary-read-only` SUCCESS ; `production-bounded-write` SKIPPED sur PR.
- Bounded write historique v5 : run `31904092395` — **92 planned / 92 written**, dont **33 Mubawab + 59 Masaken** directement attribués au lot.
- Baseline fiable : **2 703 / 15 438 = 17,51 %**.
- Dernier snapshot production exact observé avant closeout : **2 838 / 15 438 = 18,38 %** ; gain global observé **+135 / +0,87 point**, sans attribuer à v5 la variation concurrente au-delà des 92 écritures prouvées.
- Le `COUNT exact` Supabase reste un observateur non bloquant après erreurs intermittentes vides ; tests, TypeScript et audits read-only restent les gates fonctionnels.
- Toute future écriture prix v5 reste manuelle via `workflow_dispatch` + `execute_write=true`, plafond <= 100 ; aucun write automatique sur PR/push.
- Mouldar reste HOLD HTTP 403 ; Agenz HTTP 429 respecté ; 44 prix indicatifs Agenz restent hors métrique fiable ; aucun bypass.
- Preuve détaillée : `docs/PRICE_EXTRACTION_V5_AUDIT.md`.
- Suite Search prix : mesurer read-only des cohortes paginées au-delà des 120 plus récents avant tout nouveau bounded write ; ne pas relâcher les règles de fiabilité pour atteindre un objectif numérique.

## Carte intelligence marché — C8 Extension Rabat tous quartiers ⏳ EN COURS

- **C0–C7 = 8/8 CLOSED = 100 % historique uniquement** ; ce pourcentage ne mesure pas C8.
- C8A #744, C8B #745, C8C #746 et C8D foundation #747 sont mergés ; registre actuel **23 localités produit/candidates**, explicitement qualifié de plancher non exhaustif.
- Géométrie : **4/23 certifiées** (Agdal, Hay Riad, Hassan, Souissi) ; **19/23 non résolues** ; aucune géométrie candidate promue par inférence.
- Resolver shadow #750 ✅ merge `9b365bc8d671f58e20c9c33b0509f419f5f58771` : 984 annonces Rabat / 6 sources, 638 matchs uniques, 6 ambiguës fail-closed, 340 sans signal exact ; 68 matchs candidats.
- Authority Proposal #753 ✅ merge `fbbf4c1904c640364f16303f27f6a35f047c7798` : 18 autorités `proposal_only`, 26 aliases proposés, 0 conflit observé, **0 write**.
- Market Maturity #754 ✅ merge `95fe4274ac217a4dde926f76c8f287a1dcb02109` : maximum **2** échantillons vente `normalized_price_m2` par candidate, **0 candidate** prête pour métrique prix/m² publique.
- Agenz Detail Recovery #758 ✅ exact head `6492e843989fa6d8e22b6af1da2844df7677c051`, merge `dfd227e5050b76abb14967a0d0ef98374c113009`, **8/8 workflows SUCCESS** ; cible initiale Agenz × Diour Jamaa, 12 URLs canoniques → 9 IDs uniques ; audit strictement read-only.
- Invariants C8 : **0 mutation DB**, **0 nouvelle activation publique**, **0 nouvelle métrique prix/m² publique**.
- Dry-run live Agenz post-merge : **PENDING**. Le workflow actuel n’expose pas `workflow_dispatch` et le connecteur GitHub courant n’expose pas d’action dispatch ; ne pas prétendre qu’il a été exécuté.
- Progression globale C8 : **non chiffrable** tant que le dénominateur exhaustif des quartiers/localités produit de Rabat n’est pas prouvé.
- Preuve canonique : `docs/CARTE_C8_RABAT_EXTENSION_STATUS.md`.
- Next : dry-run live borné Agenz sans écriture dès qu’un environnement réseau/credentials permet l’exécution, poursuite de l’inventaire exhaustif et certification des 19 géométries restantes.

## Mockup Convergence — L2 Search + Map ✅ CLOSED

- **PR #667 ✅ MERGED** — merge `c77621b35ca84b498b4744d9b8f9583fc1f45057`.
- Head exact certifié : `4ddb561567c107c4ebaf8f9c097fc17f3c9b6b9d`.
- Gate L2 `31900627982` SUCCESS ; Footer `31900627973` SUCCESS ; Search Final `31900627924` SUCCESS ; UI All Pages `31900627981` SUCCESS.
- Certification globale : **208/208 captures, 0 finding** sur 390×844 / 430×932 / 768×900 / 1280×900.
- Artefact UI `9251044397`, digest `sha256:de80ac7da0424f6a101eb046555ce4307eee17505fbee8bda496f0b1f116b6b4`.
- Search/Map rapprochés de la cible mockup sans modifier ranking, DATA, Registry, entitlement ou publication ; aucune géographie/prix inventé.
- Footer secondaire Search/Map masqué du viewport mobile ; bottom-nav canonique conservée.
- Progression stricte de ce chantier : **2 lots CLOSED / 6 = 33,3 %**. L1 et L2 CLOSED ; **L3 Favoris NEXT**.
- Preuve : `docs/MOCKUP_CONVERGENCE_L2_CLOSEOUT.md`.

## SEARCH — Prix indicatifs à vérifier sur la source ✅ CLOSED

- **PR #661 ✅ MERGED**.
- Head exact certifié : `5a0529ecb3b2a36a0fb4d215098d5a87c55750a2`.
- Gate dédiée : run `31898270967` — `certify` SUCCESS.
- Test ciblé `indicative-price-source-check.test.ts` : SUCCESS.
- TypeScript `npx tsc --noEmit` : SUCCESS.
- Merge `main` : `92ca4adbfbe571e52f9a627f0fd7ef92ebb14fd4`.
- Prix fiable toujours prioritaire ; fallback indicatif limité à Agenz lorsqu’aucun prix fiable n’est disponible.
- Libellé public : `Prix indicatif · à vérifier sur la source`.
- Prix/m², courte durée, multi-montants et valeurs hors bornes rejetés.
- Aucun write DB ; aucun changement des filtres, du ranking ou de la métrique de couverture fiable.
- Snapshot fiable de référence : **2 703 / 15 438 = 17,51 %**.
- Cohorte indicative stricte : **44** annonces Agenz, dont **36 locations** et **8 ventes**.
- Preuve : `docs/INDICATIVE_PRICE_SOURCE_CHECK_CLOSEOUT.md`.

## SEARCH Price Extraction v3 ✅ CLOSED

- **PR #649 ✅ MERGED** — merge `95132b751d0000be140d84fcfbf1f17ad84a2a5e`.
- Closeout documentaire **#652 ✅ MERGED** — merge `b0b3fa8cdd8eb4755d7a34228e6f23e40d5b7d77`.
- Snapshot historique v3 : **2 694 / 15 438 = 17,45 %**.
- Ce snapshot est superseded par le snapshot fiable observé du lot #661 : **2 703 / 15 438 = 17,51 %** ; aucune causalité du drift n’est inventée.
- PromoImmo reste `HOLD` faute d’extraction suffisamment fiable ; Avito reste `HOLD` HTTP 403, sans bypass.
- Preuve historique : `docs/PRICE_EXTRACTION_V3_CLOSEOUT.md`.

## B2B Partner Landing Productization ✅ CLOSED

- **PR #650 ✅ MERGED** — merge `32c0b3635f9f8aec2fe92722eef09f0484dfec1b`.
- `/pro/agences` et `/promoteurs` commercialement concrètes sans modifier activation, publication, ranking, DATA ou Registry.
- Gate B2B final `31891405851` SUCCESS.
- UI All Pages final `31891405842` SUCCESS ; 208/208 captures, 0 finding sur le référentiel final.
- Dettes séparées : #641 double source promoteur ; #643 validation téléphone serveur + anti-abus `/api/leads`.

## Audit Toutes Pages ✅ CLOSED

- **5/5 jalons CLOSED = 100 %**.
- Inventaire : 64 patterns App Router gouvernés.
- Final : **52 pages rendues/certifiées + 12 blockers explicitement typés**.
- Recertification stricte #633 : run `31824121689` SUCCESS ; **208/208 captures, 0 finding**.
- Closeout gouvernance #635 mergé.
- Viewports certifiés : 390×844 / 430×932 / 768×900 / 1280×900.

## UI polish / mockup v1 ✅ CLOSED

- **10/10 jalons CLOSED = 100 %**.
- P0 Search → P5 certification globale certifiés et mergés.
- P5 : PR #624, run `31814084564` SUCCESS, 68/68 captures, 0 failure, 0 overflow.
- Hotfix Comparer #625 mergé.

## Search Ranking v2

- **PR #629 ✅ MERGED**, merge `7d20556a610c69b0898b21e3ccf2baa3bb50a580`.
- RPC/migration v2 actifs et audits DB validés ; hiérarchie commerciale codée sans entitlement inventé.
- **Déploiement applicatif production toujours BLOQUÉ** au dernier contrôle : `VERCEL_TOKEN` absent/vide dans GitHub Actions. Ne pas prétendre que l’interleaving applicatif de `main` est servi par Vercel tant qu’un déploiement authentifié n’est pas prouvé.

## Bibliothèque visuelle quartiers

- **Rabat P0 → P2 Visual Resolver integration ✅ CLOSED**.
- **P3 national rollout ⏳ NEXT**.
- Doctrine : photos réelles uniquement, provenance/licence défendables, aucune géographie inventée.

## DATA MASS

- **MASS-1 → MASS-6 ✅ CLOSED**.
- **MASS-X5 ✅ CLOSED — PR #609**.
- Toute activation/mutation production reste hors scope sans gate humain explicite.

## Invariants opérationnels

- zéro donnée, permission, géographie ou provenance inventée ;
- aucune écriture DB sans gate humain explicite ;
- une responsabilité / branche / PR / merge par lot ;
- CI en cours n’interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d’un lot visuel ;
- une route bloquée doit être explicitement typée et suivie, jamais silencieusement exclue ;
- un prix indicatif ne devient jamais un prix fiable sans preuve source suffisante.

## Reprise exacte

**C8 Extension Rabat tous quartiers est le chantier Carte courant. #750/#753/#754/#758 sont mergés ; registre actuel 23 localités non exhaustif ; géométrie 4/23 certifiée et 19/23 unresolved ; 0 mutation DB, 0 nouvelle activation C8, 0 métrique prix/m² candidate publiée. Le dry-run live Agenz × Diour Jamaa reste pending et non dispatchable via le connecteur/workflow actuels. Reprendre par la certification/merge du closeout canonique, puis exécuter ce dry-run dans un environnement adapté avant toute écriture.**
