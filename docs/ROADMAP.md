# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-09**  
**Statut : UX/Carte P1B.4 ✅ production certifiée ; BENCHMARK-SERP-1 ✅ ; SEARCH-UX-FAST-1 ✅ PR #390 ; SEARCH-WORDING-PURITY-1 ✅ PR #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ PR #395 ; RANKING-QUALITY-1 ✅ PR #403 production certifiée ; prochain lot UX Search = UNIFIED-LISTING-CARD-1 ; couche Offre quartier OFF ; DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 Registry Pattern Review Shadow ✅ CLOSED ; freshness reconciler hardening ✅ PR #396**

`README.md` définit l’identité/doctrine. `docs/SESSION.md` porte le handover court. Ce fichier est l’unique roadmap.

# 1. Cap produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence** pour le Maroc.

- cœur produit : `/search` ;
- `/map` : complément spatial ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- North Star DATA : `COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE` ;
- paliers : **5K → 20K → 50K → 100K+** observations utiles, jamais du volume artificiel.

Pipeline canonique :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

# 2. Doctrine non négociable

- no-bypass absolu ;
- robots/sitemap/capability ≠ permission ;
- Source Registry obligatoire avant activation ;
- un registre structurel/patterns ne peut jamais devenir une autorisation de canal ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- aucune donnée/image/géométrie/coordonnée/proximité/partenariat inventé ;
- Search reste canonique ; Map partage son identité géographique ;
- migrations séparées du code applicatif ;
- une responsabilité / une branche / une PR / un merge ;
- Builder ≠ Benchmark UX/Search Reviewer ≠ Reviewer technique ≠ Release Certifier ;
- tests + preuves exact-head avant merge ;
- mutation DATA : rollback avant activation ;
- mobile = expérience UX de référence ; aucun lot UX majeur certifié avec mobile <9/10 ;
- aucun jargon d’architecture interne exposé au grand public sans nécessité ;
- benchmark concurrent = source d’apprentissage, jamais modèle à copier.

# 3. Lane UX / Search

## BENCHMARK-SERP-1 ✅ FIRST PASS

Référence : `docs/BENCHMARK_SERP_1_REPORT.md`. Agent : `docs/BENCHMARK_UX_SEARCH_AGENT.md`.

Verdict initial : **CHANGES_REQUIRED** sur la SERP avant les lots de convergence.

Direction verrouillée :

`RECHERCHE → FILTRES COMPACTS → COMPTEUR/TRI → ANNONCE → ANNONCE → ANNONCE`

Scores heuristiques first pass : AkarFinder **6,9/10**, mobile **6,2/10**, desktop **7,2/10** ; potentiel après simplification **9,3–9,5/10**.

Décisions déjà verrouillées :

- flux visuel continu ;
- mobile comme référence ;
- desktop enrichit sans ajouter du bruit ;
- Benchmark Reviewer obligatoire avec pouvoir `CHANGES_REQUIRED` ;
- zéro jargon grand public ;
- card cible `IMAGE → PRIX → TITRE → LOCALISATION → 3–4 FACTS → PROVENANCE → ACTION`.

## SEARCH-UX-FAST-1 ✅ CLOSED — PR #390

Responsabilité unique : **réduire au strict minimum tout ce qui précède le premier résultat sur `/search`**, sans modifier ranking, récupération de prix, ordre commercial, structure des cards, DATA, Registry ou Map.

Résultat certifié :

- grand hero Search, prose de ranking et prompt projet retirés du chemin critique ;
- filtres visibles réduits à recherche + Acheter/Louer/Neuf + `Filtres` ;
- Option A des types de biens conservée derrière `Filtres` ;
- compteur, Liste/Mixte/Carte et tri rapprochés du flux ;
- intelligence locale `SearchPriceExplorerDock` préservée mais déplacée après les résultats ;
- contrat permanent : le flux primaire doit rester avant l’intelligence locale ;
- mobile **360×800** : première annonce **1538 px → 450 px**, Search à **69 px**, zéro overflow ;
- mobile **390×844** : première annonce **450 px**, zéro overflow ;
- desktop **1280×800 / 1440×900** : première annonce **328 px**, zéro overflow ;
- Chromium réel sur 4 viewports + build production + TypeScript ;
- **25/25 workflows exact-head verts** avant closeout ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,3/10, desktop 9,2/10** ;
- Reviewer technique : **PASS**.

## SEARCH-WORDING-PURITY-1 ✅ CLOSED — PR #391

Responsabilité unique : **remplacer le jargon et la prose d’architecture par un langage utilisateur clair sur Search/Home**, sans modifier ranking, ordre commercial, récupération de prix, DATA, Registry, cards ou Map.

Résultat certifié :

- `search-truth-tier` garde exactement les mêmes branches `observed/analyzed/partial`, le même collapse et le même ordre ; seules les chaînes publiques changent ;
- les libellés d’architecture sont retirés des surfaces transactionnelles ;
- les informations de confiance nécessaires restent explicites en langage simple ;
- le garde-fou dédup est conservé : des résultats regroupés peuvent correspondre au même bien **sans certitude** ;
- mobile **360×800 / 390×844** : première annonce **398 px**, visible dès le premier écran, zéro overflow ;
- desktop **1280×800 / 1440×900** : première annonce **328 px**, zéro overflow ;
- Search + Home : **0 expression retirée** sur les 4 viewports Chromium ;
- gate permanent `SEARCH-WORDING-PURITY-1 Gate` : contrats + TypeScript + build + Chromium ;
- **23/23 workflows exact-head verts** avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,4/10, desktop 9,3/10** ;
- Reviewer technique : **PASS**.

## SEARCH-CONTINUOUS-FLOW-1 ✅ CLOSED — PR #393

Responsabilité unique : **supprimer les ruptures visuelles entre catégories d’annonces tout en conservant exactement la priorité commerciale et les truth tiers internes**.

Résultat certifié avant closeout documentaire :

- suppression des sections visibles `Promoteurs premium`, `Agences partenaires`, `Annonces sur AkarFinder`, `Informations détaillées`, `Informations à compléter` et `Autres annonces` ;
- une seule grille continue pour les listings internes ; Gateway suit dans le même axe sans header de catégorie ;
- ordre interne strict conservé : `promoteur premium → agence partenaire → direct user → public analyzed → public partial → public observed → gateway` ;
- `partitionCommercialSearchListings` reste autoritaire ; ranking, truth tiers, dédup, prix, DATA, Registry, Map et éligibilité inchangés ;
- Chromium réel **360×800 / 390×844 / 1280×800 / 1440×900** : ordre préservé, 0 header de catégorie, 0 overflow, première annonce dans le premier écran ; aucune rupture verticale mobile > **24 px** ;
- anciens contrats SEARCH-UX-FAST, P0, Search Truth et Visible Dedup réconciliés pour protéger la logique interne plutôt que l’ancienne segmentation visuelle ;
- `SEARCH-CONTINUOUS-FLOW-1 Gate` : contrats + TypeScript + build + Chromium = PASS ;
- **23/23 workflows exact-head verts** avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,5/10, desktop 9,4/10** ;
- Reviewer technique : **PASS**.

## SEARCH-MOBILE-CARD-GRID-1 ✅ CLOSED — PR #394

Responsabilité unique : **augmenter la densité de scan mobile avec une grille 2 colonnes inspirée des meilleures pratiques du benchmark Airbnb, adaptée à l’immobilier AkarFinder sans modifier les décisions métier**.

Résultat certifié avant closeout documentaire :

- grille verticale continue **2 colonnes** sous `640 px` ; tablette/desktop préservés ;
- image `164 px`, puis prix → titre → localisation → 3 facts → provenance ;
- cœur Favori déplacé en overlay mobile pour préserver la largeur du prix ;
- carte/compare/gros CTA masqués uniquement sur mobile ;
- Gateway suit le même rythme mobile sans section supplémentaire ;
- **360×800** : première card `308 px`, `158×306 px`, 2 colonnes réelles, 0 overflow, 0 CTA secondaire, 0 prix tronqué ;
- **390×844** : première card `308 px`, `173×306 px`, mêmes invariants à zéro ;
- **1280×800 / 1440×900** : desktop préservé, première card `236 px`, 0 overflow ;
- provenance, `Visuel illustratif` et prudence dédup/source restent explicites ;
- gate permanent `SEARCH-MOBILE-CARD-GRID-1 Gate` : contrats + TypeScript + build + Chromium + anti-troncature prix ;
- **23/23 workflows exact-head verts** sur `76a5dfac10dd47aeee569f85067cc9e677d1cecb` avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,6/10, desktop 9,4/10** ;
- Reviewer technique : **PASS**.

## PRICE-COVERAGE-RECOVERY-1 ✅ CLOSED — PR #395

Responsabilité : neutraliser l’ancien shadow price recovery V1 qui pouvait écrire dans le prix public. Production certifiée : **8 → 0 shadow leaks**, aucune valeur raw/trusted touchée, materializer rendu audit-only, publication=false, ranking=false. Migration canonique `20260809013000_price_coverage_recovery_shadow_governance`.

## RANKING-QUALITY-1 ✅ CLOSED — PR #403

Responsabilité : resynchroniser la policy de qualité persistée avec vertical/document-kind/provider-detail sans modifier Ranking V2 ni l’ordre commercial. Préflight : **14 007 / 56 810** rows différaient de la policy composée. Production après migrations : `policy_drift_rows=0`, tous les invariants fail-closed à zéro, **587** fallbacks provider-detail conservés, **15 438** LISTING publics (10 061 primary / 5 377 secondary). Reviewer PASS, Release Certifier GO, **19/19** workflows exact-head verts, merge `c5949063fa1c0e3448e917473239f821a17b7d59`.

### Prochains lots UX/Search — ordre strict

1. **UNIFIED-LISTING-CARD-1** — grammaire unique des cards ;
2. **CONTEXTUAL-VISUAL-ASSETS-1** — visuels contextuels déterministes et truth-safe.

# 4. Lane UX / Carte

Acquis :

- P1A.0 ✅ PR #327 ;
- P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — Search Geo Contract ;
- P1A.3 ✅ PR #349 — Map State & Navigation, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System technique ;
- P1A.5 ✅ PR #365 — Territorial Explorer progressif **Maroc → ville → quartier**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive Hardening, **12 captures / 0 finding**, **9,2/10** ;
- P1B.1 ✅ PR #371 — **AkarFinder Map Visual Layer**, **9,1/10** ;
- P1B.2 ✅ PR #376 — **Sourced Territorial Intelligence** `layer=price`, aucune interpolation/fallback ville, **9,2/10** ;
- P1B.3 ✅ PR #382 — **Territorial Metric Join Contract** ;
- P1B.4 ✅ PR #386 — **Geo Coverage Recovery pilot**.

## P1B.3 — Territorial Metric Join Contract ✅ CLOSED

Production initiale : **15 399 listings éligibles / 0 résolu / 0 % coverage / 0 collision / 0 conflit**, `metric_layers_activated=false`.

## P1B.4 — Geo Coverage Recovery pilot ✅ CLOSED

Preflight **69/69**, write **69/69**, **14 quartiers / 5 villes**, aucune inférence/fuzzy/spatiale. Rapport post-write : **15 395 listings éligibles / 69 résolus / 0,45 % coverage / 0 collision / 0 conflit**, `metric_layers_activated=false`.

**Offre quartier reste OFF.** La prochaine lane Carte poursuit la récupération géographique explicite/certifiable ; aucun seuil artificiel ni choroplèthe fabriqué.

# 5. Fondation DATA acquise

Observation Ledger / Freshness / normalization / quality tiers ; Source Registry v2 / display eligibility ; Market Index / Property Graph foundation ; dedup ; Partner Feed ; OpenSERP / public sitemaps / Common Crawl ; 53 villes/pôles.

# 6. DATA-1 ✅

37 009 URLs / 7 051 domaines ; 8 727 registered domains Common Crawl ; univers 15 238 domaines ; 230 primary-source candidates ; 625 portal candidates ; Registry initial sans activation non autorisée.

# 7. P0.1 — Mass Index Source Registry Operational Gate ✅ CLOSED — PR #392

Responsabilité unique : **rendre `public.source_policy_registry` réellement autoritaire sur le chemin Common Crawl mass-index**, sans créer de nouveau Registry et sans activer aucune source.

Finding racine : l’ancien `data/openserp/source-domain-registry.json` contient la structure/patterns URL et un statut historique `approved_discovery`, alors que la policy production peut autoriser uniquement `public_sitemap`, refuser `commoncrawl` ou être réellement expirée. Structure ≠ autorisation.

Contrat :

- le harvester relit la policy production avant toute requête Common Crawl CDX ;
- l’importer la relit encore avant toute écriture, afin qu’un artefact ancien ne puisse pas s’auto-autoriser ;
- un trigger DB fail-closed protège `source_offer_seeds` comme dernière frontière ;
- exact domain + exact channel `commoncrawl` + no-bypass + hash + review/date valide + gates non bloqués sont obligatoires ;
- `next_review_at > now()` est vérifié indépendamment du label `review_status` ;
- identité source/provider d’un seed Common Crawl immuable ;
- insert Common Crawl = `seed_only`, jamais de fraîcheur fabriquée ;
- aucune suppression/réécriture automatique du stock historique.

Audit live read-only du LOT :

- **16** domaines structurels candidats ;
- **9** autorisés sur le canal exact `commoncrawl` ;
- **7** refusés : **6 `channel_not_allowed` + 1 `policy_review_not_current`** ;
- autorisés : `1immo.ma`, `agenz.ma`, `avito.ma`, `barnes-marrakech.com`, `kawtarimmobilier.com`, `masaken.ma`, `mouldar.com`, `mubawab.ma`, `soukimmobilier.com`.

Dette historique mesurée avant activation : **1 734** rows `commoncrawl_cdx` sur 6 domaines non autorisés aujourd’hui pour ce canal. **65** ont ensuite été confirmées par un autre canal live ; aucune blind-quarantine dans P0.1. Future recurrence = bloquée ; remediation historique = LOT séparé si nécessaire.

Migration `supabase/migrations/20260808150000_p0_1_mass_index_source_registry_operational_gate.sql` appliquée en production après merge #392 (`1bbf2ff2f3ba7aed2b99eb492f703c965e1ed406`). Rapport production, trigger catalog, ACL/fonctions, advisors et probe transactionnel fail-closed vérifiés. Rollback : drop trigger/fonctions P0.1, sans mutation de rows historiques.

Preuve E2E de sortie : workflow schedulé **Common Crawl Mass Seed Harvest #24**, run `31293392616`, sur `main` `7169142e9e0b4e327bdd9afe5befe7bbe7c64edd`, **SUCCESS**. Canary **6/6 CDX / 931 seeds** ; remainder **21/21 CDX / 13 747 seeds** ; imports **0 policy rejection / 0 nouvelle row** ; reconciler `APPLIED` avec **56 810 seeds / 3 299 fresh_confirmed / 53 511 seed_only / 1 row modifiée / 3 206 rows étrangères protégées** ; artefact final `sha256:67ea00cca946b992fa3aef2122bab1e6763533ec05346c5ab96239ab32041f59`.

P0.1 **n’autorise aucune expansion de volume par lui-même** et n’autorise aucun scraper direct.

## 7.1 DATA — Common Crawl freshness reconciler hardening ✅ CLOSED — PR #396

Finding séparé du LOT P0.1 : un run antérieur avait échoué sur un objet PostgREST affiché comme `[object Object]`, avec des `statement timeout` PostgreSQL observés. Le micro-lot #396 ajoute : erreurs PostgREST explicites, retry borné uniquement sur erreurs transitoires, concurrence PATCH **25 → 5**, sans changer exact canonical matching ni ownership de fraîcheur.

Certification : **19/19 workflows exact-head verts**, DATA-4.3I contract + live-read-only PASS, Reviewer PASS, Release Certifier GO ; merge `6816e5e7bc4dbfe3c253cfe5da38175a5390606d`. Aucune migration, aucune policy/source activation.

# 7.2 P0.2 — Common Crawl Discovery Coverage Audit ✅ CLOSED — PR #398

Responsabilité unique : **mesurer le gap entre policy Common Crawl production et readiness structurelle du harvester**, sans refaire DATA-1.3B et sans acquisition.

Preuve live read-only : **28** policies `commoncrawl`, **27** opérationnelles, **9** `HARVEST_READY`, **18** `POLICY_ALLOWED_PATTERN_MISSING`, **1** expirée/bloquée ; ratio harvest-ready **33,33 %**. Les policies concernées portent **40 809** seeds ; les **18 pattern-missing portent 0 seed**. Deux sources harvest-ready sont encore à 0 seed.

Contrat permanent P0.2 : 0 Common Crawl request, 0 source-site request, 0 WARC fetch, 0 DB mutation, 0 policy/source activation. Certification : **20/20 workflows exact-head verts**, Reviewer **PASS 9,4/10**, Release Certifier **GO**, merge `9112cbf02fef2ada2d0eb0785ec872fe630e293f`, gate spécialisée post-merge PASS.

P0.2 ne dérive ni n’active aucun pattern. Le prochain lot est **P0.3 — Common Crawl Pattern Evidence** : produire offline-first des preuves de structure d’URL sur la cohorte des 18 sources, à partir de l’URL-index Common Crawl existant ; WARC/content uniquement si un besoin ultérieur distinct est démontré.

# 7.3 P0.3 — Common Crawl Pattern Evidence ✅ CLOSED — PR #400

Responsabilité unique : **produire des preuves de structure d’URL sur les 18 sources pattern-missing certifiées par P0.2**, via l’URL-index Common Crawl uniquement, sans écrire de pattern dans le Registry.

Preuve finale : **18/18** targets encore policy-allowed, **54/54** requêtes réussies, **10 254 URL uniques**. Classification conservative : **5 strong / 6 reviewable / 7 insufficient**. Strong : `christiesrealestatemorocco.com`, `immo-maroc.com`, `immobilier-a-marrakech.com`, `immohammedia.com`, `leaderimmo.ma`.

Finding Reviewer corrigé : une archive de blog `/{year}/{month}/{day}/...` pouvait ressembler à une signature ID-bearing. Ces signatures datées sont maintenant explicitement exclues de `STRONG_PATTERN_EVIDENCE` et un test permanent couvre ce cas. Les `REVIEWABLE` ne sont pas automatiquement activables ; notamment `valfoncier.ma` présente une signature dominante incluant des chemins médias imbriqués.

Contrat : 0 source-site request, 0 WARC/content fetch, 0 DB mutation, 0 Registry/policy mutation, 0 pattern activation. Certification : **20/20 exact-head PASS**, Reviewer **9,4/10**, Certifier GO, merge `8ffffc7cfbe0921d21f66887e1c4ecccf3a738cb`, gate P0.3 post-merge PASS.

## 7.4 P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402

P0.4 a revu en shadow les **5 domaines `STRONG_PATTERN_EVIDENCE`** issus de P0.3, sans activer aucun pattern. Le replay utilise un oracle conservateur à trois états : signatures détail certifiées = `POSITIVE`, signatures explicitement non-detail = `NEGATIVE`, tout le reste = `AMBIGUOUS`. Un pattern qui absorbe une URL ambiguë est rejeté fail-closed.

Preuve finale : **15/15 requêtes Common Crawl URL-index réussies**, **2 `SHADOW_ACCEPTABLE` / 3 `REJECTED_SHADOW`**, **0 faux positif**, **1 faux négatif**, **42 matchs ambigus** uniquement sur les candidats rejetés. Acceptés en shadow : `christiesrealestatemorocco.com` (**1024 positifs / 9 négatifs / précision 1 / rappel 1 / 0 ambiguous match**) et `immobilier-a-marrakech.com` (**165 / 15 / précision 1 / rappel 1 / 0 ambiguous match**). Rejetés : `immo-maroc.com` (corpus négatif insuffisant + 4 ambiguous matches), `immohammedia.com` (3 ambiguous matches), `leaderimmo.ma` (35 ambiguous matches).

Finding Reviewer corrigé avant merge : les URL non certifiées ne sont plus fabriquées comme négatives ; elles restent `AMBIGUOUS`. Le client Common Crawl respecte `Retry-After`, utilise retry/timeout bornés et ne contourne aucun rate-limit. **20/20 workflows exact-head verts**, Reviewer **PASS 9,5/10**, Release Certifier **GO**, merge `81f4809424757838c099b6acfb8f8d4b719deab7`, gate P0.4 post-merge **PASS**. Artefact exact-head : `sha256:c772ed6a63daa800238040e93f17dc983d58c24538290ac05ac96f9538e7d22f`.

Contrat : **0 source-site request, 0 WARC/content fetch, 0 DB mutation, 0 Registry/policy mutation, 0 harvest, 0 pattern activation**. P0.4 prouve seulement une aptitude structurelle shadow ; il n'accorde aucune autorisation d'activation.

## 7.5 Prochaine étape mass-index

Un LOT séparé pourra examiner **uniquement les 2 candidats `SHADOW_ACCEPTABLE`** pour une éventuelle revue Registry/canary bornée. Cette étape devra revalider policy/autorisation, conserver rollback et fail-closed, et ne devra jamais activer automatiquement les 3 candidats rejetés.

# 8. DATA-4 — Reservoir Strategy

- 4.0 ✅ #341 — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable ;
- 4.1A ✅ #343 — Avito unavailable : 95,06 % bruit ; 73 core-récupérables ;
- 4.2 ✅ #344 — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE` ;
- 4.3A→J ✅ — Dar Agadir 500/500, Search/display 500/500, drift 0 %, ownership fraîcheur et trigger display protégés ;
- 4.4A ✅ #379 ;
- 4.4B ✅ #380 — Promo Immo revalidé : 3 130 URLs sitemap / 2 935 intersection / 2 456 éligibles ;
- 4.4C ✅ #384, merge `ba65943a` — canary 50 persistant certifié, Search/display/quality/projection **50/50**, drift **0 %**, Registry inchangé.

DATA-4.4C n’autorise aucun +100/+500 automatique. Le prochain lot DATA d’expansion doit être borné explicitement.

# 9. Lane business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.

# 10. Définition de terminé

Scope respecté, Benchmark Reviewer si UX majeur, Reviewer indépendant PASS, tests/build/gates exact-head verts, preuves, Registry respecté, aucun bypass, Release Certifier GO, PR mergée depuis le head attendu, `main` vérifié, post-merge CI/gates verts, production vérifiée si applicable, rollback disponible si mutation, 3 MD alignés.

# 11. Prochaine action exacte

## UX / Search

Exécuter **PRICE-COVERAGE-RECOVERY-1** uniquement : auditer les résultats sans prix et récupérer uniquement les prix explicitement disponibles via des canaux policy-compliant, sans estimation, sans scraping direct non autorisé et sans mélanger ranking ou card redesign.

## UX / Carte

Auditer la prochaine cohorte explicite de Geo Coverage Recovery. Tant que couverture insuffisante : **Offre quartier = OFF**.

## DATA

**P0.1, P0.2, P0.3 et P0.4 sont CLOSED.** La prochaine étape mass-index est un LOT séparé de revue Registry/canary, limité aux **2 candidats `SHADOW_ACCEPTABLE`** ; aucune activation automatique, et les 3 candidats rejetés restent bloqués.