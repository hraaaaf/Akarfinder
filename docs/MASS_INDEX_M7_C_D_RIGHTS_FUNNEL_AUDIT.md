# MASS-INDEX M7-C/D — Rights & conversion funnel audit

**Date : 2026-08-24**  
**Statut : AUDIT COMPLETE — funnel dormant, aucun PARTNER_FULL live**

## Goal
Vérifier que la conversion d'une source externe indexée vers un partenaire enrichi reste fail-closed et qu'aucun contact, droit ou contenu partenaire n'est activé implicitement.

## Succès
- aucun partenaire actif sans droits explicites ;
- aucune publication partenaire sans gates de review/dedup/dry-run/approval ;
- aucun contact sortant effectué pendant l'audit ;
- campagne d'autorisation mesurée sans exposer de valeur de contact ;
- séparation stricte entre indexation minimale et réutilisation de contenu.

## M7-C — modèle de droits / PARTNER_FULL

### Snapshot live
`source_policy_registry` :
- 35 sources ;
- `authorized_partner` : 0 ;
- mode `authorized_detail_feed` / `partner_feed` : 0 ;
- `display_policy = partner_content` : 0 ;
- `content_reuse_policy = authorized` : 0 ;
- gates partenaires machine : 0 ;
- `no_bypass_required = true` : 35/35.

`professional_organizations` : 0.

`partner_feed_sources` : 0.

`partner_feed_publication_batches` : 0.

### Garde-fous repo vérifiés
`supabase/migrations/20260722003000_partner_commercial_activation_v1.sql` impose un statut explicite d'autorisation source avant activation des outils de publication partenaire et conserve des permissions médias explicites.

`supabase/migrations/20260805230000_lot_b3_4_6_publication_canary.sql` ne permet `publication_eligible = true` que si les conditions de droits, source active, review, déduplication, dry-run et approbation sont remplies.

### Conclusion M7-C
Aucun lane `PARTNER_FULL` n'est actif live. Le modèle existant est fail-closed ; aucun nouveau modèle de droits séparé n'est requis avant l'activation contrôlée du claim externe.

## M7-D — funnel d'autorisation externe

### Snapshot live
`source_external_tail_authorization_campaign_v1` :
- 7 sources ;
- `ready_to_contact` : 4 ;
- `draft_prepared` : 3 ;
- `submitted` : 0 ;
- `awaiting_reply` : 0 ;
- `approved` : 0 ;
- `declined` : 0 ;
- `no_response` : 0 ;
- `written_authorization_received` : 0 ;
- `activation_review_eligible` : 0 ;
- `ever_contacted` : 0 ;
- `follow_up_scheduled` : 0 ;
- valeurs de contact persistées : 3, non affichées dans cet audit.

### Contrat existant
`supabase/migrations/20260805190000_lot_b3_1_external_tail_policy.sql` sépare permission d'ingestion et permission d'affichage. Les champs minimaux autorisés restent limités au titre généré, géographie/type/intention normalisés, domaine source et URL canonique. Les descriptions, images, prix, surfaces et autres contenus source ne sont pas autorisés dans ce lane minimal.

`supabase/migrations/20260805190500_lot_b3_2_external_tail_source_review.sql` conserve les sources revues en mode caché / non publiable tant qu'une autorisation écrite n'est pas obtenue.

### Conclusion M7-D
Le funnel est préparé mais dormant : 0 contact envoyé, 0 autorisation écrite, 0 activation partenaire. Le comportement reste conforme au principe AkarFinder : indexer minimalement et renvoyer vers la source, sans copier les contenus protégés.

## Gate restant
L'audit C/D est fermé en lecture seule. Le chantier M7 ne peut être certifié final tant que `external_source_claims_v1` n'est pas appliqué et vérifié live, puis intégré au closeout global M7.
