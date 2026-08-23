# MASS-INDEX M6 — Search activation + SEO

**Date : 2026-08-23**  
**Statut : ACTIVE — production runtime gate**  
**Issue canonique : #854**

## Goal
Activer Search + SEO uniquement à partir de représentations admissibles, avec fraîcheur et provenance vérifiées, sans régresser les invariants M0–M5.

## M6-A — CLOSED — baseline read-only
- PR #879 ; merge `bd514a8f8797a77096bf11d52875dec431342367` ;
- run `32636262489` SUCCESS ;
- artifact `9492399522` ; digest `sha256:3a19cec4b90f050dc1a5251ca535787a829121269cdddeaa0f867cbf5731d07b` ;
- 0 write DB, 0 activation Search/SEO, 0 Vercel.

Baseline : 3 054 LISTING display-eligible `fresh_confirmed`, 3 049 admissibles au RPC public ; les 5 exclues sont toutes `openserp` hors whitelist provider.

## M6-B — CLOSED — Search cutover contract
- PR #881 ; merge `4fa80e5e1e512666fe81c973de268f13e207cd43` ;
- run `32647288760` SUCCESS ;
- artifact `9495238964` ; digest `sha256:afe8914b543a92f81e8e0915e679902100909ffa3a9e632fab5608ea74d9f68b`.

Contrat certifié :
- `ODM_PUBLIC_CANARY_ENABLED=true` ;
- `ODM_PUBLIC_CANARY_APPROVED=true` ;
- `ODM_PUBLIC_CANARY_PERCENT=100` ;
- `ODM_PUBLIC_CANARY_STOP=false` ;
- requête ODM-compatible -> lane `odm` ;
- approbation absente ou emergency stop -> `legacy_primary` ;
- erreur ODM -> `legacy_fallback` ;
- district -> legacy tant que l’ODM n’a pas de district autoritatif.

## M6-C — CLOSED — freshness defense
- PR #882 ; merge `c49c31fa90f27bf6d48ac15146b9191464ecbd14` ;
- run `32647718215` SUCCESS ;
- serving policy Node : `fresh_confirmed` uniquement ;
- `seed_only` rejeté en défense secondaire ;
- provider non approuvé rejeté ;
- 0 DB write, 0 env prod, 0 Search activation, 0 Vercel.

## Legacy/SEO guard vérifié
- Search legacy structuré : first-party / partner-authorized par défaut ;
- exception OpenSERP persistée désactivée par défaut et encadrée par feature flag + metadata + source allowlist + URL sûre + absence de PII ;
- `/search` reste `noindex, follow` et absent du sitemap ;
- pages city/district indexables utilisent encore le moteur legacy gardé.

## Runtime gate restant
Dernier déploiement production READY vérifié :
- `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah` ;
- commit `10420b4c0e0622122aa86608e7f257080e6b3c44`.

Ce runtime est antérieur aux merges M6. M6 reste donc ACTIVE malgré les certifications current-main/DB.

## Succès restant pour fermer M6
1. déployer un HEAD contenant M6 avec autorisation explicite ;
2. configurer le cutover production contrôlé ;
3. vérifier que les requêtes compatibles passent bien par ODM et restent `fresh_confirmed` ;
4. vérifier emergency stop / fallback ;
5. certifier le comportement SEO/runtime sur le déploiement cible ;
6. aucun leak `seed_only`, contenu riche non autorisé ou métrique de doublon non prouvée.

## Human gate
**Aucun Vercel sans autorisation explicite.**

## Next exact
Autorisation Vercel -> deploy M6 -> cutover -> runtime/log verification -> rollback proof -> M6 CLOSED -> M7.
