# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane UX/Search : BENCHMARK-SERP-1 ✅ first pass ; prochain lot = SEARCH-UX-FAST-1**  
**Lane UX/Carte : P1B.4 ✅ Geo Coverage Recovery pilot certifié en production**  
**Lane DATA : DATA-4.4C ✅ Persistent Canary 50 certifié ; prochaine décision DATA = expansion bornée à définir explicitement**  
**Couche Offre quartier : OFF — couverture certifiée actuelle 0,45 %**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Base actuelle avant gouvernance Benchmark : `ac1c7f11e4f90fad93c843529b2ee9807fef544f`.

Acquis récents :

- DATA-4.4C ✅ PR #384/#385 — canary exact 50 persisté et certifié, drift 0 % ;
- P1B.3 ✅ PR #382 — Territorial Metric Join Contract ;
- P1B.4 ✅ PR #386 — Geo Coverage Recovery pilot, 69/69, coverage 0,45 % ;
- BENCHMARK-SERP-1 ✅ first pass read-only — rapport `docs/BENCHMARK_SERP_1_REPORT.md`.

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

Verdict : **CHANGES_REQUIRED** sur la SERP actuelle.

Scores heuristiques :

- AkarFinder global : **6,9/10** ;
- mobile : **6,2/10** ;
- desktop : **7,2/10** ;
- potentiel après simplification : **9,3–9,5/10**.

Finding principal : trop de structure, texte et segmentation avant le premier résultat. L’intelligence AkarFinder doit améliorer le résultat, pas ralentir son accès.

# SEARCH-UX-FAST-1 — PROCHAIN LOT

Responsabilité unique : **réduire tout ce qui précède la première annonce sur `/search`**.

Scope autorisé :

- compacter/supprimer les blocs introductifs non nécessaires ;
- rapprocher compteur/tri/filtres du flux ;
- privilégier 360/390 px ;
- préserver une expérience desktop 1280/1440 propre.

Hors scope strict :

- ranking ;
- ordre commercial ;
- structure de cards ;
- récupération des prix ;
- wording profond des cards/catégories au-delà de ce qui est nécessaire pour retirer le bruit avant résultat ;
- DATA/Registry ;
- Map métier.

Gates : captures 360/390/1280/1440, mesure avant/après du chemin vers le premier résultat, Search fonctionnelle, Benchmark Reviewer PASS mobile ≥9, Reviewer technique PASS, Certifier GO, 3 MD alignés.

Lots suivants séparés : `SEARCH-WORDING-PURITY-1`, `SEARCH-CONTINUOUS-FLOW-1`, `PRICE-COVERAGE-RECOVERY-1`, `RANKING-QUALITY-1`, `UNIFIED-LISTING-CARD-1`, `CONTEXTUAL-VISUAL-ASSETS-1`.

# UX / Carte — état certifié

P1B.4 production : **69 résolutions / 14 quartiers / 5 villes**, couverture **0,45 %**, 0 collision, 0 conflit, metric layers OFF. Ne pas activer Offre quartier.

# DATA

DATA-4.4C fermé et certifié. Aucun +100/+500 automatique ; prochain lot d’expansion à définir explicitement.
