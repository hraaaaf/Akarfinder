# MASS-INDEX M7-A — Read-only audit

**Date : 2026-08-24**  
**Statut : CLOSED — remédiation sécurité live vérifiée**

## Goal
Cartographier les surfaces existantes de source, propriété, partenaire, contact, droits et consentement avant toute conversion partenaire, puis fermer toute exposition directe non nécessaire de données de contact.

## Succès
- schéma et objets utiles identifiés ;
- couverture mesurée sans exposer de PII ;
- droits/provenance distingués des simples contacts ;
- anomalie `saved_alerts` corrigée dans le repo et sur la base live ;
- `anon` et `authenticated` n'ont plus d'accès direct ;
- `service_role` reste fonctionnel.

## Preuves live — audit initial

### Index / sources
- `discovery_candidates` : 280 962 lignes, 23 961 domaines distincts ; URLs source et canoniques présentes sur 280 962 lignes ;
- `source_offer_seeds` : 57 843 lignes, 23 domaines ; 53 649 `seed_only`, 3 945 `fresh_confirmed` ;
- `source_policy_registry` : 35 sources ; 35 `no_bypass_required`, 35 `partnership_required`, 35 `legal_review_required`, 0 source autorisée au moment de l'audit.

### Conversion / partenaires
- `professional_organizations` : 0 ligne ;
- `professional_listing_ownership` : 0 ligne ;
- `partner_feed_sources` : 0 ligne ;
- `partner_feed_imports` : 0 ligne ;
- `partner_feed_publication_batches` : 0 ligne ;
- `source_external_tail_authorization_campaign_v1` : 7 domaines, 0 autorisation écrite, 0 source éligible à l'activation.

### Consentement / PII
- `buyer_leads` : 13 lignes ; 13 avec consentement contact et consentement indicatif ;
- `saved_alerts` : 4 lignes ; 4 avec consentement ;
- aucune valeur de téléphone, email ou identité n'a été copiée dans cet audit ou son closeout.

## Anomalie sécurité M7-A-SEC-1

### Cause vérifiée
La migration historique `db/supabase-p18a-alerts-migration.sql` créait une policy `FOR ALL USING (true)` sans clause `TO`. PostgreSQL applique une policy sans rôle explicite à `PUBLIC`. Avec les grants existants, `anon` et `authenticated` avaient un accès direct à la table.

### Remédiation repo
PR #890 mergée sur `main` via `6b3e637b53289409772665440caeabb52b30c61d`.

Migration canonique :
`supabase/migrations/20260824083500_harden_saved_alerts_access.sql`

Actions :
- RLS maintenue active ;
- policy permissive historique supprimée ;
- privilèges révoqués à `PUBLIC`, `anon`, `authenticated` ;
- `service_role` conserve `SELECT/INSERT/UPDATE/DELETE` ;
- template historique corrigé ;
- test CI dédié ajouté.

Run dédié : `32702512105` — success sur le HEAD exact `faf9681d35c41945287223c79448ae137fb245dd`.

## Remédiation live — preuve 2026-08-24
Migration Supabase appliquée et enregistrée sous :
`harden_saved_alerts_access`.

Vérification de privilèges :
- RLS : `true` ;
- `anon SELECT` : `false` ;
- `authenticated SELECT` : `false` ;
- `service_role SELECT` : `true` ;
- policies restantes sur `saved_alerts` : aucune policy client permissive.

Tests réels par rôle :
- `SET LOCAL ROLE anon` + `SELECT` → refus PostgreSQL `42501` ;
- `SET LOCAL ROLE authenticated` + `SELECT` → refus PostgreSQL `42501` ;
- `SET LOCAL ROLE service_role` + `SELECT count(*)` → succès, 4 lignes visibles côté serveur.

Aucune donnée PII n'a été affichée pendant la validation.

## Décision M7
`PARTNER_FULL` reste interdit tant qu'aucune preuve explicite de droits/autorisation n'existe. La fermeture de M7-A ne constitue aucune autorisation de réutilisation de contenu externe.

## État
M7-A est fermé. Le chantier M7 reste ouvert jusqu'à activation/certification contrôlée du claim externe et au closeout global M7.
