# AkarFinder — audit de reconstruction Supabase propre — 05/11/2026

**Statut : AUDIT HORS LIGNE PRÉPARÉ — BASE VIERGE NON RECONSTRUITE — AUCUNE ÉCRITURE DISTANTE.**

## Goal / succès / preuve
Goal : rendre reconstruisible et testable AkarFinder depuis GitHub avant de raccorder le nouveau Supabase `mgqsckxsqdqbzqwkgvwo`.

Succès de ce sous-lot : inventorier les migrations, détecter les collisions de versions et identifier les dépendances structurelles probables ; publier un rapport JSON d'agrégats et une CI dédiée. **Succès de la reconstruction, distinct :** exécution depuis zéro dans un environnement Supabase éphémère avec migrations, RLS, Auth, Storage et tests fonctionnels.

## Faits vérifiés sur GitHub `main` à `c02d0b73ed18b0e136d478fab39e71df425173a7`
- **214 fichiers `supabase/migrations/*.sql`**.
- **5 versions horodatées dupliquées**, correspondant à dix fichiers (chaque version présente deux fois) :
  1. `20260726194500` — `create_recrawl_scheduler_worker.sql`, `fix_public_search_lookahead_limit.sql`
  2. `20260727093000` — `create_source_bounded_recrawl_claim_v1.sql`, `odm_10a_coverage_audit.sql`
  3. `20260727110000` — `odm_10c2_honest_40k_gate.sql`, `odm_10c_noise_quarantine.sql`
  4. `20260805190000` — `lot_b3_1_external_tail_policy.sql`, `seller_controlled_publication_management_v1.sql`
  5. `20260805203000` — `lot_b3_4_1_feed_contract_quarantine.sql`, `owner_listing_integration_v1.sql`
- Le fichier `20260716140400_add_source_offer_columns_to_listing_sources.sql` exige que `listing_sources` existe déjà, et `20260721231500_professional_auth_ownership_profiles_v1.sql` référence `public.property_listings`. La **présence d'un bootstrap complet versionné n'est pas établie** ; à vérifier par l'audit automatique puis par un véritable replay.
- Le workflow existant `.github/workflows/neon-migration-validation-suite.yml` restaure des *exports* PostgreSQL depuis un secret `SUPABASE_DATABASE_URL_DIRECT` : il **ne certifie pas** une installation Supabase from scratch sans base existante.
- Supabase docs : les migrations sont identifiées par le timestamp (version) ; **versions dupliquées et problèmes de dépendance doivent être résolus**. Voir https://supabase.com/docs/guides/deployment/branching/troubleshooting et https://supabase.com/docs/reference/cli/introduction .

## Livrables de ce sous-lot
- `scripts/audits/audit_supabase_clean_bootstrap.py` : analyse statique read-only des fichiers, version collisions, références et créations de `listing_sources` / `property_listings`, sortie JSON `clean_bootstrap_status`.
- `scripts/audits/tests/test_audit_supabase_clean_bootstrap.py` : cas négatifs (versions dupliquées, objets bootstrap absents, commentaires trompeurs) et cas sans anomalie détectée.
- `.github/workflows/akar-supabase-bootstrap-offline-audit.yml` : exécute les tests et l'audit sur GitHub Actions, vérifie le référentiel 214/5 et charge un rapport agrégé.
- **La CI peut être SUCCESS tout en produisant `STATIC_BLOCKERS_FOUND` :** PASS signifie seulement que le *diagnostic* s'est exécuté correctement, **pas** que les migrations peuvent tourner sur une base neuve.

## Risques et garde-fous
- **Ne jamais** corriger les cinq collisions en renommant les migrations à l'aveugle : l'historique d'exécution des anciennes bases et l'ordre SQL doivent être évalués en environnement isolé.
- Le scanner est une **heuristique** : un `ALTER TABLE` conditionnel/dynamique peut être faussement interprété. Les tables du schéma `auth` ou `storage` n'existent que dans une installation compatible Supabase ; un vanilla PostgreSQL n'est pas un test équivalent.
- Ancien Supabase `kusfiyimwvxblvsrhaes` INACTIVE ; propriétaire prévoit sa suppression ultérieure et dit détenir la sauvegarde complète. **Ne rien supprimer à sa place**.
- Nouveau `mgqsckxsqdqbzqwkgvwo` ACTIVE_HEALTHY mais schéma `public` initialement vide : **aucune migration appliquée sans gate distinct**.
- Ne pas changer les secrets de P5 / de Vercel pour les pointer vers une DB vide. P5 échoue à cause de l'ancien endpoint (DNS ENOTFOUND/503) ; ne pas masquer le problème.
- Aucune insertion de données historiques non autorisées dans le nouveau projet. `fresh_unique_eligible=UNKNOWN`.

## Next exact
1. Vérifier le rapport JSON et les tests du HEAD exact en CI.
2. Identifier les DDL de création manquants et le bootstrap minimal nécessaire ; proposer un **nouveau baseline** de schéma versionné dans un environnement vierge, sans toucher aux fichiers historiques appliqués.
3. Valider l'ordre et les versions dans une base Supabase locale éphémère ; **rejouer réellement** le schéma et produire logs, résultats RLS/tests, checksum.
4. Après revue, initialiser le staging neuf sur `mgqsckxsqdqbzqwkgvwo` (écriture à autoriser distinctement). Connexion production/Vercel seulement sur validation explicite.

Références : [plan GitHub-first](AKARFINDER_GITHUB_FIRST_CLEAN_SUPABASE_PLAN_2026-11-05.md), [R2 fraîcheur](AKARFINDER_R2_FRESHNESS_EVIDENCE_GATE_2026-11-05.md).
