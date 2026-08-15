# AkarFinder — Session courante

**Mise à jour : 2026-08-15**

Ce fichier est le handover opérationnel court. `README.md` porte l’identité/doctrine et `docs/ROADMAP.md` reste l’unique roadmap canonique.

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

**Mockup Convergence : L1 + L2 CLOSED, progression stricte 2/6 = 33,3 %. Prochaine action : L3 Favoris. Conserver le stockage/fetch/suppression/comparaison et l’état vide réels ; converger uniquement la vue peuplée vers la densité du mockup, avec segmentation seulement si les données réelles la supportent.**
