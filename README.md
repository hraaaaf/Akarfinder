# AkarFinder

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- Produit public : <https://akarfinder.vercel.app>
- Cœur produit : `/search`
- Branche canonique : `main`
- Objectif long terme : **Property Graph du marché immobilier marocain**

## Documentation canonique

1. `README.md` — identité, doctrine, architecture et état macro ;
2. `docs/ROADMAP.md` — ordre d’exécution ;
3. `docs/SESSION.md` — handover opérationnel court.

Ordre de vérité :

`code mergé dans main → README.md → ROADMAP.md → SESSION.md → specs techniques → preuves historiques`.

<!-- DATA-MASS-CURRENT-START -->
## DATA MASS — état courant

La priorité DATA actuelle est **la masse nationale policy-safe**. Le programme canonique est `MASS-1 → MASS-6` et suit la doctrine **MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME**.

**MASS-1 — Reservoir Qualification** est certifié **9,5/10** sur PR #511, merge en attente : **86 741 représentations URL net-new** ont été mesurées, dont **51 326 signaux immobilier Maroc probables**. Après trois passes de double-check et exclusion des annuaires, hospitality/travel et portails foreign-only non pertinents, la queue **MASS-2 Source Factory** contient **101 domaines** portant **15 790 signaux immobilier Maroc probables**.

MASS-1 est strictement read-only : **0 fetch source détail, 0 write DB/DDL/Registry, 0 ingestion, 0 activation publique, 0 permission inférée et 0 claim de bien unique**. La prochaine étape est **MASS-2 — Source Factory**, puis Minimal Listing Index, Mass Reclassification, Discovery Expansion et National Mass Engine. Voir `docs/ROADMAP.md` et `docs/data/DATA-MASS-1-RESERVOIR-QUALIFICATION.md`.
<!-- DATA-MASS-CURRENT-END -->

<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-START -->
## Bibliothèque visuelle quartiers — Souissi Pilot ✅ CLOSED

- **P0.1→P0.5** : Modèle A verrouillé et trois scènes réelles Souissi certifiées (`signature / immobilier / lifestyle`) à partir de sources Wikimedia Commons vérifiées, sans génération ex nihilo.
- **P0.6 ✅** : les trois scènes ont été rejouées dans les vraies cards Search sur la matrice responsive ; gate humain final **9,2/10**, disclosure `Photo d’ambiance` et crédits/licences préservés.
- **P0.7 ✅ PR #506 + P0.7S #507** : bucket Supabase `neighborhood-visuals` matérialisé ; trois masters réels présents sous `rabat/souissi/{signature|immobilier|lifestyle}/master.jpg` ; les trois rows canoniques portent provenance/licence/attribution et `verified_location=true`.
- Le master source reste **intact**. Le traitement AkarFinder certifié du pilote est **non destructif et rendu en CSS/UI** ; aucun bitmap dérivé n’est requis, donc `transformed_asset_url = NULL` est l’état canonique attendu pour ces trois assets.
- La fonction d’ingestion P0.7 est désormais fail-closed (`410`) et l’extension temporaire `pg_net` a été supprimée après ingestion.
- **Aucune activation implicite du Visual Resolver V2** : la consommation généralisée de cette bibliothèque reste dans **P2**. Le pilote prouve source → droits → ingestion → rendu → QA → Storage/metadata, pas une nouvelle règle de ranking/publication.
- **Prochain LOT de cette lane : P1.1 — Agdal**, 3 scènes réelles selon le pipeline Souissi certifié.
<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-END -->

<!-- DATA-4.7B-CURRENT-START -->
## État DATA courant — 2026-08-10

La lane DATA distingue strictement **capacité sitemap brute**, **représentations URL de pages détail**, **biens uniques dédupliqués**, **fraîcheur** et **inventaire Search**.

- **DATA-4.9A ✅ PR #444** — merge `18be46c7349e8a56b2b68b56005d79f85e125675` : onboarding read-only de 11 sources zéro-stock ; jusqu'à **11 480 identités sitemap net-new brutes** observées selon snapshot, sans les appeler annonces.
- **DATA-4.9B 🟠 PR #452** — High-Capacity Structural Detail Qualification, strictement read-only. Snapshot durci certifié au head `ae4b212e28f6ca0929548299860b04936daea218`, run `31369710665` PASS, artefact `sha256:dce77812b6666b09f29d7e716500cd5abed39e6902fcbcc71a515eeb4680f33d`, observé `2026-08-10T08:24:02.397Z`.
- **10 128 identités URL net-new** qualifiées sur 6 sources → **2 326 représentations URL structurellement compatibles avec une page détail** + **7 802 rejets explicites** ; 0 collision d'identité sur ce snapshot.
- Détail candidats URL : Val Foncier **709**, Christie's Morocco **602**, Immo Maroc **276**, AgadirImmobilier.ma **37**, ProImmobilier **99**, Capital Properties **603** (optionnel/non bloquant).
- **2 326 ≠ 2 326 biens uniques.** Le proof l'impose désormais : `structuralDetailCandidateRowsAreUrlRepresentationsNotUniqueProperties=true` et `deduplicatedUniquePropertyCountProducedByThisLot=false`.
- Val Foncier illustre le filtre : les pages `/bien-immobilier/<slug>` qualifient, tandis que des milliers de sous-URLs d'attachments/images sont rejetées.
- 0 detail-page fetch ; 0 DB/Registry/policy write ; 0 ingestion ; 0 activation Search/public display.
- Registry live : les six sources restent `unverified + hidden + internal_signal_only` avec 0 représentation active ; sitemap/structure n'est jamais une permission.

**Prochain LOT : DATA-4.9C — Source Policy Decision & Registry Assignment.** Revue actuelle des preuves officielles/CGU/robots et décision par source. Aucune ingestion dans ce lot ; une mutation du Source Registry n'est permise que si les preuves justifient explicitement la policy choisie, sinon la source reste fail-closed.

**DATA-4.9D** ne pourra être qu'un canary d'ingestion borné/rollback-ready pour les sources réellement autorisées par 4.9C.
<!-- DATA-4.7B-CURRENT-END -->

## Doctrine

Pipeline :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

Principes non négociables :

- aucune donnée absente n’est inventée ;
- provenance et canonical URL restent explicables ;
- volume brut ≠ inventaire publiable ;
- robots/sitemap/capability ≠ permission ;
- no-bypass absolu ;
- Source Registry obligatoire avant activation ;
- un registre structurel/patterns ne constitue jamais une autorisation de canal ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- partner/autorisé ≠ public-indexed ≠ signal interne ;
- `Shadow → Canary → certification → activation bornée` pour les changements DATA/Search importants ;
- une responsabilité, une branche, une PR, un merge par lot.

## Architecture active

- Next.js 15 / React 19 / TypeScript / Tailwind ;
- Supabase PostgreSQL ;
- Vercel ;
- MapLibre GL ;
- Geo Registry canonique ;
- Source Registry v2 ;
- P0.1 operational mass-index gate **actif en production** : Source Registry relu dans harvester + importer, trigger DB fail-closed ;
- reconciler freshness Common Crawl durci contre les timeouts Supabase via PR #396 ;
- Observation/Freshness/quality/dedup pipeline ;
- CI GitHub Actions avec gates DATA, UX, accessibilité et build.

## Gouvernance UX / Search

<!-- UX-HEADER-10OF10-1-CLOSEOUT-START -->
## UX-HEADER-10OF10-1 — Exact White Search Header ✅ CERTIFIED

Responsibility: make the `/search` header match the locked visual contract exactly before moving to the next section.

- desktop 1440×900: one continuous pure-white header surface, blue AkarFinder logo, `Acheter / Louer / Neuf / Agences / Conseils`, then `Favoris / Publier / Mon compte`;
- mobile 390×844: `Menu / centered AkarFinder / Mon compte` on one continuous pure-white surface;
- exact rendered height: **54 px** on both certified viewports;
- no blue header band, no orange, no dark-mode override on the Search header;
- Product Design Reviewer: **10/10 PASS**;
- Independent Release Certifier: **10/10 PASS**;
- synchronized certified behavioral head: `413f854979e5b4349866955b92bb3f4d9d5ba72c`;
- specialized synchronized run: `31524218758` SUCCESS;
- perceptual resemblance to the supplied mockup after double-check: **9.8/10**; remaining difference is limited to micro-spacing/font rendering, while the implemented contract itself is **10/10 exact**;
- DATA, ranking, Source Registry, dedup, price, commercial ordering and Map logic unchanged.

**Next UX section:** Search / filters. Do not reopen the Header unless a measured regression appears.
<!-- UX-HEADER-10OF10-1-CLOSEOUT-END -->

<!-- UX-SEARCH-CONTROLS-10OF10-1-CLOSEOUT-START -->
## UX-SEARCH-CONTROLS-10OF10-1 — Exact Light Search Controls ✅ CERTIFIED

Responsabilité unique : verrouiller la section Recherche / Filtres de `/search` sur la cible décidée, sans rouvrir le Header ni modifier les résultats, cards, DATA, ranking, Registry, dédup, prix, ordre commercial ou Map.

- head comportemental certifié : `436721ec175251578d169fe2626674769b5b6853` ;
- run spécialisé : `31535196572` — **Product Design Reviewer 10/10 PASS + Independent Release Certifier 10/10 PASS** ;
- preuve indépendante : artefact `ux-search-controls-10of10-release-certifier-proof`, digest `sha256:e28d45a936312f4f19606a5b0353e7a4fd80edb5d92fd24f5302f9b5cba5fa34` ;
- Chromium réel : **360×800 / 390×844 / 768×900 / 1024×800 / 1440×900** ;
- surface Recherche/Filtres **blanche pure**, y compris sous `colorScheme=dark`, avec thème sémantique local `data-theme=light` ;
- couleurs : primitives sémantiques AkarFinder, bleu primaire `#0B63CE`, navy/foreground, blanc/neutres ; **0 orange / 0 bronze** dans la section ;
- mobile 360/390 : ligne primaire **48 px**, inset **16 px**, gap Search↔Filtres **8 px** ; tablette 768 : **48 px**, inset **24 px** ;
- desktop 1024/1440 : ligne primaire **44 px**, Search **520 px**, sélecteur Acheter/Louer/Neuf **288×44 px**, Filtres **120×44 px**, inset **24 px** ;
- section complète avec divider : **65 px mobile/tablette / 69 px desktop** ; 0 overflow horizontal ;
- filtres avancés préservés : ville, budget min/max, surface min, type de bien + sélecteur visuel ; sheet mobile blanche, safe-area friendly, cibles critiques ≥48 px ;
- predecessor Header préservé à **54 px**, blanc exact et logo bleu ;
- exact-head : **32 workflows associés terminés SUCCESS** après rerun du seul échec réseau transitoire Google Fonts ; les tests Casablanca étaient 16/16 PASS avant cet échec de fetch et le rerun build est SUCCESS ;
- inspection humaine des preuves 390×844 et 1440×900 : la section implémentée correspond au contrat verrouillé **10/10**. La toolbar sombre et la bottom-nav actuelle restent volontairement hors scope et seront traitées dans leurs lots dédiés.

**Prochain LOT : UX-RESULTS-TOOLBAR-10OF10-1 — Results Toolbar.**
<!-- UX-SEARCH-CONTROLS-10OF10-1-CLOSEOUT-END -->


Les lots UX majeurs utilisent désormais un **Benchmark UX/Search Reviewer indépendant** avant certification et après implémentation. Référence : `docs/BENCHMARK_UX_SEARCH_AGENT.md`.

Principes verrouillés :

- **mobile = expérience de référence** ; desktop enrichit sans ajouter de bruit ;
- aucun lot UX majeur n’est certifié avec un score mobile < **9/10** ;
- `/search` vise `RECHERCHE → FILTRES UTILES → RÉSULTATS` ;
- aucun jargon d’architecture interne n’est exposé au grand public sans nécessité ;
- la SERP doit rester un **flux visuel continu**, même si les priorités commerciales/provenance restent appliquées en interne ;
- les cards convergent vers `IMAGE → PRIX → TITRE → LOCALISATION → 3–4 FACTS → PROVENANCE → ACTION` ;
- le Benchmark Reviewer est consultatif obligatoire et peut rendre `CHANGES_REQUIRED` ;
- aucune pratique concurrente n’est copiée automatiquement : elle doit apporter un gain utilisateur compatible avec AkarFinder.

Première mission : `BENCHMARK-SERP-1`, rapport dans `docs/BENCHMARK_SERP_1_REPORT.md`.

<!-- UX-SEARCH-CONVERGENCE-CURRENT-START -->
### Convergence Search actuelle — UX-SEARCH-1 à UX-SEARCH-7 ✅ COMPLETE

- **UX-SEARCH-1 — Density First ✅ PR #479** : grille certifiée 2/2/3/4/4 ; densité **9,3/10**.
- **UX-SEARCH-2 — Compact Search & Filters ✅ PR #480** : première annonce ~240–250 px, touch targets 48 px, 0 overflow ; **9,5/10**.
- **UX-SEARCH-3 — Card Architecture ✅ PR #481** : `IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE`, confiance/source préservées ; **9,4/10**.
- **UX-SEARCH-4 — Visual Inventory System ✅ PR #482** : fallbacks contextuels truth-safe activés ; variété visuelle certifiée, stable et transparente ; **9,5/10**.
- **UX-SEARCH-5 — Navigation & Hierarchy Polish ✅ PR #483** : header Search compact/fluid, hauteur **49–53,8 px**, inventaire prioritaire ; **9,5/10**.
- **UX-SEARCH-6 — Mobile Precision Pass ✅ PR #484** : mobile 360/390 à **2 colonnes**, gaps **10/14 px**, contrôles critiques **48 px**, 0 clipping/overflow ; **9,5/10**.
- **UX-SEARCH-7 — Final Visual Certification ✅ PR #485** : six viewports **360/390/768/1024/1280/1440**, grille **2/2/2/3/4/4**, contrat final **10/10 (9/9 axes)**, audit humain **9,5/10**, **19/19 workflows exact-head SUCCESS**, Product Design Reviewer + Independent Release Certifier PASS.
- Preuves finales : première card **229,5 px mobile / 242,25 px desktop** avec filtre Rabat actif ; max card **362,4 px mobile / 419 px desktop** ; **11/12 visuels distincts**, 0 overflow, 0 image cassée, provenance et disclosure truth-safe conservées.
- Les sept lots préservent ranking, DATA, Source Registry, dédup, ordre commercial, prix, Map et transparence de provenance.
- **Convergence UX/Search fermée.** Toute évolution suivante doit repartir d’un finding utilisateur/production mesuré, sans rouvrir les lots certifiés par défaut.
<!-- UX-SEARCH-CONVERGENCE-CURRENT-END -->

### UX-LISTING-NAV-FEEDBACK-1 ✅ CERTIFIED — PR #486

Finding utilisateur distinct après la convergence UX-SEARCH-1→7 : l’action principale d’une annonce ouvrait un nouvel onglet, cassant la continuité naturelle du bouton Précédent, et les navigations lentes n’exprimaient aucun état d’attente.

- ouverture principale des résultats internes, observés et Gateway **dans le même onglet** ; le bouton Précédent du navigateur revient donc au Search précédent ;
- les liens secondaires explicitement externes (source originale secondaire, crédit/licence photo) restent en nouvel onglet ;
- feedback global AkarFinder **pin + radar** uniquement si la navigation dépasse **280 ms**, non bloquant et sans flash sur les transitions rapides ;
- reset sur changement de route/query, `pageshow`/BFCache et `popstate` ; `prefers-reduced-motion` respecté ;
- aucun changement de ranking, DATA, Source Registry, dédup, prix, densité, ordre commercial ou Map ;
- head comportemental `ea36ca6650af9774c5bca778069c7997766ce43c` : gate dédié `UX Listing Navigation Feedback Gate` run `31490771461` **PASS** — contrat navigation/loading + TypeScript ; les predecessor gates du PR sont rejoués avant merge.


### SEARCH-UX-FAST-1 ✅ PR #390

Premier lot produit issu du benchmark : chemin direct vers la première annonce, sans modifier ranking, prix, ordre commercial, cards, DATA ou logique Map.

Preuves de certification :

- mobile **360×800** : première annonce `1538 px → 450 px`, Search à `69 px`, zéro overflow ;
- mobile **390×844** : première annonce à `450 px`, zéro overflow ;
- desktop **1280×800 / 1440×900** : première annonce à `328 px`, zéro overflow ;
- hero Search, prose de ranking et prompt projet retirés du chemin critique ;
- `SearchPriceExplorerDock` conservé mais déplacé **après** le flux primaire de résultats ;
- Option A des types de biens conservée derrière `Filtres` ;
- gate permanent `SEARCH-UX-FAST-1 Gate` : contrat/types + build + Chromium 4 viewports ;
- **25/25 workflows exact-head verts** avant closeout ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,3/10, desktop 9,2/10** ;
- Reviewer technique : **PASS**.

### SEARCH-WORDING-PURITY-1 ✅ PR #391

Deuxième lot Search : simplification du vocabulaire public sur Search/Home, sans modifier ranking, ordre commercial, récupération de prix, DATA, Registry, structure des cards ou logique Map.

Résultat certifié :

- libellés d’architecture retirés des surfaces transactionnelles : `indexé`, `observé`, `analysé`, `analyse partielle`, `niveau d’information`, `passeport local factuel`, `écart descriptif`, etc. ;
- informations de confiance utiles conservées en langage simple : source externe, informations limitées, détails utiles, résultats proches, quartier en chiffres ;
- prudence dédup conservée : un regroupement peut correspondre au même bien **sans certitude** ;
- `search-truth-tier` conserve exactement les mêmes branches `observed/analyzed/partial`, le même collapse et le même ordre ; seules les chaînes publiques changent ;
- mobile **360×800 / 390×844** : première annonce à **398 px**, visible dans le premier écran, zéro overflow ;
- desktop **1280×800 / 1440×900** : première annonce à **328 px**, zéro overflow ;
- Search et Home : **0 expression retirée détectée** sur les 4 viewports Chromium ;
- gate permanent `SEARCH-WORDING-PURITY-1 Gate` : contrats + TypeScript + build + Chromium ;
- **23/23 workflows exact-head verts** avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,4/10, desktop 9,3/10** ;
- Reviewer technique : **PASS**.

### SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393

Troisième lot Search : suppression des ruptures visuelles entre catégories d’annonces, sans modifier le classement, la récupération de prix, les cards, DATA, Registry, Map, l’éligibilité ou le dédup.

Résultat certifié avant closeout documentaire :

- les anciens murs `Promoteurs premium`, `Agences partenaires`, `Annonces sur AkarFinder`, `Informations détaillées`, `Informations à compléter` et `Autres annonces` ne segmentent plus la SERP ;
- les résultats internes sont rendus dans une seule grille continue ; les résultats Gateway suivent sans nouveau header de catégorie ;
- ordre interne strict conservé : `promoteur premium → agence partenaire → direct user → public analyzed → public partial → public observed → gateway` ;
- `partitionCommercialSearchListings` reste autoritaire ; aucun changement de ranking ou de truth tier ;
- Chromium réel **360×800 / 390×844 / 1280×800 / 1440×900** : ordre préservé, 0 header de catégorie, 0 overflow, première annonce dans le premier écran ; sur mobile, aucune rupture verticale entre cards > **24 px** ;
- `SEARCH-UX-FAST-1`, Search Truth, Visible Dedup, P0 Closure et WORDING-PURITY restent verts ;
- gate permanent `SEARCH-CONTINUOUS-FLOW-1 Gate` : contrats + TypeScript + build + Chromium ;
- **23/23 workflows exact-head verts** avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,5/10, desktop 9,4/10** ;
- Reviewer technique : **PASS**.

### SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394

Lot mobile ajouté avant la récupération des prix : densité de scan inspirée du meilleur du benchmark Airbnb, adaptée à la recherche immobilière AkarFinder sans copier son design et sans modifier ranking, prix, ordre commercial/truth, DATA, Registry ou Map.

Résultat certifié avant closeout documentaire :

- mobile : grille verticale continue **2 colonnes**, image dominante `164 px`, prix → titre → localisation → 3 facts → provenance ;
- favoris conservés en overlay sur l’image, ce qui libère la largeur du prix ;
- CTA secondaires carte/compare/gros CTA masqués uniquement sous `640 px` ; tablette/desktop préservés ;
- Gateway suit la même densité mobile sans recréer de section ;
- **360×800** : première card à `308 px`, largeur `158 px`, hauteur `306 px`, `0` CTA secondaire, `0` prix tronqué, `0` overflow ;
- **390×844** : première card à `308 px`, largeur `173 px`, hauteur `306 px`, mêmes invariants à zéro ;
- **1280×800 / 1440×900** : comportement desktop préservé, première card à `236 px`, zéro overflow ;
- `Visuel illustratif`, provenance et prudence `Résultats proches / Comparez les sources` restent explicites ;
- gate permanent `SEARCH-MOBILE-CARD-GRID-1 Gate` : contrats + TypeScript + build + Chromium 4 viewports + anti-troncature prix ;
- **23/23 workflows exact-head verts** sur `76a5dfac10dd47aeee569f85067cc9e677d1cecb` avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,6/10, desktop 9,4/10** ;
- Reviewer technique : **PASS**.

### PRICE-COVERAGE-RECOVERY-1 ✅ PR #395

Récupération de prix remise sous gouvernance fail-closed : l’ancien V1 shadow est désormais audit-only, les **8 fuites publiques** historiques ont été nettoyées en production, publication et ranking restent désactivés pour ce shadow. Migration canonique `20260809013000_price_coverage_recovery_shadow_governance`, report production `shadow_public_leaks=0`.

### RANKING-QUALITY-1 ✅ PR #403

Politique de qualité persistée recomposée et resynchronisée sans modifier Ranking V2 ni la priorité commerciale. Préflight : **14 007 / 56 810** rows stale ; après migration production : `policy_drift_rows=0`, 0 vertical non immobilier/inconnu public, 0 CATEGORY public, 0 AMBIGUOUS primary, 0 LISTING gardant l’ancienne policy ambiguous. Les **587** fallbacks provider-detail explicites restent conservés. Inventaire LISTING public : **15 438** (10 061 primary / 5 377 secondary). Merge `c5949063fa1c0e3448e917473239f821a17b7d59`.

### UNIFIED-LISTING-CARD-1 ✅ PR #407

La card Gateway/externe a été alignée sur la grammaire canonique `IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE → ACTION`, sans modifier ranking, priorité commerciale, éligibilité, acquisition, Source Registry, policy thumbnails ou schéma. Les états inconnus restent explicites et truth-safe : `Prix non communiqué`, `Localisation non précisée`, `Informations à compléter`.

Certification : head `6ddde621f03ccca1f25b8dc5dd34fdded090044b`, **23/23 workflows PR verts**, gate spécialisé contrat + Search Truth + TypeScript + build PASS, Chromium déterministe **360×800 / 390×844 / 768×900 / 1280×900**, 0 overflow, 0 prix tronqué. Benchmark UX/Search Reviewer **PASS 9,2/10**, Reviewer PASS, Release Certifier GO. Artefact visuel `sha256:784182dd2c8d4f5eca46e907eeedd38493e0f63d586bd99151010fae6b3e542b`. Merge `7ad1b7af2a0e7dc268b0b3ea032e083f7ccbb193`.

### CONTEXTUAL-VISUAL-ASSETS-1 ✅ PR #414

Les résultats Gateway sans thumbnail autorisée utilisent désormais un fallback contextuel déterministe et truth-safe : thumbnail autorisée d’abord ; sinon illustration de ville uniquement sur `normalized_city` exact et allowlist locale ; sinon artwork du type normalisé reconnu ; sinon état neutre `Annonce indexée`. Aucun parsing titre/snippet, fuzzy matching, hasard, réseau ou lookup d’image externe.

Certification : head `575f9510587cc244b2f1a3a6bf9aea7ad957fd83`, **24/24 workflows exact-head verts**, Property Type Visual Option A + UNIFIED predecessor + Search Truth + TypeScript + build PASS. Chromium **360×800 / 390×844 / 768×900 / 1280×900** : 0 label tronqué, 0 prix tronqué, 0 overflow horizontal. Benchmark UX/Search Reviewer **PASS 9,3/10**, Reviewer PASS, Release Certifier GO. Artefact visuel `sha256:78cf4a742360b87683bd9697a465a15f898979b29dea9e384474baf8b0a7ca69`. Merge `ae3e254bcec3bb4e98b814b0f057141e84956d10`.

### CONTEXTUAL-ILLUSTRATIONS-FOUNDATION-1 ✅ PR #437

Fondation P0 du système d’illustrations contextuelles scalable : catalogue local explicite + resolver pur, déterministe et fail-closed, sans introduire de nouvel asset dans ce lot. La priorité reste `thumbnail autorisée → illustration contextuelle → artwork type reconnu → fallback neutre`. La sélection multi-assets utilise Rendezvous/HRW, l’identité stable vient de `original_url` normalisée de façon conservatrice, et aucun district n’est consommé tant que Search n’expose pas un signal structuré certifié.

Certification : head `36620ca20e826be46464ab177e9611fb01f94a16`, **27/27 workflows exact-head verts**, specialized gate PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** avec reload stable, 0 label/prix tronqué et 0 overflow. Audit visuel P0 **9,6/10**, Reviewer PASS, Release Certifier GO. Artefact `sha256:3b71f26ffccf0614098b3dbd7c893560345d332f2a69e6115a7e7bb3dc828944`. Merge `66ee5a9263fbdef673c4f16f6066aa10c7cf0417`.

### CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1 ✅ PR #445

Pilote P1 Agadir : **12 assets déterministes = 4 ville + 4 Appartement + 4 Villa**, sans district, sans inférence texte et sans toucher ranking, priorité commerciale, éligibilité, dedupe, DATA, Source Registry ou Map. `Appartement` et `Villa` utilisent le tier `city_type`; les autres types reconnus à Agadir retombent sur le pool `city`. La thumbnail autorisée reste prioritaire et la disclosure publique reste `Illustration`.

Certification : head `f6b1d15e92636439dfca8128e54892fbf32b95a6`, **20/20 workflows exact-head verts**, specialized P1 + predecessor P0 PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, **12/12 assets uniques**, reload stable, 0 label/prix tronqué et 0 overflow. Smoke global **48 captures / 0 finding**. Audit UX **9,4/10**, Reviewer PASS, Release Certifier GO. Artefact `sha256:46441308c3449fe1fabef5c8cd651ae9700cd52f91b190190b153ca7f8152860`. Merge `a2e92ac6c4385792744ab7bf3e105663d040bc9d`, post-merge `main` + tree exact vérifiés.

### CONTEXTUAL-ILLUSTRATIONS-SCALE-1 ✅ PR #448

Extension bornée du système P0/P1 aux deux villes à plus fort impact restant après Agadir : **Marrakech + Casablanca**. Chaque ville dispose désormais de **4 variantes ville + 4 Appartement + 4 Villa**, soit **24 variantes certifiées** sur la cohorte SCALE-1. Le resolver HRW/Rendezvous, l'identité stable `original_url`, la priorité des thumbnails autorisées, les fallbacks type/neutre et le label `Illustration` restent inchangés. Agadir P1 est rejoué comme predecessor ; Rabat, Tanger et Fès restent singleton dans ce lot. Aucun district n'est activé.

Certification : head final `3a4df096c16cf1fe1f9c051dfd24f59bd750b5a4`, **21/21 workflows exact-head verts**, specialized SCALE-1 + Agadir P1 + P0 + Unified Card + Search Truth PASS, TypeScript + build PASS. Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : **24/24 asset IDs uniques**, images hors écran explicitement hydratées (`complete && naturalWidth > 0`) avant capture, reload stable, 0 label/prix tronqué et 0 overflow. Audit UX **9,3/10**, Reviewer PASS, Release Certifier GO. Artefact `sha256:b80d2539afea1fda4bfc8e515fe94ffe7821aee0d2f71c45e29c844f586ca8f5`. Merge `081d51ebd38ff728366694aca9ae6c1923a54fe5`, post-merge `main` + tree exact vérifiés.

### CONTEXTUAL-ILLUSTRATIONS-SCALE-2 ✅ PR #453

Extension finale du scale par ville aux trois villes encore singleton : **Rabat + Tanger + Fès**. Chaque ville dispose désormais de **4 variantes ville + 4 Appartement + 4 Villa**, soit **36 variantes SCALE-2** et **33 nouveaux SVG locaux**. Les clés structurées `Fes` / `Fès` partagent exactement les mêmes pools et les mêmes IDs/paths ASCII `fes-*`. Le resolver HRW/Rendezvous, l'identité stable `original_url`, la priorité des thumbnails autorisées, les fallbacks type/neutre, le label `Illustration` et district OFF restent inchangés.

Certification : head final `e242960788f57975ae9d107ab04766f14fa29d87`, **22/22 workflows exact-head SUCCESS**, specialized SCALE-2 + SCALE-1 + Agadir P1 + P0 + Unified Card + Search Truth PASS, TypeScript + build PASS. Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : **36/36 asset IDs uniques**, lazy images hydratées avant capture, reload stable, 0 label/prix tronqué et 0 overflow. Audit UX exact-head **9,3/10**, Reviewer PASS, Release Certifier GO. Artefact `sha256:85659a415e52e28d4258b152fc26ea43dd726d16203e23b3941efb3a6d4ad564`. Merge `07d9fc07fe24a9a176ad8830bd0e6852631ed1a4`, post-merge `main` vérifié.

### RABAT-REAL-PHOTO-LIBRARY-1 ✅ PR #468

Rabat dispose désormais d'une **bibliothèque séparée de 40 vraies photos Wikimedia Commons**, soit **8 photos × 5 quartiers structurés** : Agdal, Hay Riad, Souissi, Océan et Hassan. Cette bibliothèque ne modifie pas le catalogue historique d'illustrations : elle s'active uniquement lorsque `city=Rabat`, qu'un `listing.neighborhood` structuré correspond exactement à l'un des 5 quartiers et que la card est déjà en `fallback_visual`. Une photo du bien autorisée reste prioritaire ; quartier inconnu ou échec de chargement → artwork existant. Aucune inférence depuis titre, description ou snippet.

La sélection est déterministe par identité stable de l'annonce. Chaque card affiche `Rabat • Quartier`, `Photo d’ambiance` et un lien `Crédit & licence · Wikimedia Commons`. L'identité AkarFinder est appliquée uniquement au rendu CSS ; le fichier Commons reste intact.

Certification : head `3de085a2058862edc52bab4fe0dcd3aca04a4f4c`, **29/29 workflows exact-head SUCCESS**, gate spécialisé PASS, **40/40 sources + licences Commons** vérifiées, TypeScript + build PASS. Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : 10/10 photos chargées sur la cohorte visuelle, reload stable, 0 clipping, 0 overflow, mobile **2 colonnes**. Audit visuel humain **9,2/10**, Reviewer PASS, Release Certifier GO. Merge `2585017ea377d72b3a54ca1083dbf1b609899ad9`, post-merge `main` vérifié.

Les **6 villes contextualisées** (Agadir, Marrakech, Casablanca, Rabat, Tanger, Fès) disposent désormais chacune de **12 variantes**, soit **72 IDs contextuels uniques**. Aucune nouvelle extension d'assets par ville ne doit être lancée sans mesure d'usage réelle.

Prochain lot UX/Search : **CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1** — audit read-only de la couverture réellement rendue dans Search après #468 : thumbnail autorisée vs **Rabat real-photo district** vs `city_type` vs `city` vs fallback type vs neutre, distribution ville/type/quartier, répétition effective et taux d'échec des photos distantes. **0 nouvel asset / 0 DATA / 0 Registry / 0 ranking / 0 Map**. Le tier district du catalogue d'illustrations historique reste OFF ; seule la bibliothèque Rabat bornée utilise le signal structuré `listing.neighborhood`.

### DETERMINISTIC-ATTRIBUTION-1 ✅ PR #416

La provenance publique Search est désormais calculée par un resolver canonique fail-closed plutôt que rendue depuis des labels libres. Gateway dérive l’identité depuis `source_id` et la configuration source canonique ; les listings persistés utilisent les signaux structurés d'accès/display plus une allowlist de marques ; AkarInfo consomme le même resolver. Les noms bruts inconnus ne sont jamais réémis dans l'UI.

Certification : head `ab4a05ec21434fb414628a181a11adddd68d8293`, **26/26 workflows exact-head verts**, preuve déterministe **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, 0 overflow, 0 prix tronqué et fixtures avec labels bruts empoisonnés sans fuite. Benchmark UX/Search Reviewer **PASS 9,4/10** (mobile 9,4 / desktop 9,3), Reviewer technique PASS (`4891678670`), Release Certifier GO (`4891679276`). Merge `80da5a2abf2d3a7d74dafa6c6043ffe7176929d7`.

### SEARCH-ACTION-HIERARCHY-1 ✅ PR #418

La hiérarchie d’actions des cards Search a été simplifiée sans modifier ranking, priorité commerciale, éligibilité, DATA, attribution ou état Map. Sur tablette/desktop, une card interne expose désormais une seule action forte `Voir le bien`; les contrôles dédiés `Repérer sur la carte` et `Comparer` ont été retirés de la card, tandis que la continuité Search↔Map par hover/focus et le comparateur global restent disponibles. Lorsqu’une source originale existe, elle reste accessible comme lien discret de provenance au lieu d’un deuxième gros CTA. Mobile reste compact et inchangé.

Certification : head `a7ddb7d023eac1418eee50e03258f1d056184b64`, **24/24 workflows exact-head verts**, Chromium déterministe **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, 0 overflow, 0 ancien CTA Map/Compare, 0 prix mobile tronqué. Benchmark UX/Search Reviewer **PASS 9,5/10** (mobile 9,6 / tablette 9,5 / desktop 9,5), Reviewer PASS, Release Certifier GO. Artefact visuel `sha256:c9ec64465039168a44c81b8921ff0ac7e57ab7a25e65a54f91f06f480805a66f`. Merge `0987b89286d262e7d01ec8e3a868b2424d85c4d5`.

### SEARCH-DESKTOP-SPLIT-1 ✅ PR #423

Dernier lot de convergence BENCHMARK-SERP-1 : le mode `Mixte` desktop est désormais un vrai split **résultats + carte**, sans réintroduire les blocs secondaires `Mon Projet AkarFinder` et `Ouvrir la carte complète` dans la colonne Map. Mobile/tablette restent empilés et inchangés ; `Liste` et `Carte` conservent leurs contrats fonctionnels. Aucun changement ranking, filtres, éligibilité, ordre commercial, DATA, attribution ou état URL.

Certification : head `29b469e17eff6f4516bef18f7d5ed193726308f0`, **26/26 workflows exact-head verts**, gate spécialisé contrat + predecessors + TypeScript + build + Chromium PASS. Preuve **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : mobile/tablette empilés, desktop **654/558 px** puis **741/631 px** résultats/carte, **0 bloc secondaire desktop**, **0 overflow horizontal**, **0 prix tronqué**. Benchmark UX/Search Reviewer **PASS 9,5/10**, Reviewer technique PASS, Release Certifier GO. Artefact `sha256:9811f9b4a62b8b571ff977953f240e3be5ac17fad41cf3ef87d8d8b30feedf8c`. Merge `6bcf402158539c547061a6a92d1b408df1da8d22`.

**BENCHMARK-SERP-1 — séquence de convergence terminée ✅.** Toute nouvelle évolution UX/Search doit désormais être formalisée comme un nouveau lot, avec benchmark et contrat propres.


## État UX / Carte

- CARTE-QUARTIER-P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — `district` structuré dans Search ;
- P1A.3 ✅ PR #349 — Map state/navigation pilotés par URL, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System, cockpit flottant map-first ;
- P1A.5 ✅ PR #365 — Territorial Explorer **Maroc → ville → quartier**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive hardening, **12 captures / 0 finding**, **9,2/10** ;
- P1B.1 ✅ PR #371 — AkarFinder Map Visual Layer, **3 captures / 0 finding**, **9,1/10** ;
- P1B.2 ✅ PR #376 — Sourced Territorial Intelligence `layer=price`, benchmarks quartier exacts, aucune interpolation/fallback ville, **3 captures / 0 finding**, **9,2/10** ;
- P1B.3 ✅ PR #382, merge `dca48b2c` — **Territorial Metric Join Contract** fail-closed, post-merge gate vert ; rapport production initial : **15 399 listings éligibles / 0 résolution quartier / 0 collision / 0 conflit / 0 % coverage**, `metric_layers_activated=false` ;
- P1B.4 ✅ PR #386, merge `5ab84bcf` — **Geo Coverage Recovery pilot** : preuve explicite `property_listings.district` uniquement, alias Geo Registry exact + ville parente exacte, aucune inférence/fuzzy/spatiale. Preflight **69/69**, write transactionnel **69/69**, **14 quartiers / 5 villes**, rollback append-only disponible. Rapport P1B.3 après write : **15 395 listings éligibles / 69 résolus / 0,45 % coverage / 0 collision / 0 conflit / 0 geo canonique manquante**. Post-merge gate `31254967688` vert ; rollback non requis ; `metric_layers_activated=false`.
- P1B.5 ✅ PR #419, merge `0abfd97c` — **Canonical Geo Normalization Recovery** : récupération strictement déterministe des districts explicites manqués uniquement par accents/apostrophes ; `odm04_fold_text()` + suppression d’apostrophes, alias Geo Registry confiance 1, quartier unique + ville parente validée, aucun fuzzy/synonyme/réseau. Preflight production **20/20**, write atomique **20/20** = **14 map-eligible + 6 canonical-only** ; **11 Guéliz / 6 Océan / 3 Route de l’Ourika** ; latest-event post-write **20/20 resolved**, preflight retombé à 0, rollback append-only disponible. Couverture Search quartier : **89 / 15 438 = 0,5765 %** ; post-merge gate P1B.5 PASS ; `metric_layers_activated=false`.

### P1B.6 ✅ PR #424 — Geo Coverage Depth Audit

Audit production strictement read-only après P1B.5 : **15 438** listings Search éligibles, **605** rows reliées à `property_listings`, **89** résolues, **516** non résolues. Parmi elles, **71** ont un `district` explicite mais **0/71** ne possède actuellement d’alias quartier validé confiance 1 ; elles forment **31 couples ville/quartier**. Les **445** restantes n’exposent aucun champ quartier/district structuré dans les metadata autorisées. Provenance exacte double-checkée : `mouldar.com` **42**, `mubawab.ma` **21**, `marrakechrealty.com` **8**. Verdict certifié : `REGISTRY_GAP_IS_NEXT_BOUNDARY`. **0 write, 0 mutation Registry, 0 source-site request, 0 fuzzy, 0 parsing titre/snippet.** Exact-head **19/19 PASS**, Reviewer **9,6/10**, merge `304726a83e1ef4df5ddacb8ecba925ad2e1c1b30`, push gate post-merge PASS.

### P1B.7 ✅ PR #426 — Geo Registry Gap Qualification

Qualification production strictement read-only du gap Registry certifié par P1B.6. Baseline inchangé : **15 438** listings Search éligibles / **605** bridged / **89** resolved / **516** unresolved / **71** avec district explicite / **31** couples ville-quartier. Classification certifiée : **10 couples / 31 rows `PRIORITY_EXTERNAL_VALIDATION`**, **9 / 26 `SINGLE_SOURCE_REPEAT_NEEDS_AUTHORITY`**, **10 / 10 `SINGLETON_NEEDS_AUTHORITY`**, `Tanger — Centre-ville` = **1 / 2 `PARENT_MISMATCH_REVIEW`**, `Marrakech — Autres Marrakech` = **1 / 2 `REJECT_PROVIDER_BUCKET`**. La récurrence commerciale sert uniquement à prioriser une validation indépendante ; elle ne constitue jamais une vérité géographique.

Contrat : **0 DB/Registry mutation, 0 alias/entity creation, 0 geo-resolution write, 0 source-site request, 0 fuzzy, 0 title/snippet inference**. Exact-head final après réalignement `d76eeda4de755faf08ec90afdaa0989cd4e8f2de`, **19/19 workflows PASS**, specialized live gate PASS, Reviewer **9,6/10**, Release Certifier GO, merge `77bd6ffad41443efbf543cd25caf7539ca593579`, post-merge specialized gate PASS. Verdict : **`EXTERNAL_AUTHORITY_REQUIRED_BEFORE_REGISTRY_WRITE`**.

### P1B.8 ✅ PR #430 — Geo Authority Evidence Review

Revue d’autorité indépendante strictement read-only des **10 couples / 31 rows** prioritaires P1B.7. Les portails immobiliers sont explicitement interdits comme autorité géographique. Le gate rejoue la cohorte P1B.7 live et échoue sur tout drift de couple, volume ou source. Résultat : **2 couples / 8 rows `AUTHORITY_CONFIRMED_NEIGHBORHOOD`** — **Agadir — Hay Mohammadi (5)** et **Agadir — Dakhla (3)**. Gauthier reste corroboration institutionnelle seulement ; Palmier nécessite encore autorité administrative ; Targa reste locality/type review ; Majorelle landmark/type mismatch ; Massira name/type unresolved ; Palmeraie, Route de Fès et Tanger — Nejma restent sans preuve quartier suffisante dans le périmètre revu. Absence de preuve ≠ preuve d’absence.

Contrat : **0 DB/Registry mutation, 0 alias/entity creation, 0 geo-resolution write, 0 property-portal authority**. Exact-head `e15fc810f2c98ed85fce0c78a465cf6e92cf33c7`, **19/19 workflows PASS**, specialized live gate PASS, Reviewer **9,6/10**, Release Certifier GO, merge `8f16efe091f76a5e933a201abd7f0bd1f9e53d77`, post-merge run `31328973075` PASS. Verdict : **`AUTHORITY_EVIDENCE_REVIEW_COMPLETE_NO_REGISTRY_WRITE_AUTHORIZED`**.

La couche **Offre par quartier reste interdite** : couverture **89 / 15 438 = 0,5765 %**. Prochain lot Carte : **P1B.9 — Tier A Registry Candidate Review**, strictement read-only sur **Hay Mohammadi + Dakhla** avant toute éventuelle mutation Registry.

## État DATA acquis

### DATA-1 — Census / Registry ✅

- réserve B3 : **37 009 URLs / 7 051 domaines** ;
- Common Crawl : **300/300 Parquet**, **8 727 registered domains** ;
- univers réconcilié : **15 238 domaines** ;
- 230 `PRIMARY_SOURCE_CANDIDATE` ;
- 625 `PORTAL_CANDIDATE` ;
- DATA-1.5 → DATA-1.6B : capability + policy + Registry, **0 activation non autorisée**.

### P0.1 — Mass Index Source Registry Operational Gate ✅ CLOSED — PR #392

P0.1 ne crée pas de nouveau Registry et n’accorde aucune permission. Il ferme le décalage entre le registre structurel historique des URL patterns et la policy production.

Contrat :

- le harvester Common Crawl relit `public.source_policy_registry` avant le premier appel CDX ;
- l’importer relit la policy avant toute écriture afin qu’un artefact ancien ne puisse pas s’auto-autoriser ;
- PostgreSQL protège ensuite `source_offer_seeds` avec un trigger fail-closed ;
- admission seulement sur domaine exact + canal exact `commoncrawl` + no-bypass + policy hash + review/date valides + acquisition/machine/ingestion non bloqués ;
- `next_review_at` réel est vérifié, même si un ancien label `review_status` n’a pas encore été recalculé ;
- identité source/provider immuable pour les seeds Common Crawl ;
- insert Common Crawl = `seed_only` : Common Crawl ne fabrique jamais la fraîcheur ;
- aucune row historique n’est supprimée ou réécrite automatiquement.

Audit live read-only pendant le LOT : **16** candidats structurels, **9** autorisés pour `commoncrawl`, **7** refusés fail-closed (**6 canal non autorisé + 1 policy expirée**). Les 9 domaines admis sont : `1immo.ma`, `agenz.ma`, `avito.ma`, `barnes-marrakech.com`, `kawtarimmobilier.com`, `masaken.ma`, `mouldar.com`, `mubawab.ma`, `soukimmobilier.com`.

Dette historique mesurée : **1 734** rows `commoncrawl_cdx` sur 6 domaines dont la policy actuelle n’autorise plus ce canal. **65** ont été confirmées ensuite par une observation live distincte ; P0.1 ne fait donc aucune blind-quarantine. Il bloque la récidive et expose la dette pour un éventuel LOT séparé.

Migration `supabase/migrations/20260808150000_p0_1_mass_index_source_registry_operational_gate.sql` **appliquée en production** après merge #392 (`1bbf2ff2f3ba7aed2b99eb492f703c965e1ed406`). Trigger, fonctions/ACL, rapport production et probe fail-closed ont été vérifiés ; rollback non destructif disponible.

Preuve E2E post-merge : workflow schedulé **Common Crawl Mass Seed Harvest #24**, run `31293392616`, sur `main` `7169142e9e0b4e327bdd9afe5befe7bbe7c64edd`, **SUCCESS**. Canary : **6/6 CDX**, **931 seeds** ; remainder : **21/21 CDX**, **13 747 seeds** ; imports : **0 policy rejection**, **0 nouvelle row** ; reconciler : `APPLIED`, **56 810 seeds**, **3 299 fresh_confirmed**, **53 511 seed_only**, **1 row modifiée**, **3 206 rows d’autres canaux protégées** ; artefact final SHA-256 `67ea00cca946b992fa3aef2122bab1e6763533ec05346c5ab96239ab32041f59`.

### DATA — Common Crawl freshness reconciler hardening ✅ CLOSED — PR #396

Micro-lot séparé après un échec transitoire observé sur le run #23 : le reconciler sérialise désormais explicitement les erreurs PostgREST, retrye de façon bornée les timeouts/5xx/fetch transitoires et réduit la concurrence des PATCH de **25 → 5**. Matching exact canonical URL et ownership `openserp_yandex_discovery` inchangés. **19/19 workflows exact-head verts**, DATA-4.3I contract + live-read-only PASS, Reviewer PASS, Release Certifier GO ; merge `6816e5e7bc4dbfe3c253cfe5da38175a5390606d`. Aucune migration, aucune policy modifiée.

### P0.2 — Common Crawl Discovery Coverage Audit ✅ CLOSED — PR #398

P0.2 ne refait pas le census DATA-1.3B : il mesure le delta opérationnel entre les policies production autorisant `commoncrawl` et la readiness structurelle exigée par le harvester (`approved_discovery` + résultat web externe + pattern de listing).

Preuve live read-only : **28** policies déclarent `commoncrawl`, **27** sont opérationnelles, **9** sont `HARVEST_READY`, **18** sont `POLICY_ALLOWED_PATTERN_MISSING`, **1** est `POLICY_EXPIRED_OR_BLOCKED` (`marrakechrealty.com`). Couverture structurelle : **33,33 %**. Les sources policy-déclarées portent **40 809** seeds Common Crawl ; les **18 pattern-missing portent 0 seed**. Deux sources harvest-ready (`1immo.ma`, `barnes-marrakech.com`) sont encore à 0 seed.

Contrat : **0 requête Common Crawl**, **0 requête source-site**, **0 WARC fetch**, **0 mutation DB**, **0 activation policy/source**. Exact-head : **20/20 workflows verts** ; Reviewer **PASS 9,4/10** ; Release Certifier **GO** ; merge `9112cbf02fef2ada2d0eb0785ec872fe630e293f` ; gate post-merge P0.2 PASS.

Prochain lot mass-index : **P0.3 — Common Crawl Pattern Evidence**. Il doit produire des preuves de patterns à partir de l’URL-index Common Crawl existant, sans WARC content par défaut et sans auto-activation.

### P0.3 — Common Crawl Pattern Evidence ✅ CLOSED — PR #400

P0.3 analyse uniquement les métadonnées de l’URL-index Common Crawl pour la cohorte figée des **18** sources `POLICY_ALLOWED_PATTERN_MISSING` de P0.2. Les policies production sont relues avant les requêtes ; aucun site source et aucun contenu WARC ne sont appelés.

Preuve finale : **54/54** requêtes URL-index réussies sur 3 indexes, **10 254 URL uniques**, **5 `STRONG_PATTERN_EVIDENCE`**, **6 `REVIEWABLE_PATTERN_EVIDENCE`**, **7 `INSUFFICIENT_URL_INDEX_EVIDENCE`**. Les 5 strong sont : `christiesrealestatemorocco.com`, `immo-maroc.com`, `immobilier-a-marrakech.com`, `immohammedia.com`, `leaderimmo.ma`. Un faux positif d’archive datée `/YYYY/MM/DD/...` a été détecté puis neutralisé avant certification ; test permanent ajouté.

Sécurité : **0 requête source-site**, **0 WARC/content fetch**, **0 mutation DB**, **0 mutation Registry/policy**, **0 activation de pattern**. **20/20 workflows exact-head verts**, Reviewer **PASS 9,4/10**, Release Certifier **GO**, merge `8ffffc7cfbe0921d21f66887e1c4ecccf3a738cb`, gate P0.3 post-merge PASS.

P0.5 a exécuté cette revue de readiness en lecture seule : **0/2 candidat autorisé pour une revue canary**. Les deux restent bloqués par l'autorisation/partenariat/revue légale ; aucun canary n'est permis tant que le Source Registry n'évolue pas explicitement.

### P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402

P0.4 a revu en shadow les **5 domaines `STRONG_PATTERN_EVIDENCE`** issus de P0.3, sans activer aucun pattern. Le replay utilise un oracle conservateur à trois états : signatures détail certifiées = `POSITIVE`, signatures explicitement non-detail = `NEGATIVE`, tout le reste = `AMBIGUOUS`. Un pattern qui absorbe une URL ambiguë est rejeté fail-closed.

Preuve finale : **15/15 requêtes Common Crawl URL-index réussies**, **2 `SHADOW_ACCEPTABLE` / 3 `REJECTED_SHADOW`**, **0 faux positif**, **1 faux négatif**, **42 matchs ambigus** uniquement sur les candidats rejetés. Acceptés en shadow : `christiesrealestatemorocco.com` (**1024 positifs / 9 négatifs / précision 1 / rappel 1 / 0 ambiguous match**) et `immobilier-a-marrakech.com` (**165 / 15 / précision 1 / rappel 1 / 0 ambiguous match**). Rejetés : `immo-maroc.com` (corpus négatif insuffisant + 4 ambiguous matches), `immohammedia.com` (3 ambiguous matches), `leaderimmo.ma` (35 ambiguous matches).

Finding Reviewer corrigé avant merge : les URL non certifiées ne sont plus fabriquées comme négatives ; elles restent `AMBIGUOUS`. Le client Common Crawl respecte `Retry-After`, utilise retry/timeout bornés et ne contourne aucun rate-limit. **20/20 workflows exact-head verts**, Reviewer **PASS 9,5/10**, Release Certifier **GO**, merge `81f4809424757838c099b6acfb8f8d4b719deab7`, gate P0.4 post-merge **PASS**. Artefact exact-head : `sha256:c772ed6a63daa800238040e93f17dc983d58c24538290ac05ac96f9538e7d22f`.

Contrat : **0 source-site request, 0 WARC/content fetch, 0 DB mutation, 0 Registry/policy mutation, 0 harvest, 0 pattern activation**. P0.4 prouve seulement une aptitude structurelle shadow ; il n'accorde aucune autorisation d'activation.

### P0.5 — Registry Activation Readiness Gate ✅ CLOSED — PR #408

P0.5 a requalifié en **lecture seule** les 2 candidats `SHADOW_ACCEPTABLE` de P0.4 avant toute éventuelle mutation Registry/canary. Le résultat production est fail-closed : **0/2 `READY_FOR_CANARY_REVIEW`, 2/2 `BLOCKED_BY_POLICY`**.

- `christiesrealestatemorocco.com` : Common Crawl discovery autorisé, mais `authorization_status=unverified`, `partnership_required=true`, `legal_review_required=true` ; **0 seed / 5 discovery candidates** ;
- `immobilier-a-marrakech.com` : Common Crawl discovery autorisé, mais `authorization_status=unverified`, `partnership_required=true`, `legal_review_required=true`, `detail_fetch_policy=paused` ; **0 seed / 14 discovery candidates**.

Le contrat distingue explicitement **preuve structurelle ≠ canal de discovery autorisé ≠ autorisation de canary**. `READY_FOR_CANARY_REVIEW` reste un état review-only pour un éventuel `commoncrawl_seed_only_internal`; il n'active ni pattern, ni source, ni détail, ni affichage.

Certification : **20/20 workflows exact-head verts** sur `e54099e9120d573d8092c8a119c066c911b624bd`, Reviewer **PASS 9,6/10**, Release Certifier **GO**, merge `ac0e240d28b88c5e66da73d1ab964794deb01877`, gate P0.5 post-merge **PASS**. Artefact exact-head : `sha256:a8617f91147feec1f2d870b971d346f36cddf74386da9019af2b600d4d224536`.

Contrat : **0 source-site request, 0 Common Crawl request, 0 WARC/content fetch, 0 DB mutation, 0 Registry mutation, 0 harvest, 0 pattern activation, 0 canary write**. Aucun rollback n'est requis puisqu'aucune mutation n'a eu lieu.

### DATA-4 — Reservoir Strategy

- DATA-4.0 ✅ PR #341 : Avito + Mubawab = **35 134 normalized**, **3 588 technical display**, **0 policy-activable** ;
- DATA-4.1A ✅ PR #343 : Avito `unavailable` = 95,06 % bruit/non-immobilier ; seulement **73** core-récupérables ;
- DATA-4.2 ✅ PR #344 : `daragadir.com` = `ADMISSIBLE_GROWTH`, `agenz.ma` = `PARTNERSHIP_UPSIDE` ;
- DATA-4.3A → H ✅ jusqu’à PR #377 : Dar Agadir certifié au cap **500**, TTL 14 jours, Search **500/500**, technical display **500/500**, drift **0 %**, Registry inchangé ;
- DATA-4.3I ✅ PR #367 : ownership fraîcheur multi-canal protégé ;
- DATA-4.3J ✅ PR #368 : ordre du trigger display corrigé ;
- DATA-4.4A ✅ PR #379, merge `43d8086c` : qualification read-only du second réservoir ;
- DATA-4.4B ✅ PR #380, merge `13b6c3c` : Promo Immo revalidé sur signaux publics actuels ; **3 130 URLs sitemap**, **2 935** dans le réservoir, **2 456** lignes conservatrices éligibles ; canary **50/50** préparé pour Search, technical display, quality A/B et rollback ; **0 write** dans le LOT ;
- DATA-4.4C ✅ PR #384, merge `ba65943a` : protection du Thin Index sur les writes freshness-only, migration production appliquée puis canary persistant exact **50/50**. Revalidation publique 4.4B rejouée juste avant write avec cohorte immuable ; post-certification : Search **50/50**, technical display **50/50**, quality A/B **50/50**, projection préservée **50/50**, drift **0 %**, Registry inchangé. Promo Immo = **3 005 total / 59 fresh_confirmed / 2 946 seed_only / 50 public_sitemap_presence** ; rollback disponible mais non requis.
- DATA-4.5A ✅ PR #410, merge `a4710d6f5a88218db7d0751adb775a145a8b04d2` : qualification read-only d'une expansion Promo Immo vers un plafond de **500**. Preuve source DATA-4.4B certifiée âgée de **25,29 h** et vérifiée par artefact/digest : **3 130 URLs sitemap / 2 935 intersections / 2 456 éligibles**. Production actuelle : **3 005 seeds / 2 923 Search / 2 923 technical display / 0 collision exacte** ; **2 405** nouvelles lignes conservatrices disponibles et cohorte provisoire **450/450**, batchée **100+100+100+100+50**. Cette cohorte n'est pas déclarée sitemap-live par 4.5A : les **450 doivent être revalidées individuellement contre le sitemap courant avant tout write**. **0 write, 0 source-site request, Registry inchangé**.

## Décision DATA courante

**DATA-4.4C, DATA-4.5A et P0.1 à P0.5 sont fermés et certifiés.** Le micro-lot reconciler #396 est également fermé. La lane P0 reste bloquée sur autorisation externe, mais le chantier DATA indépendant continue via Promo Immo. **Prochain lot : DATA-4.5B — Controlled Expansion Write**, strictement borné à un plafond de 500, avec revalidation sitemap live de chaque ligne avant write, rollback préalable et certification après chaque batch.

En parallèle business : **Agenz = priorité partenariat/feed**, sans changement Registry ou produit avant autorisation écrite.

## Règles d’exécution

Un lot n’est terminé que si : scope respecté, revue indépendante, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, PR mergée, post-merge vérifié, production vérifiée si applicable, rollback disponible si mutation, et les 3 MD canoniques alignés.

Pour un lot UX majeur : `Builder → Benchmark UX/Search Reviewer → Reviewer technique → Release Certifier → merge → post-merge`.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une service-role côté client.


## UX-SHELL-WHITE-HEADER-1 ✅ CLOSED

- PR #489 — light header locked to a white surface with the blue/light AkarFinder logo, including dark-OS contexts.
- Header navigation/control contrast recalibrated for white; compact `Mon projet` remains legible and secondary.
- Dark/transparent header variants preserved. Search, DATA, ranking, dedup and Map unchanged.
- Behavioral head `033a805470bd25004eca047fa72e06886027d93b`: Product Design Reviewer PASS + Independent Release Certifier PASS; production build and TypeScript PASS.
