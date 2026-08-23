# MASS-INDEX M6 — Search activation + SEO

**Date : 2026-08-23**  
**Statut : ✅ CLOSED — production runtime certified**  
**Issue canonique : #854**

## Goal
Activer Search + SEO uniquement à partir de représentations admissibles, avec fraîcheur et provenance vérifiées, sans régresser les invariants M0–M5.

## Succès
- voie ODM réellement servie en production pour les requêtes compatibles ;
- legacy limité aux cas contrôlés/fallback ;
- `fresh_confirmed` requis SQL + Node ;
- `seed_only` non servi ;
- `/search` non indexable et absent du sitemap ;
- runtime production sans erreur Search critique pendant la certification ;
- rollback disponible.

## M6-A — CLOSED — baseline read-only
- PR #879 ; merge `bd514a8f8797a77096bf11d52875dec431342367` ;
- run `32636262489` SUCCESS ;
- artifact `9492399522` ; digest `sha256:3a19cec4b90f050dc1a5251ca535787a829121269cdddeaa0f867cbf5731d07b` ;
- baseline : 3 054 LISTING display-eligible `fresh_confirmed`, 3 049 admissibles au RPC public ; 5 `openserp` exclus par whitelist provider.

## M6-B — CLOSED — Search cutover contract
- PR #881 ; merge `4fa80e5e1e512666fe81c973de268f13e207cd43` ;
- run `32647288760` SUCCESS ;
- artifact `9495238964` ; digest `sha256:afe8914b543a92f81e8e0915e679902100909ffa3a9e632fab5608ea74d9f68b` ;
- ODM 100 % sur requêtes compatibles avec approbation explicite ;
- emergency stop / défaut d’approbation -> legacy primaire ; erreur ODM -> legacy fallback ; district -> legacy tant que l’ODM n’a pas de district autoritatif.

## M6-C — CLOSED — freshness defense
- PR #882 ; merge `c49c31fa90f27bf6d48ac15146b9191464ecbd14` ;
- run `32647718215` SUCCESS ;
- serving policy Node : `fresh_confirmed` uniquement ;
- `seed_only` et provider non approuvé rejetés en défense secondaire.

## Production runtime — CERTIFIED
Déploiement cible :
- ID `dpl_GHqzoTyvJpsTo1R5D8yELfbrbtq6` ;
- project `prj_RCs2Ku5vex9cpABWnwaCjbuKrhhc` ;
- target `production` ;
- state/readyState `READY` ;
- alias primaire `akarfinder.vercel.app` ;
- `aliasError=null` ;
- SHA verrouillé au build : `AKARFINDER_DEPLOY_SHA=6ade8c35dcaad013cef28422137dbad83ea1dbdf` ;
- Next.js compile SUCCESS ; deployment completed.

### Runtime Search
- `GET /api/search?city=Rabat` -> réponse réussie, `source=database_fallback` : voie ODM réelle pour requête compatible ;
- `GET /api/search?city=Rabat&district=Agdal` -> réponse réussie, `source=database` : legacy contrôlé conservé pour district.

### SEO
- `GET /search` -> HTTP 200 ; robots `noindex, follow` et googlebot `noindex, follow` ;
- `GET /sitemap.xml` -> HTTP 200 ; `/search` absent de l’urlset.

### Observabilité
- `get_runtime_errors` sur `/api/search,/search`, fenêtre de certification : aucune erreur runtime ;
- logs du deployment groupés par status : 72 réponses `200` observées ;
- filtre `5xx` : aucun log trouvé.

### Rollback
Ancienne production :
- `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah` ;
- commit `10420b4c0e0622122aa86608e7f257080e6b3c44` ;
- état `READY` ; build terminé proprement.

Rollback non exécuté car le nouveau runtime est sain ; sa disponibilité est prouvée.

## Legacy/SEO guard
- Search legacy structuré : first-party / partner-authorized par défaut ;
- exception OpenSERP persistée désactivée par défaut et encadrée ;
- pages city/district indexables restent sur legacy gardé tant que l’ODM n’a pas de district autoritatif.

## Anomalie non bloquante
Le bootstrap de build a signalé `npm audit` avec 5 vulnérabilités high severity. Le lot M6 n’a pas établi leur exploitabilité production. Elles sont consignées pour traitement sécurité/dépendances séparé et ne sont pas utilisées comme preuve de santé applicative.

## Cohérence Git/runtime
Après le déploiement certifié, `main` a avancé jusqu’à `b7262ce940785be0b663caace6a4b8ccb464fc34` avec un correctif seed-freshness indépendant. Ce commit n’est pas inclus dans la certification runtime M6 et n’a pas été redéployé implicitement.

## Conclusion
**M6 CLOSED.** Goal, succès et preuves production sont satisfaits pour le SHA runtime certifié `6ade8c35dcaad013cef28422137dbad83ea1dbdf`.

## Next exact
M7 — conversion partenaires : audit read-only -> baseline droits/provenance/contact -> funnel mesurable -> implémentation bornée -> certification.
