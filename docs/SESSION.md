# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane UX/Search : BENCHMARK-SERP-1 ✅ ; SEARCH-UX-FAST-1 ✅ PR #390 ; SEARCH-WORDING-PURITY-1 ✅ PR #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394 ; prochain lot = PRICE-COVERAGE-RECOVERY-1**  
**Lane UX/Carte : P1B.4 ✅ Geo Coverage Recovery pilot certifié en production**  
**Lane DATA : DATA-4.4C ✅ ; P0.1 Mass Index Source Registry operational gate = PR #392, certification/activation post-merge requise**  
**Couche Offre quartier : OFF — couverture certifiée actuelle 0,45 %**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Base de ce LOT UX/Search : `main` `24f7363710fba955c75f1a8f67084bb8840bfa94`.

Acquis récents :

- DATA-4.4C ✅ PR #384/#385 — canary exact 50 persisté et certifié, drift 0 % ;
- P1B.3 ✅ PR #382 — Territorial Metric Join Contract ;
- P1B.4 ✅ PR #386 — Geo Coverage Recovery pilot, 69/69, coverage 0,45 % ;
- BENCHMARK-SERP-1 ✅ first pass read-only — rapport `docs/BENCHMARK_SERP_1_REPORT.md` ;
- SEARCH-UX-FAST-1 ✅ PR #390 — accès direct au premier résultat certifié mobile-first ;
- SEARCH-WORDING-PURITY-1 ✅ PR #391 — wording public simplifié, truth/ranking inchangés, Chromium 4 viewports ;
- SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393 — une seule séquence visuelle de listings, ordre commercial/truth interne inchangé ;
- SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394 — grille mobile 2 colonnes, prix non tronqué, favoris en overlay, desktop préservé ;
- P0.1 PR #392 — Source Registry rendu opérationnel sur le chemin Common Crawl mass-index, sans nouvelle autorisation de source.

Invariants : no-bypass, provenance réelle, Search canonique, aucune donnée/géométrie inventée, mobile-first pour UX majeur, zéro jargon interne sur les surfaces grand public.

# P0.1 — Mass Index Source Registry Operational Gate

Responsabilité unique : **empêcher le Registry structurel historique de devenir une autorisation implicite pour Common Crawl**.

Finding racine :

- `data/openserp/source-domain-registry.json` connaissait des domaines/patterns `approved_discovery` ;
- la production `public.source_policy_registry` peut autoriser seulement `public_sitemap`, interdire `commoncrawl`, ou avoir une policy réellement expirée ;
- le harvester Common Crawl utilisait jusque-là le premier registre pour sélectionner ses domaines.

Contrat P0.1 :

1. le harvester relit le Source Registry production **avant toute requête CDX** ;
2. l’importer relit le Source Registry avant tout write, donc un artefact ancien ne s’auto-autorise jamais ;
3. le trigger PostgreSQL bloque en dernier ressort tout `commoncrawl_cdx` hors policy ;
4. admission seulement si : domaine exact, `commoncrawl` explicitement autorisé, `no_bypass_required=true`, `policy_hash` présent, `review_status in (current,due_soon)` **et** `next_review_at > now()`, acquisition/machine/ingestion non bloqués ;
5. identité `source_domain + seed_provider` immuable pour un seed Common Crawl ;
6. un INSERT Common Crawl reste `seed_only` et ne fabrique jamais de fraîcheur ; la revalidation fraîche ultérieure reste un pipeline séparé ;
7. aucune row historique n’est supprimée ou réécrite automatiquement.

Audit live read-only de certification :

- **16** domaines structurels candidats ;
- **9** autorisés pour le canal exact `commoncrawl` ;
- **7** refusés fail-closed : **6 `channel_not_allowed` + 1 `policy_review_not_current`** ;
- domaines actuellement autorisés : `1immo.ma`, `agenz.ma`, `avito.ma`, `barnes-marrakech.com`, `kawtarimmobilier.com`, `masaken.ma`, `mouldar.com`, `mubawab.ma`, `soukimmobilier.com`.

Dette historique exposée :

- **1 734** rows `commoncrawl_cdx` existent sur 6 domaines dont la policy actuelle n’autorise plus Common Crawl ;
- **65** sont `fresh_confirmed` par une autre observation live (`openserp_yandex_discovery`) ;
- la dette n’est donc pas blind-quarantined dans P0.1 ; elle est mesurée, future recurrence bloquée, et toute remediation historique doit rester un LOT distinct.

Migration incluse : `supabase/migrations/20260808150000_p0_1_mass_index_source_registry_operational_gate.sql`.

Activation : **uniquement post-merge**, via migration canonique Supabase, puis rapport production + trigger catalog + advisors. Rollback non destructif : drop trigger + fonctions P0.1 ; aucune row historique n’est mutée par la migration.

# Gouvernance UX / Search

Référence : `docs/BENCHMARK_UX_SEARCH_AGENT.md`.

Chaîne des lots UX majeurs :

`Builder → Benchmark UX/Search Reviewer → Reviewer technique → Release Certifier → merge → post-merge`

Décisions verrouillées :

- mobile = expérience de référence ;
- score mobile ≥9/10 obligatoire pour certifier un lot UX majeur ;
- desktop enrichit sans ajouter du bruit ;
- Search vise `RECHERCHE → FILTRES UTILES → RÉSULTATS` ;
- flux visuel continu d’annonces ;
- zéro jargon d’architecture interne visible ;
- Benchmark Reviewer peut rendre `CHANGES_REQUIRED` ;
- aucune copie concurrente sans valeur propre AkarFinder.

# BENCHMARK-SERP-1 ✅ FIRST PASS

Références : Mubawab, Agenz, Zillow, Rightmove.

Verdict initial : **CHANGES_REQUIRED** sur la SERP.

Scores heuristiques initiaux :

- AkarFinder global : **6,9/10** ;
- mobile : **6,2/10** ;
- desktop : **7,2/10** ;
- potentiel après simplification : **9,3–9,5/10**.

# SEARCH-UX-FAST-1 ✅ CLOSED — PR #390

Responsabilité : **réduire tout ce qui précède la première annonce sur `/search`**.

Preuves exactes :

- **360×800** : première annonce `1538 px → 450 px`, Search `69 px`, overflow `false` ;
- **390×844** : première annonce `450 px`, overflow `false` ;
- **1280×800 / 1440×900** : première annonce `328 px`, overflow `false` ;
- build production, TypeScript, contrat spécialisé et Chromium : PASS ;
- Benchmark Reviewer : **PASS — mobile 9,3/10, desktop 9,2/10** ;
- Reviewer technique : **PASS**.

# SEARCH-WORDING-PURITY-1 ✅ CLOSED — PR #391

Responsabilité : **retirer le jargon et la prose d’architecture des surfaces Search/Home concernées**, sans modifier ranking, ordre commercial, récupération de prix, DATA, Registry, structure des cards ou logique Map.

Preuves exactes :

- branches internes `observed/analyzed/partial` inchangées ; même collapse/dédoublonnage et même ordre ;
- wording public simplifié sur Search/Home, carte, price explorer, quartier, comparateur, résultats externes et AkarInfo ;
- garde-fou dédup conservé : des résultats regroupés peuvent correspondre au même bien **sans certitude** ;
- **360×800 / 390×844** : première annonce `398 px`, visible dans le premier écran, overflow `false` ;
- **1280×800 / 1440×900** : première annonce `328 px`, overflow `false` ;
- Search + Home : **0 expression retirée détectée** sur les 4 viewports ;
- `SEARCH-WORDING-PURITY-1 Gate` : contrats + TypeScript + build + Chromium = PASS ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,4/10, desktop 9,3/10** ;
- Reviewer technique : **PASS**.

# SEARCH-CONTINUOUS-FLOW-1 ✅ CLOSED — PR #393

Responsabilité : **supprimer les ruptures visuelles entre les catégories d’annonces sans changer leur ordre interne**.

Preuves avant closeout documentaire :

- anciennes sections visibles promoteur/agence/direct/public supprimées du flux ;
- listings internes rendus dans une seule grille ; Gateway suit sans nouveau header de catégorie ;
- séquence conservée : `promoteur premium → agence partenaire → direct user → public analyzed → public partial → public observed → gateway` ;
- `partitionCommercialSearchListings` reste autoritaire ; ranking, truth tiers, prix, dédup, DATA, Registry, Map et éligibilité inchangés ;
- Chromium **360×800 / 390×844 / 1280×800 / 1440×900** : ordre préservé, 0 header de catégorie, 0 overflow, première annonce dans le premier écran ; aucune rupture verticale mobile > **24 px** ;
- `SEARCH-CONTINUOUS-FLOW-1 Gate`, SEARCH-UX-FAST, P0 Closure, Search Truth, Visible Dedup et WORDING-PURITY : PASS ;
- **23/23 workflows exact-head verts** avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,5/10, desktop 9,4/10** ;
- Reviewer technique : **PASS**.

# SEARCH-MOBILE-CARD-GRID-1 ✅ CLOSED — PR #394

Responsabilité : **augmenter la densité de scan mobile des résultats dans l’esprit du benchmark Airbnb, sans copier son design et sans modifier ranking, ordre commercial/truth, prix, DATA, Registry ou Map**.

Preuves pré-closeout :

- mobile : grille verticale continue **2 colonnes**, image dominante `164 px`, prix → titre → localisation → 3 facts → provenance ;
- favoris conservés en **overlay sur l’image** pour libérer toute la largeur du prix ;
- CTA secondaires `Repérer sur la carte`, gros CTA et `Comparer` masqués uniquement sous `640 px` ; desktop/tablette préservés ;
- résultats Gateway alignés sur le même rythme mobile sans recréer de section ;
- **360×800** : première card à `308 px`, largeur `158 px`, hauteur `306 px`, 2 colonnes réelles, `0` CTA secondaire, `0` prix tronqué, `0` overflow ;
- **390×844** : première card à `308 px`, largeur `173 px`, hauteur `306 px`, mêmes invariants à zéro ;
- **1280×800 / 1440×900** : desktop préservé, première card à `236 px`, zéro overflow ;
- `Visuel illustratif`, provenance et prudence `Résultats proches / Comparez les sources` restent explicites ;
- gate permanent `SEARCH-MOBILE-CARD-GRID-1 Gate` : contrat + TypeScript + build + Chromium 4 viewports + anti-troncature prix ;
- **23/23 workflows exact-head verts** sur `76a5dfac10dd47aeee569f85067cc9e677d1cecb` avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,6/10, desktop 9,4/10** ;
- Reviewer technique : **PASS**.

# PROCHAIN LOT UX/SEARCH

**PRICE-COVERAGE-RECOVERY-1** uniquement : audit des résultats sans prix puis récupération policy-compliant de prix explicitement disponibles, sans estimation et sans bypass.

Puis : `RANKING-QUALITY-1` → `UNIFIED-LISTING-CARD-1` → `CONTEXTUAL-VISUAL-ASSETS-1`.

# UX / Carte — état certifié

P1B.4 production : **69 résolutions / 14 quartiers / 5 villes**, couverture **0,45 %**, 0 collision, 0 conflit, metric layers OFF. Ne pas activer Offre quartier.

# DATA

DATA-4.4C fermé et certifié. P0.1 ne donne aucune nouvelle permission et n’augmente aucun volume par lui-même. Après closeout production de P0.1, le prochain LOT mass-index doit être défini explicitement ; aucun nouveau scraper/source direct n’est autorisé par P0.1.