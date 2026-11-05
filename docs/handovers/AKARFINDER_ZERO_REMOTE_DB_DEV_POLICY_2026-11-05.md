# AkarFinder — Politique ZERO DB hébergée en développement
**Décision propriétaire : 2026-11-05. Statut : doctrine approuvée, application technique globale NON auditée.**

## Goal
Garantir que le développement, les prévisualisations et les validations automatiques ne sollicitent **aucune base Supabase hébergée**. Ne connecter la nouvelle base `mgqsckxsqdqbzqwkgvwo` que lorsqu'un parcours de production réellement prêt et autorisé nécessite d'enregistrer ou lire des annonces réelles. Prévenir toute consommation inutile, surcharge de requêtes, suspension ou dépassement de quota.

## Périmètre et séparation des environnements
| Environnement | Données | Accès DB Supabase hébergée |
| --- | --- | --- |
| GitHub / PR / CI | Fixtures synthétiques, mocks, tests statiques | **INTERDIT** |
| Dev local et preview | Fixtures synthétiques, mocks ; **PostgreSQL/Supabase local éphémère** pour replay du schéma si nécessaire | **INTERDIT** |
| Staging pré-production | Tests avec mocks et base locale/isolée ; pas d'injection de listings réelles dans une base hébergée | **INTERDIT par défaut**, exception seulement après nouvelle approbation explicite |
| Production autorisée | Annonces réelles provenant de sources avec droits prouvés, fraîcheur contrôlée, déduplication vérifiée | **AUTORISÉ sous budget et gardes** |

**La base locale jetable n'est pas la base Supabase en ligne.** Le test de migration peut créer et détruire une DB locale, mais doit prouver qu'il n'a jamais utilisé les URI/clé de Supabase cloud ou le compte de production.

## Garde-fous dev / CI à mettre en place avant tout branchement
1. Ne **jamais exposer** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL_DIRECT` ou `DATABASE_URL` pointant vers un domaine hébergé dans les workflows de tests. Les secrets de production ne doivent pas être injectés dans les PR/preview.
2. Par défaut, fail-closed : tout client DB distant en `development`, `test`, `CI` ou `preview` doit être bloqué explicitement. Tester cette règle et l'absence d'appels réseau à Supabase lors des tests ; fournir une exception **locale uniquement** (`localhost`, `127.0.0.1`, Docker local).
3. Déconnecter de la CI les workflows historiques qui exigent l'ancien projet `kusfiyimwvxblvsrhaes`, en conservant leurs rapports d'échecs visibles ; **ne pas remplacer leurs secrets** par ceux de la nouvelle base. P5 actuel : ancienne cible inactive, DNS `ENOTFOUND` et HTTP 503.
4. Les migrations seront vérifiées depuis un **baseline schema-only** local issu de la sauvegarde propriétaire ; jamais via application aveugle des 214 migrations historiques sur le nouveau projet.
5. Ne pas déclencher en dev/preview : ingestion automatique, crawling, recrawl, backfill, cron, nettoyage ou import de masse vers la base cloud.

## Budget et admission en production — à coder/tester puis certifier
- Exiger preuve de permission d'exploitation (R3) **avant toute insertion d'annonces tierces** et preuve récente de disponibilité (R2) avant compter une annonce active.
- Opérations **delta / upsert source-scoped** et idempotentes, jamais full reload récurrent. Empêcher duplication par ID et collision entre sources ; les cas ambigus restent en quarantaine.
- Pagination bornée, budget maximum par exécution, backoff sur erreurs et 429/5xx, circuit breaker et désactivation des tâches lorsque les quotas sont approchés.
- Une seule tâche d'ingestion simultanée par source ; seuils et fréquence à fixer à partir du plan Supabase effectivement souscrit et d'une mesure réelle, **pas de chiffres arbitraires**.
- KPI vérifiables : requêtes/heure, écritures/heure, taille de DB, limites/quota, taux de doublons, publication conforme, temps depuis la dernière preuve positive.
- Politique d'images conservatrice : pas de téléchargement/cache de médias tiers sans permission.

## Point de départ vérifié
- GitHub `hraaaaf/Akarfinder`, rapport [PR Draft #1162](https://github.com/hraaaaf/Akarfinder/pull/1162) ; 214 fichiers de migrations historiques, 5 collisions de version, objets initiaux potentiellement absents (scanner statique), reconstruction encore NON PRouvée.
- Ancien Supabase `kusfiyimwvxblvsrhaes` : INACTIVE, suppression reportée au propriétaire ; nouveau `mgqsckxsqdqbzqwkgvwo` : ACTIVE_HEALTHY mais public vide au dernier contrôle.
- R1 a établi **77 072 identités source-scoped historiques**, **PAS 77 072 annonces fraîches et légalement admissibles**.
- Aucun rattachement de la nouvelle Supabase à Vercel, à GitHub Actions ni au développement n'est approuvé. Aucun déploiement Vercel sans autorisation explicite.

## Codex — reprise sur ordinateur propriétaire
Le schéma SQL de sauvegarde est sur le poste du propriétaire. Voir l'issue GitHub de mission Codex liée à cette politique. Ne jamais demander d'importer la sauvegarde brute dans le dépôt ni de l'envoyer au modèle. Produire **uniquement** le schéma minimisé/sanitisé, le rapport d'intégrité et les tests de restauration locale.

## Critères observables de succès
1. Audit des chemins DB en dev/CI/preview sans secret cloud, avec preuves négatives d'accès (tests + logs).
2. Reproduction du schéma local éphémère avec tests de RLS et tests applicatifs.
3. Pipeline production séparé, borné en quotas, utilisant uniquement annonces réelles admissibles, **après validation humaine distincte**.
4. Aucun ancien projet supprimé, aucune nouvelle DB hébergée écrite, aucun merge ni déploiement sans décision explicite.

**Statut d'exécution au 05/11/2026 : doctrine consignée ; l'enforcement runtime global et le replay local restent à implémenter/certifier.**
