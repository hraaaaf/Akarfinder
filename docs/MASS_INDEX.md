# AkarFinder — DATA MASS-INDEX

**Issue canonique : #854**  
**Statut : CLOSED — 8/8 lots certifiés**

## Goal
Construire l'index le plus large possible de l'immobilier marocain dans AkarFinder, en séparant découverte, index externe minimal, enrichissement factuel et contenu partenaire complet.

## Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique. Aucun texte long/photo source copié par défaut.

## Pipeline
`DISCOVERY -> canonicalization -> LISTING classification -> minimal external seed -> dedup/freshness -> Search/SEO -> partner conversion`

## Lots
- M0 — current-main audit + baseline : ✅ CLOSED.
- M1 — Universal candidate promotion : ✅ CLOSED.
- M2 — External Index model : ✅ CLOSED.
- M3 — Source Factory adapters : ✅ CLOSED.
- M4 — National MASS ingest : ✅ CLOSED.
- M5 — Dedup + freshness hardening : ✅ CLOSED.
- M6 — Search activation + SEO : ✅ CLOSED.
- M7 — Conversion partenaires : ✅ CLOSED.

**Progression : 8/8 = 100 %.**

## M4 — résultat final
965 URLs certifiées ; 955 inserts + 10 préservés ; Thin Index +0 attendu ; Search OFF ; run final `32610621902` SUCCESS ; PR #871.

## M5 — résultat final
- shadow dedup conservateur, aucune fusion automatique ; run `32611464377` SUCCESS ;
- freshness gate prod : les RPC publics servent `fresh_confirmed` uniquement ; run `32631787333` SUCCESS ;
- `seed_only` reste un réservoir non public.

## M6 — résultat final
- M6-A baseline : PR #879 ; run `32636262489` SUCCESS ; artifact `9492399522` ;
- M6-B cutover contract : PR #881 ; run `32647288760` SUCCESS ; artifact `9495238964` ;
- M6-C Node freshness defense : PR #882 ; run `32647718215` SUCCESS ;
- production certifiée sur `dpl_GHqzoTyvJpsTo1R5D8yELfbrbtq6`, alias `akarfinder.vercel.app`, SHA `6ade8c35dcaad013cef28422137dbad83ea1dbdf` ;
- `city=Rabat` -> ODM ; `city=Rabat&district=Agdal` -> legacy contrôlé ;
- `/search` : `noindex, follow`, canonical `/search`, absent du sitemap ;
- aucun 5xx Search observé pendant la certification ;
- rollback disponible.

## M7 — résultat final

### M7-A — contacts / sécurité
- audit read-only réalisé sans exposer de PII ;
- défaut `saved_alerts` détecté puis corrigé ;
- PR #890 ; run `32702512105` SUCCESS ;
- live : `anon/authenticated` refusés, `service_role` fonctionnel.

### M7-B — claim externe
- `external_source_claims_v1` live ;
- rôles bornés `owner|agency|platform` ; statuts `pending|verified|rejected|revoked` ;
- RLS active, accès client direct refusé ;
- `claim_scope='external_index_only'` ;
- `content_enrichment_authorized=false` hard-locké ;
- PR #891 mergée.

### M7-C — PARTNER_FULL
- aucun passage implicite vers `PARTNER_FULL` ;
- droits explicites requis avant contenu riche ;
- snapshot de certification : 0 source `authorized_partner`, 0 `partner_content`, 0 `content_reuse_policy=authorized`.

### M7-D — funnel supplier/agency
- funnel préparé mais dormant ;
- 0 contact envoyé ;
- 0 autorisation écrite ;
- 0 activation partenaire.

### M7-E — certification finale Search / rights
Défaut découvert puis corrigé : l'ancienne projection publique pouvait exposer des champs riches de sources externes non autorisées.

Correctif sécurité : PR #893, run `32705238465` SUCCESS, migration `m7_public_search_policy_guard` live.

Le premier garde a été trop strict et a fait tomber Rabat à 0 résultat. La récupération sépare donc correctement droit d'afficher un lien canonique minimal et droit de réutiliser du contenu source.

Recovery : PR #895, run `32706329238` SUCCESS, merge `baf8baf8fe61ee9b6de975ebeaf04bb3c344c20d`, migration `m7_public_search_link_only_recovery` live.

Preuve finale Rabat :
- 101 résultats ;
- 101 `fresh_confirmed` ;
- 0 `seed_only` ;
- 101 lane `external_minimal_index` ;
- 4 domaines ;
- 0 snippet ;
- 0 prix ;
- 0 surface ;
- 0 price/m² ;
- 0 source `authorization_status=prohibited` ;
- 0 source `content_reuse_policy=prohibited` ;
- `anon/authenticated EXECUTE=false` ;
- `service_role EXECUTE=true`.

## Vérité quantitative
Snapshot M7-E : `source_offer_seeds` = 57 843 lignes et 57 843 URL canoniques distinctes, 0 URL canonique manquante.

**Ce chiffre certifie l'idempotence de l'index d'URL ; il ne représente pas un nombre de biens immobiliers uniques.**

## Closeout
MASS-INDEX est CLOSED. Les futurs travaux de croissance corpus, nouvelles sources, partenariats ou enrichissement doivent être ouverts comme nouveaux chantiers avec preuves dédiées.

## Interdits permanents
- aucun déploiement Vercel sans autorisation explicite ;
- aucun contournement de contrôles techniques ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe ;
- aucune utilisation de contact personnel non autorisée.
