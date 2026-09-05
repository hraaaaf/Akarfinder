# Lot 5 Status

**Status: ✅ CLOSED — deterministic dedup/lifecycle proven**

## Goal

Rendre les runs répétés idempotents et gérer la vie d'une annonce sans perdre la provenance source.

## Implémentation

- `data-ingestion/lifecycle.ts`
- `scripts/scrapers/__tests__/data-ingestion-lifecycle.test.ts`
- `scripts/data-ingestion-lifecycle-proof.ts`
- workflow `Data Ingestion Lot 5 Lifecycle Gate`

## Règles prouvées

- clé d'idempotence : `source.name + source_id` ;
- même clé + même `content_hash` → `unchanged`, pas d'insert ;
- même clé + hash différent → `update`, `first_seen_at` préservé ;
- 1er run complet absent → `stale` ;
- 2e run complet absent → `inactive` ;
- plusieurs annonces représentant le même bien → même `property_group_id`, lignes source distinctes ;
- matching cross-source sans fusion de provenance ;
- records hors scope du run conservés ;
- purge Mubawab limitée à `source.name=mubawab AND source_type=portal` ;
- `agency_direct` et `partner_feed` survivent à la purge ;
- zéro écriture DB / production.

## Fingerprint baseline

Le matching immobilier refuse les cas trop pauvres et exige :

- ville ;
- type de bien ;
- surface ;
- quartier ou adresse.

Le prix n'entre pas dans le fingerprint afin qu'une variation de prix ne casse pas le rapprochement du même bien.

Le matching crée seulement un `property_group_id`. Il ne fusionne jamais les enregistrements source ni leur provenance.

## Preuve finale

Workflow : `Data Ingestion Lot 5 Lifecycle Gate`

- run : **#3**
- run ID : **33801186360**
- head SHA : **7a459279b6fb402603b1eefcc345ff91e3aee04d**
- artifact : `data-ingestion-lot5-lifecycle-proof`
- artifact ID : **9911110576**
- digest : `sha256:61f528b39095009f9e2918750da7f889854f503dc5bd1e884f559c06c4740a01`
- tests unitaires : **SUCCESS**
- proof successive-run : **SUCCESS**

Artefact final inspecté : `proof.json`, `run2-decisions.json`, `run3-decisions.json`.

### Run 2

- `insert = 2`
- `unchanged = 1`
- `update = 1`
- `stale = 1`
- `inactive = 0`
- `out_of_scope = 2`
- records après run : **7**
- doublons même bien : `mubawab:A` et `mubawab:A2` → même `property_group_id = group-A`
- matching cross-source : `agency-alpha:D` et `mubawab:D2` → même `property_group_id = group-direct`

### Run 3

- `insert = 0`
- `unchanged = 4`
- `update = 0`
- `stale = 0`
- `inactive = 1`
- `out_of_scope = 2`
- `mubawab:C` → `inactive`
- `absence_runs = 2`
- stock total contrôlé : **7**, sans croissance artificielle

### Purge source

- Mubawab portal purgés : **5**
- conservés : `agency-alpha:D`, `partner-x:P`
- `agency_direct_survives = true`
- `partner_feed_survives = true`

### Sécurité

- `database_writes = 0`
- `production_writes = 0`
- `assertions_passed = true`

## Conclusion

Le succès canonique Lot 5 est satisfait : plusieurs runs successifs montrent idempotence, update, stale/inactive, rapprochement de doublons, matching cross-source et purge source sans perte de provenance directe/partenaire.

**Lot 5 est CLOSED.**

## Next exact

### Lot 6 — Crawl Mubawab complet hors production

Construire un crawl large, chunké, reprenable et auditable couvrant les catégories / villes / transactions ciblées, avec :

- fichiers JSONL découpés ;
- manifest global ;
- erreurs/rejets ;
- couverture par catégorie / ville / transaction ;
- qualité moyenne ;
- checkpoint/reprise ;
- zéro ingestion AkarFinder.

## Interdictions inchangées

- zéro write production
- zéro ingestion AkarFinder
- aucun merge automatique
- aucun déploiement Vercel
