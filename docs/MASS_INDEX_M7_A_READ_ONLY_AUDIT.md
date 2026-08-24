# MASS-INDEX M7-A — Read-only audit

**Date : 2026-08-24**  
**Statut : ACTIVE — baseline vérifiée, remédiation sécurité préparée**

## Goal
Cartographier les surfaces existantes de source, propriété, partenaire, contact, droits et consentement avant toute conversion partenaire.

## Succès
- schéma et objets utiles identifiés ;
- couverture mesurée sans exposer de PII ;
- droits/provenance distingués des simples contacts ;
- anomalie de sécurité bloquante documentée et corrigée dans le code avant activation du funnel.

## Preuves live — lecture seule

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
- `source_external_tail_authorization_campaign_v1` : 7 domaines, 7 méthodes de contact renseignées, 3 valeurs de contact persistées, 0 autorisation écrite, 0 source éligible à l'activation.

### Consentement / PII
- `buyer_leads` : 13 lignes ; 13 avec consentement contact et consentement indicatif ;
- `saved_alerts` : 4 lignes ; 4 avec consentement ;
- aucune valeur de téléphone, email ou identité n'a été lue ni copiée dans cet audit.

## Modèles déjà présents
Le socle M7 n'est pas vierge :
- ownership professionnel : `professional_listing_ownership` ;
- organisations : `professional_organizations` ;
- sources partenaires : `partner_feed_sources` ;
- imports, review, publication et rollback : tables `partner_feed_*` ;
- attestations : `ownership_attested`, `rights_attested` ;
- registre de politiques : `source_policy_registry` ;
- campagne d'autorisation externe : `source_external_tail_authorization_campaign_v1`.

## Anomalie sécurité M7-A-SEC-1

### Fait vérifié
La migration historique `db/supabase-p18a-alerts-migration.sql` créait :

`CREATE POLICY "service_role_all" ... FOR ALL USING (true)`

sans clause `TO`.

PostgreSQL applique alors la policy à `PUBLIC`. Avec les grants de table existants, un test live sous rôle `anon` a vu **4 lignes sur 4** de `saved_alerts`.

### Impact
`saved_alerts` contient des données de contact consenties. Cette table est conçue comme serveur-only et l'API applicative utilise la clé `service_role`. L'accès direct `anon/authenticated` n'est donc ni nécessaire ni conforme au contrat fonctionnel.

### Remédiation préparée
- supprimer la policy permissive historique ;
- révoquer tous privilèges de table à `PUBLIC`, `anon`, `authenticated` ;
- conserver les opérations applicatives via `service_role` ;
- corriger aussi le template historique pour éviter de recréer le défaut ;
- ajouter un test de régression dédié.

**Important :** la migration corrective n'est pas encore appliquée à la base live dans ce commit. Une validation live post-migration devra prouver `anon -> 0 accès` avant fermeture de M7-A-SEC-1.

## Décision M7
`PARTNER_FULL` reste interdit tant qu'aucune preuve explicite de droits/autorisation n'existe. À la date de l'audit, les objets partenaires sont en place mais leur population est nulle et `source_policy_registry` ne contient aucune source autorisée.

## Next exact
1. valider le correctif par test CI ;
2. appliquer la migration corrective à la base live après gate production ;
3. prouver `anon/authenticated` sans accès direct à `saved_alerts` et `service_role` fonctionnel ;
4. reprendre M7-B sur le modèle de claim minimal en réutilisant les primitives existantes au lieu de créer un doublon.
