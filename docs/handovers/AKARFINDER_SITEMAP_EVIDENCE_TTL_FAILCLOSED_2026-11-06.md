# AkarFinder — borne temporelle des preuves sitemap (06/11/2026)

## But
Une preuve sitemap **datée dans le futur** ou **plus ancienne que 14 jours** ne doit jamais permettre de proposer `fresh_confirmed`, y compris si un canary rejoue un artefact archivé. Ce contrat est indépendant du fait qu'une annonce soit actuellement disponible.

## Correctif offline
- `scripts/data4/daragadir-freshness-evidence-canary.ts` : ajout d'une horloge d'évaluation contrôlable `evaluatedAt`, vérification horloge/date et refus hors intervalle fermé **0 à 14 jours**.
- `scripts/data4/daragadir-freshness-write-canary.ts` : le plan de write-canary hérite de la même règle sans exception.
- `scripts/audits/data-4-3d-freshness-evidence-canary.ts` et `scripts/audits/data-4-3e-first-freshness-write-canary.ts` : utilisent une seule valeur `generatedAt` pour l'observation et la décision, pour éviter les divergences d'horloge.
- Tests ciblés : borne exacte de 14 jours autorisée, dépassement de 1 ms refusé, futur refusé, horloge invalide refusée, archive expirée refusée, plan write-canary refusé pour futur/expiré.

## Succès et preuve
**Succès :** CI PR offline sur HEAD exact, les suites d'évidence + write-canary + TypeScript PASS ; aucune tâche `live-dry-run` sur la PR.

**Attention :** aucun test n'utilise de nouvelles annonces réelles ; les suites fixtures ne prouvent ni la fraîcheur du marché ni une autorisation de réutilisation des contenus. La proposition `fresh_confirmed` n'est pas une preuve de disponibilité actuelle du bien.

## Doctrine 2026-11-06
Travail **GitHub Actions uniquement**. Ne pas déclencher les jobs `workflow_dispatch` manuels qui lisent les bases hébergées ; ils sont historiques et hors de portée du lot. Pas de Codex local, pas de PostgreSQL/Supabase, pas d'import, de merge automatique ou de déploiement Vercel.

**Suivi :** fichier d'orientation `docs/handovers/AKARFINDER_GITHUB_ACTIONS_ONLY_2026-11-06.md` (PR #1167). PR de date future sur le pipeline de listing : #1168.

## Incident CI ancien workflow DATA-4.0 — confinement branche

- **Fait vérifié** : [run #42207233091](https://github.com/hraaaaf/Akarfinder/actions/runs/42207233091), job `live-audit` : `getaddrinfo ENOTFOUND kusfiyimwvxblvsrhaes.supabase.co` le 06/11/2026. Une tentative DNS vers l'ancien Supabase a existé, **sans preuve de connexion réussie ni lecture DB**.
- **Cause** : `.github/workflows/data-4-large-reservoir-depth-audit.yml` contient historiquement un `live-audit` non gardé sur les PR `scripts/data4/**`, avec injection de secrets Supabase.
- **Confinement dans cette Draft PR uniquement** : `live-audit` a `if: ${{ false }}` ; le build lourd de PR est retiré, tandis que tests et TypeScript restent. Le groupe `concurrency` respecte le contrat CI existant (isolé par PR). Un contrôle séparé doit prouver `live-audit=SKIPPED` sur le dernier HEAD.
- **Limite** : `main` conserve le workflow historique, faute de merge. Ne pas lancer le job manuel ni ouvrir de PR sur `scripts/data4/**` sans une protection équivalente. Toute fusion est un gate distinct si elle entraîne un déploiement Vercel automatique.
- **États antérieurs** : au HEAD `5cf6b07`, quatre suites métier/baseline/constitution et DATA-4.0 ont réussi, mais le CI Efficiency Policy a échoué sur le groupe `concurrency` ; correction dans le HEAD ultérieur, verdict **à recontrôler**.
