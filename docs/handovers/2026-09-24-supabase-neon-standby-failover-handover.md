# AKARFINDER — SUPABASE PRIMARY ↔ NEON STANDBY / FAILOVER — HANDOVER

Date: 2026-09-24

## Goal

Concevoir et préparer une architecture de continuité de service où :

- Supabase PostgreSQL reste le primaire en fonctionnement normal.
- Neon conserve une copie suffisamment fraîche et indépendante pour reprendre le trafic base de données si Supabase devient indisponible.
- Pendant un incident, Neon devient le SEUL primaire d'écriture autorisé.
- Après rétablissement de Supabase, le delta créé/modifié sur Neon pendant l'incident est resynchronisé vers Supabase de façon contrôlée.
- Aucun dual-write non coordonné et aucun split-brain ne sont autorisés.
- Le retour éventuel à Supabase n'est permis qu'après preuve de parité.

Ce chantier doit être conçu comme un mécanisme de DR/failover PostgreSQL, pas comme un simple backup froid.

## Succès observable

Le chantier n'est considéré réussi que si toutes les preuves suivantes existent :

1. Baseline Supabase → Neon importée et vérifiée.
2. Mécanisme de synchronisation normal Supabase → Neon démontré sur un jeu de données représentatif.
3. Test de panne simulée : Supabase indisponible, AkarFinder lit depuis Neon.
4. Test d'écriture incident : une nouvelle annonce est créée sur Neon uniquement.
5. Test de reprise : le delta incident est propagé Neon → Supabase sans perte ni duplication.
6. Parité vérifiée : counts + IDs + timestamps/version + digest/checksum sur les tables critiques.
7. Un seul writer est actif à chaque étape.
8. Runbook de bascule et de retour documenté.
9. Aucun secret exposé.
10. Aucun déploiement Vercel sans autorisation explicite.

## État vérifié au handover

### Repository

- Repo: `hraaaaf/Akarfinder`
- Migration PR existante: #1082
- Branche migration: `infra/neon-migration-20260923`
- Dernier HEAD migration produit validé: `d794616471e77b98e9c7b6138060d69ad49b0b95`
- Neon Runtime Read Path Validation: run `35927501137` → SUCCESS.
- Canonique migration mis à jour ensuite sur commit docs `8615235cab0b7b2d7ef239a415107d8269fe9906`.

### Neon

- Project ID: `ancient-violet-43534870`
- Branch: `br-frosty-glitter-b2762sv1`
- Database: `AkarFinder`
- Aucun import/apply Neon n'a encore été exécuté.
- Aucun provider production n'a été basculé vers Neon.

### Supabase

- Project: `AqarFinder`
- Project ref: `kusfiyimwvxblvsrhaes`
- Region: `eu-north-1`
- PostgreSQL: 17.6
- Control plane observé: `ACTIVE_HEALTHY`
- SQL actuellement indisponible avec:
  - `57P03: the database system is not accepting connections`
  - `Hot standby mode is disabled`
- Logs PostgreSQL observés:
  - `database system was not properly shut down; automatic recovery in progress`
  - `redo starts at 22/F609FA68`
  - cible de redo récurrente observée: `23/CFFFEE0`
  - plusieurs `redo done` suivis de nouveaux cycles de recovery.
- L'ancien message `exceed_egress_quota` n'est plus celui observé pendant les derniers tests.
- Ne pas conclure que la DB est rétablie tant qu'un `SELECT 1` n'est pas passé.

### Workflow PG17

Workflow:
`Neon Migration Validation Suite`

- enregistré sur `main` via PR #1085
- merge commit: `b0ec9d6a5526bd60c14653a5679b88e2e6d7194d`
- source-only
- PostgreSQL 17 scratch
- aucune cible Neon
- aucun mode apply

Dernier run:
- run `35969875172`
- SHA `d794616471e77b98e9c7b6138060d69ad49b0b95`
- 5 jobs créés
- 5/5 ont échoué immédiatement à `Validate source secret`
- cause exacte: `Missing SUPABASE_DATABASE_URL_DIRECT`

Le secret `SUPABASE_DATABASE_URL_DIRECT` n'était pas enregistré dans GitHub Actions lors du dernier contrôle.

L'utilisateur a indiqué disposer localement d'une connexion PostgreSQL directe Supabase récupérée depuis son environnement/Vercel. Sa valeur ne doit jamais être copiée dans ChatGPT ni dans un fichier du repo.

## Architecture cible à étudier et valider

### Mode NORMAL

`Supabase = writer primaire`

`Supabase → Neon = réplication/synchronisation`

Neon doit rester indépendant et requêtable même si Supabase tombe.

### Mode INCIDENT

Quand Supabase est déclaré indisponible :

1. arrêter/neutraliser toute écriture vers Supabase ;
2. promouvoir Neon comme unique writer ;
3. basculer les lectures et écritures DB AkarFinder vers Neon ;
4. journaliser le début de la fenêtre d'incident ;
5. conserver IDs stables + timestamps/version/changelog nécessaires au retour.

### Mode REPRISE

Quand Supabase revient :

1. ne pas repasser immédiatement en double-write ;
2. figer/identifier la fenêtre de delta Neon ;
3. répliquer ou appliquer le delta Neon → Supabase ;
4. résoudre les conflits selon une politique explicite ;
5. vérifier parité counts/IDs/timestamps/digests ;
6. seulement ensuite décider :
   - garder Neon primaire ; ou
   - repasser Supabase primaire et Neon standby.

## Règle critique : single-writer

À tout instant il doit exister un seul système autorisé à accepter les écritures applicatives.

Interdit :
- Supabase et Neon writers simultanés sans protocole distribué explicite ;
- bascule automatique non testée ;
- retour arrière basé uniquement sur le statut `healthy` ;
- mélange de séquences/IDs sans stratégie.

Le risque à éviter est le split-brain.

## Tables / domaines à couvrir

Commencer par les tables PostgreSQL critiques déjà identifiées dans le chantier migration :

Core:
- `property_listings`
- `listing_sources`
- `property_clusters`
- `property_cluster_members`

ODM/public search:
- `thin_index_search_documents`
- `source_policy_registry`
- `professional_listing_ownership`
- `search_business_entitlements`

Owner/read:
- `buyer_leads`
- `seller_property_drafts`
- `seller_listing_publications`
- `owner_listing_representations`

Comparables/history/map:
- `source_offer_observations`
- `geo_entities`
- `geo_resolution_events`
- `source_offer_seeds`

Ne pas supposer que cette liste est exhaustive : faire l'inventaire avant certification.

## Auth / Storage

Le failover DB PostgreSQL ne rend PAS automatiquement Supabase Auth ou Supabase Storage redondants.

Ces plans doivent rester séparés :

- PostgreSQL data plane
- Auth
- Storage/media

Le chantier peut commencer par garantir la continuité des listings/recherches DB.

Aucune promesse de failover complet plateforme tant qu'Auth/Storage n'ont pas leur propre stratégie vérifiée.

## Sécurité / secrets

Ne jamais afficher ni committer :
- mot de passe Supabase DB
- URL PostgreSQL complète
- secrets GitHub
- secrets Neon

Secrets déjà prévus :
- `SUPABASE_DATABASE_URL_DIRECT`
- `NEON_DATABASE_URL_DIRECT`
- `NEON_DATABASE_URL`
- `SEARCH_CURSOR_SECRET`

Pour import/réplication, utiliser les connexions directes/unpooled quand requis.

## Contraintes produit / exécution

- Respecter robots.txt.
- Ne pas solliciter inutilement Supabase pendant recovery.
- Pas de suppression Supabase.
- Pas de merge #1082 sans preuves.
- Pas de Vercel deploy sans autorisation explicite.
- Pas de bascule production pendant le design/tests.
- Après 2 échecs similaires, changer de stratégie.
- Recherche externe/API/standards: ≥2 sources sérieuses, primaires si possible.
- Pour ce chantier HA/DR, vérifier impérativement la documentation officielle Supabase + Neon + PostgreSQL avant choix de réplication.

## Ordre de travail recommandé dans la nouvelle fenêtre

### LOT HA-01 — Source recovery + baseline proof
Goal:
- attendre que Supabase accepte `SELECT 1`
- enregistrer `SUPABASE_DATABASE_URL_DIRECT` côté GitHub sans exposer sa valeur
- relancer une fois `Neon Migration Validation Suite`
- obtenir 5/5 PG17 green ou diagnostiquer précisément l'échec.

### LOT HA-02 — Architecture replication / DR
Goal:
- comparer les options réalisables pour Supabase → Neon :
  - logical replication native PostgreSQL
  - CDC/delta sync
  - snapshots périodiques + WAL/delta
- choisir la solution la plus simple, fiable et réversible.
- définir RPO/RTO cibles.
- définir la stratégie des IDs, séquences, schema/DDL, deletes, updates et conflits.

### LOT HA-03 — Baseline Supabase → Neon
Goal:
- import contrôlé dans Neon vide
- source↔target counts + deterministic digests
- aucune activation production.

### LOT HA-04 — Continuous sync proof
Goal:
- prouver qu'une annonce test créée/modifiée côté Supabase apparaît sur Neon selon le RPO attendu.
- mesurer lag réel.

### LOT HA-05 — Failover simulation
Goal:
- simuler Supabase indisponible
- forcer DB provider Neon
- lecture + création d'annonce sur Neon
- prouver single-writer.

### LOT HA-06 — Reverse delta / failback
Goal:
- rétablir Supabase
- transférer uniquement le delta incident Neon → Supabase
- parité complète
- aucun doublon/perte
- décision explicite sur le primaire final.

### LOT HA-07 — Runbook + guardrails
Goal:
- runbook opérateur
- health gates
- feature/provider flags
- kill switch
- audit/logging
- tests automatisés
- docs canoniques.

## Tests minimums à prévoir

- insert/update/delete pendant mode normal
- panne Supabase avant/pendant/après sync
- création de listing pendant mode Neon
- reprise Supabase avec delta Neon
- conflit même listing modifié des deux côtés — doit être évité par single-writer, sinon test de politique
- séquences / UUID / IDs
- schema drift / migration DDL
- retry idempotent
- duplication
- ordre des événements
- checksum/parité
- restart du mécanisme de réplication
- indisponibilité prolongée

## Décision à NE PAS prendre sans preuve

Ne pas décider dès maintenant que la logical replication bidirectionnelle est la solution finale.

Le nouveau chantier doit d'abord vérifier :
- support réel côté Supabase source
- compatibilité Neon destination
- gestion du retour Neon → Supabase
- comportement DDL
- séquences
- contraintes/RLS
- coûts/limites
- comportement pendant longue panne.

## Next exact

Dans la nouvelle conversation :

1. lire ce handover ;
2. vérifier repo / branche / PR #1082 / HEAD ;
3. vérifier une fois l'état SQL Supabase ;
4. si `SELECT 1` passe, reprendre LOT HA-01 immédiatement ;
5. en parallèle, documenter avec sources primaires l'architecture DR Supabase ↔ Neon ;
6. ne rien déployer et ne rien promouvoir en production.

## État de clôture de cette fenêtre

Le chantier migration courant est volontairement mis en pause à la demande de l'utilisateur pour ouvrir le chantier HA/DR dans une fenêtre conversationnelle neuve.

Aucune action restante autorisée dans cette fenêtre après création de ce handover.
