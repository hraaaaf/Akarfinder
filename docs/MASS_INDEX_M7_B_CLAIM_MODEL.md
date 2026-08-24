# MASS-INDEX M7-B — External claim model

**Date : 2026-08-24**  
**Statut : CLOSED — live DB vérifiée**

## Goal
Créer un modèle minimal permettant à un propriétaire, une agence ou une plateforme de revendiquer une URL canonique externe indexée, sans transformer cette revendication en droit de réutilisation du contenu.

## Succès
- URL canonique + domaine persistés ;
- claimant identifié par `auth.users` ;
- rôle borné à `owner | agency | platform` ;
- email vérifié et preuve de contrôle exigés avant `verified` ;
- états `pending | verified | rejected | revoked` ;
- table server-only ;
- aucune conversion automatique vers contenu riche / `PARTNER_FULL`.

## Décision d'architecture
Le modèle existant est réutilisé plutôt que dupliqué :
- `professional_listing_ownership` reste le claim d'une annonce interne ;
- `professional_organizations` et `professional_memberships` restent les primitives organisationnelles ;
- `partner_feed_sources` reste la source d'un feed partenaire autorisé ;
- `source_policy_registry` reste la vérité sur la politique/droits d'une source ;
- `external_source_claims` couvre uniquement la revendication d'une URL canonique externe.

Cette séparation évite de confondre :
1. contrôle d'une URL/d'un domaine ;
2. propriété/mandat commercial ;
3. droit de réutiliser des textes, images, prix ou autres contenus protégés.

## Contrat M7-B
Table : `public.external_source_claims`.

Champs structurants :
- `seed_id` optionnel vers l'index existant ;
- `canonical_url` ;
- `source_domain` ;
- `claimant_user_id` ;
- `organization_id` optionnel ;
- `claimant_role` ;
- `verified_email` + `email_verified_at` ;
- `control_proof_kind` + `control_proof_ref` ;
- `status` ;
- timestamps de review/verification/rejet/révocation.

## Garde-fous
- RLS activée ;
- aucun grant direct `PUBLIC`, `anon`, `authenticated` ;
- opérations applicatives via `service_role` après authentification serveur ;
- `claim_scope = 'external_index_only'` verrouillé par CHECK ;
- `content_enrichment_authorized = false` verrouillé par CHECK ;
- `verified` nécessite reviewer, review timestamp, verified timestamp, email vérifié ;
- une même personne ne peut avoir qu'un claim ouvert (`pending|verified`) par URL canonique.

## Ce que M7-B ne fait pas
- aucun contact sortant ;
- aucune publication ;
- aucun enrichissement de contenu ;
- aucune autorisation implicite ;
- aucun `PARTNER_FULL`.

## Preuve repo
Migration : `supabase/migrations/20260824084500_external_source_claims_v1.sql`.

Test : `scripts/scrapers/__tests__/market-index-migration-safety.test.ts`.

PR #891 : mergée le 2026-08-24.
- head exact : `a3720963a6e62521e46f4d0e31e1ff304aa9f784` ;
- merge commit : `474115adccb949be28167370eec648b3f61609d6` ;
- 7/7 workflows associés au head : success.

## Preuve live
Migration Supabase enregistrée sous `external_source_claims_v1`.

État live après application :
- RLS : active ;
- lignes : 0 ;
- `anon SELECT` : false ;
- `authenticated SELECT` : false ;
- `service_role SELECT` : true.

Tests réels par rôle :
- `SET LOCAL ROLE anon` + `SELECT` → refus PostgreSQL `42501` ;
- `SET LOCAL ROLE authenticated` + `SELECT` → refus PostgreSQL `42501` ;
- `SET LOCAL ROLE service_role` + `SELECT count(*)` → succès, 0 ligne.

Contraintes live vérifiées :
- `claim_scope = 'external_index_only'` ;
- `content_enrichment_authorized = false` ;
- rôle limité à `owner | agency | platform` ;
- statut limité à `pending | verified | rejected | revoked` ;
- état `verified` exige review + email vérifié.

## Conclusion
M7-B est fermé. Un claim vérifié prouve le contrôle revendiqué ; il ne vaut jamais autorisation de réutiliser du contenu et ne déclenche pas `PARTNER_FULL`.
