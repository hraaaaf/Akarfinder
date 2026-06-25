SUPABASE_SETUP.md — AkarFinder Production Database
Vérifié : 2026-06-25 — Phase 3 COMPLÉTÉE

====================================================
RÉSUMÉ

AkarFinder utilise Supabase PostgreSQL en production.
En développement local, SQLite reste disponible comme fallback.
Le switch se fait via la variable d'environnement DATABASE_PROVIDER.

====================================================
VARIABLES D'ENVIRONNEMENT REQUISES

Variables locales (.env.local) :

  DATABASE_PROVIDER=supabase

  # URL du projet — Settings > API > Project URL
  SUPABASE_URL=https://<ref>.supabase.co

  # Clé service role — Settings > API > service_role secret
  # JAMAIS de préfixe NEXT_PUBLIC_. JAMAIS committer.
  SUPABASE_SERVICE_ROLE_KEY=<ta_clé_service_role>

Variables Vercel (Settings > Environment Variables) :

  DATABASE_PROVIDER     → supabase
  SUPABASE_URL          → https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY → <ta_clé_service_role>

ATTENTION :
  - Ne jamais préfixer avec NEXT_PUBLIC_ (exposerait la clé au navigateur).
  - La clé service role bypass le RLS — serveur uniquement.
  - Utiliser SUPABASE_ANON_KEY uniquement si une route publique est ajoutée
    (non implémenté à ce stade).

====================================================
SCHÉMA

Fichier : scripts/scrapers/db/supabase-migration.sql

Tables :
  property_listings   — annonces immobilières enrichies
  listing_sources     — sources par annonce (FK → property_listings)
  scrape_runs         — historique des runs de scraping
  raw_listings        — données brutes (non exposées à l'UI)

Pour appliquer (si nouveau projet Supabase) :
  supabase db push
  ou : psql -f scripts/scrapers/db/supabase-migration.sql

====================================================
SÉCURITÉ — RLS (Row Level Security)

RLS activé sur toutes les tables.

Politique actuelle :
  "service_role_all" — accès complet pour le backend (service role key).

Politique anon_read (commentée dans le SQL) :
  Non activée. Toutes les lectures passent par les routes Next.js (/api/*),
  qui utilisent la service role key côté serveur uniquement.

Aucune politique INSERT/UPDATE/DELETE publique.
Les ingestions se font via npm run sync:supabase (server-side script).

====================================================
MODE SUPABASE — COMMENT VÉRIFIER

1. Vérifier la connexion et les données :

     npm run check:supabase

   Résultat attendu : 8/8 checks OK, 82+ rows dans property_listings.

2. Lancer le serveur en mode Supabase :

     DATABASE_PROVIDER=supabase npx next start -p 3099
     # ou avec next dev :
     DATABASE_PROVIDER=supabase npm run dev

3. Vérifier /search et /listings/[id] dans le navigateur.

4. Vérifier /api/stats :
     curl http://localhost:3099/api/stats
     # Attendu : { "total_listings": 82, ... }

====================================================
MIGRATION SQLITE → SUPABASE

Script : scripts/sync-supabase.ts
Commande : npm run sync:supabase

Ce que ça fait :
  - Lit akarfinder.db (SQLite local)
  - Upsert par canonical_fingerprint dans property_listings
  - Upsert listing_sources (FK remappée)
  - Idempotent : safe à relancer

Prérequis :
  - scripts/scrapers/output/akarfinder.db présent (npm run scrape:ingest)
  - .env.local configuré avec credentials Supabase

====================================================
ROLLBACK VERS SQLITE LOCAL

Changer DATABASE_PROVIDER dans .env.local :

  DATABASE_PROVIDER=sqlite

Ou ne pas définir la variable (sqlite est le défaut).

Aucune autre modification requise. La couche lib/db/index.ts
gère automatiquement le switch.

====================================================
DÉPLOIEMENT VERCEL

1. Créer le projet sur vercel.com (import du repo Git).
2. Ajouter les 3 variables d'environnement (voir ci-dessus).
3. Déployer :
     vercel --prod
   ou push sur la branche main si CI/CD configuré.

Routes dynamiques (ƒ) : /api/listings, /api/search, /api/stats,
                          /listings/[id], /map, /search
Routes statiques (○)  : /, /onboarding, /pro, /_not-found

====================================================
ÉTAT VÉRIFIÉ — 2026-06-25

  SUPABASE_URL                : configuré ✅
  SUPABASE_SERVICE_ROLE_KEY   : configuré ✅
  check:supabase              : 8/8 OK ✅
  property_listings rows      : 82 ✅
  listing_sources rows        : 83 ✅
  P6 + P8A colonnes           : présentes ✅
  NEXT_PUBLIC_SUPABASE_*      : absent (scan complet) ✅
  service_role dans app/      : absent ✅
  supabase-client dans app/   : absent ✅
  RLS activé                  : oui ✅
  Politique anon INSERT/UPDATE: absente ✅
  /api/stats Supabase         : 200 ✅
  /api/listings Supabase      : 200, données réelles ✅
  /listings/[id]              : 200 ✅
  /search                     : 200 ✅
  stack trace dans réponses   : non ✅
  .env.local.example          : placeholders seulement ✅
