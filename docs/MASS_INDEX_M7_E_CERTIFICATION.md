# MASS-INDEX M7-E — Final certification

**Date : 2026-08-24**  
**Statut : FAIL — public external-content projection guard requis**

## Goal
Certifier de bout en bout : discovery, external index, source factory, national ingest, dedup, freshness, search, SEO, partner conversion, provenance/droits et publication publique sans contenu protégé ni `seed_only`.

## Gates vérifiés

### Discovery — PASS
`discovery_candidates` : 280 962 lignes.

Providers live :
- `openserp` : 253 702 lignes / 23 848 domaines ;
- `serper_mass_harvest` : 16 098 / 380 ;
- `public_sitemap` : 11 162 / 5.

### External index / Source Factory — PASS
`source_offer_seeds` : 57 843 lignes et 57 843 URL canoniques distinctes, 0 URL canonique manquante.

Providers :
- Common Crawl : 42 543 ;
- Public Sitemap : 11 554 ;
- Serper Search : 2 771 ;
- OpenSERP : 851 ;
- Serper Mass Harvest : 124.

### Dedup — PASS sur l'index seed
57 843 lignes = 57 843 URL canoniques distinctes.

Cette preuve certifie l'idempotence canonique de l'index seed ; elle ne doit pas être reformulée comme un nombre de biens immobiliers uniques.

### Freshness — PASS
- `fresh_confirmed` : 3 945 ;
- `seed_only` : 53 649.

### Search freshness / public seed gate — PASS
RPC `search_public_representations_v2`, Rabat, limite 500 :
- 101 résultats ;
- 101 `fresh_confirmed` ;
- 0 `seed_only` ;
- 5 domaines.

### SEO — PASS repo
`/search` : `robots.index=false`, `follow=true`, canonical `/search`.

`sitemap.ts` exclut volontairement `/search` et ne génère que les routes produit/géographiques stables ; aucune URL individuelle d'index externe n'y est injectée.

### Partner conversion / claim — PASS
M7-B `external_source_claims_v1` appliqué live : table vide, RLS active, `anon/authenticated` sans accès direct, `service_role` fonctionnel.

Le CHECK `content_enrichment_authorized = false` interdit qu'un claim devienne implicitement une permission de contenu.

### PARTNER_FULL / rights — PASS fail-closed
Snapshot précédent : 0 organisation professionnelle, 0 source partenaire, 0 batch partenaire, 0 source `authorized_partner`, 0 `partner_content`, 0 `content_reuse_policy=authorized`.

Le funnel d'autorisation externe reste dormant : 0 contact envoyé, 0 autorisation écrite, 0 activation partenaire.

## Gate bloquant — protected-content leakage — FAIL

### Fait live vérifié
La RPC publique `search_public_representations_v2` filtre correctement `fresh_confirmed`, mais son assemblage actuel lit `thin_index_search_documents.title`, `snippet`, prix et surface sans consulter `source_external_tail_policy_v1`.

Sur les documents frais et publiables selon l'ancien gate, plusieurs domaines `canonical_link_only` disposent encore de champs riches dans la projection. Exemple critique : `mubawab.ma` est `authorization_status=prohibited`, `content_reuse_policy=prohibited`, tandis que la projection actuelle peut encore retenir ses documents.

Le registre plus strict `source_external_tail_policy_v1` marque pourtant ce domaine `hidden / prohibited` et plusieurs autres domaines `hidden / permission_required`.

Aucune valeur de titre, snippet, prix ou surface n'a été affichée dans cet audit ; seules des agrégations ont été utilisées pour prouver le défaut.

### Cause
`search_public_representations_v2` applique :
- listing ;
- display eligibility ;
- provider whitelist ;
- `fresh_confirmed` ;

mais n'applique pas le registre externe-tail plus strict avant de retourner les champs riches.

### Correctif repo
PR #893 : `M7-E: fail-close public external search projection`.

HEAD : `6b94100e871ebb4a994655b86f767c8c9a47d11b`.

Le correctif prévu :
1. contenu riche uniquement pour un partenaire explicitement autorisé ;
2. index externe minimal uniquement pour `approved_existing_link_policy` ;
3. `prohibited` / `permission_required` cachés ;
4. lane minimale : titre généré + ville/type/intention + domaine + URL canonique ;
5. snippet/prix/surface supprimés ;
6. recherche texte minimale uniquement sur champs autorisés ;
7. aucune inférence prix/surface via filtres ;
8. RPC `SECURITY DEFINER` server-only (`service_role`).

## Verdict
M7-E n'est pas certifié tant que #893 n'est pas vert, mergé, appliqué à la base live et validé par tests live.

Aucun déploiement Vercel requis pour ce correctif DB et aucun déploiement Vercel n'est autorisé dans ce lot.
