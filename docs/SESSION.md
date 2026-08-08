# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane UX/Search : BENCHMARK-SERP-1 ✅ ; SEARCH-UX-FAST-1 ✅ PR #390 ; prochain lot = SEARCH-WORDING-PURITY-1**  
**Lane UX/Carte : P1B.4 ✅ Geo Coverage Recovery pilot certifié en production**  
**Lane DATA : DATA-4.4C ✅ Persistent Canary 50 certifié ; prochaine décision DATA = expansion bornée à définir explicitement**  
**Couche Offre quartier : OFF — couverture certifiée actuelle 0,45 %**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Base de gouvernance Benchmark : merge PR #389 `6b11087366c60c8e5921344d6908abe8a4af35a3`.

Acquis récents :

- DATA-4.4C ✅ PR #384/#385 — canary exact 50 persisté et certifié, drift 0 % ;
- P1B.3 ✅ PR #382 — Territorial Metric Join Contract ;
- P1B.4 ✅ PR #386 — Geo Coverage Recovery pilot, 69/69, coverage 0,45 % ;
- BENCHMARK-SERP-1 ✅ first pass read-only — rapport `docs/BENCHMARK_SERP_1_REPORT.md` ;
- SEARCH-UX-FAST-1 ✅ PR #390 — accès direct au premier résultat certifié mobile-first.

Invariants : no-bypass, provenance réelle, Search canonique, aucune donnée/géométrie inventée, mobile-first pour UX majeur, zéro jargon interne sur les surfaces grand public.

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

Finding principal : trop de structure, texte et segmentation avant le premier résultat. L’intelligence AkarFinder doit améliorer le résultat, pas ralentir son accès.

# SEARCH-UX-FAST-1 ✅ CLOSED — PR #390

Responsabilité : **réduire tout ce qui précède la première annonce sur `/search`**.

Résultat :

- hero Search et prose intermédiaire retirés ;
- `ActiveProjectBanner` retiré du chemin critique, `project_id` toujours transmis via le bridge Search/Map ;
- recherche + Acheter/Louer/Neuf + `Filtres` comme contrôles visibles principaux ;
- Option A toujours accessible derrière `Filtres` ;
- compteur + Liste/Mixte/Carte + tri compactés ;
- `SearchPriceExplorerDock` déplacé après le flux primaire, sans suppression de l’intelligence locale ;
- contrat permanent empêchant le retour de cette intelligence avant les résultats ;
- overflow 360 px corrigé.

Preuves exactes :

- **360×800** : première annonce `1538 px → 450 px`, Search `69 px`, overflow `false` ;
- **390×844** : première annonce `450 px`, Search `69 px`, overflow `false` ;
- **1280×800** : première annonce `328 px`, overflow `false` ;
- **1440×900** : première annonce `328 px`, overflow `false` ;
- ancien hero : absent ;
- ancienne explication de ranking : absente ;
- ancien prompt projet avant SERP : absent ;
- build production, TypeScript, contrat spécialisé et Chromium 4 viewports : PASS ;
- **25/25 workflows exact-head verts avant closeout** ;
- Benchmark Reviewer : **PASS — mobile 9,3/10, desktop 9,2/10** ;
- Reviewer technique : **PASS**.

Finding différé, non bloquant pour ce LOT : les grands headers/explications de catégories existent encore. Ils appartiennent aux lots `SEARCH-WORDING-PURITY-1` puis `SEARCH-CONTINUOUS-FLOW-1`.

# PROCHAIN LOT UX/SEARCH

**SEARCH-WORDING-PURITY-1** uniquement.

Objectif : supprimer jargon et prose inutile des surfaces transactionnelles sans mélanger le refactor continuous-flow, le ranking, les cards ou la récupération de prix.

Puis : `SEARCH-CONTINUOUS-FLOW-1` → `PRICE-COVERAGE-RECOVERY-1` → `RANKING-QUALITY-1` → `UNIFIED-LISTING-CARD-1` → `CONTEXTUAL-VISUAL-ASSETS-1`.

# UX / Carte — état certifié

P1B.4 production : **69 résolutions / 14 quartiers / 5 villes**, couverture **0,45 %**, 0 collision, 0 conflit, metric layers OFF. Ne pas activer Offre quartier.

# DATA

DATA-4.4C fermé et certifié. Aucun +100/+500 automatique ; prochain lot d’expansion à définir explicitement.
