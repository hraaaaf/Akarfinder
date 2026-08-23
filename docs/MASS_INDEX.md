# AkarFinder — DATA MASS-INDEX

**Issue canonique : #854**  
**Statut : M0→M6 CLOSED — M7 ACTIVE / conversion partenaires**

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
- M6 — Search activation + SEO : ✅ CLOSED.
- M7 — Conversion partenaires : 🟡 ACTIVE.

**Progression : 7/8 = 87,5 %.**

## M4 — résultat final
965 URLs certifiées ; 955 inserts + 10 préservés ; Thin Index +0 attendu ; Search OFF ; run final `32610621902` SUCCESS ; PR #871.

## M5 — résultat final
- shadow dedup conservateur, aucune fusion automatique ; run `32611464377` SUCCESS ;
- freshness gate prod : les deux RPC publics servent `fresh_confirmed` uniquement ; run `32631787333` SUCCESS ;
- `seed_only` reste un réservoir non public.

## M6 — résultat final
- M6-A baseline : PR #879 ; run `32636262489` SUCCESS ; artifact `9492399522` ;
- M6-B cutover contract : PR #881 ; run `32647288760` SUCCESS ; artifact `9495238964` ;
- M6-C Node freshness defense : PR #882 ; run `32647718215` SUCCESS ;
- Node + SQL exigent `fresh_confirmed` ;
- production certifiée sur `dpl_GHqzoTyvJpsTo1R5D8yELfbrbtq6`, alias `akarfinder.vercel.app`, SHA `6ade8c35dcaad013cef28422137dbad83ea1dbdf` ;
- requête `city=Rabat` -> ODM ; requête `city=Rabat&district=Agdal` -> legacy contrôlé ;
- `/search` est `noindex, follow` et absent du sitemap ;
- aucune erreur runtime Search observée pendant la certification et aucun 5xx sur le deployment ;
- rollback immédiatement disponible vers `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah` READY.

Le `main` Git a avancé ensuite jusqu’à `b7262ce940785be0b663caace6a4b8ccb464fc34` avec un correctif seed-freshness indépendant. Le runtime M6 certifié reste explicitement le SHA `6ade8c35dcaad013cef28422137dbad83ea1dbdf`; aucun redéploiement implicite n’a été fait.

## M7 — objectif
Convertir les sources/représentations admissibles en partenaires et contacts actionnables avec provenance, droits, consentement et métriques de funnel vérifiables. Aucun contact, identité ou taux de conversion ne peut être inventé.

## Next exact
Audit read-only code + DB + modèles de contact/partenariat -> baseline droits/provenance -> définir funnel mesurable -> implémentation bornée -> certification -> closeout MASS-INDEX.

## Interdits permanents
- aucun déploiement Vercel sans autorisation explicite ;
- aucun contournement de contrôles techniques ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe ;
- aucune utilisation de contact personnel non autorisée.
