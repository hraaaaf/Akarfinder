# AkarFinder — Session courante

**Mise à jour : 2026-08-23**

`docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — DATA MASS-INDEX
Issue : `#854`.

Progression stricte : **7/8 lots CLOSED = 87,5 %**.

### CLOSED
- M0 baseline ;
- M1 Universal candidate promotion ; run `32577296107` SUCCESS ;
- M2 External Index ; run `32580352867` SUCCESS ;
- M3 Source Factory ; PR #863 ; run `32594176513` SUCCESS ;
- M4 National MASS ingest ; PR #871 ; merge `206672c8a24b7aa95271f2f7d32dbc733dba08b5` ;
- M5 Dedup + freshness ; PR #874 + #876 ;
- M6 Search activation + SEO ; PR #879 + #881 + #882 ; runtime production certifié.

## M6 — CLOSED — production runtime certified

### Code/CI
- M6-A : PR #879 ; run `32636262489` SUCCESS ; artifact `9492399522` ;
- M6-B : PR #881 ; run `32647288760` SUCCESS ; artifact `9495238964` ;
- M6-C : PR #882 ; run `32647718215` SUCCESS ;
- SQL + Node exigent `fresh_confirmed` ; `seed_only` rejeté ; ODM 100 % certifié sur les requêtes compatibles avec emergency stop et fallback legacy.

### Production
- déploiement : `dpl_GHqzoTyvJpsTo1R5D8yELfbrbtq6` ;
- target : `production` ; état : `READY` ; alias primaire : `akarfinder.vercel.app` ;
- SHA déployé et imprimé au build : `6ade8c35dcaad013cef28422137dbad83ea1dbdf` ; compilation Next SUCCESS ;
- Rabat compatible -> ODM (`source=database_fallback`) ;
- Rabat + Agdal -> legacy contrôlé (`source=database`) ;
- `/search` -> HTTP 200 + `noindex, follow` ;
- `/search` absent de `/sitemap.xml` ;
- runtime errors `/api/search,/search` : aucun sur la fenêtre de certification ;
- logs du deployment : 72 réponses 200 observées, aucun 5xx ;
- rollback disponible : `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah` READY, commit `10420b4c0e0622122aa86608e7f257080e6b3c44`.

### Anomalie non bloquante consignée
Le build bootstrap a signalé `npm audit` avec 5 vulnérabilités high severity. Aucun lien d’exploitabilité production n’a été établi dans ce lot ; à traiter dans un chantier sécurité/dépendances dédié, sans réécrire la preuve M6.

### Cohérence Git/runtime
`main` a avancé après le runtime M6 jusqu’à `b7262ce940785be0b663caace6a4b8ccb464fc34` avec un correctif seed-freshness indépendant. Aucun redéploiement implicite de ce HEAD n’a été effectué.

## M7 — ACTIVE — conversion partenaires

### Goal initial
Transformer les représentations/source leads admissibles en opportunités partenaires traçables, sans enrichissement inventé ni exposition de données personnelles non autorisées.

### Next exact
1. audit read-only du code, DB et modèles de contact/partenariat existants ;
2. baseline vérifiée des surfaces disponibles et de leurs droits ;
3. définir funnel + métriques de conversion sans métrique inventée ;
4. implémentation bornée ;
5. certification et closeout final MASS-INDEX.

## Invariants
- aucun Vercel sans autorisation explicite ;
- aucun bypass technique ;
- aucune donnée de contact inventée ;
- provenance et droits obligatoires ;
- pas de métrique unique/property sans preuve de dédup.
