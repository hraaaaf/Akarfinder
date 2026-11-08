# Akarfinder — unification vers nouvelle Supabase (08/11/2026)

## Décision et cible

**Utilisateur a ordonné de mettre tout sur Supabase et de choisir la nouvelle base vide.** Destination `AkarfFnder` Supabase ref `mgqsckxsqdqbzqwkgvwo` (eu-west-1), créée 04/11/2026, ACTIVE_HEALTHY et initialement **0 table métier / 0 migration**. Ancienne Supabase `AqarFinder` ref `kusfiyimwvxblvsrhaes` est INACTIVE et inaccessible : ne jamais prétendre avoir migré ses leads.

## DB nouvelle — appliqué et prouvé

- **12 migrations Supabase enregistrées** le 08/11/2026 (toute série `akarfinder_unified_*`) : fondation `public.property_listings` 41 colonnes, `public.listing_sources` 17 colonnes (correspondance source historique Neon, PK/FK et index) ; `buyer_leads` ; brouillons vendeur, photos, modération, publication ; `owner_listing_representations`, fonctions et triggers de projections ; bucket `seller-property-drafts` privé ; dernier lot de sécurité `akarfinder_unified_security_hardening_v1`.
- **PROOF** : `list_tables(public)` : 9 tables, toutes RLS true et à 0 ligne ; `has_table_privilege` confirme 0 droit SELECT anon/authenticated, SELECT service_role autorisé ; les six fonctions sensibles de publication ont 0 droit EXECUTE anon/authenticated, service_role autorisé ; Supabase Security Advisors **0 WARN** après durcissement, 9 messages INFO `rls_enabled_no_policy` correspondant à la politique volontaire service-only.
- La source Neon et les données existantes restent intactes ; **0 annonce, 0 source, 0 lead transférés**. Le vrai endpoint PROD Neon n'est pas identifié ; stock historique 151900 annonces n'implique pas droit de republication, ne pas importer aveuglément. Les tarifs fictifs du test précédent ne sont pas dans la nouvelle base.

## Application — branche candidate

- `lib/db/index.ts` possède déjà `DATABASE_PROVIDER=supabase` et les fonctions `querySupabaseListings`, `querySupabaseListingById`, `querySupabaseStats`, sans nécessité de modifier le serveur Vercel pour la PR.
- Dans cette branche, le code propriétaire `syncOwnerListingProjection` et `searchOwnerListings` sélectionne désormais les **RPC Supabase service-role** lorsque `DATABASE_PROVIDER=supabase`, et garde la voie Neon en rollback non actif sur la destination ; `OWNER_LISTINGS_PUBLIC_SEARCH_ENABLED` reste *false* par défaut.
- La lecture Supabase des annonces prend d'abord une source active `first_party`/`partner_authorized` lorsqu'il y en a une, évitant le bug source historique de la lecture Neon, mais **sans ajouter de nouvelles permissions**. Pour lecture non publique, priorité antérieure préservée. Les gardes métier `canPublishDbRowToPublicSearchSurface` restent applicables.

## Succès / limites / gates

- **SUCCÈS DB-01/02** : schéma privé créé et contrôlé, données d'origine non altérées. **SUCCÈS code candidat** seulement après CI owner-search, Search page, TypeScript, build.
- **NON ATTEINT** : totalité de la migration des données, lecture HTTP Supabase avec la nouvelle clé service_role depuis Vercel, origine DB PROD vérifiée, flux UI de bout en bout, quartier administratif Maârif certifié, contours, sources d'annonces autorisées réelles.
- **Ne pas faire** : déployer Vercel sans autorisation explicite ; modifier les variables d'environnement de Production sans preuve et gate ; désactiver RLS ; ouvrir les tables de leads ou vendeur au public ; copier 151900 annonces tierces comme publiables ; supprimer l'ancienne base ou Neon.
- **Next exact** : CI de la branche candidate et typecheck → contrat Supabase Public Search (source prioritaire) → rendre le pipeline Search entier compatible sans Neon (`public-search-cursor` et autres RPC Neon restent à remplacer) → qualifier la vraie source de données et migrer **uniquement avec droits et réconciliation** → Preview avec clé service-role sécurisée → preuves UI E2E avec nettoyage → décision explicite pour déploiement.


## 08/11/2026 — Lot DB-03 : le moteur public utilise la base cible sans appeler Neon

- La lecture `querySupabaseListings({public_search_only:true})`, lorsque la publication OpenSERP externe n'est pas activée, applique `listing_sources!inner` + `is_active=true` + identifiants de sources autorisées **avant** `COUNT(*)` et pagination PostgREST. Cela corrige le risque `total:5,listings:[]` dû à un comptage de lignes brutes dans la voie Supabase. La garde de publication métier reste en place. Si l'option OpenSERP externe est activée, l'ancien chemin de contrôle distinct reste utilisé ; couverture exhaustive à certifier avant l'activation.
- Le Thin Index ODM version 2 est **absent** de la nouvelle base. `searchPublicRepresentations` refuse explicitement toute tentative hors fournisseur Neon avec `public_search_index_unavailable` (même contrat qu'une fonction absente). `routePublicSearch` doit revenir au moteur Legacy structuré Supabase et l'API Search Gateway conserver sa dégradation explicite. Cela évite une lecture silencieuse de Neon via `DATABASE_URL`. **Ce n'est pas une migration de l'ODM / thin index** ; la reconstruction de ce dernier reste un lot séparé, sans réemploi d'URLs tierces comme fiches autorisées.
- Deux tests de contrat ajoutés ; réussite réelle dépend de la CI de cette branche.


## 08/11/2026 — Baseline immobilier conservé dans GitHub

**Nouvelle preuve de reproductibilité partielle** : le schéma des deux tables immobilières `property_listings` et `listing_sources` (41 + 17 colonnes, 7 contraintes, 3 index opérationnels, RLS et droits private-only) a été relu depuis **le catalogue PostgreSQL du Supabase cible**, puis figé en SQL dans `db/baselines/akarfinder_supabase_property_foundation_2026-11-08.sql` (sans données ni secrets). Tests hors-ligne `scripts/scrapers/__tests__/akarfinder-supabase-property-foundation.test.ts` pour structure et interdiction de grants public. Le fichier est volontairement conservé dans `db/baselines`, **pas** au milieu des 214 migrations historiques qui ont 5 collisions de versions et exigent des dépendances manquantes. Il ne couvre PAS à lui seul les 7 tables vendeur/propriétaire : celles-ci proviennent des migrations existantes référencées dans le manifeste de cette revue.

**Gates** : vérifier la CI de ce commit, puis replay du baseline + chaîne vendeur dans un Supabase local jetable pour certifier la reconstruction complète. Le SQL n'a PAS été réappliqué au Supabase cible : uniquement lecture de son catalogue ; aucune écriture de données, aucun merge, aucun Vercel deploy.


## 08/11/2026 — Backup local retrouvé, compatibilité source alignée

**Source physique lue sur ordinateur autorisé** : backup PostgreSQL gzip du **13/10/2026** à l'emplacement Desktop, SHA256 déclaré dans manifeste `cb0da8c09b81217cb2202b9f2a8ba66276c2ab2faa413e9dbfce8a99e8597e60`, 109510569 octets. Le dossier local contient les extraits `property_listings.copy.sql.gz` (19616 lignes) et `listing_sources.copy.sql.gz` (19621 lignes), ainsi que le manifeste local, les archives et la banque L0 ; **aucune donnée brute téléchargée ni envoyée vers GitHub/Notion/cloud**. Le script en lecture seule a extrait la définition SQL de `listing_sources`, sans lignes personnelles.

**Diff de colonnes réel** : `property_listings` backup = 40 colonnes, cible = 41 (cible possède `thumbnail_url` supplémentaire nullable) ; `listing_sources` backup = 21, cible initiale = 17. Les quatre champs absents ont été ajoutés au Supabase cible via migration enregistrée `akarfinder_unified_legacy_source_columns_v1` : `canonical_kind text`, `canonical_eligible boolean`, `canonical_hygiene_version smallint`, `canonical_classified_at timestamptz`. La requête `information_schema.columns` a confirmé les types. La cible est désormais 41/21 ; autres tables vendeur inchangées, **0 enregistrement migré**.

**Contrôle sémantique** : le `canonical_eligible` du backup ne signifie qu'une hygiène d'URL, pas un contrat de publication. Les permissions de toutes les sources historiques restent inconnues/non prouvées ; ne pas confondre sauvegarde propriétaire et droits de republier des offres provenant d'autres sites. Les 231818 clés L0 et 95825 URL de delta de l'archive privée ne sont pas des biens actifs ni des mandats. Les rapports locaux donnent `reuse_rights=NOT_PROVEN` et `current_listing_status=UNKNOWN`.

**Trace source contrôlée** : DDL additif dans `db/baselines/akarfinder_supabase_source_backup_compat_2026-11-08.sql` + test hors ligne dans `scripts/scrapers/__tests__/akarfinder-supabase-property-foundation.test.ts`. Le backup source reste sur l'ordinateur, non modifié ; l'ancienne Supabase et Neon sont conservés ; rien n'a été connecté à Vercel. **Human gate avant import massif** : clarifier les droits et la provenance, vérifier la fraîcheur et la non-duplication, puis importer uniquement dans un modèle privé avec audit et quotas. Le replay total du patrimoine historique n'est pas certifié.
