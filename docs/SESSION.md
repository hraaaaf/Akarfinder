# AkarFinder — Session courante

**Mise à jour : 2026-08-09**  
**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ #395 ; RANKING-QUALITY-1 ✅ #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ #407 ; CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 ; DETERMINISTIC-ATTRIBUTION-1 ✅ #416 ; SEARCH-ACTION-HIERARCHY-1 ✅ #418 ; SEARCH-DESKTOP-SPLIT-1 ✅ #423 ; BENCHMARK-SERP-1 convergence ✅ COMPLETE**  
**Lane UX/Carte : P1B.8 ✅ Geo Authority Evidence Review — PR #430 ; prochain LOT = P1B.9 Tier A Registry Candidate Review (read-only, Hay Mohammadi + Dakhla uniquement)**  
**Lane DATA : DATA-4.4C ✅ ; DATA-4.5A Expansion-to-500 Qualification ✅ #410 ; P0.1→P0.5 ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain LOT = DATA-4.5B Promo Immo Controlled Expansion Write, indépendant de la lane d'autorisation P0**  
**Couche Offre quartier : OFF — couverture certifiée actuelle **89 / 15 438 = 0,5765 %****

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Main canonique après P1B.8 technique : `8f16efe091f76a5e933a201abd7f0bd1f9e53d77` — merge PR #430. Exact-head `e15fc810f2c98ed85fce0c78a465cf6e92cf33c7`, **19/19 workflows verts**, specialized live PASS, Reviewer **9,6/10**, Release Certifier GO, post-merge run `31328973075` PASS. P1B.8 confirme **Hay Mohammadi + Dakhla** en Tier A mais autorise **0 write Registry**.

P0.4 main merge : `81f4809424757838c099b6acfb8f8d4b719deab7` — PR #402 ; post-merge gate PASS.

Acquis récents :

- DATA-4.4C ✅ PR #384/#385 — canary exact 50 persisté et certifié, drift 0 % ;
- P1B.3 ✅ PR #382 — Territorial Metric Join Contract ;
- P1B.4 ✅ PR #386 — Geo Coverage Recovery pilot, 69/69, coverage 0,45 % ;
- P1B.5 ✅ PR #419 — Canonical Geo Normalization Recovery : preflight 20/14/6, write 20/20, 11 Guéliz + 6 Océan + 3 Route de l’Ourika, latest resolved 20/20, coverage Search quartier **89/15 438 = 0,5765 %**, rollback append-only disponible, metric layers OFF ;
- P1B.6 ✅ PR #424 — Geo Coverage Depth Audit read-only : 15 438 Search, 605 bridged, 89 resolved, 516 unresolved = 71 district explicite + 445 sans district ; 0/71 alias quartier confidence-1, 31 couples, sources corrigées/double-checkées = mouldar 42 / mubawab 21 / marrakechrealty 8 ; verdict `REGISTRY_GAP_IS_NEXT_BOUNDARY` ;
- P1B.7 ✅ PR #426 — Geo Registry Gap Qualification read-only : 31 couples / 71 rows classés en 10/31 multi-source prioritaires pour validation externe, 9/26 répétitions mono-source, 10/10 singletons, Tanger Centre-ville 1/2 parent-mismatch, Autres Marrakech 1/2 rejet bucket ; verdict `EXTERNAL_AUTHORITY_REQUIRED_BEFORE_REGISTRY_WRITE` ; aucun write Registry autorisé ;
- P1B.8 ✅ PR #430 — Geo Authority Evidence Review read-only : cohort prioritaire live 10 couples / 31 rows sans drift ; 2 Tier A / 8 rows = Agadir Hay Mohammadi 5 + Dakhla 3 ; tous les autres restent corroboration/type-review/authority-gap ; verdict `AUTHORITY_EVIDENCE_REVIEW_COMPLETE_NO_REGISTRY_WRITE_AUTHORIZED` ; 0 write Registry autorisé ;
- BENCHMARK-SERP-1 ✅ first pass read-only — `docs/BENCHMARK_SERP_1_REPORT.md` ;
- SEARCH-UX-FAST-1 ✅ #390 — première annonce rapprochée, mobile-first ;
- SEARCH-WORDING-PURITY-1 ✅ #391 — wording public simplifié, truth/ranking inchangés ;
- SEARCH-CONTINUOUS-FLOW-1 ✅ #393 — une seule séquence visuelle de listings, ordre métier inchangé ;
- SEARCH-MOBILE-CARD-GRID-1 ✅ #394 — grille mobile 2 colonnes, prix non tronqué, desktop préservé ;
- PRICE-COVERAGE-RECOVERY-1 ✅ #395 — 8 shadow price leaks historiques → 0, recovery V1 audit-only, publication/ranking inchangés ;
- RANKING-QUALITY-1 ✅ #403 — 14 007 rows stale resynchronisées, policy drift production = 0, Ranking V2 inchangé ;
- UNIFIED-LISTING-CARD-1 ✅ #407 — card Gateway alignée sur la grammaire canonique, preuve visuelle 4 viewports, 0 overflow/prix tronqué, Benchmark PASS 9,2/10 ;
- CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 — fallback ville exact/local → type reconnu → neutre, aucune inférence, Chromium 4 viewports, Benchmark PASS 9,3/10 ;
- DETERMINISTIC-ATTRIBUTION-1 ✅ #416 — attribution publique centralisée, raw source labels interdits, 26/26 workflows, Chromium 5 viewports, Benchmark PASS 9,4/10 ;
- SEARCH-ACTION-HIERARCHY-1 ✅ #418 — une action forte par card tablette/desktop, Map/Compare retirés de la card mais capacités globales conservées, 24/24 workflows, Chromium 5 viewports, Benchmark PASS 9,5/10 ;
- SEARCH-DESKTOP-SPLIT-1 ✅ #423 — desktop Mixte = résultats + carte sans blocs secondaires, mobile/tablette inchangés, 26/26 workflows, Chromium 5 viewports, Benchmark PASS 9,5/10, merge `6bcf402158539c547061a6a92d1b408df1da8d22` ;
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

# P0.5 — Registry Activation Readiness Gate ✅ CLOSED — PR #408

Lecture seule sur les 2 `SHADOW_ACCEPTABLE` P0.4. Verdict production : **0/2 `READY_FOR_CANARY_REVIEW`, 2/2 `BLOCKED_BY_POLICY`**.

- `christiesrealestatemorocco.com` : Common Crawl discovery allowed, mais `authorization_status=unverified` + partenariat requis + revue légale requise ; **0 seed / 5 candidates** ;
- `immobilier-a-marrakech.com` : mêmes blockers, `detail_fetch_policy=paused` ; **0 seed / 14 candidates**.

Certification : head `e54099e9120d573d8092c8a119c066c911b624bd`, **20/20 PASS**, Reviewer **9,6/10**, Certifier GO, merge `ac0e240d28b88c5e66da73d1ab964794deb01877`, post-merge gate PASS, artefact `sha256:a8617f91147feec1f2d870b971d346f36cddf74386da9019af2b600d4d224536`. **0 source-site/CC/WARC request, 0 DB/Registry mutation, 0 harvest/pattern activation/canary write.**

# DATA-4.5A — Promo Immo Expansion-to-500 Qualification ✅ CLOSED — PR #410

Qualification read-only de capacité à partir du baseline persistant **50**. Source evidence 4.4B exact-head, artefact `9020834298`, digest vérifié, âge **25,29 h** : **3 130 URLs sitemap / 2 935 intersections / 2 456 éligibles / 0 collision exacte**. Production au run : **3 005 seeds / 2 923 Search / 2 923 technical display / 0 collision exacte / 2 405 nouvelles rows conservatrices**. Cohorte provisoire : **450/450**, unique, Search/display/collision-free, batches **100+100+100+100+50**.

Important : 4.5A **ne certifie pas la présence sitemap live individuelle des 450**. Les 450 sont toutes marquées `must_revalidate_current_sitemap_before_write=true`. Contrat : **0 source-site request, 0 detail fetch, 0 DB/freshness/Registry write, 0 activation**. Exact-head `7338b0108e7bd633af7c51ef4e7ce9c8a595dabc`, **20/20 PASS**, Reviewer **9,6/10**, Certifier GO, merge `a4710d6f5a88218db7d0751adb775a145a8b04d2`, post-merge gate PASS.

# PROCHAINE ÉTAPE DATA

**DATA-4.5B — Promo Immo Controlled Expansion Write** uniquement. La lane P0 peut rester bloquée sur autorisation externe sans bloquer ce chantier. 4.5B devra obtenir une preuve sitemap actuelle pour chaque ligne avant write, préparer le rollback avant mutation, écrire au plus **450** rows en batches **100+100+100+100+50**, et stopper/rollback immédiatement sur drift Search/display/quality/projection.

# UX / Search — état court

- SEARCH-UX-FAST-1 ✅ #390 — mobile 9,3/10 ;
- SEARCH-WORDING-PURITY-1 ✅ #391 — mobile 9,4/10 ;
- SEARCH-CONTINUOUS-FLOW-1 ✅ #393 — mobile 9,5/10 ;
- SEARCH-MOBILE-CARD-GRID-1 ✅ #394 — mobile 9,6/10 ;
- PRICE-COVERAGE-RECOVERY-1 ✅ #395 — production certifiée, 0 shadow public leak ;
- RANKING-QUALITY-1 ✅ #403 — production certifiée, `policy_drift_rows=0`, 15 438 LISTING publics ;
- UNIFIED-LISTING-CARD-1 ✅ #407 — head `6ddde621f03ccca1f25b8dc5dd34fdded090044b`, **23/23 workflows PR verts**, Chromium 4 viewports, Benchmark **9,2/10**, merge `7ad1b7af2a0e7dc268b0b3ea032e083f7ccbb193` ;
- CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 — head `575f9510587cc244b2f1a3a6bf9aea7ad957fd83`, **24/24 workflows exact-head verts**, Chromium 4 viewports, Benchmark **9,3/10**, merge `ae3e254bcec3bb4e98b814b0f057141e84956d10` ;
- prochaine étape : **attribution déterministe à formaliser**, sans identifiant de LOT inventé.

# UX / Carte — état certifié

P1B.4 : **69 résolutions / 14 quartiers / 5 villes**, couverture **0,45 %**, 0 collision, 0 conflit, metric layers OFF. **Offre quartier reste OFF.**

# DATA — prochaine action

DATA-4.4C, DATA-4.5A et P0.1 à P0.5 sont fermés. Le reconciler #396 est fermé. **Prochaine action DATA : DATA-4.5B**, expansion Promo Immo bornée vers 500 ; la lane d'autorisation P0 reste séparée et ne bloque plus ce chantier.
