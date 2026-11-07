# AkarFinder — P5 PR CI hors-ligne, aucune DB Supabase hébergée
**Décision propriétaire du 05/11/2026. Draft non fusionnée.**

## Goal / preuve
**Goal :** garantir que les workflows de tests PR P5 ne sollicitent pas l'ancien ni le nouveau Supabase hébergé. **Succès :** suite de tests P2–P5 synthétiques + TypeScript PASS sur le HEAD, aucun secret de DB cloud injecté, aucune étape serveur/Playwright susceptible d'appeler une Supabase cloud. **Preuve :** code YAML + logs CI. Cela ne constitue PAS une validation visuelle AFTER de P5.

## Constat avant correction
L'ancien workflow `.github/workflows/partner-market-intelligence-p2.yml` injectait `secrets.SUPABASE_URL` et `secrets.SUPABASE_SERVICE_ROLE_KEY` dans un job PR, compilait et lançait une application sur un port local, puis demandait des pages API dépendant de Supabase. Le [run #42046861866](https://github.com/hraaaaf/Akarfinder/actions/runs/42046861866) avait échoué sur `ENOTFOUND` vers l'ancien projet hébergé et une réponse HTTP 503, puis sur l'absence de rapport AFTER. En plus de l'échec, ce pattern solliciterait le backend distant s'il devenait accessible.

## Solution proposée (PR Draft)
- Workflow renommé `Partner Market Intelligence P5 (offline regression)`, job `partner-pipeline-offline`.
- **Retrait** de tous les secrets et URLs Supabase hébergés du job de PR.
- **Conservation** des six suites de tests synthétiques Partner P2–P5 et de `tsc --noEmit`.
- Assertion qui échoue si l'environnement reçoit des variables de connexion cloud nommées `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL_DIRECT`, `DATABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL`.
- **Retrait** des étapes `npm run build`, démarrage serveur, Playwright, certification visuelle AFTER et upload d'artefacts P5. Leur absence est **explicite** : les suites hors ligne ne fournissent pas de preuve d'UI/UX réelle ni de présence de données en production.
- Dans une mission ultérieure, créer une certification P5 UI locale entièrement sur fixtures, avec mêmes viewports BEFORE/AFTER, captures visibles, tests de comportement, et **aucun** secret cloud. Jamais sur la nouvelle DB Supabase à titre de staging sans autorisation distincte.

## Limites
Ce durcissement concerne **uniquement** le workflow P5. Les autres workflows, scripts, tests, previews et l'application peuvent encore contenir des accès Supabase : l'audit global fail-closed reste à réaliser. La présence d'un guard d'environnement ne démontre pas qu'aucun code ne possède d'URL cloud codée en dur ; ce risque nécessite une inspection dédiée.
 
La nouvelle Supabase `mgqsckxsqdqbzqwkgvwo` reste intacte. L'ancien projet `kusfiyimwvxblvsrhaes` reste à supprimer ultérieurement par le propriétaire. Aucun changement de DB, aucun secret modifié, aucun merge ni déploiement Vercel.

**Références :** politique `AKARFINDER_ZERO_REMOTE_DB_DEV_POLICY_2026-11-05.md` sur PR Draft #1162 ; Codex local backup [Issue #1163](https://github.com/hraaaaf/Akarfinder/issues/1163).

## Next exact
Vérifier la CI sur le HEAD réel de cette PR ; résoudre tout échec ; vérifier les autres workflows appelant Supabase hébergé en dev/CI avant généralisation de la politique. R2 disponibilité / R3 droits inchangés, `fresh_unique_eligible=UNKNOWN`.

## 05/11/2026 — test de la correction P5 et CI Efficiency
Sur le HEAD `42b9dd15d3402b680b65527b8f3ff73dbc39063d`, [Partner Market Intelligence P5 offline #42111488674](https://github.com/hraaaaf/Akarfinder/actions/runs/42111488674) **SUCCESS** et [Product Constitution Gate #42111483607](https://github.com/hraaaaf/Akarfinder/actions/runs/42111483607) **SUCCESS** : npm ci, six suites synthétiques, typecheck local et garde-fou des credentials passent réellement. [CI Workflow Efficiency Policy #42111488604](https://github.com/hraaaaf/Akarfinder/actions/runs/42111488604) **FAILURE** car le groupe de concurrence utilisait seulement `github.ref`, alors que le validateur exige `github.workflow` et une identité de PR (`github.event.pull_request.number` ou `github.head_ref`). Dans le présent commit, le groupe devient `github.workflow` + `github.event.pull_request.number || github.ref` avec `cancel-in-progress: true`. **La nouvelle CI exact SHA reste à vérifier**. Aucune DB cloud, aucun merge, aucun Vercel ; la certification visuelle P5 AFTER n'est toujours pas prouvée.
