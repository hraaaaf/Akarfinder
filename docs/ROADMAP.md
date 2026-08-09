# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-09**  
**Statut : UX/Carte P1B.8 ✅ Geo Authority Evidence Review certifié ; BENCHMARK-SERP-1 ✅ ; SEARCH-UX-FAST-1 ✅ PR #390 ; SEARCH-WORDING-PURITY-1 ✅ PR #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ PR #395 ; RANKING-QUALITY-1 ✅ PR #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ PR #407 ; CONTEXTUAL-VISUAL-ASSETS-1 ✅ PR #414 ; DETERMINISTIC-ATTRIBUTION-1 ✅ PR #416 ; SEARCH-ACTION-HIERARCHY-1 ✅ PR #418 ; SEARCH-DESKTOP-SPLIT-1 ✅ PR #423 ; CONTEXTUAL-ILLUSTRATIONS-FOUNDATION-1 ✅ PR #437 ; BENCHMARK-SERP-1 convergence ✅ COMPLETE ; couche Offre quartier OFF ; DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 ✅ ; P0.5 Registry Activation Readiness Gate ✅ CLOSED ; freshness reconciler hardening ✅ PR #396**

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

## UNIFIED-LISTING-CARD-1 ✅ CLOSED — PR #407

Responsabilité : unifier la hiérarchie visible des résultats Gateway/externes avec la card Search canonique, sans changer ranking, ordre commercial, éligibilité, acquisition, publication, Source Registry ni policy thumbnails.

Résultat certifié :

- grammaire `IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE → ACTION` ;
- états inconnus explicites, sans donnée fabriquée ;
- `Source externe`, prudence de comparaison et CTA vers la source originale conservés ;
- fallback visuel déterministe : thumbnail autorisée, sinon artwork type de bien connu, sinon visuel neutre ;
- finding mobile corrigé avant certification : `Prix non communiqué` reste entièrement lisible à 360 px ;
- preuve Chromium dédiée : **360×800 / 390×844 / 768×900 / 1280×900**, 0 overflow, 0 prix tronqué, provenance avant action ;
- gate permanent `UNIFIED-LISTING-CARD-1 Gate` : contrat + Search Truth + TypeScript + build + preuve visuelle externe ;
- **23/23 workflows PR verts** sur `6ddde621f03ccca1f25b8dc5dd34fdded090044b` ;
- Benchmark UX/Search Reviewer : **PASS 9,2/10** ; Reviewer PASS ; Release Certifier GO ;
- merge `7ad1b7af2a0e7dc268b0b3ea032e083f7ccbb193`, artefact `sha256:784182dd2c8d4f5eca46e907eeedd38493e0f63d586bd99151010fae6b3e542b`.

## CONTEXTUAL-VISUAL-ASSETS-1 ✅ CLOSED — PR #414

Responsabilité : améliorer les fallbacks visuels des résultats Gateway sans photo autorisée, sans fabriquer de représentation du bien et sans modifier les décisions métier.

Résultat certifié :

- thumbnail provider autorisée reste prioritaire ;
- contexte ville uniquement depuis `normalized_city` exact, allowlist locale Agadir/Casablanca/Fès/Marrakech/Rabat/Tanger ;
- aucune inférence depuis titre/snippet/description, aucun fuzzy, hasard, fetch réseau ou lookup externe ;
- ville non reconnue + type reconnu → `PropertyTypeArtwork` existant ; contexte absent → état neutre `Annonce indexée` ;
- disclosure permanente : `Illustration` sur mobile, `Visuel illustratif · Ville` sur tablette/desktop ;
- finding 360 px corrigé avant certification : aucun label illustratif tronqué ;
- Chromium **360×800 / 390×844 / 768×900 / 1280×900** : 0 label tronqué, 0 prix tronqué, 0 overflow horizontal ;
- gate permanent `CONTEXTUAL-VISUAL-ASSETS-1 Gate` : truth contract + UNIFIED predecessor + Search Truth + TypeScript + build + Chromium ;
- **24/24 workflows exact-head verts** sur `575f9510587cc244b2f1a3a6bf9aea7ad957fd83` ;
- Benchmark UX/Search Reviewer : **PASS 9,3/10** ; Reviewer PASS ; Release Certifier GO ;
- merge `ae3e254bcec3bb4e98b814b0f057141e84956d10`, artefact `sha256:78cf4a742360b87683bd9697a465a15f898979b29dea9e384474baf8b0a7ca69`.

## DETERMINISTIC-ATTRIBUTION-1 ✅ CLOSED — PR #416

Responsabilité : **rendre l'attribution publique Search déterministe et fail-closed, sans exposer de labels source libres ni modifier les décisions métier**.

Résultat certifié :

- resolver canonique `lib/search/public-attribution.ts` partagé par la card Gateway, la card structurée et AkarInfo ;
- Gateway : identité publique dérivée de `source_id → Search Gateway source config` ;
- listings persistés : attribution dérivée des signaux structurés d'accès/display et d'une allowlist explicite de marques ;
- source inconnue/non approuvée → libellé générique, jamais le texte brut reçu ;
- predecessors Search Truth, Wording, Mobile Grid, UNIFIED et CONTEXTUAL réconciliés sans affaiblir leurs invariants ;
- preuve Chromium déterministe **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : 0 overflow, 0 prix tronqué, provenance avant action et 0 fuite des faux labels source injectés ;
- **26/26 workflows exact-head verts** sur `ab4a05ec21434fb414628a181a11adddd68d8293` ;
- Benchmark UX/Search Reviewer : **PASS 9,4/10** (mobile 9,4 / desktop 9,3) ; Reviewer technique PASS ; Release Certifier GO ;
- merge `80da5a2abf2d3a7d74dafa6c6043ffe7176929d7`.

## SEARCH-ACTION-HIERARCHY-1 ✅ CLOSED — PR #418

Responsabilité : **réduire la concurrence entre actions dans les cards Search sans retirer les capacités globales de comparaison ou de continuité Search↔Map**.

Résultat certifié :

- mobile conservé compact, sans nouveau CTA ;
- tablette/desktop : **1 CTA fort maximum par card** ;
- card interne : `Voir le bien` reste l’action principale ;
- `Repérer sur la carte` et le toggle `Comparer` sont retirés de la card ; le comparateur global et le shared selection context restent actifs ;
- hover/focus card → Map reste actif, sans modifier ranking ni sélection métier ;
- source originale disponible → lien discret dans la provenance au lieu d’un deuxième gros bouton ;
- card externe observée conserve une seule action forte vers l’annonce originale ; Gateway inchangé ;
- Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : 0 overflow, 0 ancien CTA Map/Compare, mobile 0 prix tronqué ;
- **24/24 workflows exact-head verts** sur `a7ddb7d023eac1418eee50e03258f1d056184b64` ;
- Benchmark UX/Search Reviewer : **PASS 9,5/10** (mobile 9,6 / tablette 9,5 / desktop 9,5) ; Reviewer technique PASS ; Release Certifier GO ;
- merge `0987b89286d262e7d01ec8e3a868b2424d85c4d5`, artefact `sha256:c9ec64465039168a44c81b8921ff0ac7e57ab7a25e65a54f91f06f480805a66f`.

## SEARCH-DESKTOP-SPLIT-1 ✅ CLOSED — PR #423

Responsabilité unique : **simplifier le mode Mixte desktop en un vrai split résultats + carte sans surcharge secondaire**, tout en conservant mobile/tablette, Liste, Carte, ranking, filtres, ordre commercial, DATA, attribution et état URL.

Résultat certifié :

- desktop Mixte = deux panes utiles ; les blocs secondaires Mon Projet / carte complète ne sont plus affichés dans cette vue ;
- mobile/tablette restent empilés avec leurs contenus existants ;
- Liste et Carte conservent leurs contrats fonctionnels ;
- Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : 0 overflow, 0 prix tronqué ; desktop **654/558 px** puis **741/631 px**, 0 bloc secondaire ;
- **26/26 workflows exact-head verts** sur `29b469e17eff6f4516bef18f7d5ed193726308f0` ;
- Benchmark UX/Search Reviewer **PASS 9,5/10** ; Reviewer technique PASS ; Release Certifier GO ;
- merge `6bcf402158539c547061a6a92d1b408df1da8d22`, artefact `sha256:9811f9b4a62b8b571ff977953f240e3be5ac17fad41cf3ef87d8d8b30feedf8c`.

**BENCHMARK-SERP-1 convergence = COMPLETE ✅.**

## CONTEXTUAL-ILLUSTRATIONS-FOUNDATION-1 ✅ CLOSED — PR #437

Responsabilité unique : **poser une fondation déterministe et truth-safe pour faire varier les illustrations contextuelles sans remapper massivement les résultats ni utiliser de signaux non certifiés**.

Résultat certifié :

- catalogue local explicite, sans nouvel asset dans le lot P0 ;
- hiérarchie conservée : thumbnail autorisée → contextual illustration → artwork type reconnu → neutre ;
- resolver pur, fail-closed et sans `Math.random()` ;
- sélection Rendezvous/HRW, indépendante de l’ordre des candidats et à churn minimal lors de l’ajout futur d’assets ;
- identité stable dérivée de `original_url` avec normalisation conservative : tracking/fragment/trailing slash/ordre de query ne remappent pas, paramètres significatifs restent distincts, URL invalide → null ;
- seuls les signaux du tier réellement choisi entrent dans le seed ;
- district non consommé tant que Search n’expose pas un champ structuré certifié ;
- disclosure uniforme `Illustration` ;
- Chromium exact-head **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : reload stable, 0 label tronqué, 0 prix tronqué, 0 overflow ;
- **27/27 workflows exact-head verts** sur `36620ca20e826be46464ab177e9611fb01f94a16` ;
- audit visuel P0 **9,6/10**, Reviewer PASS, Release Certifier GO ;
- artefact `sha256:3b71f26ffccf0614098b3dbd7c893560345d332f2a69e6115a7e7bb3dc828944` ;
- merge `66ee5a9263fbdef673c4f16f6066aa10c7cf0417` ; aucun workflow `push` n’est configuré pour ce merge commit, `main` + tree certifié vérifiés directement.

**Prochain lot UX/Search : CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1.** Scope : petit pool multi-assets Agadir, variation déterministe sur les résultats sans photo autorisée, sans district non certifié, sans ranking/commercial priority/eligibility/dedupe/DATA/Map change. Le but principal est de réduire la répétition visuelle observée en P0 tout en conservant le contrat de vérité.

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
- P1B.5 ✅ PR #419 — **Canonical Geo Normalization Recovery**.

## P1B.3 — Territorial Metric Join Contract ✅ CLOSED

Production initiale : **15 399 listings éligibles / 0 résolu / 0 % coverage / 0 collision / 0 conflit**, `metric_layers_activated=false`.

## P1B.4 — Geo Coverage Recovery pilot ✅ CLOSED

Preflight **69/69**, write **69/69**, **14 quartiers / 5 villes**, aucune inférence/fuzzy/spatiale. Rapport post-write : **15 395 listings éligibles / 69 résolus / 0,45 % coverage / 0 collision / 0 conflit**, `metric_layers_activated=false`.


## P1B.5 — Canonical Geo Normalization Recovery ✅ CLOSED

Delta strict de normalisation sur des `property_listings.district` déjà persistés : fold canonique des accents via `odm04_fold_text()` + suppression d’apostrophes uniquement. Aucun alias créé, aucun fuzzy/synonyme/spatial/titre/URL/proximité/réseau.

Production : preflight **20 candidats / 14 map-eligible / 6 canonical-only**, write atomique **20/20**, réparti en **11 Guéliz / 6 Océan / 3 Route de l’Ourika**. Les 20 événements P1B.5 sont les événements latest `resolved`, puis le preflight retombe à **0**. Rollback append-only disponible ; couches métriques toujours désactivées.

Après write : **15 438 listings Search éligibles / 89 résolus quartier / 0,5765 % coverage**. Exact-head **20/20 PASS** sur `5a1d43dd53937c6b462a7a947d4c72605c41f5ab`, Reviewer technique PASS, merge `0abfd97c85da31e11d0e94ecc5ef5b9317c313ff`, push gate P1B.5 PASS.

## P1B.6 — Geo Coverage Depth Audit ✅ CLOSED — PR #424

Audit live read-only après P1B.5 : **15 438** listings Search éligibles ; **605** rows avec coverage bridge ; **89** latest-resolved ; **516** non résolues. Sous-cohortes : **71** avec `district` explicite et **445** sans district. Les 71 explicites ont **0 alias quartier validé confidence=1** et forment **31 couples ville/quartier** ; distribution source certifiée après double-check SQL : `mouldar.com` **42**, `mubawab.ma` **21**, `marrakechrealty.com` **8**. Les 445 sans district ne contiennent **aucun champ neighborhood/district/quartier structuré** dans les metadata auditées ; titre/snippet restent interdits comme preuve automatique.

Contrat : read-only, **0 DB/Registry mutation, 0 source-site request, 0 alias/entity creation, 0 fuzzy, 0 title/snippet inference**. Exact-head `311b00bb5d0273f04b4405395e5eb5be13050045`, **19/19 workflows PASS**, specialized live gate PASS, Reviewer **9,6/10**, merge `304726a83e1ef4df5ddacb8ecba925ad2e1c1b30`, post-merge gate PASS. Verdict : **`REGISTRY_GAP_IS_NEXT_BOUNDARY`**.

## P1B.7 — Geo Registry Gap Qualification ✅ CLOSED — PR #426

Responsabilité unique : **qualifier sans write les 31 couples ville/quartier du gap Registry P1B.6 afin de séparer priorité de validation, preuve insuffisante, mismatch parent et faux bucket fournisseur**.

Preuve production live : baseline **15 438 / 605 / 89 / 516 / 71 / 31** inchangé. Décisions :

- **10 couples / 31 rows `PRIORITY_EXTERNAL_VALIDATION`** — récurrence multi-source, utile uniquement pour prioriser une autorité indépendante ;
- **9 / 26 `SINGLE_SOURCE_REPEAT_NEEDS_AUTHORITY`** ;
- **10 / 10 `SINGLETON_NEEDS_AUTHORITY`** ;
- **Tanger — Centre-ville : 1 couple / 2 rows `PARENT_MISMATCH_REVIEW`** — un nom canonique exact existe ailleurs dans le Registry mais pas sous Tanger ;
- **Marrakech — Autres Marrakech : 1 / 2 `REJECT_PROVIDER_BUCKET`** — bucket fournisseur, pas entité Geo.

Invariants : la récurrence commerciale **n’est pas** une vérité géographique ; aucun alias/entité n’est créé par intuition. Contrat read-only : **0 DB/Registry mutation, 0 alias/entity creation, 0 geo-resolution write, 0 source-site request, 0 fuzzy, 0 title/snippet inference**.

Certification : head final concurrency-safe `d76eeda4de755faf08ec90afdaa0989cd4e8f2de` ; **19/19 workflows exact-head PASS**, specialized live gate PASS, Reviewer **9,6/10**, Release Certifier **GO**, merge `77bd6ffad41443efbf543cd25caf7539ca593579`, specialized push gate post-merge PASS. Verdict : **`EXTERNAL_AUTHORITY_REQUIRED_BEFORE_REGISTRY_WRITE`**.

## P1B.8 — Geo Authority Evidence Review ✅ CLOSED — PR #430

Responsabilité unique : **appliquer une hiérarchie de preuve géographique indépendante aux 10 couples multi-source prioritaires P1B.7 sans créer ni modifier le Geo Registry**.

Le gate rejoue en production le cohort P1B.7 exact (**10 couples / 31 rows**) avant d’accepter le manifeste de preuves et fail-close sur tout drift. Les portails immobiliers sont interdits comme autorité. Les décisions distinguent autorité municipale/urbanisme, corroboration institutionnelle, type territorial différent ou non résolu, et absence de preuve suffisante dans le périmètre revu.

Résultat certifié :

- **2 couples / 8 rows `AUTHORITY_CONFIRMED_NEIGHBORHOOD`** : Agadir — Hay Mohammadi (5), Agadir — Dakhla (3) ;
- Gauthier : corroboration institutionnelle quartier, insuffisante pour write ;
- Palmier : mention institutionnelle/localité, autorité administrative encore requise ;
- Targa : preuve officielle de localité/zone, type quartier non établi ;
- Majorelle : preuve officielle landmark/jardin, type mismatch ;
- Massira : nom officiel présent, type territorial non résolu ;
- Palmeraie, Route de Fès, Tanger — Nejma : aucune preuve quartier suffisante trouvée dans le périmètre d’autorité revu, sans conclure à la non-existence.

Contrat : **0 DB/Registry mutation, 0 alias/entity creation, 0 geo-resolution write, 0 property-portal authority**. Exact-head `e15fc810f2c98ed85fce0c78a465cf6e92cf33c7`, **19/19 workflows PASS**, specialized live PASS, Reviewer **9,6/10**, Release Certifier **GO**, merge `8f16efe091f76a5e933a201abd7f0bd1f9e53d77`, post-merge specialized run `31328973075` PASS. Verdict : **`AUTHORITY_EVIDENCE_REVIEW_COMPLETE_NO_REGISTRY_WRITE_AUTHORIZED`**.

**Offre quartier reste OFF.** Prochain lot : **P1B.9 — Tier A Registry Candidate Review**, read-only et borné à **Hay Mohammadi + Dakhla**. P1B.8 n’autorise aucun write Registry.

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

## 7.5 P0.5 — Registry Activation Readiness Gate ✅ CLOSED — PR #408

Responsabilité unique : **revalider en lecture seule la readiness Registry/canary des 2 candidats `SHADOW_ACCEPTABLE` de P0.4**, sans mutation et sans transformer une preuve structurelle en autorisation.

Preuve production : **0/2 `READY_FOR_CANARY_REVIEW`, 2/2 `BLOCKED_BY_POLICY`**. Les deux domaines sont Common Crawl-discovery-allowed mais restent `authorization_status=unverified`, `partnership_required=true` et `legal_review_required=true`. Stock actuel : Christie’s **0 seed / 5 discovery candidates** ; Immobilier-à-Marrakech **0 seed / 14 discovery candidates**. Aucun candidate row n'est accepted/promoted/compliance_allowed.

Contrat : 0 source-site request, 0 Common Crawl request, 0 WARC/content fetch, 0 DB mutation, 0 Registry mutation, 0 harvest, 0 pattern activation, 0 canary write. Certification : **20/20 exact-head PASS**, Reviewer **9,6/10**, Certifier GO, merge `ac0e240d28b88c5e66da73d1ab964794deb01877`, gate P0.5 post-merge PASS. Artefact : `sha256:a8617f91147feec1f2d870b971d346f36cddf74386da9019af2b600d4d224536`.

### Dépendance suivante

**Aucun canary technique n'est autorisé actuellement.** La prochaine étape n'est pas un P0.6 automatique : elle dépend d'une résolution externe d'autorisation/partenariat/revue légale, puis d'une modification explicite et auditée du Source Registry vers un état d'autorisation positif. Tant que ce changement n'existe pas, les 2 candidats restent bloqués et les 3 candidats P0.4 rejetés restent hors scope.

# 8. DATA-4 — Reservoir Strategy

- 4.0 ✅ #341 — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable ;
- 4.1A ✅ #343 — Avito unavailable : 95,06 % bruit ; 73 core-récupérables ;
- 4.2 ✅ #344 — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE` ;
- 4.3A→J ✅ — Dar Agadir 500/500, Search/display 500/500, drift 0 %, ownership fraîcheur et trigger display protégés ;
- 4.4A ✅ #379 ;
- 4.4B ✅ #380 — Promo Immo revalidé : 3 130 URLs sitemap / 2 935 intersection / 2 456 éligibles ;
- 4.4C ✅ #384, merge `ba65943a` — canary 50 persistant certifié, Search/display/quality/projection **50/50**, drift **0 %**, Registry inchangé.
- 4.5A ✅ #410, merge `a4710d6f5a88218db7d0751adb775a145a8b04d2` — qualification de capacité read-only vers 500 : snapshot source 4.4B certifié **25,29 h**, **3 130/2 935/2 456**, production **3 005 seeds / 2 923 Search / 2 923 display / 0 collision**, **2 405** nouvelles rows conservatrices, **450/450** sélectionnées provisoirement, batches **100+100+100+100+50**. Les 450 restent à revalider sitemap-live avant write.

DATA-4.5A qualifie la capacité mais **n'autorise aucun write par lui-même**. Prochain lot : **DATA-4.5B — Promo Immo Controlled Expansion Write**. Il devra revalider le sitemap courant pour chaque ligne juste avant write, créer le rollback avant mutation, appliquer au maximum **450 nouvelles confirmations** par batches **100+100+100+100+50**, arrêter fail-closed sur toute anomalie et certifier Search/display/quality/projection après chaque batch.

# 9. Lane business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.

# 10. Définition de terminé

Scope respecté, Benchmark Reviewer si UX majeur, Reviewer indépendant PASS, tests/build/gates exact-head verts, preuves, Registry respecté, aucun bypass, Release Certifier GO, PR mergée depuis le head attendu, `main` vérifié, post-merge CI/gates verts, production vérifiée si applicable, rollback disponible si mutation, 3 MD alignés.

# 11. Prochaine action exacte

## UX / Search

Exécuter **CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1** uniquement : ajouter un petit pool d’illustrations locales Agadir certifiées et déterministes, branché sur la fondation #437, sans utiliser de district non certifié et sans modifier ranking, priorité commerciale, éligibilité, dedupe, DATA, Source Registry ou Map. Rejouer le Benchmark UX/Search Reviewer et le protocole Chromium multi-viewport ; score UX cible ≥ **9/10**.

## UX / Carte

Auditer la prochaine cohorte explicite de Geo Coverage Recovery. Tant que couverture insuffisante : **Offre quartier = OFF**.

## DATA

**DATA-4.5A est CLOSED ✅.** La lane P0.1→P0.5 reste fermée/bloquée sur autorisation externe, sans empêcher la lane DATA indépendante. **Action suivante : DATA-4.5B uniquement**, expansion Promo Immo bornée vers 500 avec revalidation sitemap live avant chaque write et rollback préalable.
