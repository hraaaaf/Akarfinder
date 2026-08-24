# MASS-INDEX M7-E — Final certification

**Date : 2026-08-24**  
**Statut : CLOSED — live certified**

## Goal
Certifier de bout en bout : discovery, external index, source factory, national ingest, dedup, freshness, search, SEO, partner conversion, provenance/droits et publication publique sans contenu protégé ni `seed_only`, tout en conservant une recherche minimale utile.

## Gates certifiés

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

### SEO — PASS
`/search` : `robots.index=false`, `follow=true`, canonical `/search`.

`sitemap.ts` exclut `/search` et ne génère que les routes produit/géographiques stables ; aucune URL individuelle d'index externe n'y est injectée.

### Partner conversion / claim — PASS
M7-B `external_source_claims_v1` est appliqué live : table vide, RLS active, `anon/authenticated` sans accès direct, `service_role` fonctionnel.

`content_enrichment_authorized = false` reste verrouillé par CHECK : un claim n'accorde aucun droit de contenu.

### PARTNER_FULL / rights — PASS fail-closed
Snapshot : 0 organisation professionnelle, 0 source partenaire, 0 batch partenaire, 0 source `authorized_partner`, 0 `partner_content`, 0 `content_reuse_policy=authorized`.

Le funnel d'autorisation externe reste dormant : 0 contact envoyé, 0 autorisation écrite, 0 activation partenaire.

## Défaut M7-E découvert et corrigé
La première certification a prouvé que l'ancienne RPC pouvait retourner des champs riches de sources externes `canonical_link_only`, y compris une source `authorization_status=prohibited` / `content_reuse_policy=prohibited`.

Aucune valeur de titre, snippet, prix ou surface n'a été affichée pendant l'audit ; seules des agrégations ont servi de preuve.

### Correctif sécurité #893
- HEAD `6b94100e871ebb4a994655b86f767c8c9a47d11b` ;
- run `32705238465` SUCCESS ;
- merge `f5550f155845eb387c62ef0165e30a9f623fef26` ;
- migration `m7_public_search_policy_guard` appliquée live ;
- `anon/authenticated EXECUTE=false`, `service_role=true` ;
- protected-content leakage fermé.

### Régression du garde strict
Le premier garde exigeait un statut externe-tail trop restrictif même pour afficher un simple lien canonique. Résultat live : Rabat = 0.

Cette exigence mélangeait :
1. droit d'afficher un index minimal / lien canonique ;
2. droit de réutiliser le contenu source.

### Recovery #895
Le lane minimal est désormais piloté par les gates canoniques de `source_policy_registry` :
- `authorization_status <> 'prohibited'` ;
- `display_policy='canonical_link_only'` ;
- `machine_gate='canonical_link_only'` ;
- `ingestion_gate='canonical_link_only'` ;
- `display_gate='external_tail_link_only'` ;
- review `current|due_soon` ;
- `no_bypass_required=true`.

Le contenu riche reste réservé à un partenaire explicitement autorisé.

Preuves repo :
- PR #895 ;
- HEAD `abc5e2e8e5d04c934599c893114851ce89c091be` ;
- run `32706329238` SUCCESS ;
- merge `baf8baf8fe61ee9b6de975ebeaf04bb3c344c20d`.

Migration live : `m7_public_search_link_only_recovery`.

## Validation live finale — PASS
Rabat via `search_public_representations_v2` :
- 101 résultats ;
- 101 `fresh_confirmed` ;
- 0 `seed_only` ;
- 101 `external_minimal_index` ;
- 4 domaines ;
- 0 snippet non nul ;
- 0 prix non nul ;
- 0 surface non nulle ;
- 0 price/m² non nul ;
- 0 résultat `authorization_status=prohibited` ;
- 0 résultat `content_reuse_policy=prohibited` ;
- `anon EXECUTE=false` ;
- `authenticated EXECUTE=false` ;
- `service_role EXECUTE=true`.

## Verdict
M7-E est certifié. MASS-INDEX atteint **8/8 lots CLOSED = 100 %**.

La doctrine finale est respectée : index externe minimal et lien canonique possibles quand la policy l'autorise ; aucun contenu source riche sans droits explicites ; aucun `seed_only` public ; aucun faux chiffre de biens uniques.

Aucun déploiement Vercel n'a été effectué pour M7.
