# Akarfinder V7 — J7 : contrat d'automatisation 10 minutes (13 novembre 2026)

**GOAL :** faire avancer J7 malgré les admissions sources et DB non certifiées, sans ouvrir de cron live ni contourner J6. Contrat de créneau UTC 600 secondes et idempotence hors ligne.

**Architecture :** `scripts/acquisition/v7_parallel/j7_ten_minute_contract.py` construit une intention déterministe par créneau UTC, identifiant `AKARFINDER_V7_10M:<slot_index>`, début de créneau et fin exclusive. Les déclenchements en retard conservent leur créneau UTC observé. Un événement de type `schedule` ne déclenche **jamais** la collecte et n'autorise aucune DB.

**Tests :** `test_v7_j7_ten_minute_contract.py` vérifie les limites dix minutes, fuseaux, changement de jour, refus d'horloge naïve, impossibilité d'activer le LIVE, et concurrence simulée dans un fichier SQLite temporaire. Le harness SQLite est **uniquement un simulateur de contrainte UNIQUE/transaction locale**. Il n'est pas un registre durable partagé entre des runners GitHub Actions. Une reprise après panne reste désactivée, sans tentative automatique de rerun du même créneau.

**Workflow :** `.github/workflows/akar-v7-j7-offline.yml` fonctionne uniquement sur `pull_request` avec `contents: read`, sans clause `schedule`, sans secret, sans URL source, sans service DB ni Vercel. Le cron déjà déclaré dans PR #1204 reste un état de diagnostic désactivé, non une ingestion V7.

**NO-GO live jusqu'à :** registre d'atomicité distribué réellement durable (contrainte UNIQUE avec fencing/gestion de crash), qualification d'au moins un connecteur source et admission privée J6, autorisation opérateur explicite, vérifications robustes sous retards/doubles appels GitHub Actions. Le scheduler GitHub ne garantit ni déclenchement exact toutes les dix minutes ni disponibilité d'un créneau.

**SUCCESS limité :** intention pure et simulation robuste PASS en CI à HEAD exact. Aucune affirmation d'exécution continue, de source collectée ou d'annonce ajoutée. J7 complet restera ouvert.

**NEXT :** valider CI, documenter preuve, puis concevoir un registre partagé authentifié externe aux GitHub runners, toujours sans activer la collecte.
