# DATA MASS-INDEX — M3 Source Factory adapters

**Issue : #854**  
**Lot : M3**  
**Statut : implementation candidate — certification requise avant closeout**

## Goal
Industrialiser les sources prioritaires par configuration/adaptateur sans réinterpréter les droits de réutilisation et sans introduire de fetch direct pendant la certification M3.

## Succès
- 10 domaines prioritaires du contrat #854 couverts par une config déterministe ;
- seulement les providers natifs M2 `openserp` et `serper_mass_harvest` ;
- budget de lecture borné à 40 candidats par domaine ;
- canary bornée à 10 listings valides par domaine ;
- budget d'erreurs + circuit breaker explicites ;
- rendement `candidate canonical URL -> valid listing` mesuré séparément par domaine ;
- aucune activation publique, aucun relabel provider, aucun fetch direct, aucun write DB ;
- compatibilité avec la Source Factory policy-first historique et le classifieur M1 prouvée par tests.

## Architecture

`discovery_candidates (read-only) -> M3 domain config -> M1 universal promotion -> per-domain yield/canary -> M2 external-index candidate`

M3 ne remplace pas `source-factory.ts`, `source-factory-decision.ts` ni `source-factory-policy-matrix.ts`. Ces briques restent la couche de gouvernance et de preuve. Le nouvel adaptateur M3 ne transforme jamais une décision `HOLD`/`PERMISSION_REQUIRED` en permission et ne rend rien publiquement activable.

## Cohorte initiale
- marocannonces.com
- yakeey.com
- domio.ma
- 2p.ma
- sakane.ma
- 1000-annonces.com
- housing.place
- expat.com
- milkiya.ma
- portail-immobilier.ma

## Budgets initiaux de certification
Par domaine :
- `candidateReadBudget = 40` ;
- `validListingCanaryBudget = 10` ;
- `maxErrorCount = 2` ;
- `maxErrorRate = 0.20` ;
- `sourceNetworkRequestBudget = 0` ;
- `directFetchAllowed = false` ;
- `publicActivationAllowed = false`.

Ces valeurs bornent le benchmark M3 ; elles ne constituent pas encore des budgets d'ingestion M4.

## Circuit breaker
Le breaker ouvre si le nombre d'erreurs dépasse `maxErrorCount` ou si le taux d'erreur dépasse `maxErrorRate`. La certification échoue si un breaker est ouvert.

## Preuve attendue
Workflow `MASS-INDEX M3 Source Factory Certification` :
1. contrats M3 ;
2. régression Source Factory / decision / policy matrix ;
3. régression M1 + contrat provider M2 ;
4. TypeScript ;
5. requêtes Supabase bornées read-only sur les 10 domaines ;
6. artifact `m3-source-factory-canary-report.json` avec rendement par domaine ;
7. assertions : 10/10 domaines mesurés, 0 write DB, 0 source-network request, 0 direct fetch, 0 activation publique, 0 relabel, 0 mutation policy, 0 breaker ouvert.

## Gate M4
M4 ne pourra sélectionner que les domaines dont M3 fournit un échantillon mesuré et un rendement réellement positif. Un domaine sans échantillon ou à rendement nul reste hors ingestion nationale jusqu'à nouvelle preuve.

## Interdits
- aucun contournement de login/CAPTCHA/anti-bot/paywall ;
- aucun spoofing ou mécanisme furtif ;
- aucun contenu riche réutilisé implicitement ;
- aucun déploiement Vercel sans autorisation explicite.
