# AKARFINDER — Radar10, staging privé, 12 novembre 2026

## Goal
Surveillance de nouvelles annonces sur une cadence de 10 min en réutilisant
Scraper V6.4.6 et AkarParser V3, puis ingestion idempotente dans la seule Supabase
active mgqsckxsqdqbzqwkgvwo. Ne jamais confondre nouvelle URL découverte et
date de publication de l'annonce.

## Architecture préparée (non activée)
Source V646 approuvée / robots fail-closed -> export HMAC et snapshot immuable
-> mapping V646 vers V3 -> normalisation conservatrice -> schéma PostgreSQL
privé acquisition.radar_candidates + audit acquisition.radar_runs, dans une
transaction à verrou pg_try_advisory_xact_lock. Aucun INSERT/UPDATE dans
public.property_listings et public.listing_sources.

Runner: scripts/acquisition/radar10/run_cycle.py
Schéma PROPOSÉ : scripts/acquisition/radar10/private_schema.sql
Test : scripts/acquisition/__tests__/test_radar10_pipeline.py
CI : .github/workflows/akar-radar10-private-tests.yml
Runbook : scripts/acquisition/radar10/README.md
Timer: scripts/acquisition/radar10/systemd/akarfinder-radar10.timer

## État de preuve
- Draft PR #1202 : https://github.com/hraaaaf/Akarfinder/pull/1202
- Parent de compatibilité Draft #1200 : https://github.com/hraaaaf/Akarfinder/pull/1200
- À l'état initial du 12/11, CI PostgreSQL ephemeral 10/10 PASS sur commit
  69144e9d8dbf53a6549256fb8dc07a535567f9bd (run 43273295397).
- Dernier lot RLS et rôle least-privilege ajouté après cette preuve : vérifier
  les CI au SHA HEAD final avant de prétendre la certification closeout.
- Pas de schéma acquisition réel dans Supabase à ce stade; les tables publiques
  restent non modifiées. Aucun déploiement Vercel / merge / activation timer.

## Portée et limites non négociables
1. V646 = trois shards Mubawab, premières pages seulement. Pas de collecte
   nationale exhaustive. Aucun contournement robots/anticrawl.
2. Une première observation Akarfinder ne prouve pas la fraîcheur éditoriale.
   Capture source date/heure ≠ published_at.
3. Couche privée: publication_eligible = false; contrôle RLS; rôle dédié
   radar10_ingest NOLOGIN et runtime login séparé à provisionner.
4. Aucune clé service_role dans le navigateur, Git, logs ou Notion.
5. Pas de migration prod, de collecte live, d'écriture staging réelle ni
   de déploiement sans gate humain distinct.
6. PC distant hors ligne lors du GO; aucun hôte permanent accessible/provisionné.
7. Tests sur pages synthétiques, pas de rendement live, ni qualité par portail
   vérifiée, ni déduplication physique de biens.

## Next exact
- Revoir CI du dernier HEAD; corriger si rouge et obtenir preuve verte.
- Revoir security grants + rôle avec l'opérateur; créer migration officielle avec
  Supabase CLI à partir de SQL proposé lors d'une fenêtre approuvée.
- Sur hôte toujours disponible: configurer certificats TLS, rôle/secret dédié,
  source scraper autorisée et registre anti-rollback protégé.
- Après GO distinct de collecte et de staging: canary 1/10/100 réellement frais,
  replay, pannes/quotas, journaux, observation pendant 24 h.
- Human gate supplémentaire avant promotion des fiches dans public et toute
  mise en ligne Vercel; puis documentation de closeout avec preuves exactes.
