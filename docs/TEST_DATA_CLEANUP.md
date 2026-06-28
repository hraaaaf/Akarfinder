# Nettoyage des données de test — AkarFinder

> ⚠️ **À exécuter manuellement après validation Achraf.** Aucune suppression
> automatique. Les `DELETE` ne sont jamais lancés par le code ni par un agent.

## Pourquoi
Les smokes/QA des missions (LEADS-MVP, SELLER/PROMOTER-MVP, P18A alertes,
CREDIT-MVP, OVERNIGHT-MVP-HARDENING-1) insèrent des leads/alertes de test dans la
base Supabase de production. Ils doivent être purgés avant exploitation réelle.

## Comment
1. Ouvrir Supabase Dashboard → **SQL Editor** → New query.
2. (Recommandé) Décommenter d'abord le bloc `SELECT` de vérification dans le script.
3. Copier le contenu de [`scripts/maintenance/purge-smoke-leads.sql`](../scripts/maintenance/purge-smoke-leads.sql).
4. Exécuter **Run** une fois la liste vérifiée.

## Contenu purgé
- **buyer_leads** : 11 IDs de test
  - 8 SMOKE/QA (acheter, louer, seller, promoter)
  - 1 PROD SMOKE CREDIT (`7b036c0f…`)
  - 2 OVERNIGHT (`5455c64c…` P1 listing, `09e40b8a…` P2 tracking)
- **saved_alerts** : 3 alertes de smoke (P18A ×2, P2 ×1)
- **conversion_events** : non purgé en masse (voir note `TRUNCATE` optionnelle
  pour repartir propre **avant** mise en prod du tracking uniquement).

## Bonnes pratiques pour les prochains smokes
- Préfixer les noms de test (`SMOKE`, `QA`, `P1`, `P2`…) pour les repérer.
- Noter les IDs renvoyés par les POST de smoke et les ajouter au script de purge.
- Idéalement, smoker sur une base de préproduction séparée (non disponible
  actuellement — les smokes touchent la base prod via `.env.local`).
