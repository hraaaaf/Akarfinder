# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-1.6B — Source Registry Assignment ✅ PR #338 + hotfix #339**  
**Prochain lot DATA : DATA-4 — Large Reservoir Depth Audit**  
**Lot UX acquis : CARTE-QUARTIER-P1A.2 — Search Geo Contract ✅ PR #334**  
**Prochain lot UX : CARTE-QUARTIER-P1A.3 — Map State & Navigation**

Ce fichier est le handover opérationnel court du projet. `docs/ROADMAP.md` reste l’unique roadmap canonique.

## Main canonique

`main` inclut notamment :

- Mon Projet P1B ✅ PR #318 ;
- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score **9,5/10** ;
- CARTE-QUARTIER-P1A.2 ✅ PR #334, merge `1fbe3e4` ;
- DATA-1.1 ✅ PR #322 ;
- DATA-1.2 ✅ PR #323 ;
- DATA-1.3A ✅ PR #324 ;
- DATA-1.3B ✅ PR #326 ;
- DATA-1.4 ✅ PR #329 ;
- DATA-1.5 ✅ PR #331, score **9,4/10** ;
- DATA-1.6A ✅ PR #333, score **9,5/10** ;
- DATA-1.6B ✅ PR #338 + #339, score final **9,6/10**.

Invariants : no-bypass, aucune activation sans Source Registry explicite, capability ≠ permission, Search reste le moteur canonique, Map reste le moteur spatial complémentaire.

# DATA — état acquis

## DATA-1.2 — Existing Reserve Census ✅

- **37 009 URLs distinctes** ;
- **7 051 domaines**.

## DATA-1.3B — Common Crawl Live Evidence ✅

- crawl : `CC-MAIN-2026-25` ;
- **300/300 Parquet** ;
- **9 087 hosts bruts** ;
- **8 970 hosts canoniques** ;
- **8 727 registered domains** ;
- aucun WARC/content fetch, aucune écriture Supabase, aucune activation.

## DATA-1.4 — Candidate Reconciliation ✅

- univers réconcilié : **15 238 domaines** ;
- **15 222 non enregistrés** au moment de l’audit ;
- `PRIMARY_SOURCE_CANDIDATE` : **230** ;
- `PORTAL_CANDIDATE` : **625** ;
- fail-closed : 0 write / 0 policy.

## DATA-1.5 — Candidate Technical Capability Audit ✅

PR **#331**.

Batch P0 :

- **20/20 domaines audités** ;
- **19 `CAPABILITY_REVIEW_READY`** ;
- familles : 3 RealHomes, 3 Houzez, 5 WordPress génériques, 8 structured-web ;
- 116 requêtes publiques ; maximum **7 GET/domain** sur budget 8 ;
- 0 write DB / 0 policy / 0 auth / 0 bypass / 0 WARC ;
- score **9,4/10**.

## DATA-1.6A — Source Policy Evidence Review ✅

PR **#333**, merge `28fbdf5`.

Preuve finale run **31182352538** :

- sources auditées : **19** ;
- requêtes : **79** ;
- max **5/domain** ;
- `RESTRICTIVE_TERMS_FOUND` : **1** ;
- `TERMS_FOUND_NO_EXPLICIT_PERMISSION` : **3** ;
- `INSUFFICIENT_LEGAL_EVIDENCE` : **11** ;
- `ACCESS_OR_FETCH_LIMITED` : **4** ;
- `PUBLIC_CHANNEL_SIGNAL_FOUND` : 0 ;
- 0 write / 0 policy / 0 auth / 0 bypass / 0 WARC ;
- head `69f6545` : **20/20 workflows verts** ;
- score **9,5/10**.

Double-check qualitatif : privacy-only ≠ terms ; legal→homepage ≠ preuve CGU ; timeout/robots-path-limit → access-limited ; une mention générique d’autorisation préalable ne suffit pas à conclure restrictif.

`prestigeimmo.ma` reste la seule source restrictive du batch car une restriction substantielle sur accès automatisé/copie/reproduction a été observée.

## DATA-1.6B — Source Registry Assignment ✅

### PR et certification

PR **#338**, head `3ecf9d6`, merge `92fd7e0`.

Preflight read-only run **31186041984** :

- 19 décisions ;
- target déjà présent : **0** ;
- activating assignments : **0** ;
- hidden : **19** ;
- direct fetch : **0** ;
- partner : **0** ;
- authorization attendu : 1 prohibited / 3 permission_required / 15 unverified ;
- **20/20 workflows verts**.

### Incident de migration maîtrisé

Première application production : **échec atomique avant tout insert**.

Cause : `source_policy_registry.execution_score` est `GENERATED ALWAYS`; la migration tentait de l’insérer explicitement.

Contrôles après échec :

- **0/19** ligne écrite ;
- aucune entrée ajoutée dans `supabase_migrations.schema_migrations` ;
- aucune policy partielle.

Hotfix **PR #339**, merge `3694902` :

- retrait de `execution_score` de l’INSERT ;
- PostgreSQL le calcule automatiquement ;
- test permanent interdisant son retour dans la liste INSERT ;
- **20/20 workflows verts**.

### Production finale certifiée

Migration Supabase : `data_1_6b_source_registry_assignment`  
Version enregistrée : **`20260807142236`**.

Résultat production :

- nouvelles lignes Registry : **19/19** ;
- authorization :
  - `prohibited` : **1** ;
  - `permission_required` : **3** ;
  - `unverified` : **15** ;
- acquisition :
  - `blocked` : **1** ;
  - `public_index_internal_only` : **18** ;
- detail fetch :
  - `prohibited` : **1** ;
  - `permission_required` : **3** ;
  - `legal_review_required` : **11** ;
  - `paused` : **4** ;
- display :
  - `blocked` : **1** ;
  - `internal_signal_only` : **18** ;
- `display_gate=hidden` : **19** ;
- unsafe/activating : **0** ;
- generated `execution_score` : min **6**, max **30**.

`prestigeimmo.ma` :

- discovery `paused` ;
- detail `prohibited` ;
- reuse `prohibited` ;
- display `blocked` ;
- authorization `prohibited` ;
- acquisition `blocked` ;
- channels `[]` ;
- machine gate `blocked_invalid_no_bypass` ;
- ingestion gate `blocked` ;
- display gate `hidden` ;
- `no_bypass_required=true`.

**Score final DATA-1.6B : 9,6/10.**

# Doctrine DATA active

`DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE`

`TECHNICAL CAPABILITY ≠ SOURCE PERMISSION`

Les 19 nouvelles lignes du Registry sont des **garde-fous de gouvernance**, pas des activations de sources.

# Prochain lot DATA — DATA-4

## Large Reservoir Depth Audit

Objectif : déterminer si le multiplicateur vers **20K observations** se trouve déjà dans les grands réservoirs connus avant de multiplier les connecteurs long-tail.

Premier scope audit-only :

1. Mubawab ;
2. Avito immobilier ;
3. autres grands portails marocains déjà connus du Registry/Census, classés ensuite par volume × policy × profondeur.

Pour chaque source :

- volume public annoncé/estimé ;
- couverture AkarFinder actuelle ;
- profondeur discovery actuelle ;
- sitemap/pagination/structured data ;
- robots / CGU / noindex / policy Registry ;
- historique Common Crawl ;
- pages détail publiquement atteignables ;
- fraîcheur ;
- duplication/bruit ;
- meilleur mode admissible : `PARTNER_FEED`, `INDEX_ONLY`, `PUBLIC_DISCOVERY`, `NO_INGESTION` ;
- **gap potentiel d’observations** sans contourner la policy.

DATA-4 ne construit pas de scraper dans son premier lot. Il mesure d’abord le potentiel réel et la frontière d’usage autorisée.

# UX — handover

## CARTE-QUARTIER-P1A.2 ✅

PR **#334**, merge `1fbe3e4`, toutes les gates déclenchées vertes.

Acquis :

- `district` est un filtre Search structuré ;
- `/search?city=Rabat&district=Agdal` porte une identité géographique explicite ;
- `q` reste texte libre ;
- DB et Typesense appliquent `district` via Geo Registry ;
- lane ODM sans district autoritatif fail-closed au lieu d’élargir à la ville ;
- SSR/client/API conservent le district ;
- quartier et Map transmettent `city + district` vers Search ;
- aucune migration ni modèle géographique parallèle.

## Prochain UX : P1A.3 — Map State & Navigation

Cible :

`/map?city=rabat&district=agdal&layer=explore&project_id=...`

Objectif : conserver `city`, `district`, `layer`, filtres/intention utiles et `project_id` de bout en bout, avec Back/Forward et liens partageables.
