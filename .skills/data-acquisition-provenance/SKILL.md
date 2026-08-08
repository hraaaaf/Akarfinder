# Data Acquisition & Provenance Review

## Purpose
Garantir acquisition, freshness et expansion traçables, autorisées par la doctrine interne, bornées et rollbackables.

## When it applies
Scrapers, sitemaps, Common Crawl, OpenSERP/Serper, feeds, ingestion, Source Registry, provenance, freshness, reservoirs, quotas ou controlled expansion.

## Required inspection
Source Registry actuel, robots/CGU/evidence quand requis, canal de discovery, permissions distinctes, population source, freshness, dedupe/Property Graph, Search/display avant mutation, limites et rollback.

## Mandatory evidence
Population avant/après ; provenance ; réellement inédit vs déjà visible ; drift ; erreurs ; doublons/collisions ; Search réel avant/après ; revalidation source ; batch size ; limites ; snapshot/apply/rollback si write.

## Blockers
Bypass ; permission inférée d'un sitemap/robots ; source non Registry ; batch hors cap ; rollback absent ; drift hors limite ; contenu/image réutilisé sans droit ; lignes déjà visibles comptées comme nouvelle exposition ; volume seul utilisé comme succès.

## PASS / FAIL criteria
PASS si chaque mutation ou qualification est explicable, bornée, source-validée et sans changement public non mesuré. Sinon `CHANGES_REQUIRED`.

## Forbidden shortcuts
Pas de detail-page fetch non autorisé ; pas de fuzzy dedupe inventé ; pas de mass write sans canary ; pas de “fresh” sans preuve ; pas de confusion technical display/public Search.

## Required final report
Source, canal, Registry, avant/après, inédit, freshness, drift, erreurs, doublons, Search/display impact, batch/limits, rollback, SHA et verdict.
