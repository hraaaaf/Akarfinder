# AKARFINDER — V7 MULTISOURCE GITHUB ACTIONS — 2026-11-12

GOAL: version multi-sites extensible, cadence cible 10 minutes GitHub Actions,
AkarParser V3 réel, déduplication par source et staging privé.

ÉTAT: candidat Draft empilé sur Radar10 #1202. Ce fichier est
l'unique reprise du nouveau sous-lot V7; se reporter à
scripts/acquisition/v7_multisource/README.md pour le runbook.

PÉRIMÈTRE RÉEL:
- Deux adaptateurs OFFLINE: Mubawab (V6.4.6 snapshot HMAC signé), Agenz
  (observation individuelle fournie et non authentifiée côté portail).
- Huit sites enregistrés comme NON intégrés, pas comme couverts.
- Pas de connexion live à un portail et pas d'import Supabase PROD.
- Workflow GitHub Actions porte un cron 10 min, mais n'est pas sur main.
  Sa seule voie schedule est un probe NO-NETWORK OFF par défaut.
- Aucun déploiement Vercel, merge, migration DB ni retrait du radar horaire.

SUCCESS ciblé: suite de tests V3 réel + V646 HMAC fixture + PG17 éphémère,
contrat URL/ID anti-falsification, double source, replay idempotent,
0 publication et 0 écritures Supabase. Ne pas écrire PASS sans preuve CI.

NEXT EXACT:
1. Lire CI V7 au SHA HEAD exact; corriger et revalider si échec.
2. Mettre PR/Notion à jour avec nombres de tests/logs/SHAs.
3. Vérifier droits des sources, échantillons réels et bench précision
   par portail, résilience/robots/quotas.
4. Provisionner stockage externe monotone pour GH-hosted ephemeral,
   schéma Supabase staging isolé, rôle readonly/ingest limité,
   sans secrets dans Git/CI outputs/Notion.
5. Après GO spécifique : live canary, installation main cron 10 min,
   monitoring 24h, couverture multi-sites mesurée.
6. Fusion/promotions publiques/Vercel seulement après gates distincts.

Aucun pourcentage global inventé.
