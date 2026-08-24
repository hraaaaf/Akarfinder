# MASS-INDEX M7-E — Final certification

**Date : 2026-08-24**  
**Statut : ACTIVE — sécurité live fermée, disponibilité Rabat à restaurer**

## Goal
Certifier de bout en bout : discovery, external index, source factory, national ingest, dedup, freshness, search, SEO, partner conversion, provenance/droits et publication publique sans contenu protégé ni `seed_only`, tout en conservant une recherche minimale utile.

## Gates déjà vérifiés

### Discovery — PASS
`discovery_candidates` : 280 962 lignes.

Providers live :
- `openserp` : 253 702 lignes / 23 848 domaines ;
- `serper_mass_harvest` : 16 098 / 380 ;
- `public_sitemap` : 11 162 / 5.

### External index / Source Factory — PASS
`source_offer_seeds` : 57 843 lignes et 57 843 URL canoniques distinctes, 0 URL canonique manquante.

### Dedup — PASS sur l'index seed
57 843 lignes = 57 843 URL canoniques distinctes.

Cette preuve certifie l'idempotence canonique de l'index seed ; elle ne doit pas être reformulée comme un nombre de biens immobiliers uniques.

### Freshness — PASS
- `fresh_confirmed` : 3 945 ;
- `seed_only` : 53 649.

### SEO — PASS repo
`/search` : `robots.index=false`, `follow=true`, canonical `/search`.

`sitemap.ts` exclut `/search` et ne génère que les routes produit/géographiques stables ; aucune URL individuelle d'index externe n'y est injectée.

### Partner conversion / claim — PASS
M7-B `external_source_claims_v1` est appliqué live : table vide, RLS active, `anon/authenticated` sans accès direct, `service_role` fonctionnel.

`content_enrichment_authorized = false` reste verrouillé par CHECK : un claim n'accorde aucun droit de contenu.

### PARTNER_FULL / rights — PASS fail-closed
Snapshot : 0 organisation professionnelle, 0 source partenaire, 0 batch partenaire, 0 source `authorized_partner`, 0 `partner_content`, 0 `content_reuse_policy=authorized`.

Le funnel d'autorisation externe reste dormant : 0 contact envoyé, 0 autorisation écrite, 0 activation partenaire.

## M7-E sécurité publique

### Défaut initial
La RPC publique exposait encore des champs riches issus de sources externes `canonical_link_only`, y compris une source marquée `authorization_status=prohibited` / `content_reuse_policy=prohibited`.

Aucune valeur de titre, snippet, prix ou surface n'a été affichée pendant l'audit ; seules des agrégations ont servi de preuve.

### Correctif repo #893 — MERGED
PR #893 : `M7-E: fail-close public external search projection`.

- HEAD : `6b94100e871ebb4a994655b86f767c8c9a47d11b` ;
- workflow dédié run `32705238465` : success ;
- merge commit : `f5550f155845eb387c62ef0165e30a9f623fef26`.

### Migration live — APPLIQUÉE
Migration : `20260824091000_m7_public_search_policy_guard.sql`.

Preuves live :
- `anon EXECUTE` : false ;
- `authenticated EXECUTE` : false ;
- `service_role EXECUTE` : true ;
- test réel `anon` : PostgreSQL `42501` ;
- test réel `authenticated` : PostgreSQL `42501` ;
- appel global service_role : 101/101 `fresh_confirmed`, 101 lane `external_minimal_index`, 0 champ riche, 0 source interdite.

Le protected-content leakage est donc fermé.

## Régression découverte post-migration

### Fait live
Après le garde strict, `search_public_representations_v2(city='Rabat')` retourne 0 ligne.

Le routeur applicatif ne bascule sur `legacy_fallback` qu'en cas d'exception ODM, pas en cas de résultat vide. À cutover ODM 100 %, Rabat serait donc vide tant que ce point n'est pas corrigé.

### Cause
Le garde #893 exigeait `source_external_tail_policy_v1.review_status='approved_existing_link_policy'` pour afficher même un lien minimal. Cette exigence mélangeait deux questions :
1. droit d'afficher un index minimal / lien canonique ;
2. droit de réutiliser le contenu source.

### Simulation de récupération — PASS read-only
En utilisant uniquement les gates canoniques `source_policy_registry` pour le lane minimal :
- `authorization_status <> 'prohibited'` ;
- `display_policy='canonical_link_only'` ;
- `machine_gate='canonical_link_only'` ;
- `ingestion_gate='canonical_link_only'` ;
- `display_gate='external_tail_link_only'` ;
- review `current|due_soon` ;
- `no_bypass_required=true` ;

Rabat retrouve 263 URL canoniques distinctes sur 4 domaines, sans autoriser aucun contenu source riche.

## Correctif de récupération — PR #895
PR #895 : `M7-E: recover canonical-link-only public search`.

HEAD exact : `abc5e2e8e5d04c934599c893114851ce89c091be`.

Contrat :
- rich content uniquement pour partenaire explicitement autorisé ;
- index externe minimal piloté par `source_policy_registry` ;
- source `authorization_status=prohibited` exclue ;
- titre généré uniquement ;
- snippet/prix/surface/price_m2 toujours nuls sur lane minimal ;
- aucune inférence prix/surface via filtres ;
- RPC toujours server-only.

## Gate restant
1. CI exact-head #895 ;
2. merge si vert ;
3. gate explicite production pour `20260824092200_m7_public_search_link_only_recovery.sql` ;
4. validation live : Rabat > 0, `seed_only=0`, prohibited=0, rich fields=0, anon/authenticated denied ;
5. closeout M7 + merge #892.

Aucun déploiement Vercel n'est requis ni autorisé pour ce correctif DB.
