# AkarFinder R1 — recoupement intégral local ↔ Neon — 2026-11-05

**Statut : NON CLOS — outil de rapprochement publié et testé localement, exécution intégrale réelle NON prouvée.**

## Goal / succès / preuve
Goal : mesurer l'intersection exacte *source-scoped* entre les 32 460 candidats du ZIP local autorisé et les clés explicites `source_offer_key` de l'archive Neon. Succès : un rapport JSON d'agrégats, sur **tous** les candidats de chaque source, sans écrire en DB ni divulguer les identifiants. Preuve requise : exécution avec l'archive vérifiée et une extraction complète Neon de la branche recovery, avec contrôle des compteurs.

## Données vérifiées
- ZIP local `akar-200k-isolated-inventory.zip` : `zip.testzip() = None`, SHA256 interne valide, SQLite `integrity_check=ok`, **27 106 Avito + 5 354 Mubawab = 32 460** IDs source-scoped distincts. Tous `UNVERIFIED`, `ready_for_use=0`, `publication_eligible=0`.
- Neon recovery **archivée** : project `ancient-violet-43534870`, branch `br-cold-mouse-b2a50yaa`, DB `AkarFinder`. Audit SELECT : `listing_sources` Avito `avito.ma` **14 000** lignes / **13 422** clés numériques ; Mubawab `mubawab.ma` **44 099** lignes / **31 875** clés numériques ; Mubawab `mubawab` 13 lignes sans clé. Des clés explicites sont NULL / non numériques : l'absence de match explicite **n'est pas la preuve d'une annonce distincte**.
- Échantillons exacts, non extrapolables : **12 correspondances sur 210 IDs**, 1 Avito / 11 Mubawab. Ce ne sont ni l'intersection globale ni des annonces fraîches certifiées.
- R0 historique Avito+Mubawab `136 716` références : inchangé, non certifié frais/physiquement unique.

## Livrables
- `scripts/audits/reconcile_local_neon_source_keys.py` : validateur ZIP+SHA+SQLite, jointure **numérique stricte** source+clé, comptages d'exclusivité et d'intersection, rapport **agrégé uniquement**. Supporte CSV exporté ou connexion PostgreSQL en **transaction read-only** (`default_transaction_read_only=on` et `SHOW transaction_read_only`). Aucun `INSERT/UPDATE/DELETE`.
- `scripts/audits/tests/test_reconcile_local_neon_source_keys.py` : preuve de non-normalisation risquée, de déduplication des clés et de non-exposition des IDs. **3 tests similaires exécutés localement : PASS** ; la CI distante du HEAD final reste à confirmer.
- `scripts/audits/compare_source_identity_exports.py` : Agenz en quarantaine (suffixes numériques ambigus), Domio/Sarout identité URL avec contrôle du host. Voir l'audit Sarout 14 305 paires FR/AR / 10 divergences géographiques à revoir.

## Exécution autorisée sur machine ayant accès à l'archive Neon
```bash
python -m pip install 'psycopg[binary]'
# Définir AKARFINDER_NEON_RECOVERY_DSN dans l'environnement local sécurisé,
# en pointant EXCLUSIVEMENT vers la branche recovery archivée.
python scripts/audits/reconcile_local_neon_source_keys.py \
  --archive /chemin/securise/akar-200k-isolated-inventory.zip \
  --dsn-env AKARFINDER_NEON_RECOVERY_DSN \
  --output /chemin/securise/r1_local_neon_aggregate.json
```

**Limite actuelle :** le conteneur local peut lire le ZIP, mais sa résolution DNS vers Neon échoue. Le connecteur Neon interroge la base, mais ne peut pas accéder directement au SQLite du conteneur. La comparaison exhaustive croisée **n'a pas été exécutée**. Ne pas inventer de chiffres d'intersection ou d'union.

## Suite exacte
1. Exécuter l'outil sur les deux jeux réels dans un environnement autorisé qui dispose du ZIP et de l'accès réseau recovery ; vérifier les agrégats et les clés absentes.
2. Réconcilier, séparément, les lignes Neon sans clé explicite à l'aide d'identités URL source-scoped vérifiées, sans créer de faux matches.
3. Contrôler les collisions et le dédoublonnage physique, puis **fraîcheur, statut actif et droits**. R1 ne certifie **pas** l'objectif 200k.
4. Aucun merge, DB write ni déploiement Vercel sans gates distincts.

## Borne rigoureuse avant la comparaison exhaustive — 2026-11-05

**Nouvelle vérification Neon recovery, SELECT uniquement :**

| Source | ZIP IDs | Neon rows | Neon numeric distinct keys | Neon NULL keys | Neon other keys |
|---|---:|---:|---:|---:|---:|
| Avito | 27 106 | 14 000 | 13 422 | 578 | 0 |
| Mubawab (source_name='mubawab.ma') | 5 354 | 44 099 | 31 875 | 12 153 | 71 |
| Mubawab alias (source_name='mubawab') | included above locally | 13 | 0 | 13 | 0 |

The two Neon explicit numeric-key sets total **45,297** distinct source-scoped identities, and the ZIP contains **32,460**. By elementary set bounds, **before measuring the full intersection**:

- Avito exact-key union lies between **27,106 and 40,527** (at least one already verified match).
- Mubawab exact-key union lies between **31,875 and 37,218** (at least eleven already verified matches).
- Combined strict numeric source-key union lies in **[58,981, 77,745]**. This upper bound uses the **12 independently observed exact matches** from earlier 210-probe sample; without sample confirmation the safe upper bound is 77,757.

**These are mathematical bounds, NOT the actual deduplicated result**; they exclude Neon rows with missing/nonnumeric keys and say nothing about real properties, live availability, freshness or rights. They must NOT be compared directly to the R0 historical 136,716 as though identical universes.
