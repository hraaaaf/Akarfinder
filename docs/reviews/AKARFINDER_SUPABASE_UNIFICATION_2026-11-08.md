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
