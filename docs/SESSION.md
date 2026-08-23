# AkarFinder — Session courante

**Mise à jour : 2026-08-23**

`docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — DATA MASS-INDEX
Issue : `#854`.

Progression stricte : **6/8 lots CLOSED = 75 %**.

### CLOSED
- M0 baseline ;
- M1 Universal candidate promotion ; run `32577296107` SUCCESS ;
- M2 External Index ; run `32580352867` SUCCESS ;
- M3 Source Factory ; PR #863 ; run `32594176513` SUCCESS ;
- M4 National MASS ingest ; PR #871 ; merge `206672c8a24b7aa95271f2f7d32dbc733dba08b5` ;
- M5 Dedup + freshness ; PR #874 + #876.

## M6 — ACTIVE — production runtime gate

### M6-A baseline
- PR #879 ; merge `bd514a8f8797a77096bf11d52875dec431342367` ;
- run `32636262489` SUCCESS ; artifact `9492399522` ;
- DB : 3 054 display-eligible `fresh_confirmed`, RPC public 3 049 ; 5 `openserp` exclus par whitelist provider.

### M6-B cutover contract
- PR #881 ; merge `4fa80e5e1e512666fe81c973de268f13e207cd43` ;
- run `32647288760` SUCCESS ; artifact `9495238964` ;
- ODM 100 % certifiable avec `enabled=true`, `approved=true`, `percent=100`, `stop=false` ;
- emergency stop et absence d’approbation reviennent à `legacy_primary` ; erreur ODM -> `legacy_fallback` ; district reste legacy.

### M6-C freshness defense
- PR #882 ; merge `c49c31fa90f27bf6d48ac15146b9191464ecbd14` ;
- run `32647718215` SUCCESS ;
- Node et SQL exigent `fresh_confirmed` ; `seed_only` rejeté ;
- 0 DB write / 0 env prod / 0 Vercel.

### Blocage réel
Production Vercel vérifiée encore sur :
- deployment `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah` READY ;
- commit `10420b4c0e0622122aa86608e7f257080e6b3c44`.

Donc M6 n’est pas CLOSED : aucun runtime prod M6 n’a encore été déployé ni certifié.

## Next exact
Human gate Vercel -> deploy current-main M6 -> cutover contrôlé -> runtime/logs/SEO verification -> rollback proof -> closeout M6 -> M7.

## Invariants
- aucun Vercel sans autorisation explicite ;
- aucun bypass technique ;
- aucune métrique propriété unique avant preuve ;
- provenance réelle et fraîcheur obligatoires.
