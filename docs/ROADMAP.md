# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-31**  
**Statut : DATA MASS-INDEX CLOSED / ACQUISITION VOLUME SAFE CONVERSION CLOSED**

Ce fichier est l’unique vérité canonique globale pour l’ordre des chantiers, leur état et leur progression.

## 1. Chantier P0 — DATA MASS-INDEX ✅ CLOSED

**Issue canonique : #854**  
**Plan : `docs/MASS_INDEX.md`**

### Goal
Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder, avec provenance réelle, déduplication, fraîcheur et séparation stricte entre index externe minimal et contenu partenaire riche.

### Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement login/CAPTCHA/paywall/anti-bot. Aucun contenu riche externe copié par défaut. Aucun provider relabel. Aucun Vercel sans autorisation explicite.

### Progression stricte

**8/8 lots CLOSED = 100 %.**

| Lot | Scope | État | Preuve principale |
|---|---|---|---|
| M0 | Current-main audit + baseline fraîche | ✅ CLOSED | `docs/MASS_INDEX_M0_AUDIT.md` |
| M1 | Universal candidate promotion | ✅ CLOSED | run `32577296107` SUCCESS |
| M2 | External Index model | ✅ CLOSED | run `32580352867` SUCCESS |
| M3 | Source Factory adapters | ✅ CLOSED | PR #863 ; run `32594176513` SUCCESS |
| M4 | National MASS ingest | ✅ CLOSED | PR #871 ; run `32610621902` SUCCESS |
| M5 | Dedup + freshness hardening | ✅ CLOSED | PR #874 + #876 ; runs `32611464377` + `32631787333` SUCCESS |
| M6 | Search activation + SEO | ✅ CLOSED | production `dpl_GHqzoTyvJpsTo1R5D8yELfbrbtq6` certifiée |
| M7 | Conversion partenaires + droits | ✅ CLOSED | PR #890/#891/#893/#895 ; M7-E live certified |

### M6 — closeout certifié
- production : `dpl_GHqzoTyvJpsTo1R5D8yELfbrbtq6`, alias `akarfinder.vercel.app`, SHA `6ade8c35dcaad013cef28422137dbad83ea1dbdf` ;
- ODM 100 % sur requêtes compatibles ; fallback legacy contrôlé ;
- SQL + Node servent `fresh_confirmed` uniquement ; `seed_only` rejeté ;
- `/search` : `noindex, follow`, canonical `/search` ; absent du sitemap ;
- aucun 5xx Search observé pendant la fenêtre de certification ;
- rollback disponible sans rollback DB destructif.

### M7 — closeout certifié
- M7-A : hardening `saved_alerts` live ; `anon/authenticated` refusés, `service_role` conservé ; PR #890 ; run `32702512105` SUCCESS ;
- M7-B : `external_source_claims_v1` live, RLS active, direct client access refusé, `content_enrichment_authorized=false` verrouillé ; PR #891 ;
- M7-C : `PARTNER_FULL` reste fail-closed ; aucun partenaire actif sans droits explicites ;
- M7-D : funnel d’autorisation dormant ; 0 contact envoyé, 0 autorisation écrite, 0 activation partenaire ;
- M7-E : fuite de projection publique riche détectée puis corrigée ; PR #893, run `32705238465` SUCCESS ;
- récupération lien-only : PR #895, run `32706329238` SUCCESS, merge `baf8baf8fe61ee9b6de975ebeaf04bb3c344c20d` ;
- migration live `m7_public_search_link_only_recovery` appliquée ;
- validation live Rabat : 101 résultats, 101 `fresh_confirmed`, 0 `seed_only`, 101 lane `external_minimal_index`, 4 domaines ;
- lane externe minimale : 0 snippet, 0 prix, 0 surface, 0 price/m² ;
- sources `authorization_status=prohibited` : 0 résultat public ;
- RPC publique privilégiée : `anon/authenticated EXECUTE=false`, `service_role=true`.

### Vérité quantitative
- `source_offer_seeds` certifié : 57 843 lignes et 57 843 URL canoniques distinctes au snapshot M7-E ;
- ce chiffre mesure des URL canoniques d’index, **pas des biens immobiliers uniques**.

### Maintenance ingestion — 2026-08-25 ✅ CLOSED

| Incident | Résolution | Preuve runtime |
|---|---|---|
| OpenSERP `discovery_candidates` collision / lookup PostgREST >1 000 | PR #878, atomic PostgreSQL RPC | run `32766339030` ; `docs/OPENSERP_ATOMIC_UPSERT_CLOSEOUT.md` |
| Common Crawl remainder import timeout `57014` | PR #910, chunks 100 + retry borné | run `32829365500` ; `docs/COMMONCRAWL_IMPORT_TIMEOUT_CLOSEOUT.md` |
| Public Sitemap deep offset ~8000 timeout | UUID keyset pagination on `main`; PR #884 supersédée | run `32766268682` ; `docs/PUBLIC_SITEMAP_OFFSET_TIMEOUT_CLOSEOUT.md` |
| OpenSERP `property_listings` duplicate conflict key | PR #911, dedupe par `canonical_fingerprint` | run DB `openserp-github-cron-2026-08-25T20-02-23-835Z` ; 12 property rows + 12 source rows touchées ; `docs/OPENSERP_PROPERTY_LISTINGS_BATCH_DEDUPE_CLOSEOUT.md` |

Les quatre incidents sont fermés par preuve. Les erreurs PostgreSQL `ON CONFLICT DO UPDATE command cannot affect row a second time` observées avant le correctif ne réapparaissent pas dans la fenêtre du run certifiant de 20:02Z à 20:07Z.

### Acquisition volume — Seed Mass Conversion — 2026-08-31 ✅ CLOSED

Closeout : `docs/COMMONCRAWL_RECENT_CONFIRMATION_V1_2_CLOSEOUT.md`.

- provenance CDX certifiée jusqu’à `source_offer_seeds.last_observed_at` ;
- 4 758 / 4 758 seeds V1 passent le gate exact-URL : aucun élargissement regex requis ;
- 13 captures restaient dans la fenêtre policy de 14 jours ; le seul blocage commun était la ville ;
- récupération fail-closed retenue : 12 URLs, 10 identifiants provider numériques distincts ; `M'diq-Fnideq` reste exclu ;
- PR #957 ; merge `9fbfc94e784ed0602aafd0e7f95a2b15700b413b` ; gate `33380261508` SUCCESS ;
- migration live `20260831100334 commoncrawl_recent_confirmation_v1_2_city_recovery` ;
- batch `cb4aedee-1f8a-410e-b9de-c3c9abd348c1` : 12/12 activées ;
- strict-served : **2 005 -> 2 017**, delta **+12 exact** ;
- 12/12 `fresh_confirmed`, 12/12 LISTING HIGH, 0 titre/snippet/prix/surface exposé ;
- candidats V1.2 restants : 0 ;
- aucun déploiement Vercel.

### Next exact
Seed Mass Conversion est fermé. Le prochain lot de croissance doit mesurer en lecture seule le réservoir **Common Crawl récent + policy admissible hors allowlist V1**, puis ne proposer une extension que si le rendement net est significatif et sans fausse fraîcheur.

---

## 2. Homepage Visual Reconciliation ✅ CLOSED
Issue #849 : 6/6 CLOSED = 100 %. Preuve finale : PR #861 ; merge `78079f179ffbbf6285e23bf86ba18c609563f661` ; run `32595444588` SUCCESS ; artifact `9481435261` ; score 9,4/10 ; human gate APPROVED.

## 3. Règles permanentes
- provenance + canonical URL obligatoires ;
- aucune métrique propriété unique avant dédup certifiée ;
- writer idempotent, budgets, rollback et circuit breakers ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe ;
- CI pending n’arrête pas le travail indépendant ;
- **aucun déploiement Vercel sans autorisation explicite**.
