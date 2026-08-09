# AkarFinder — Session courante

**Mise à jour : 2026-08-09**  
**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; prochain lot = PRICE-COVERAGE-RECOVERY-1**  
**Lane UX/Carte : P1B.4 ✅ Geo Coverage Recovery pilot certifié en production**  
**Lane DATA : DATA-4.4C ✅ ; P0.1 Mass Index Source Registry ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain LOT mass-index à définir explicitement**  
**Couche Offre quartier : OFF — couverture certifiée actuelle 0,45 %**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Base du closeout DATA : `main` `6816e5e7bc4dbfe3c253cfe5da38175a5390606d` — merge PR #396.

Acquis récents :

- DATA-4.4C ✅ PR #384/#385 — canary exact 50 persisté et certifié, drift 0 % ;
- P1B.3 ✅ PR #382 — Territorial Metric Join Contract ;
- P1B.4 ✅ PR #386 — Geo Coverage Recovery pilot, 69/69, coverage 0,45 % ;
- BENCHMARK-SERP-1 ✅ first pass read-only — `docs/BENCHMARK_SERP_1_REPORT.md` ;
- SEARCH-UX-FAST-1 ✅ #390 — première annonce rapprochée, mobile-first ;
- SEARCH-WORDING-PURITY-1 ✅ #391 — wording public simplifié, truth/ranking inchangés ;
- SEARCH-CONTINUOUS-FLOW-1 ✅ #393 — une seule séquence visuelle de listings, ordre métier inchangé ;
- SEARCH-MOBILE-CARD-GRID-1 ✅ #394 — grille mobile 2 colonnes, prix non tronqué, desktop préservé ;
- P0.1 ✅ #392 — Source Registry opérationnel et fail-closed sur Common Crawl ;
- freshness reconciler hardening ✅ #396 — retry transitoire borné, diagnostics PostgREST explicites, concurrence PATCH 25→5.

Invariants : no-bypass, provenance réelle, Search canonique, aucune donnée/géométrie inventée, mobile-first pour UX majeur, zéro jargon interne sur les surfaces grand public.

# P0.1 — Mass Index Source Registry Operational Gate ✅ CLOSED

Responsabilité : **empêcher le Registry structurel historique de devenir une autorisation implicite pour Common Crawl**.

Contrat actif :

1. le harvester relit `public.source_policy_registry` avant toute requête CDX ;
2. l’importer relit la policy avant tout write ;
3. le trigger PostgreSQL bloque tout `commoncrawl_cdx` hors policy ;
4. admission seulement si domaine exact + canal `commoncrawl` explicite + no-bypass + policy hash + review/date valide + gates non bloqués ;
5. identité source/provider Common Crawl immuable ;
6. INSERT Common Crawl = `seed_only`, jamais de fraîcheur fabriquée ;
7. aucune suppression/réécriture automatique du stock historique.

Audit initial de certification :

- **16** domaines structurels candidats ;
- **9** autorisés sur le canal exact `commoncrawl` ;
- **7** refusés fail-closed : 6 `channel_not_allowed` + 1 `policy_review_not_current`.

Dette historique exposée :

- **1 734** rows `commoncrawl_cdx` sur 6 domaines dont la policy actuelle n’autorise plus ce canal ;
- **65** avaient été confirmées ensuite par un autre canal live ;
- aucune blind-quarantine ; la récidive est bloquée et la remediation historique reste un LOT séparé si nécessaire.

Production :

- PR #392 mergée, merge `1bbf2ff2f3ba7aed2b99eb492f703c965e1ed406` ;
- migration `20260808150000_p0_1_mass_index_source_registry_operational_gate.sql` appliquée ;
- trigger, fonctions/ACL, rapport production et Supabase advisors vérifiés ;
- probe transactionnel d’une source interdite : **0 row persistée** ;
- rollback non destructif disponible.

Preuve E2E finale : **Common Crawl Mass Seed Harvest #24**, run `31293392616`, sur `main` `7169142e9e0b4e327bdd9afe5befe7bbe7c64edd`, **SUCCESS** :

- canary : **6/6 requêtes CDX**, **931 seeds** ;
- remainder : **21/21 requêtes CDX**, **13 747 seeds** ;
- import canary + remainder : **0 policy rejection**, **0 nouvelle row** ;
- reconciler : `APPLIED`, **56 810 seeds**, **3 299 fresh_confirmed**, **53 511 seed_only**, **1 row modifiée**, **3 206 rows d’autres canaux protégées** ;
- artefact final : `sha256:67ea00cca946b992fa3aef2122bab1e6763533ec05346c5ab96239ab32041f59`.

**Verdict : P0.1 CLOSED ✅.** Il n’autorise aucune expansion automatique, aucun scraper direct et aucune évolution implicite de policy.

# DATA — freshness reconciler hardening ✅ CLOSED — PR #396

Finding séparé : un run précédent avait affiché `[object Object]` sur une erreur Supabase ; les logs production montraient des `statement timeout` PostgreSQL réels.

Correctif :

- erreur PostgREST sérialisée avec message/code/details/hint/status ;
- retry exponentiel borné à 4 tentatives uniquement pour timeout/57014/fetch/5xx transitoires ;
- erreurs non retryables fail-fast ;
- concurrence PATCH **25 → 5** ;
- reads paginés et updates idempotents protégés par retry ;
- exact canonical URL matching inchangé ;
- ownership `openserp_yandex_discovery` inchangé ;
- aucune migration / policy / source activation.

Certification : **19/19 workflows exact-head verts** sur `341c06510c8ab5ea7d6cb300f9a8e73c520c605d`, DATA-4.3I contract + live-read-only PASS, TypeScript/build PASS, Reviewer PASS, Release Certifier GO. Merge : `6816e5e7bc4dbfe3c253cfe5da38175a5390606d`.

# UX / Search — état court

- SEARCH-UX-FAST-1 ✅ #390 — mobile 9,3/10 ;
- SEARCH-WORDING-PURITY-1 ✅ #391 — mobile 9,4/10 ;
- SEARCH-CONTINUOUS-FLOW-1 ✅ #393 — mobile 9,5/10 ;
- SEARCH-MOBILE-CARD-GRID-1 ✅ #394 — mobile 9,6/10 ;
- prochain lot : **PRICE-COVERAGE-RECOVERY-1** uniquement.

Puis : `RANKING-QUALITY-1` → `UNIFIED-LISTING-CARD-1` → `CONTEXTUAL-VISUAL-ASSETS-1`.

# UX / Carte — état certifié

P1B.4 : **69 résolutions / 14 quartiers / 5 villes**, couverture **0,45 %**, 0 collision, 0 conflit, metric layers OFF. **Offre quartier reste OFF.**

# DATA — prochaine action

DATA-4.4C et P0.1 sont fermés. Le reconciler #396 est fermé. **Définir explicitement le prochain LOT mass-index à partir de cette base certifiée** avant toute nouvelle acquisition ou expansion. Aucun nouveau scraper/source direct ni aucune activation ne sont autorisés implicitement.