# AKARFINDER — GitHub Actions uniquement, jusqu'aux annonces fraîches
**Décision propriétaire : 06/11/2026 — REVIREMENT DE PRIORITÉ.**

## Goal
Continuer à développer et certifier les composants **sans Codex sur ordinateur**, sans PostgreSQL local, sans Supabase hébergé et sans besoin de données réelles, en utilisant **GitHub et GitHub Actions uniquement**.

**Critère de succès du lot courant** : une CI légère refuse les nouvelles références à secrets/terminaux/CLI de DB hébergée introduites dans les workflows GitHub (sur le diff complet de PR) ; tests de régression synthétiques et vérification des workflows existants. **Preuve :** tests Node, YAML du workflow existant, runs GitHub Actions sur le HEAD exact.

## Décision de portée
- **EN PAUSE** : Codex #1163, sauvegarde gzip, replay PostgreSQL local, extension `http`, `supabase_vault`, Docker/WSL, RLS en DB réelle et migration Supabase. Ne pas installer de logiciels ni manipuler les backups ; les preuves et rapports déjà acquis restent traçables.
- **AUTORISÉ** : CI/Actions, tests unitaires de parsers, ranking/filtres, adaptateurs de sources autorisées, déduplication logique sur fixtures synthétiques, compatibilité de schémas en statique, simulations de fraîcheur/revalidation, qualité, sécurité, conformité. Pas de scraping non autorisé.
- **PRODUCTION** : ne pas relier Supabase/Vercel pour le développement, ne pas déclarer des annonces `fresh_confirmed` à partir de fixtures ou d'archives. Les 77 072 identités historiques source-scoped du rapprochement R1 ne sont pas un stock frais.
- **GATE DE REPRISE DB** : nouvelles annonces réellement fraîches, source et droits vérifiés, volume/traçabilité connus, projet production prêt, permission spécifique du propriétaire. Alors seulement rouvrir le dossier stockage et coûts.

## Protection CI de ce lot
Le contrôle existant `scripts/ci/validate-workflow-efficiency.mjs`, exécuté par `.github/workflows/ci-workflow-efficiency-policy.yml`, est renforcé pour **bloquer toute nouvelle ligne introduisant** dans un workflow :
- secrets DB hébergée (Supabase, Neon, `DATABASE_URL`, etc.),
- endpoints `supabase.co` ou URL PostgreSQL avec credentials,
- commandes `supabase link`, `supabase db push/pull`.

Le contrôle lit le **diff complet merge-base→HEAD** (pas seulement le dernier commit), tout en laissant les anciennes références inchangées afin de ne pas casser rétroactivement le dépôt : leur nettoyage exige des PR séparées et des revues de risque. Les lignes retirées ne sont pas signalées. **Limite du contrôle** : lint lexical ciblé, non un pare-feu réseau ; une nouvelle dépendance dissimulée ou héritée d'un script peut nécessiter une vérification supplémentaire.

Tests dédiés dans `scripts/ci/validate-workflow-efficiency.test.mjs`. Aucun nouveau workflow lourd, aucun appel aux secrets Supabase depuis cette CI, aucune écriture DB, aucun deploy Vercel.

## Backlog actionnable GitHub Actions, sans DB
1. Qualifier les preuves JSON des canaries **hors ligne** (format, sources, dates, droits, limites de fréquence) : un artifact historique/fixture ne devient jamais « fraîcheur confirmée ».
2. Renforcer le refus d'admission de disponibilités inconnues/obsolètes dans les projections et tests d'intention (R2).
3. Prouver la séparation des identités source et la déduplication physique ambiguë à partir de fixtures, sans prétendre compter les biens réels en prod.
4. Préparer des gates R3 droits explicites et de provenance ; pas de publication si contrat et fraîcheur réels absents.
5. Lorsque des annonces fraîches et autorisées seront réellement disponibles : revoir stockage, budget, scripts d'ingestion et plateforme de production **sur nouveau feu vert**.

## Repères et closeout
- Repo : `hraaaaf/Akarfinder`.
- Mission PostgreSQL historique : [issue #1163](https://github.com/hraaaaf/Akarfinder/issues/1163) (historique conservé, mise en pause).
- Draft architecture DB [PR #1161](https://github.com/hraaaaf/Akarfinder/pull/1161), Draft bootstrap [PR #1162](https://github.com/hraaaaf/Akarfinder/pull/1162) : aucune fusion sous ce pivot.
- Draft R2 [PR #1159](https://github.com/hraaaaf/Akarfinder/pull/1159), Draft P5 CI offline [PR #1164](https://github.com/hraaaaf/Akarfinder/pull/1164) : audits existants à réutiliser quand ils n'utilisent aucune DB cloud.
- **Next exact** : CI sur HEAD de ce guard, vérification des tests et diffusion dans Notion. Ensuite, gates de provenance/fraîcheur synthétiques sans réseau et sans base.
- **Aucun merge, aucun déploiement Vercel, aucune modification Supabase, aucun import, aucun appel Codex.**

**Verdict attendu** : policy CI prouvée sur GitHub Actions ; disponibilité et fraîcheur réelles restent **UNKNOWN**, la reconstruction DB est explicitement **DEFERRED**.
