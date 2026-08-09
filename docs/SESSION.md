# AkarFinder — Session courante

**Mise à jour : 2026-08-09**  
**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ #395 ; RANKING-QUALITY-1 ✅ #403 production certifiée ; prochain lot = UNIFIED-LISTING-CARD-1**  
**Lane UX/Carte : P1B.4 ✅ Geo Coverage Recovery pilot certifié en production**  
**Lane DATA : DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 Registry Pattern Review Shadow ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain LOT = revue Registry/canary bornée sur les 2 `SHADOW_ACCEPTABLE` uniquement**  
**Couche Offre quartier : OFF — couverture certifiée actuelle 0,45 %**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Main canonique après RANKING-QUALITY-1 : `c5949063fa1c0e3448e917473239f821a17b7d59` — merge PR #403.

P0.4 main merge : `81f4809424757838c099b6acfb8f8d4b719deab7` — PR #402 ; post-merge gate PASS.

Acquis récents :

- DATA-4.4C ✅ PR #384/#385 — canary exact 50 persisté et certifié, drift 0 % ;
- P1B.3 ✅ PR #382 — Territorial Metric Join Contract ;
- P1B.4 ✅ PR #386 — Geo Coverage Recovery pilot, 69/69, coverage 0,45 % ;
- BENCHMARK-SERP-1 ✅ first pass read-only — `docs/BENCHMARK_SERP_1_REPORT.md` ;
- SEARCH-UX-FAST-1 ✅ #390 — première annonce rapprochée, mobile-first ;
- SEARCH-WORDING-PURITY-1 ✅ #391 — wording public simplifié, truth/ranking inchangés ;
- SEARCH-CONTINUOUS-FLOW-1 ✅ #393 — une seule séquence visuelle de listings, ordre métier inchangé ;
- SEARCH-MOBILE-CARD-GRID-1 ✅ #394 — grille mobile 2 colonnes, prix non tronqué, desktop préservé ;
- PRICE-COVERAGE-RECOVERY-1 ✅ #395 — 8 shadow price leaks historiques → 0, recovery V1 audit-only, publication/ranking inchangés ;
- RANKING-QUALITY-1 ✅ #403 — 14 007 rows stale resynchronisées, policy drift production = 0, Ranking V2 inchangé ;
- P0.1 ✅ #392 — Source Registry opérationnel et fail-closed sur Common Crawl ;
- freshness reconciler hardening ✅ #396 — retry transitoire borné, diagnostics PostgREST explicites, concurrence PATCH 25→5.
- P0.2 ✅ #398 — coverage audit read-only : 27 policies Common Crawl opérationnelles, 9 harvest-ready, 18 pattern-missing, ratio 33,33 %, 0 seed sur la cohorte manquante.

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

# P0.2 — Common Crawl Discovery Coverage Audit ✅ CLOSED — PR #398

P0.2 mesure uniquement le delta entre `public.source_policy_registry` et la readiness structurelle du harvester. DATA-1.3B reste le census national existant.

Preuve production read-only :

- **28** policies déclarent `commoncrawl` ;
- **27** sont opérationnelles ;
- **9** `HARVEST_READY` ;
- **18** `POLICY_ALLOWED_PATTERN_MISSING` ;
- **1** `POLICY_EXPIRED_OR_BLOCKED` (`marrakechrealty.com`) ;
- ratio ready **33,33 %** ;
- **40 809** seeds sur les sources policy-déclarées ;
- cohorte des **18 pattern-missing = 0 seed** ;
- `1immo.ma` et `barnes-marrakech.com` sont harvest-ready mais encore à 0 seed.

Sécurité : `commoncrawl_request=false`, `source_site_request=false`, `warc_fetch=false`, `db_mutation=false`. **20/20 exact-head PASS**, Reviewer **9,4/10**, Certifier GO, merge `9112cbf02fef2ada2d0eb0785ec872fe630e293f`, post-merge gate PASS.

Prochain lot : **P0.3 — Common Crawl Pattern Evidence**, offline-first sur l’URL-index existant ; aucune activation automatique et aucun WARC par défaut.

# P0.3 — Common Crawl Pattern Evidence ✅ CLOSED — PR #400

Cohorte figée P0.2 : **18 domaines**. Revalidation policy production avant requête ; collecte limitée à `index.commoncrawl.org` sur trois indexes.

Preuve :

- **54/54** requêtes URL-index réussies ;
- **10 254** URL uniques ;
- **5 STRONG** : `christiesrealestatemorocco.com`, `immo-maroc.com`, `immobilier-a-marrakech.com`, `immohammedia.com`, `leaderimmo.ma` ;
- **6 REVIEWABLE** ;
- **7 INSUFFICIENT** ;
- faux positif archive datée détecté/corrigé avant certification ;
- `source_site_request=false`, `warc_fetch=false`, `db_mutation=false`, `registry_mutation=false`.

Certification : **20/20 exact-head PASS**, Reviewer **9,4/10**, Certifier GO, merge `8ffffc7cfbe0921d21f66887e1c4ecccf3a738cb`, post-merge gate PASS.

# P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402

P0.4 a revu en shadow les **5 domaines `STRONG_PATTERN_EVIDENCE`** issus de P0.3, sans activer aucun pattern. Le replay utilise un oracle conservateur à trois états : signatures détail certifiées = `POSITIVE`, signatures explicitement non-detail = `NEGATIVE`, tout le reste = `AMBIGUOUS`. Un pattern qui absorbe une URL ambiguë est rejeté fail-closed.

Preuve finale : **15/15 requêtes Common Crawl URL-index réussies**, **2 `SHADOW_ACCEPTABLE` / 3 `REJECTED_SHADOW`**, **0 faux positif**, **1 faux négatif**, **42 matchs ambigus** uniquement sur les candidats rejetés. Acceptés en shadow : `christiesrealestatemorocco.com` (**1024 positifs / 9 négatifs / précision 1 / rappel 1 / 0 ambiguous match**) et `immobilier-a-marrakech.com` (**165 / 15 / précision 1 / rappel 1 / 0 ambiguous match**). Rejetés : `immo-maroc.com` (corpus négatif insuffisant + 4 ambiguous matches), `immohammedia.com` (3 ambiguous matches), `leaderimmo.ma` (35 ambiguous matches).

Finding Reviewer corrigé avant merge : les URL non certifiées ne sont plus fabriquées comme négatives ; elles restent `AMBIGUOUS`. Le client Common Crawl respecte `Retry-After`, utilise retry/timeout bornés et ne contourne aucun rate-limit. **20/20 workflows exact-head verts**, Reviewer **PASS 9,5/10**, Release Certifier **GO**, merge `81f4809424757838c099b6acfb8f8d4b719deab7`, gate P0.4 post-merge **PASS**. Artefact exact-head : `sha256:c772ed6a63daa800238040e93f17dc983d58c24538290ac05ac96f9538e7d22f`.

Contrat : **0 source-site request, 0 WARC/content fetch, 0 DB mutation, 0 Registry/policy mutation, 0 harvest, 0 pattern activation**. P0.4 prouve seulement une aptitude structurelle shadow ; il n'accorde aucune autorisation d'activation.

# PROCHAINE ÉTAPE DATA

LOT séparé de revue Registry/canary uniquement pour `christiesrealestatemorocco.com` et `immobilier-a-marrakech.com`, avec revalidation policy/autorisation et rollback avant toute mutation. `immo-maroc.com`, `immohammedia.com` et `leaderimmo.ma` restent bloqués tant que leur ambiguïté n'est pas résolue.

# UX / Search — état court

- SEARCH-UX-FAST-1 ✅ #390 — mobile 9,3/10 ;
- SEARCH-WORDING-PURITY-1 ✅ #391 — mobile 9,4/10 ;
- SEARCH-CONTINUOUS-FLOW-1 ✅ #393 — mobile 9,5/10 ;
- SEARCH-MOBILE-CARD-GRID-1 ✅ #394 — mobile 9,6/10 ;
- PRICE-COVERAGE-RECOVERY-1 ✅ #395 — production certifiée, 0 shadow public leak ;
- RANKING-QUALITY-1 ✅ #403 — production certifiée, `policy_drift_rows=0`, 15 438 LISTING publics ;
- prochain lot : **UNIFIED-LISTING-CARD-1** uniquement.

Puis : `CONTEXTUAL-VISUAL-ASSETS-1`.

# UX / Carte — état certifié

P1B.4 : **69 résolutions / 14 quartiers / 5 villes**, couverture **0,45 %**, 0 collision, 0 conflit, metric layers OFF. **Offre quartier reste OFF.**

# DATA — prochaine action

DATA-4.4C, P0.1, P0.2, P0.3 et P0.4 sont fermés. Le reconciler #396 est fermé. **Prochaine étape mass-index : LOT séparé de revue Registry/canary limité aux 2 `SHADOW_ACCEPTABLE`**, sans activation automatique ; les 3 rejetés restent bloqués.