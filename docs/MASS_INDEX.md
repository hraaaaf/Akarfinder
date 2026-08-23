# AkarFinder — DATA MASS-INDEX

**Issue canonique : #854**  
**Statut : M0→M5 CLOSED — M6 ACTIVE / production runtime gate**

## Goal
Construire l'index le plus large possible de l'immobilier marocain dans AkarFinder, en séparant découverte, index externe minimal, enrichissement factuel et contenu partenaire complet.

## Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique. Aucun texte long/photo source copié par défaut.

## Pipeline
`DISCOVERY -> canonicalization -> LISTING classification -> minimal external seed -> dedup/freshness -> Search/SEO -> partner conversion`

## Lots
- M0 — current-main audit + baseline : ✅ CLOSED.
- M1 — Universal candidate promotion : ✅ CLOSED.
- M2 — External Index model : ✅ CLOSED.
- M3 — Source Factory adapters : ✅ CLOSED.
- M4 — National MASS ingest : ✅ CLOSED.
- M5 — Dedup + freshness hardening : ✅ CLOSED.
- M6 — Search activation + SEO : 🟡 ACTIVE — runtime gate.
- M7 — Conversion partenaires : ⏳ PENDING.

**Progression : 6/8 = 75 %.**

## M4 — résultat final
965 URLs certifiées ; 955 inserts + 10 préservés ; Thin Index +0 attendu ; Search OFF ; run final `32610621902` SUCCESS ; PR #871.

## M5 — résultat final
- shadow dedup conservateur, aucune fusion automatique ; run `32611464377` SUCCESS ;
- freshness gate prod : les deux RPC publics servent `fresh_confirmed` uniquement ; run `32631787333` SUCCESS ;
- `seed_only` reste un réservoir non public.

## M6 — état
- M6-A baseline : PR #879 ; run `32636262489` SUCCESS ;
- M6-B cutover contract : PR #881 ; run `32647288760` SUCCESS ;
- M6-C Node freshness defense : PR #882 ; run `32647718215` SUCCESS ;
- current-main sait réaliser un cutover ODM 100 % avec approbation explicite, emergency stop et fallback legacy ;
- Node + SQL exigent `fresh_confirmed` ;
- `/search` reste `noindex` ; SEO city/district reste sur legacy guarded Search tant que le cutover SEO n’est pas produit.

## Runtime production
Dernier déploiement READY vérifié : `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah`, commit `10420b4c0e0622122aa86608e7f257080e6b3c44`.

M6 ne peut pas fermer avant déploiement + activation + preuve runtime, car ces changements current-main ne sont pas encore en production.

## Next exact
Autorisation Vercel -> déployer M6 -> appliquer configuration cutover contrôlée -> vérifier `/api/search`, fallback, pages SEO, logs et rollback -> closeout M6 -> M7.

## Interdits permanents
- aucun déploiement Vercel sans autorisation explicite ;
- aucun contournement de contrôles techniques ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe.
