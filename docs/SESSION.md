# AkarFinder — Session courante

**Mise à jour : 2026-08-25**

`docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier — DATA MASS-INDEX ✅ CLOSED
Issue : `#854`.

Progression stricte : **8/8 lots CLOSED = 100 %**.

## Maintenance ingestion — ✅ CLOSED

Les incidents du handover du 23–25 août sont fermés par preuve runtime :

1. **OpenSERP atomic discovery upsert**
   - PR #878 ; merge `5a66e7c8312253794f474bf73ddd7a5aff6b515b` ;
   - run `32766339030` SUCCESS ;
   - RPC atomique `upsert_discovery_candidates_batch` ;
   - aucun retour de collision `discovery_candidates_idempotency_idx` dans le run certifié.

2. **Common Crawl import timeout**
   - PR #910 ; merge `9120e3734da9dff47234e4abac1ab83a7dd86c84` ;
   - run `32829365500` SUCCESS ;
   - chunks 100 + retry borné ;
   - remainder + reconciliation `APPLIED`, aucun `57014`.

3. **Public Sitemap offset ~8000**
   - UUID keyset pagination sur `main` ; PR #884 fermée comme supersédée ;
   - run `32766268682` SUCCESS ;
   - test >8 000 lignes + vraie reconciliation `APPLIED` sur 59 723 seeds ;
   - aucun timeout offset/`57014`.

4. **OpenSERP property-listings duplicate conflict key**
   - cause DB : `ON CONFLICT DO UPDATE command cannot affect row a second time` ;
   - PR #911 ; merge `274032ef7e04ca5000908f3941636c65eff928aa` ;
   - gate `32834491733` SUCCESS ;
   - run live post-merge : `openserp-github-cron-2026-08-25T20-02-23-835Z` ;
   - à `20:04:32Z` : 12 `property_listings` mises à jour + 12 `listing_sources` mises à jour ;
   - aucune récurrence du même conflit dans la fenêtre inspectée jusqu’à `20:07:16Z`.

Docs de preuve :
- `docs/OPENSERP_ATOMIC_UPSERT_CLOSEOUT.md`
- `docs/COMMONCRAWL_IMPORT_TIMEOUT_CLOSEOUT.md`
- `docs/PUBLIC_SITEMAP_OFFSET_TIMEOUT_CLOSEOUT.md`
- `docs/OPENSERP_PROPERTY_LISTINGS_BATCH_DEDUPE_CLOSEOUT.md`

## Vérité quantitative
Le volume d’URL indexées ne doit jamais être présenté comme un nombre de biens immobiliers uniques sans déduplication certifiée dédiée.

## Next exact
Aucun travail restant dans ce chantier d’incidents ingestion. Les prochains travaux doivent suivre le chantier actif correspondant dans `docs/ROADMAP.md` et ne pas ressusciter une ancienne PR supersédée sans comparaison current-main.

## Invariants
- aucun Vercel sans autorisation explicite ;
- aucun bypass technique ;
- provenance et droits obligatoires ;
- pas de métrique “biens uniques” sans preuve dédiée.
