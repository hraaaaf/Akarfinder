# AkarFinder R1 — recoupement intégral local ↔ Neon — 2026-11-05

**Statut : PASS pour le recoupement exhaustif par clé explicite source-scoped; résolution URL supplémentaire NON VALIDÉE et maintenue en quarantaine.**

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

**Exécution réalisée le 2026-11-05 :** le comparateur a lu le ZIP vérifié et l’export complet autorisé de la branche recovery. Résultats exacts par clé explicite : Avito 328 intersections, 26 778 local-only, 13 094 Neon-only, union 40 200 ; Mubawab 357 intersections, 4 997 local-only, 31 518 Neon-only, union 36 872 ; total 685 intersections et union 77 072. Les invariants sont satisfaits. Les rapports agrégés publiés sont `r1_local_neon_exact_overlap.json` et `r1_local_neon_identity_anomalies.json`.

## Suite exacte
1. Valider un contrat URL source-scoped distinct avant tout rapprochement des 12 815 lignes sans identité numérique explicite ; aucun suffixe ou slug ambigu ne sera utilisé.
2. Contrôler les collisions et le dédoublonnage physique, puis **fraîcheur, statut actif et droits**. R1 ne certifie **pas** l'objectif 200k.
3. Aucun merge, DB write ni déploiement Vercel sans gates distincts.

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

## Fraîcheur des observations Neon archivées — preuve SELECT du 2026-11-05

| source_name | rows | max(last_seen_at) UTC | `last_seen_at >= 2026-10-06 UTC` | NULL last_seen_at |
|---|---:|---|---:|---:|
| `avito.ma` | 14 000 | 2026-09-08 11:09:09.601 | 0 | 256 |
| `mubawab.ma` | 44 099 | 2026-09-08 11:14:08.493 | 0 | 16 020 |
| `mubawab` alias | 13 | 2026-07-13 15:16:27 | 0 | 0 |

Ces champs prouvent uniquement une **absence d'observations récentes enregistrées dans cette archive**. Ils ne prouvent ni suppression ni inactivité actuelle sur les portails. Aucune source ne peut être certifiée fraîche par cette récupération Neon sans validation live autorisée. Le compteur frais/uniques exploitable reste **UNKNOWN**.
