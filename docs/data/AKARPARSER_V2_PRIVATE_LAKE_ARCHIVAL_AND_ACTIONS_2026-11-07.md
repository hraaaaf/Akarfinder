# AkarParser V2 Q1E — Private Lake, GitHub Actions, Neon admission only

## Decision (07/11/2026)

**GitHub Actions does the work, not the storage.** The raw 151,900 historical Neon Recovery rows live in a verified private archive, with a second copy on an **independent storage volume**. The GitHub Actions workflow orchestrates an isolated **self-hosted Windows runner**, colocated with this private lake. This avoids giving a GitHub-hosted PR or an external cloud account access to the historical listings. No owner Neon credentials, no PR secrets, no raw ZIP or JSON uploaded to GitHub, no Vercel.

**Neon product** is reserved for independently validated import-ready listings. Existing **Neon Recovery is a historical evidence source**, not the destination for new raw rows; leave it unchanged until the private archive is certified. The Q1E code **never imports into product Neon** and does not claim a single new certified observation. `ready_internal` from the parser is not admission to Neon. The separate promotion gate requires reviewer-authored, access-controlled evidence of rights, latest availability, deduplication and privacy. Its current output is **eligible for separate import review**, not permission to publish, nor an authenticated proof signature.

## Available evidence / blocking facts

- `neon_recovery_export_20261107.jsonl.gz` — reported location: `C:\Users\lenovo\Desktop\AkarFinder-DataMass-2026-11-07\` (not accessible inside GitHub-hosted Actions or this remote environment).
- Reported historical SHA-256 **`c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08`**, **151,900 JSONL rows**. Confirm these before copying. We do **not** recalculate or claim source integrity from GitHub now.
- Existing PR #1188 parser code has successful fixture and checked-in repo cohort regression; a **true 1,000-row Python run on the historical private export** has not been performed.
- The scripts and workflow can be committed and tested without needing private data. Activation depends on an authorized self-hosted Windows runner with access to a **second physical/logical volume**, private environment variables and workflow rules. Do not interpret a passing PR CI as a private data run.

## Implementation files

- `scripts/acquisition/akarparser_v2_private_archive.py`: validates the original SHA, gzip and exact row count; writes content-addressed immutable copies in pre-provisioned primary and replica roots on different volumes, verifies both copies and source; replays idempotently without rewriting anything. Requires both roots to exist. No network, no cloud DB.
- `scripts/acquisition/akarparser_v2_canary.py`: streams the verified historical source, selects 1,000 stratified records and generates 100 **unreviewed** private dossiers. JSON and dossiers never leave local runner folders.
- `scripts/acquisition/akarparser_v2_promotion_gate.py`: independently checks identity, Morocco, canonical parity, core fields, last observation, conflicting fields and **external attestation** of rights, availability, privacy, dedup and freshness; no import/write; approvals must be separately authenticated by a trusted workflow before any product use. `eligible_for_separate_import_review` ≠ ready for public search.
- `.github/workflows/akarparser-v2-private-windows-lake.yml`: manual-only on `main`, boolean explicit gate, protected environment `q1e-private-local`, runner `[self-hosted, windows, akarfinder-private-lake]`, source and destinations set via environment **variables**; fails closed if not present. No artifact upload or raw logs. No webhook/PR execution.

## Human-controlled setup for a private GitHub Actions runner

Register a dedicated self-hosted runner on the Windows workstation, scoped/restricted to trusted branches/workflows and isolated from untrusted PR jobs. Install Python 3.11+. On an environment `q1e-private-local`, allow only trusted `main` branch, require approval where supported, and set the variables:

- `Q1E_RAW_EXPORT_PATH`: exact local verified historical `.jsonl.gz` input path.
- `Q1E_ARCHIVE_PRIMARY`: pre-existing private directory on archive volume 1.
- `Q1E_ARCHIVE_REPLICA`: pre-existing private directory on separate archive volume 2 (not merely a second folder on the same volume).
- `Q1E_PRIVATE_RESULTS`: pre-existing private directory for canary output, outside repo checkout.

**Do not add raw source paths or credentials as public repo constants.** Exclude the working directories from the repo; restrict filesystem ACL to the dedicated runner identity. GitHub Actions code from PRs must never run on this runner. `workflow_dispatch` becomes available after this file is **reviewed and safely merged to main**, an independent gate. The user has not authorized merging in this lot. Never use a privileged Neon URL to shortcut the archive.

## Acceptance criteria

1. `SOURCE_SHA256_MISMATCH`, malformed gzip, count !=151900, a replay conflict, missing second volume => **refuse the archive**.
2. Two independent-volume immutable copies with matching SHA and count; source SHA unchanged; aggregate manifest only in private archive. No deletion of source branch or Windows input.
3. Windows Actions run processes exactly 1,000 **actual** historical JSONL source rows; 100 review dossiers **prepared**, `publication_allowed=0`, `new_detailed_observations_certified=0`, and the output stays private.
4. Manual independent annotations of at least 100 originals establish observed price/surface/type precision. Target >=98% on the defined annotated metrics, not automatically inferred by the code.
5. Only after evidence, legal permissions, verified availability, unique source identity, safe dedup and privacy: promotion gate can *prepare* a private import-candidate JSONL. A separate restricted Neon importer and post-import DB checks require explicit authorization. No current code is allowed to write Neon.

**Next exact:** review the PR code + tests; make the Windows runner and independent backup volume available; authorize a `main` workflow execution; inspect only the aggregate manifest. If archive verification fails, stop without changing the source and diagnose mismatch. Never publish personal data or claim new detailed observations from an archive or a candidate URL.


## Q1E poste Windows — préflight réel et blocage du 07/11/2026

- Lecture seule de la source historique : SHA-256 attendu et observé concordants (`c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08`), intégrité gzip valide, exactement **151 900 objets JSONL**, **0 ligne JSON invalide**. Contrôle du hash après les vérifications : identique. Aucun fichier source ou Neon Recovery modifié.
- L’archivage a échoué fermé avant toute copie : aucun second volume utilisable et préprovisionné n’est disponible. Windows expose un disque physique NVMe ; l’unique autre volume est la partition Windows Recovery, non montée, de 815,8 MB au total avec environ 71,9 MB disponibles, sans répertoire de destination autorisé. **Aucune copie, aucun manifeste d’archive et aucun hash d’archive** n’existent.
- Conformément au critère de refus, le parseur n’a pas été lancé sur les vraies lignes : **0/1 000 fiches traitées**, aucun JSON canonique réel produit, doublons/quarantaine/erreurs et couverture réelle non mesurés, aucune revue réelle préparée ou effectuée, **0 écriture Neon**. Aucune précision n’est revendiquée.
- Les six fichiers de tests Python AkarParser V2 ont été exécutés individuellement au HEAD de cette PR dans un worktree détaché propre : **44/44 PASS**. Les contrôles CI de ce HEAD sont SUCCESS pour regression, validate, typecheck, gate et detect_drift; `owner_approval` et `override_preflight` sont SKIPPED pour la PR Draft.
- Revue statique du workflow privé : dispatch manuel uniquement sur `main`, confirmation booléenne, environnement protégé, pas de déclenchement PR, permission GitHub `contents: read`, pas d’upload d’artefact/cache ni d’accès DB codé. L’enregistrement effectif du runner dédié, ses ACL, son isolation réseau et ses règles d’accès aux branches/jobs restent **non vérifiés**. La PR reste Draft; aucun merge n’a été effectué.
- **Next exact :** provisionner un volume privé utilisable et indépendant, avec répertoire persistant et ACL réservées au compte du runner ; enregistrer/configurer le runner Windows dédié de manière à exclure tout code de PR non approuvée ; faire valider le workflow sur `main` et autoriser le dispatch protégé. Ensuite reprendre dans l’ordre : double archive et manifeste reproductible, canary stratifié réel de 1 000, puis revue humaine indépendante des 100 dossiers.

## Q1E Amendment — independent canary and durable archive gates (07/11/2026)

**Decision:** the verified historical Windows export can be used immediately for a **read-only 1,000-row canary**, even though the independent second-volume archive remains blocked. Keep its source SHA-256, 151,900 JSONL object, gzip and before/after checks. Nothing is backed up merely by creating derived working files on the same disk.

**Independent modes:** `canary_only` requires only strict `--verify-only` input preflight (zero copies), then the 1,000-row sample and 100 *unreviewed* dossiers; `archive_then_canary` retains both independent archive destination requirements before the same canary. The current archive code must continue to refuse a missing replica. No public publication or Neon product write in either mode.

**Codex Windows immediate command (from an isolated clean PR #1188 worktree, no runner/merge/second disk):**

```powershell
$private = 'C:\Users\lenovo\Desktop\AkarFinder-DataMass-2026-11-07'
$inputFile = Join-Path $private 'neon_recovery_export_20261107.jsonl.gz'
$out = Join-Path $private ('Q1E_CANARY_ONLY_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
python scripts/acquisition/akarparser_v2_private_archive.py --verify-only --input "$inputFile"
if ($LASTEXITCODE -ne 0) { throw 'Q1E_SOURCE_PREFLIGHT_FAILED' }
python scripts/acquisition/akarparser_v2_canary.py --input "$inputFile" --out "$out" --sample-size 1000 --audit-size 100
if ($LASTEXITCODE -ne 0) { throw 'Q1E_CANARY_FAILED' }
```

Output must be in a new private directory outside repo/checkout, with sufficient free space and private ACL. **Never share** raw sample, source URLs, individual reviews or extracted rows to GitHub/Notion; share only checked aggregate report statistics and source SHA. A technically green run is not a 100-person source-backed accuracy review and adds zero certified detailed observations. The self-hosted Windows runner and main-only protected manual dispatch remain separate steps, not prerequisites of immediate local Codex analysis. Before durable archive certification, procure/authorize an independent second physical destination. **No merge, Neon product write or Vercel deployment.**


## 2026-11-07 — Q1E réel canary 1 000 lignes (Windows privé)

**HEAD exécuté :** `00f5af14ada487769e75775a8886eee27fcced59`, PR #1188 Draft. Les options `--verify-only`, `--sample-size` et `--audit-size` sont présentes. L'export original `neon_recovery_export_20261107.jsonl.gz` a passé `--verify-only` : 151 900 lignes, SHA-256 `c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08`, aucune copie créée.

Le canary a traité 1 000 véritables enregistrements, stratifiés à 200 par groupe (Mubawab, Avito, Agenz, Domio, Other), en lecture seule. Résultats : `ready_internal` 133, `complete_candidate` 349, `partial` 485, `candidate_url` 0, `quarantine` 33. Erreurs de parsing 0; doublons exacts identité/horodatage 0. Les statuts sont des états internes; `ready_internal` n'autorise aucune écriture Neon.

### Couverture de sortie (présence, pas précision)

| Champ | Présent / 1 000 |
|---|---:|
| Titre | 1 000 |
| Description | 0 |
| Ville | 1 000 |
| Quartier | 600 |
| Type de bien | 1 000 |
| Transaction | 1 000 |
| Prix MAD | 547 |
| Surface totale (m²) | 574 |
| Chambres | 65 |

Par groupe, statuts (`ready_internal` / `complete_candidate` / `partial` / `quarantine`) : Agenz 1/48/136/15; Avito 0/151/49/0; Domio 50/1/149/0; Mubawab 32/100/50/18; Other 50/49/101/0. Chaque groupe compte 200 enregistrements. Les issues relevées sont : pays inconnu 1 000, identité source non vérifiée explicitement 487, horodatage source non démontré 728, champs core manquants 485, conflit entre ID source et URL 33 (mis en quarantaine).

### Dossiers de revue et précision

La file privée contient 100 dossiers non annotés. Les 100 sont rattachés à une ligne originale du canary par URL exacte; 60/100 ont aussi un ID source explicitement identique, aucun ID présent des deux côtés ne contredit l'autre. Comparaison automatisée aux champs structurés originaux disponibles : prix 65/65, surface 72/72 et type 100/100 concordent exactement. Cette comparaison de champs persistés ne constitue pas une vérité terrain indépendante ni une annotation humaine. **Précision indépendante pour prix, surface et type : NON VÉRIFIÉE**; revue humaine terminée : 0/100. Les dossiers préparés restent dans le stockage privé local.

Le rapport `aggregate_report.json` et le manifeste de vérification privé `Q1E_CANARY_RESULT.manifest.json` se trouvent sous `Q1E_CANARY_20261107_233845` sur le Bureau; hash du manifeste de vérification : `fba347b1ee9983d46795079c18158c317963e2b8aea588918aec04dc6d7b835f`. La source a la même empreinte avant/après. Aucun changement parser n'a été nécessaire : champs manquants et conflits ont été conservés comme états incomplets/quarantaine, sans enrichissement inventé. Tests locaux liés au parseur : 48/48 PASS.

Aucun nouvel enregistrement détaillé n'est certifié par ce canary; le total de référence reste 9 990, avec un écart de 190 010 à 200 000. Aucun write Supabase/Neon, publication, merge, déploiement ou scraping n'a eu lieu. Le second disque et le runner GitHub n'étaient pas requis.

## 09/11/2026 — Clôture technique récupération description

Export privé de **151 900 lignes** reconstruit avec les **14 950 descriptions** effectivement présentes dans Neon Recovery et une jonction exacte par identifiant. Source originale intacte, nouvelle archive SHA-256 `487e2ca47c8abb7ee7f18d17e753ba1c9d466704ac13bc2b78eac4dffbf85c0e` ; génération reproductible à l'octet. Canary réel **1 000/1 000**, **252** descriptions sur le nouvel échantillon ; comparaison appariée sur les mêmes 1 000 fiches : **0 → 240** descriptions, autres champs source inchangés. Tests Python **69/69 PASS** en local. **0/100 dossiers vérifiés indépendamment** ; aucune publication, admission Neon ou certification de nouvelle annonce. Voir [`AKARPARSER_V2_DESCRIPTION_RECOVERY_2026-11-09.md`](AKARPARSER_V2_DESCRIPTION_RECOVERY_2026-11-09.md) pour la preuve détaillée et la séquence restante.
